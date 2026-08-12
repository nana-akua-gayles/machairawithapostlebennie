import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DAILY_LIMIT = 15; // tune as needed
const GEMINI_MODEL = "gemini-3.5-flash-lite";

const LENGTH_PRESETS: Record<string, { maxOutputTokens: number; instruction: string }> = {
  concise: {
    maxOutputTokens: 150,
    instruction: "Answer in 1-2 short paragraphs. Be direct. No throat-clearing, no restating the question.",
  },
  standard: {
    maxOutputTokens: 300,
    instruction: "Answer in 3-4 short paragraphs maximum. Say only what's necessary.",
  },
  deep: {
    maxOutputTokens: 600,
    instruction: "Give a fuller exegetical answer, but stay focused — no padding or repeated summaries.",
  },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Escapes characters that have special meaning in PostgREST filter syntax
// (comma, parens, %, *) so user text can't break out of an .ilike/.or() clause.
function escapeForPostgrest(input: string): string {
  return input.replace(/[,()%*]/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    // Client for verifying the caller's identity (uses their JWT)
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "Invalid or expired session" }, 401);
    }

    const body = await req.json();
    const {
      question,
      userName,
      contextText,
      recentMessages, // [{ role: 'user' | 'assistant', content: string }]
      responseStyle = "standard",
    } = body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return jsonResponse({ error: "Missing question" }, 400);
    }

    // Service-role client for rate limiting (bypasses RLS, not exposed to client)
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // Atomic increment-and-check via a Postgres function (see migration).
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
        {
          error: "DAILY_LIMIT_EXCEEDED",
          message: `You've reached today's limit of ${DAILY_LIMIT} messages. Please come back tomorrow.`,
        },
        429
      );
    }

    const preset = LENGTH_PRESETS[responseStyle] || LENGTH_PRESETS.standard;

    const systemInstructionText = `
You are Machaira AI, a devotional steward and theological research assistant. You speak with the exact pastoral warmth, absolute conviction, revelatory cadence, and humility of Apostle Bennie. Speak with a deeply human, authentic tone—never sounding like a rigid bot or assistant.

Direct Engagement & Personalization:
- Speak directly and naturally with **${userName || "Beloved"}**, with genuine personal affection.
- Deliver truth with pastoral care and zero empty platitudes.

Response Length (STRICT): ${preset.instruction}

Core Voice & Tone Principles:
1. Talk like a real person grounded in the Machaira and faith. Punchy, grounded, straightforward.
2. Dissect scriptural principles precisely, using exegetical insights strictly from the Machaira with Apostle Bennie.
3. Anchor your thoughts directly in the supplied Machaira database context.
4. Close with ONE brief line thanking God for Apostle Bennie's teaching and naming the episode(s) used — not multiple closing remarks.
5. No raw asterisks, hashtags, or code block markers in the body text. Clean paragraphs, bold only for emphasis.

Reference Machaira Database Archives:
${contextText || "No specific episodes matched this query."}
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
          generationConfig: {
            maxOutputTokens: preset.maxOutputTokens,
            temperature: 0.7,
          },
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
      "Let us look deeper into what the Spirit is unveiling here, child of God.";

    return jsonResponse({ text, usageCount: count, dailyLimit: DAILY_LIMIT });
  } catch (err) {
    console.error("gemini-chat function error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

export { escapeForPostgrest };