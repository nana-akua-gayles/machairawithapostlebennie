/**
 * PERMANENT REGRESSION SUITE for formatDevotionalHtml.js's extractOpeningScripture
 * and related preamble-stripping logic.
 *
 * Purpose: any time a fix is made to the parser, run this file FIRST against
 * the target module. It must show zero unexpected regressions on the KNOWN
 * GOOD samples, and should move flagged BUGS from their current (wrong)
 * state toward "found" / "found-unquoted" with correct text.
 *
 * USAGE:
 *   node regression-suite.js ./src/features/home/formatDevotionalHtml.js
 */

const path = require('path');

const targetPath = process.argv[2];
if (!targetPath) {
  console.error('Usage: node regression-suite.js <path-to-formatDevotionalHtml.js>');
  process.exit(1);
}

const mod = require(path.resolve(targetPath));
const {
  stripPreamble, decodeEntities, stripLeadingCss, fixMissingSentenceSpaces,
  fixGluedWords, fixWordGluedToDigit, fixDigitOrParenGluedToCapital,
  fixAllCapsGlue, stripShortcodes, stripEmptyTags, extractOpeningScripture,
  processDevotionalHtml,
} = mod;

function process_(raw, title) {
  let content = stripLeadingCss(raw.trim());
  content = decodeEntities(content);
  content = fixMissingSentenceSpaces(content);
  content = fixGluedWords(content);
  content = fixWordGluedToDigit(content);
  content = fixDigitOrParenGluedToCapital(content);
  content = fixAllCapsGlue(content);
  content = stripShortcodes(content);
  const stripped = stripPreamble(content, { title });
  const cleaned = stripEmptyTags(stripped.content);
  return extractOpeningScripture(cleaned);
}

