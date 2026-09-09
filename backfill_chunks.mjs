import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { pipeline } from '@xenova/transformers';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error("CRITICAL ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const CHUNK_SIZE = 1000;   // target characters per chunk
const CHUNK_OVERLAP = 150; // characters repeated at the start of the next chunk, for continuity

// Splits on sentence boundaries and greedily packs sentences into chunks of
// roughly CHUNK_SIZE characters, carrying the tail of one chunk into the
// next so a sentence split across chunk edges isn't lost from both.
function chunkText(text) {
    const sentences = text
        .replace(/\s+/g, ' ')
        .trim()
        .split(/(?<=[.?!])\s+/);

    const chunks = [];
    let current = '';

    for (const sentence of sentences) {
        if ((current + ' ' + sentence).trim().length > CHUNK_SIZE && current.length > 0) {
            chunks.push(current.trim());
            const overlapStart = Math.max(0, current.length - CHUNK_OVERLAP);
            current = current.slice(overlapStart);
        }
        current = (current + ' ' + sentence).trim();
    }
    if (current.trim().length > 0) chunks.push(current.trim());

    return chunks;
}

async function runBatch() {
    console.log("Loading embedding model (Supabase/gte-small)...");
    const extractor = await pipeline('feature-extraction', 'Supabase/gte-small');

    console.log("Fetching devotionals not yet chunked...");
    const { data: devotionals, error } = await supabase
        .from('devotionals')
        .select('id, pure_content')
        .not('pure_content', 'is', null);

    if (error) {
        console.error("Error fetching devotionals:", error);
        process.exit(1);
    }

    if (!devotionals || devotionals.length === 0) {
        console.log("No devotionals found. Done.");
        return;
    }

    // Skip episodes that already have chunks (so this script is safe to re-run).
    const { data: existingChunkRows, error: existingErr } = await supabase
        .from('devotional_chunks')
        .select('devotional_id');
    if (existingErr) {
        console.error("Error checking existing chunks:", existingErr);
        process.exit(1);
    }
    const alreadyChunked = new Set((existingChunkRows || []).map(r => r.devotional_id));

    const toProcess = devotionals.filter(d => !alreadyChunked.has(d.id) && d.pure_content.trim() !== '');
    console.log(`${toProcess.length} devotionals need chunking (${alreadyChunked.size} already done).`);

    for (const item of toProcess) {
        try {
            const chunks = chunkText(item.pure_content);
            console.log(`Post ID ${item.id}: ${chunks.length} chunk(s)`);

            const rows = [];
            for (let i = 0; i < chunks.length; i++) {
                const output = await extractor(chunks[i], { pooling: 'mean', normalize: true });
                const embeddingArray = Array.from(output.data);
                rows.push({
                    devotional_id: item.id,
                    chunk_index: i,
                    chunk_text: chunks[i],
                    embedding: JSON.stringify(embeddingArray),
                });
            }

            const { error: insertError } = await supabase
                .from('devotional_chunks')
                .insert(rows);

            if (insertError) {
                console.error(`Failed to insert chunks for ID ${item.id}:`, insertError);
            } else {
                console.log(`Successfully embedded and inserted ${rows.length} chunk(s) for ID ${item.id}`);
            }
        } catch (err) {
            console.error(`Error on ID ${item.id}:`, err);
        }
    }
    console.log("Batch processing completed! Remember to run: analyze devotional_chunks;");
}

runBatch();