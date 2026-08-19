/**
 * USAGE:
 *   node batch-test-devotionals.mjs            # tests 20 random rows
 *   node batch-test-devotionals.mjs 50         # tests 50 random rows
 *   node batch-test-devotionals.mjs all        # tests every row in the table
 */

import { createClient } from '@supabase/supabase-js';
import {
  decodeEntities,
  stripPreamble,
  stripEmptyTags,
  extractOpeningScripture,
  convertDashLists,
  stripLeadingCss,
  fixMissingSentenceSpaces,
  fixGluedWords,
  fixWordGluedToQuote,
  fixWordGluedToDigit,
  fixDigitOrParenGluedToCapital,
  fixAllCapsGlue,
  stripShortcodes,
  findScriptureReference,
} from './src/features/home/formatDevotionalHtml.js';

const TABLE = 'devotionals';
const CONTENT_COL = 'content';
const TITLE_COL = 'title'; 
const ID_COL = 'id';

const MIN_VERSE_LENGTH = 15;
const STRAY_QUOTE_RE = /^["'\u2018\u201c\u201d]|["'\u2018\u201c\u201d]$/;

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

// Mirrors the normalization sequence at the top of processDevotionalHtml,
// so this script sees exactly what the app would produce before the
// preamble/verse extraction runs.
function normalizeContent(rawContent) {
  let content = stripLeadingCss((rawContent || '').trim());
  content = decodeEntities(content);
  content = fixMissingSentenceSpaces(content);
  content = fixGluedWords(content);
  content = fixWordGluedToQuote(content);
  content = fixWordGluedToDigit(content);
  content = fixDigitOrParenGluedToCapital(content);
  content = fixAllCapsGlue(content);
  content = stripShortcodes(content);
  return content;
}

const NEARBY_REF_WINDOW = 800;

function hasNearbyScriptureRef(content) {
  return !!findScriptureReference((content || '').slice(0, NEARBY_REF_WINDOW));
}

function isVerseInappropriate(verse, content) {
  const wasFound = verse.status === 'found' || verse.status === 'found-unquoted';
  if (!wasFound) {
    // Extraction failed to pair a quote with a reference. Only flag this
    // if a scripture reference genuinely appears near the start of the
    // body -- otherwise this episode most likely just doesn't open with
    // one, which is a normal, valid shape and not a bug.
    return hasNearbyScriptureRef(content);
  }
  if (!verse.keyVerseRef) return true;
  if (!verse.keyVerseText || verse.keyVerseText.length < MIN_VERSE_LENGTH) return true;
  if (verse.keyVerseText && STRAY_QUOTE_RE.test(verse.keyVerseText)) return true;
  return false;
}

function reasonsFor(verse, content) {
  const reasons = [];
  const wasFound = verse.status === 'found' || verse.status === 'found-unquoted';
  if (!wasFound) {
    reasons.push(`extraction failed but a nearby reference exists (status: ${verse.status})`);
  }
  if (wasFound && !verse.keyVerseRef) reasons.push('missing reference');
  if (wasFound && verse.keyVerseText && verse.keyVerseText.length < MIN_VERSE_LENGTH) {
    reasons.push(`verse text too short (${verse.keyVerseText.length} chars)`);
  }
  if (wasFound && verse.keyVerseText && STRAY_QUOTE_RE.test(verse.keyVerseText)) {
    reasons.push('stray quote character in verse text');
  }
  return reasons;
}

function processOne(row) {
  const normalized = normalizeContent(row[CONTENT_COL] || '');
  let title = row[TITLE_COL] || row.name || row.episode_title || '';

  if (!title) {
    const titleMatch = normalized.match(/<h[34][^>]*>([\s\S]*?)<\/h[34]>/i);
    if (titleMatch) title = titleMatch[1];
  }
  title = stripHtmlEntities(title);

  const digIdx = normalized.search(/DIG\s*DEEPER/i);
  const cleanBody = digIdx !== -1 ? normalized.substring(0, digIdx) : normalized;

  const preamble = stripPreamble(cleanBody, { title });
  const strippedContent = stripEmptyTags(preamble.content);
  const verse = extractOpeningScripture(strippedContent);
  let body = [verse.leading, verse.rest].filter(Boolean).join(' ');
  body = convertDashLists(body);

  return {
    id: row[ID_COL],
    title,
    titleConfidence: preamble.titleConfidence,
    status: verse.status,
    keyVerseRef: verse.keyVerseRef,
    keyVerseText: verse.keyVerseText,
    body,
    flagged: isVerseInappropriate(verse, strippedContent),
    reasons: reasonsFor(verse, strippedContent),
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

  console.log(`Testing ${rows.length} row(s) from "${TABLE}" (showing rows with a missing or inappropriate verse only)...\n`);

  let flaggedCount = 0;

  rows.forEach((row) => {
    let result;
    try {
      result = processOne(row);
    } catch (err) {
      console.log(`[id=${row[ID_COL]}] \u2717 THREW ERROR: ${err.message}\n`);
      flaggedCount++;
      return;
    }

    if (!result.flagged) return; // Skip printing when the verse looks fine

    flaggedCount++;

    console.log(`\u26a0\ufe0f  [id=${result.id}] "${result.title}"`);
    console.log(`    title confidence: ${result.titleConfidence}`);
    console.log(`    extraction status: ${result.status}`);
    console.log(`    verse ref:  ${result.keyVerseRef || '(none found)'}`);
    console.log(`    verse text: ${JSON.stringify(result.keyVerseText || '(none found)')}`);
    console.log(`    reasons:    ${result.reasons.join('; ')}`);
    console.log(`    body:       ${JSON.stringify(result.body.slice(0, 90))}`);
    console.log('');
  });

  console.log(`\nDone. ${flaggedCount} of ${rows.length} row(s) flagged for a missing or inappropriate verse.`);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