const SAMPLES = [
  // ===================== KNOWN GOOD — must never regress =====================
  {
    id: 'good-1-normal-quoted-verse',
    knownGood: true,
    title: 'STAY LONG WITH GOD - BE IMMERSED IN THE SPIRIT 6',
    raw: `CHRIST COMMONWEALTH-COMMUNITY The Love-Life Agency <a href="x.pdf" download="x.pdf"> </a> Thursday, 11th January, 2024STAY LONG WITH GOD - BE IMMERSED IN THE SPIRIT 6"Now at this time Jesus went off to the mountain to pray, and He spent the whole night in prayer to God." Luke 6:12 (Amplified) Have you given attention to the beauty of Jesus' ministry?`,
    expectedStatus: 'found',
    expectedRefContains: 'Luke 6:12',
    note: 'Baseline: clean quoted verse, no glue issues, no author-before-date.',
  },
  {
    id: 'good-2-curly-quotes',
    knownGood: true,
    title: 'PRODUCE KINGDOM RESULTS 7',
    raw: `CHRIST COMMONWEALTH-COMMUNITY The Love-Life Agency <a role="button"> </a> Author Tuesday, 14th January, 2025 PRODUCE KINGDOM RESULTS 7 \u201cSo you must remain in life-union with me, for I remain in life-union with you.\u201d John 15:4 (TPT) God doesn't essentially place demands on His people.`,
    expectedStatus: 'found',
    expectedRefContains: 'John 15:4',
    note: 'Curly quotes, normal Author-before-title (not before date) placement.',
  },
  {
    id: 'good-3-bare-ref-no-quotes-early',
    knownGood: true,
    title: 'SIMPLE TEST',
    raw: `CHRIST COMMONWEALTH-COMMUNITY The Love-Life Agency <a role="button"> </a> Monday, 1st January, 2025 SIMPLE TEST For God so loved the world that He gave His only Son. John 3:16 (KJV) This is the most famous verse in the Bible.`,
    expectedStatus: 'found-unquoted',
    expectedRefContains: 'John 3:16',
    expectedTextContains: 'For God so loved the world',
    note: 'Original 220-char bare-reference-no-quote case. Must still work if thresholds change.',
  },
  {
    id: 'good-4-contraction-not-false-quote',
    knownGood: true,
    title: "GOD'S FAITHFULNESS",
    raw: `CHRIST COMMONWEALTH-COMMUNITY The Love-Life Agency <a role="button"> </a> Author Monday, 1st January, 2025 GOD'S FAITHFULNESS It's always good to remember that "The steadfast love of the LORD never ceases; his mercies never come to an end" Lamentations 3:22 (ESV) This is foundational.`,
    expectedStatus: 'found',
    expectedRefContains: 'Lamentations 3:22',
    note: "Contraction (It's) near start must not be mistaken for an opening quote.",
  },
  {
    id: 'good-5-long-intro-later-unrelated-quote',
    knownGood: true,
    title: 'RISK TEST',
    raw: `CHRIST COMMONWEALTH-COMMUNITY The Love-Life Agency <a role="button"> </a> Author Monday, 1st January, 2025 RISK TEST This is a very long introductory paragraph that goes on for quite a while discussing many unrelated topics before ever reaching anything resembling a scripture reference at all, deliberately written to be long. It just keeps going and going without any reference in sight for a good while longer than normal. Eventually far later in the piece we might mention "something in quotes" without a real reference nearby at all.`,
    expectedStatus: 'ambiguous-unclosed-quote',
    note: 'Must NOT wrongly grab the long intro as key verse text just because a later unrelated quote exists.',
  },

  // ===================== KNOWN BUGS — fix targets =====================
  {
    id: 'bug-48287-author-before-date',
    knownGood: false,
    title: 'CAN GOD COUNT ON YOU?',
    raw: `CHRIST COMMONWEALTH-COMMUNITY The Love-Life Agency <a role="button"> Download PDF </a> Living a life beyond your needs or personal interest is the beginning of greatness. The steps you are willing to take today shows whether you will do valiantly or not. Shalom! Apostle Bennie Author Saturday, 15th August, 2026CAN GOD COUNT ON YOU?Moreover, because I have set my affection on the house of my God, I have given to the house of my God, over and above all that I have prepared for the holy house, my own special treasure of gold and silver: 1 Chronicles 29:3 (NKJV) A United Nations publication of 1998 "Economic and Social Consequences of Drug Abuse and Illicit drugs states that a total estimation of $400 billion is spent on illicit drugs per annum in the world.`,
    expectedStatus: 'found-unquoted',
    expectedRefContains: '1 Chronicles 29:3',
    expectedTextContains: 'Moreover, because I have set my affection',
    expectedTextNotContains: 'Living a life beyond',
    note: 'Author-name+"Author" before date; leftover intro must be trimmed from verse text, not just the preamble.',
  },
  {
    id: 'bug-36288-author-before-date-2',
    knownGood: false,
    title: 'PRODUCE KINGDOM RESULTS 7 \u2014 Remain In Life-Union with the LORD',
    raw: `CHRIST COMMONWEALTH-COMMUNITY The Love-Life Agency <a role="button"> </a> The things which seem common will be used by the Lord to achieve great uncommon results. Beloved, allow the Lord through His word to bless the world with His best wine in you. Yours is to walk in the obedience of His word. Hallelujah! Author Tuesday, 14th January, 2025 PRODUCE KINGDOM RESULTS 7 \u2014 Remain In Life-Union with the LORD\u201cSo you must remain in life-union with me, for I remain in life-union with you. For as a branch severed from the vine will not bear fruit, so your life will be fruitless unless you live your life intimately joined to mine" John 15:4 (TPT)God doesn't essentially place demands on His people.`,
    expectedStatus: 'found',
    expectedRefContains: 'John 15:4',
    expectedTextContains: 'So you must remain in life-union',
    expectedTextNotContains: 'The things which seem common',
    note: 'Same author-before-date splicing, but this one HAS proper quote marks -- should resolve via the quoted path, not bare path.',
  },
  {
    id: 'bug-42712-no-quotes-in-source',
    knownGood: false,
    title: 'THE LIBERATING POWER OF READING THE WORD',
    raw: `CHRIST COMMONWEALTH-COMMUNITY The Love-Life Agency <a role="button"> </a> Dependence on God is not a sign of weakness. Dependence on God is a quality of wisdom and humility. Don't confront any assignment or task or life situation by your strength. Deploy the tools of God. Shalom! Author Monday, 1st September, 2025 THE LIBERATING POWER OF READING THE WORDDuring the first year of his reign, I, Daniel, learned from reading the word of the LORD, as revealed to Jeremiah the prophet, that Jerusalem must lie desolate for seventy years Daniel 9:2 (NIV)God created the world by speaking words.`,
    expectedStatus: 'found-unquoted',
    expectedRefContains: 'Daniel 9:2',
    expectedTextContains: 'During the first year of his reign',
    expectedTextNotContains: 'Dependence on God is not a sign',
    note: 'Source has NO quote marks around the verse at all -- must go through bare path with correct trim.',
  },
  {
    id: 'bug-34814-digit-glued-to-quote',
    knownGood: false,
    title: "HEARING GOD'S VOICE 4 \u2013 Does God Speak Today? 1",
    raw: `CHRIST COMMONWEALTH-COMMUNITY The Love-Life Agency <a role="button"> </a> Beloved, you are made complete in Christ. Selah. Author Sunday, 27th October, 2024 HEARING GOD'S VOICE 4 \u2013 Does God Speak Today? 1"I will hear what God the LORD will speak, For He will speak peace To His people and to His saints; But let them not turn back to folly" Psalm 85:8 (NKJV)Three questions have been answered in this discussion so far.`,
    expectedStatus: 'found',
    expectedRefContains: 'Psalm 85:8',
    expectedTextContains: 'I will hear what God the LORD will speak',
    expectedTextNotContains: '1"I will hear',
    note: 'Title-ending digit glued directly to opening quote mark ( 1"I ). Must strip the stray "1" from captured text.',
  },
  {
    id: 'bug-29863-html-attribute-quotes',
    knownGood: false,
    title: 'SHOD YOUR FEET WITH THE PREPARATION OF THE GOSPEL 1',
    raw: `CHRIST COMMONWEALTH-COMMUNITY The Love-Life Agency <a role="button"> </a> Tuesday 23rd, April 2024 SHOD YOUR FEET WITH THE PREPARATION OF THE GOSPEL 1It's been an exciting journey of <a style="color: #ff0000;" href="https://www.youtube.com/watch?v=69NS5kfPaVc">growing in the knowledge of Christ</a> through this Treasure chest \u2014 with .Today we get back to studying the armor of God. In case you are now joining the discussion on the armor of God, you can read previous rich verities from here. (<a style="color: #ff0000;" href="https://christcommonwealth.org/commonwealthlive/category/christian-character-and-living/armor-of-god/">Just a click and you are opened to a world of deep revelations</a>).Now let's get into today's discussion."And your feet shod with the preparation of the gospel of peace" Ephesians 6:15To have this verse start with an end means something was being discussed before what we have here.`,
    expectedStatus: 'found',
    expectedRefContains: 'Ephesians 6:15',
    expectedTextContains: 'And your feet shod with the preparation',
    note: 'HTML attribute quotes (style="...", href="...") were being picked up as false quote candidates.',
  },
  {
    id: 'bug-39050-underscore-preamble',
    knownGood: false,
    title: 'LEAD YOUR SPHERE 1',
    raw: `CHRIST COMMONWEALTH-COMMUNITY The Love-Life Agency <a role="button"> </a> HURRAAAAY! BLESSED NEW MONTH. _________________________________________________________________ Maybe you are looking forward to what to do specifically this month. Author Thursday, 1st May, 2025LEAD YOUR SPHERE 1"But we will not boast beyond our measure, but within the measure of the area of influence which God apportioned to us as a measure, to reach even as far as you." 2 Corinthians 10:13 (Legacy Standard Bible)There are many people who assume they are not called to lead.`,
    expectedStatus: 'found',
    expectedRefContains: '2 Corinthians 10:13',
    expectedTextContains: 'But we will not boast beyond our measure',
    expectedTextNotContains: '1"But we will not',
    note: 'Same digit-glued-to-quote pattern as 34814, plus an underscore-line preamble before the date.',
  },

  // ===================== OPEN / UNRESOLVED — do not remove, needs a real fix =====================
  {
    id: 'open-nested-identical-quote-marks',
    knownGood: false,
    title: 'DO NOT BE DECEIVED',
    raw: `CHRIST COMMONWEALTH-COMMUNITY The Love-Life Agency <a role="button"> </a> Beloved, this is a fruitful week for you. Step out with that conviction and bear fruits unto Christ. Shalom Aleichem! Author Wednesday, 25th September, 2024 DO NOT BE DECEIVED\u201cDo not be deceived: \u201cBad company corrupts good morals.\u201d 1 Corinthians 15:33 (NASB) Friendship is not evil nor wrong. Friendship can help you in many ways as you journey into greatness.`,
    expectedStatus: 'found',
    expectedRefContains: '1 Corinthians 15:33',
    expectedTextContains: 'Do not be deceived',
    expectedTextNotContains: '":"',
    note: 'STATUS: OPEN, UNRESOLVED as of the session that discovered it. Source uses the SAME curly-quote character for both an outer quote and a nested inner quote ("Do not be deceived: "Bad company..."""), instead of proper outer/inner quote-mark distinction. Current pairing logic grabs the inner close instead of the outer one, producing near-empty captured text. A prior attempted fix (changing the quoteStart offset formula) caused regressions on 3 other passing cases and was reverted -- any future fix MUST be verified against the full suite before being trusted, and should not touch the quoteStart base formula, which is correct for the non-nested case.',
  },
  {
    id: 'open-adjacent-anchor-links-torn-apart',
    knownGood: false,
    title: 'HEARING GOD\u2019S VOICE 4',
    raw: `CHRIST COMMONWEALTH-COMMUNITY The Love-Life Agency <a role="button"> </a> Beloved. Author Sunday, 27th October, 2024 HEARING GOD'S VOICE 4\u201cI will hear\u201d Psalm 85:8 (NKJV)Three questions have been answered in this discussion so far:<a style="color: #ff0000;" href="https://withapostlebennie.org/episode-639-hearing-gods-voice-1/">1. Does God speak?</a> <a style="color: #ff0000;" href="https://withapostlebennie.org/episode-640-hearing-gods-voice-2/">2. Does He speak to everyone?</a><a style="color: #ff0000;" href="https://withapostlebennie.org/episode-641-hearing-gods-voice-3-why-god-speaks-to-you/">3. What are the intentions of God's speaking?</a>If God speaks then His voice is not a mere human hypothesis.`,
    checkFullOutput: true,
    expectedLinkCount: 3,
    expectedCloseTagCount: 3,
    expectNoTornAnchors: true,
    expectedOutputNotContains: '@@SCRIPT',
    note: 'STATUS: OPEN, UNRESOLVED. Numbered links like "1. Does God speak?" glued directly to the next <a> tag get torn apart by sentence-splitting (a period inside the link text is treated as a sentence boundary), producing orphaned/broken <a></a> fragments. A prior attempt (protecting <a>...</a> as an unbreakable token, same technique as scripture-quote spans) fixed THIS case but caused a WORSE regression on other real episodes: the @@SCRIPT placeholder token itself leaked into final output, sometimes split mid-token across two <p> tags, on episodes containing BOTH multiple anchor tags AND multiple scripture quotes together. That attempt was reverted. Any future fix must be tested against this full-output multi-paragraph scenario (not just an isolated single-fragment test), and must run processDevotionalHtml() end-to-end, not just groupSentenceChunks() alone, before being trusted.',
  },
  {
    id: 'open-multi-anchor-multi-quote-token-leak-regression-guard',
    knownGood: false,
    title: 'HEARING GOD\u2019S VOICE 3 \u2013 Why God Speaks to You',
    raw: `CHRIST COMMONWEALTH-COMMUNITY The Love-Life Agency <a role="button"> </a> No matter how genuine you are. Selah! Author Friday, 25th October, 2024 HEARING GOD'S VOICE 3 \u2013 Why God Speaks to You"I will hear what God the LORD will speak, For He will speak peace To His people and to His saints; But let them not turn back to folly" Psalm 85:8 (NKJV)There is much more evidence in the scriptures that God speaks. <a style="color: #ff0000;" href="https://withapostlebennie.org/episode-640-hearing-gods-voice-2/">And yesterday's episode establishes that as well</a>.<a style="color: #ff0000;" href="https://withapostlebennie.org/episode-639-hearing-gods-voice-1/">We have also seen that God speaks to everyone (both unbelievers and believers)</a>.There are several examples of God speaking to both believers and unbelievers in the scriptures.Even from the example of Saul's conversion in Acts 9, you will notice God speaking or sending a message to Saul (who was not just an unbeliever, but one who was breathing out threatenings and slaughter at the time, see Acts 9:1-5; 1 Timothy 1:15) and also to Ananias (who was a believer and a leader)."And there was a certain disciple at Damascus, named Ananias; and to him said the Lord in a vision, Ananias." Acts 9:10-11 (KJV)Though God speaks to everyone, it doesn't mean He chit-chats.`,
    checkFullOutput: true,
    expectedOutputNotContains: '@@SCRIPT',
    note: 'REGRESSION GUARD -- this is the exact real episode that broke when the anchor-protection fix above was first attempted. Must ALWAYS pass (never leak the internal @@SCRIPT token) even while open-adjacent-anchor-links-torn-apart above remains unfixed. Any fix for that case must keep this one passing too -- this is what "test the fix against everything, not just the one sample you are fixing" means in practice.',
  },
];

