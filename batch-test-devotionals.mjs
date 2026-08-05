/**
 * batch-test-devotionals.mjs
 *
 * Pulls a batch of real rows from Supabase and runs each one through the
 * exact same parsing steps as DevotionalScreen.js (decode entities, cut at
 * DIG DEEPER, strip preamble, extract opening scripture, convert dash
 * lists), then prints a compact report so you can eyeball many entries at
 * once instead of pasting them one at a time.
 *
 * ENV VARS REQUIRED:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (or anon key if RLS allows read access)
 *
 * USAGE:
 *   node batch-test-devotionals.mjs            # tests 20 random rows
 *   node batch-test-devotionals.mjs 50         # tests 50 random rows
 *   node batch-test-devotionals.mjs all        # tests every row in the table
 *
 * Adjust TABLE / COLUMN names below to match your schema if they differ.
 */

import { createClient } from '@supabase/supabase-js';
import {
  decodeEntities,
  stripPreamble,
  extractOpeningScripture,
  convertDashLists,
} from './src/features/home/formatDevotionalHtml.js';

const TABLE = 'devotionals';
const CONTENT_COL = 'content';
const TITLE_COL = 'title'; // falls back to name/episode_title, matching DevotionalScreen.js
const ID_COL = 'id';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function stripHtmlEntities(text) {
  // mirrors the helper already in DevotionalScreen.js
  if (!text) return '';
  return text
    .replace(/<[^>]*>?/gm, '')
    .replace(/&#8211;|&ndash;/g, '-')
    .replace(/&#8212;|&mdash;/g, '\u2014')
    .replace(/&#8216;|&#8217;|&lsquo;|&rsquo;/g, "'")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function processOne(row) {
  const rawContent = decodeEntities(row[CONTENT_COL] || '');
  let title = row[TITLE_COL] || row.name || row.episode_title || '';

  if (!title) {
    const titleMatch = rawContent.match(/<h[34][^>]*>([\s\S]*?)<\/h[34]>/i);
    if (titleMatch) title = titleMatch[1];
  }
  title = stripHtmlEntities(title);

  const digIdx = rawContent.search(/DIG\s*DEEPER/i);
  let cleanBody = digIdx !== -1 ? rawContent.substring(0, digIdx) : rawContent;

  const preamble = stripPreamble(cleanBody, { title });
  const verse = extractOpeningScripture(preamble.content);
  let body = [verse.leading, verse.rest].filter(Boolean).join(' ');
  body = convertDashLists(body);

  return {
    id: row[ID_COL],
    title,
    titleConfidence: preamble.titleConfidence,
    keyVerseRef: verse.keyVerseRef,
    keyVerseTextPreview: (verse.keyVerseText || '').slice(0, 60),
    bodyPreview: body.slice(0, 90),
    // heuristic-only flags to help you scan fast — always eyeball the
    // preview text too, these aren't a substitute for actually reading it
    flags: {
      lowConfidence: preamble.titleConfidence === 'low',
      noVerseFound: !verse.keyVerseText,
      bodyStartsWeird: /^[a-z"'\u201c\u2018\u2019\u201d]/.test(body.trim()) === false && body.trim().length > 0
        ? false
        : body.trim().length === 0,
    },
  };
}

async function run() {
  const arg = process.argv[2];
  let query = supabase.from(TABLE).select('*');

  if (arg === 'all') {
    // no limit
  } else {
    const limit = arg ? parseInt(arg, 10) : 20;
    query = query.limit(limit);
  }

  const { data: rows, error } = await query;
  if (error) throw error;

  console.log(`Testing ${rows.length} row(s) from "${TABLE}"...\n`);

  let flaggedCount = 0;

  rows.forEach((row) => {
    let result;
    try {
      result = processOne(row);
    } catch (err) {
      console.log(`[id=${row[ID_COL]}] ✗ THREW ERROR: ${err.message}`);
      flaggedCount++;
      return;
    }

    const anyFlag = Object.values(result.flags).some(Boolean);
    if (anyFlag) flaggedCount++;

    const marker = anyFlag ? '⚠️ ' : '✓ ';
    console.log(`${marker}[id=${result.id}] "${result.title}"`);
    console.log(`   confidence: ${result.titleConfidence}`);
    console.log(`   verse ref:  ${result.keyVerseRef || '(none found)'}`);
    console.log(`   verse text: ${JSON.stringify(result.keyVerseTextPreview)}`);
    console.log(`   body:       ${JSON.stringify(result.bodyPreview)}`);
    if (anyFlag) {
      const activeFlags = Object.entries(result.flags).filter(([, v]) => v).map(([k]) => k);
      console.log(`   FLAGS: ${activeFlags.join(', ')}`);
    }
    console.log('');
  });

  console.log(`\nDone. ${flaggedCount} of ${rows.length} row(s) flagged for a closer look.`);
  console.log('Flags are heuristic hints only — skim the "body" preview on');
  console.log('flagged rows (and a few unflagged ones) to confirm by eye.');
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
