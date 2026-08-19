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

async function runBatch() {
    console.log("Loading local embedding model (all-MiniLM-L6-v2)...");
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    console.log("Fetching devotionals missing embeddings...");
    const { data: devotionals, error } = await supabase
        .from('devotionals')
        .select('id, pure_content')
        .is('embedding', null)
        .not('pure_content', 'is', null);

    if (error) {
        console.error("Error fetching devotionals:", error);
        process.exit(1);
    }

    if (!devotionals || devotionals.length === 0) {
        console.log("No devotionals found missing embeddings. Done.");
        return;
    }

    console.log(`Found ${devotionals.length} devotionals to embed.`);

    for (const item of devotionals) {
        if (!item.pure_content || item.pure_content.trim() === '') continue;

        try {
            console.log(`Processing Post ID: ${item.id}...`);
            const cleanText = item.pure_content.substring(0, 500);
            const output = await extractor(cleanText, { pooling: 'mean', normalize: true });

            let embeddingArray;
            if (output.data) {
                embeddingArray = Array.from(output.data);
            } else if (Array.isArray(output)) {
                embeddingArray = output;
            } else {
                embeddingArray = Array.from(output);
            }

            const vectorString = JSON.stringify(embeddingArray);

            const { data: updateData, error: updateError } = await supabase
                .from('devotionals')
                .update({ embedding: vectorString })
                .eq('id', item.id)
                .select();

            if (updateError) {
                console.error(`Failed ID ${item.id} Database Error:`, updateError);
            } else if (!updateData || updateData.length === 0) {
                console.error(`Failed ID ${item.id}: Zero rows updated.`);
            } else {
                console.log(`Successfully embedded and updated ID ${item.id}`);
            }
        } catch (err) {
            console.error(`Error on ID ${item.id}:`, err);
        }
    }
    console.log("Batch processing completed!");
}

runBatch();