// ===================== RUNNER =====================

let pass = 0, fail = 0, regressions = 0;

console.log(`Running regression suite against: ${targetPath}\n`);
console.log('='.repeat(100));

SAMPLES.forEach((sample) => {
  if (sample.checkFullOutput) {
    let fullOutput;
    try {
      fullOutput = processDevotionalHtml(sample.raw, { title: sample.title, includeFooter: true });
    } catch (err) {
      fullOutput = 'THREW: ' + err.message;
    }

    let ok = true;
    const problems = [];

    if (sample.expectedOutputNotContains && fullOutput.includes(sample.expectedOutputNotContains)) {
      ok = false;
      problems.push(`output must NOT contain "${sample.expectedOutputNotContains}" but does`);
    }
    if (typeof sample.expectedLinkCount === 'number') {
      const linkCount = (fullOutput.match(/<a\b/gi) || []).length;
      if (linkCount !== sample.expectedLinkCount) {
        ok = false;
        problems.push(`link count: expected ${sample.expectedLinkCount}, got ${linkCount}`);
      }
    }
    if (typeof sample.expectedCloseTagCount === 'number') {
      const closeCount = (fullOutput.match(/<\/a>/gi) || []).length;
      if (closeCount !== sample.expectedCloseTagCount) {
        ok = false;
        problems.push(`close tag count: expected ${sample.expectedCloseTagCount}, got ${closeCount}`);
      }
    }
    if (sample.expectNoTornAnchors) {
      // A torn anchor is an <a ...> that does NOT have its matching </a>
      // within the same <p>...</p> (or other single block) -- i.e. the
      // tag was split across a paragraph boundary. Check by scanning
      // each <p>...</p> block independently and confirming open/close
      // counts match within that block.
      const blocks = fullOutput.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
      let hasTornAnchor = false;
      blocks.forEach((block) => {
        const opens = (block.match(/<a\b/gi) || []).length;
        const closes = (block.match(/<\/a>/gi) || []).length;
        if (opens !== closes) hasTornAnchor = true;
      });
      if (hasTornAnchor) {
        ok = false;
        problems.push('a <p> block contains an unmatched <a>/</a> -- an anchor tag was torn across paragraph boundaries');
      }
    }

    const tag = sample.knownGood ? '[KNOWN GOOD]' : '[BUG TARGET]';
    if (ok) {
      pass++;
      console.log(`PASS ${tag} ${sample.id}`);
    } else {
      fail++;
      if (sample.knownGood) regressions++;
      console.log(`${sample.knownGood ? 'REGRESSION!!' : 'still broken'} ${tag} ${sample.id}`);
      console.log(`    note: ${sample.note}`);
      problems.forEach((p) => console.log(`    - ${p}`));
      console.log(`    full output (first 300 chars): ${JSON.stringify(fullOutput.slice(0, 300))}`);
    }
    console.log('');
    return;
  }

  let result;
  try {
    result = process_(sample.raw, sample.title);
  } catch (err) {
    result = { status: 'THREW: ' + err.message, keyVerseRef: null, keyVerseText: null };
  }

  const text = result.keyVerseText || '';
  const ref = result.keyVerseRef || '';

  let ok = true;
  const problems = [];

  if (sample.expectedStatus && result.status !== sample.expectedStatus) {
    ok = false;
    problems.push(`status: expected "${sample.expectedStatus}", got "${result.status}"`);
  }
  if (sample.expectedRefContains && !ref.includes(sample.expectedRefContains)) {
    ok = false;
    problems.push(`ref: expected to contain "${sample.expectedRefContains}", got "${ref}"`);
  }
  if (sample.expectedTextContains && !text.includes(sample.expectedTextContains)) {
    ok = false;
    problems.push(`text: expected to contain "${sample.expectedTextContains}"`);
  }
  if (sample.expectedTextNotContains && text.includes(sample.expectedTextNotContains)) {
    ok = false;
    problems.push(`text: must NOT contain "${sample.expectedTextNotContains}" but does`);
  }

  const tag = sample.knownGood ? '[KNOWN GOOD]' : '[BUG TARGET]';
  if (ok) {
    pass++;
    console.log(`PASS ${tag} ${sample.id}`);
  } else {
    fail++;
    if (sample.knownGood) regressions++;
    console.log(`${sample.knownGood ? 'REGRESSION!!' : 'still broken'} ${tag} ${sample.id}`);
    console.log(`    note: ${sample.note}`);
    problems.forEach((p) => console.log(`    - ${p}`));
    console.log(`    actual status: ${result.status} | ref: ${ref} | text: ${JSON.stringify(text.slice(0, 100))}`);
  }
  console.log('');
});

console.log('='.repeat(100));
console.log(`\n${pass} passed, ${fail} failed (${regressions} of those are REGRESSIONS on known-good samples).\n`);

if (regressions > 0) {
  console.log('STOP: known-good samples regressed. Do NOT apply this version to production.');
  process.exit(1);
} else if (fail > 0) {
  console.log('Some bug targets still not fixed, but no regressions. Safe to apply if you accept partial progress.');
} else {
  console.log('All samples pass, including all known bug targets. Still run the full batch-test-devotionals.mjs against real Supabase data before trusting this completely.');
}
