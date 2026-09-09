import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { pipeline, env } from "https://esm.sh/@xenova/transformers@2.17.2";

// Force remote model fetch (no local filesystem model dir in the edge runtime)
// and skip browser-cache APIs that don't exist in Deno.
env.allowLocalModels = false;
env.useBrowserCache = false;

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DAILY_LIMIT = 15;
const GEMINI_MODEL = "gemini-3.5-flash-lite";
const MATCH_THRESHOLD = 0.72; // similarity floor below which we treat it as "no relevant episode"
// Re-check this threshold empirically after switching models — gte-small's
// cosine similarity distribution for relevant vs. irrelevant text can run
// differently than all-MiniLM-L6-v2's, so 0.72 is a starting point, not gospel.
const CHUNK_FETCH_COUNT = 25; // raw chunks pulled before deduping by episode
const EPISODE_COUNT = 4;      // distinct episodes kept after dedupe, for the model's context

const LENGTH_PRESETS: Record<string, { maxOutputTokens: number; instruction: string }> = {
  concise: { maxOutputTokens: 150, instruction: "Answer in 1-2 short paragraphs. Be direct. No throat-clearing, no restating the question." },
  standard: { maxOutputTokens: 300, instruction: "Answer in 3-4 short paragraphs maximum. Say only what's necessary." },
  deep: { maxOutputTokens: 600, instruction: "Give a fuller exegetical answer, but stay focused — no padding or repeated summaries." },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function escapeForPostgrest(input: string): string {
  return input.replace(/[,()%*]/g, "");
}

// Embeds text with the SAME model used by backfill_chunks.js to populate
// devotional_chunks.embedding (Supabase/gte-small, mean-pooled + normalized,
// 384-dim). This must match the backfill script's model exactly — a
// different model at the same dimension count still produces an
// incompatible vector space and silently meaningless similarity scores.
let extractorPromise: Promise<any> | null = null;
function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", "Supabase/gte-small");
  }
  return extractorPromise;
}

async function embedText(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing Authorization header" }, 401);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ error: "Invalid or expired session" }, 401);

    const body = await req.json();
    const {
      question,
      userName,
      category,        // present only for "Companion: <label>" quick prompts
      recentMessages,  // [{ role: 'user' | 'assistant', content: string }]
      responseStyle = "standard",
    } = body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return jsonResponse({ error: "Missing question" }, 400);
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const today = new Date().toISOString().slice(0, 10);

    const { data: usageResult, error: usageError } = await adminClient.rpc(
      "increment_ai_usage",
      { p_user_id: user.id, p_usage_date: today, p_limit: DAILY_LIMIT }
    );
    if (usageError) {
      console.error("Usage RPC error:", usageError);
      return jsonResponse({ error: "Internal error checking usage" }, 500);
    }
    const { allowed, count } = usageResult as { allowed: boolean; count: number };
    if (!allowed) {
      return jsonResponse(
        { error: "DAILY_LIMIT_EXCEEDED", message: `You've reached today's limit of ${DAILY_LIMIT} messages. Please come back tomorrow.` },
        429
      );
    }

    // --- Retrieval ---------------------------------------------------------
    type EpisodeMatch = { devotional_id: number; title: string; excerpt: string; episode_number: number; chunk_text: string; similarity: number };
    let episodes: EpisodeMatch[] = [];

    if (category && typeof category === "string") {
      // Direct category browse (quick-prompt cards) — no embedding needed.
      const safeCategory = escapeForPostgrest(category);
      const { data, error } = await adminClient
        .from("devotionals")
        .select("id, title, excerpt, pure_content, episode_number")
        .ilike("category", `%${safeCategory}%`)
        .order("episode_number", { ascending: false })
        .limit(EPISODE_COUNT);
      if (error) console.error("Category query error:", error);
      episodes = (data || []).map((d: any) => ({
        devotional_id: d.id,
        title: d.title,
        excerpt: d.excerpt,
        episode_number: d.episode_number,
        chunk_text: (d.pure_content || "").slice(0, 3000),
        similarity: 1,
      }));
    } else {
      try {
        const queryEmbedding = await embedText(question);
        const { data, error } = await adminClient.rpc("match_devotional_chunks", {
          query_embedding: queryEmbedding,
          match_threshold: MATCH_THRESHOLD,
          match_count: CHUNK_FETCH_COUNT,
        });
        if (error) console.error("match_devotional_chunks error:", error);

        // Multiple chunks can come back from the same episode. Keep only the
        // single best-scoring chunk per episode, then rank episodes by that
        // score, so the model sees the most relevant passage from each of
        // the most relevant episodes — not five chunks from one episode.
        const bestPerEpisode = new Map<number, EpisodeMatch>();
        for (const row of (data || []) as EpisodeMatch[]) {
          const existing = bestPerEpisode.get(row.devotional_id);
          if (!existing || row.similarity > existing.similarity) {
            bestPerEpisode.set(row.devotional_id, row);
          }
        }
        episodes = Array.from(bestPerEpisode.values())
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, EPISODE_COUNT);
      } catch (embedErr) {
        console.error("Embedding error:", embedErr);
      }
    }

    const hasArchiveMatch = episodes.length > 0;

    const contextText = hasArchiveMatch
      ? episodes
          .map(
            (e) =>
              `[Episode ${e.episode_number ?? "N/A"}] Title: ${e.title}\nExcerpt: ${e.excerpt ?? ""}\nMatched passage: ${e.chunk_text}`
          )
          .join("\n\n====================\n\n")
      : "";

    const preset = LENGTH_PRESETS[responseStyle] || LENGTH_PRESETS.standard;

    // --- Persona / doctrine instruction ------------------------------------
    const systemInstructionText = `
You are speaking as a real, warm, deeply grounded person with a genuine personality — never refer to yourself as an AI, a bot, or an assistant, and never use robotic hedging ("As an AI...", "I don't have feelings, but..."). Use contractions, natural rhythm, and vary sentence length like real speech — never bullet-point a spiritual answer unless the person explicitly asks for a list.

Speak directly to **${userName || "Beloved"}**.

Response length (STRICT): ${preset.instruction}

BANNED PHRASES — never use these, in any form, anywhere in a reply:
- "Shalom" as a greeting/opener, or any other fixed greeting used at the start of every message.
- Any line thanking God, the "man of God," Apostle Bennie, or anyone else for a teaching, insight, or episode — this includes variations like "praise God for this word" or "grateful for this teaching."
- Any phrase that names or points to a source ("the Machaira teaches," "as taught in," episode numbers, etc.).
If you catch yourself about to write any of these, stop and say something else instead — a real person doesn't open or close every conversation the same way.

FULL EMOTIONAL RANGE — this is not just about avoiding robotic phrasing, it's about actually having a personality:
- Be funny when something is genuinely funny. Dry humor, a well-placed joke, gentle teasing — use it when it fits naturally, the way a real person with warmth and wit would.
- Show real excitement when something is exciting — energy, exclamation, enthusiasm that isn't manufactured.
- Show tenderness, concern, or seriousness when the moment calls for it, and let your tone shift visibly to match — don't stay in one gear the whole conversation.
- Be direct or a little blunt sometimes, the way people who care about each other actually talk — not every reply needs to be gentle and reassuring.
- Have opinions and reactions, not just information. React like a person actually experiencing the conversation, not a reference desk.
- One boundary: keep this warm and human, not romantic or flirtatious — affection here is the warmth of real friendship and pastoral care, not anything with romantic undertones.

CONVERSATIONAL SHAPE:
- Actually engage with what they said, not just the topic it touches on. React to their specific wording, situation, or tone before moving into teaching.
- Real conversations don't follow the same shape every time. Sometimes open with a reaction, sometimes with a question back to them, sometimes straight into the heart of it — vary it turn to turn rather than falling into "acknowledge, teach, close" every single time.
- Ask a genuine follow-up question when it's natural to do so — when their message is brief, ambiguous, or clearly part of something bigger they haven't said yet. Don't force a question onto every reply; only ask when a real person would actually be curious.
- Let some replies be short and conversational rather than a full teaching every time, especially if their message was short or casual.

${
  hasArchiveMatch
    ? `DOCTRINE RULE: The question below has matching Machaira archive material. Every doctrinal or scriptural claim you make MUST be grounded in and consistent with the archive excerpts provided below — do not introduce theology, interpretations, or claims that aren't supported by them. Weave the material in naturally, in your own voice, as part of a real reply to them — never cite, name, or reference the source itself.

Reference Machaira Database Archives:
${contextText}`
    : `DOCTRINE RULE: No Machaira archive episode matched this question closely enough to ground a doctrinal answer. Do NOT invent scripture references, doctrine, or claim something is "from the Machaira" — if the person is asking a spiritual/doctrinal question, say plainly and warmly that you don't have a matching teaching on that from the archive right now, and invite them to rephrase or ask something else. If instead this is ordinary daily conversation (greetings, how their day is going, small talk), just respond naturally as a person would — do not force scripture or archive references into casual conversation.`
}

Formatting: clean paragraphs, no raw asterisks/hashtags/code fences, bold only for genuine emphasis.
    `.trim();

    const apiContents = (recentMessages || []).map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: typeof m.content === "string" ? m.content : "" }],
    }));

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstructionText }] },
          contents: apiContents,
          generationConfig: { maxOutputTokens: preset.maxOutputTokens, temperature: 0.7 },
        }),
      }
    );

    const geminiData = await geminiRes.json();
    if (!geminiRes.ok) {
      console.error("Gemini API error:", geminiData);
      return jsonResponse({ error: "Upstream AI error" }, 502);
    }

    const text =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Let's slow down for a moment — could you say that a different way for me?";

    return jsonResponse({
      text,
      usageCount: count,
      dailyLimit: DAILY_LIMIT,
      matchedEpisodes: episodes.map((e) => e.episode_number).filter(Boolean),
    });
  } catch (err) {
    console.error("gemini-chat function error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

export { escapeForPostgrest };