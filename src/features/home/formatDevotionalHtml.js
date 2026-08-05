const ENTITY_MAP = {
  '&#8211;': '\u2013', '&#8212;': '\u2014', '&#8216;': '\u2018', '&#8217;': '\u2019',
  '&#8220;': '\u201c', '&#8221;': '\u201d', '&nbsp;': ' ', '&amp;': '&', '&#8230;': '\u2026',
};

function decodeEntities(str) {
  if (!str) return '';
  const decoded = Object.entries(ENTITY_MAP).reduce(
    (acc, [entity, char]) => acc.split(entity).join(char),
    str
  );
 
  return decoded.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '');
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collapseWhitespace(str) {
  return (str || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function stripTags(str) {
  return (str || '').replace(/<[^>]+>/g, '');
}


function fuzzyFind(haystack, needle) {
  if (!needle) return null;
  const pattern = escapeRegExp(needle.trim())
    .replace(/\s+/g, '\\s+')
    .replace(/['\u2018\u2019]/g, "['\u2018\u2019]")
    .replace(/["\u201c\u201d]/g, '["\u201c\u201d]');
  const match = haystack.match(new RegExp(pattern, 'i'));
  return match ? { index: match.index, length: match[0].length } : null;
}


function isStructured(content) {
  return /^\s*<(h3|h4|p|div)[\s>]/i.test(content);
}


const BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
  '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job',
  'Psalms?', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Song of Songs',
  'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel',
  'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah',
  'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John',
  'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
  'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians',
  '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon',
  'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Jude', 'Revelation',
];

const BOOK_PATTERN = BOOKS
  .slice()
  .sort((a, b) => b.length - a.length)
  .map((b) => b.replace(/\s+/g, '\\s+'))
  .join('|');

const SCRIPTURE_REF = new RegExp(
  `((?:${BOOK_PATTERN})\\s+\\d{1,3}(?::\\d{1,3}(?:[\\u2010\\u2013\\u2014-]\\d{1,3})?)?(?:\\s*\\([^)]{1,40}\\))?\\.?)`,
  'i'
);

function findScriptureReference(text) {
  const match = text.match(SCRIPTURE_REF);
  if (!match) return null;
  return {
    ref: match[1].trim().replace(/\.$/, ''),
    index: match.index,
    length: match[0].length,
  };
}

const QUOTE_CHARS = new Set(['"', "'", '\u201c', '\u201d', '\u2018', '\u2019']);
const CONTRACTION_TAILS = /^(s|t|re|ve|ll|d|m)(?![A-Za-z])/i;


function isWordInternalApostrophe(text, i) {
  const prev = text[i - 1];
  if (!prev || !/[A-Za-z]/.test(prev)) return false;
  return CONTRACTION_TAILS.test(text.slice(i + 1));
}

function matchCapsTitleRun(text) {
  let pos = 0;
  let lastGoodEnd = 0;

  while (pos < text.length) {
    let start = pos;
    while (start < text.length && /\s/.test(text[start])) start++;
    if (start >= text.length) break;

    if (text[start] === '(') {
      const closeIdx = text.indexOf(')', start);
      if (closeIdx === -1) break;
      pos = closeIdx + 1;
      lastGoodEnd = pos;
      continue;
    }

    let end = start;
    while (end < text.length) {
      const ch = text[end];
      if (/\s/.test(ch)) break;
      if (QUOTE_CHARS.has(ch) && !isWordInternalApostrophe(text, end)) break;
      end++;
    }
    if (end === start) break;

    const token = text.slice(start, end);
    const core = token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
    const hasLetters = /[A-Za-z]/.test(core);
    const isAllCaps = hasLetters && core === core.toUpperCase();
    const isNumericOrPunctOnly = core.length > 0 && !hasLetters;

    if (core.length === 0) {
      const isConnectorOnly = /^[\s\-\u2010\u2011\u2012\u2013\u2014:;,.\u2026]+$/.test(token);
      if (isConnectorOnly) {
        pos = end;
        lastGoodEnd = pos;
        continue;
      }
      break;
    }

    if (isAllCaps || isNumericOrPunctOnly) {
      pos = end;
      lastGoodEnd = pos;
      continue;
    }
    break;
  }

  return lastGoodEnd;
}


const JUNK_TEXT_PATTERNS = [
  /CHRIST\s+COMMONWEALTH[\-\s]+COMMUNITY/gi,
  /The\s+Love[\-\s]+Life\s+Agency/gi,
  /Download\s+PDF/gi,
  /\(Pronounced\s*makh['\u2019]-ahee-rah\)\s*Daily\s*revelatory\s*thoughts\s*to\s*sharpen\s*you\s*and\s*to\s*help\s*you\s*grow\s*in\s*deep\s*spiritual\s*understanding\s*and\s*knowledge\.?\s*Daily\s*Christ-centered\s*and\s*apostolic-prophetic\s*prayers\.?/gi,
  /\bBy\b(?=\s*(<a[^>]*>[\s\S]*?<\/a>\s*)?\(Pronounced)/g,
];


const ANCHOR_SEARCH_WINDOW = 500;


function stripStructuredPreamble(content) {
  let result = content.trim();
  const LEADING_BLOCK = /^\s*<(h3|p)([^>]*)>([\s\S]*?)<\/\1>\s*/i;

  while (true) {
    const match = result.match(LEADING_BLOCK);
    if (!match) break;

    const [full, tag, attrs, inner] = match;
    const innerText = stripTags(inner).trim();
    const hasDownloadLink = /download/i.test(attrs) || /<a[^>]*download/i.test(inner);
    const isDateStyle = /text-align:\s*right/i.test(attrs);
    const isEmptyish = innerText.length === 0;

    if (tag.toLowerCase() === 'h3' || hasDownloadLink || isDateStyle || isEmptyish) {
      result = result.slice(full.length);
      continue;
    }
    break; 
  }

  return { content: result.trim(), titleConfidence: 'n/a-structural', droppedHead: null };
}


function stripFlatPreamble(content, { title } = {}) {
  let result = content;

  JUNK_TEXT_PATTERNS.forEach((re) => {
    result = result.replace(re, '');
  });
  result = result.replace(/<a[^>]*role=["']button["'][^>]*>\s*<\/a>/gi, '');
  result = result.replace(/<a[^>]*download[^>]*>[\s\S]*?<\/a>/gi, '');
  result = result.replace(/<a[^>]*>\s*<\/a>/gi, '');


  const searchZone = result.slice(0, ANCHOR_SEARCH_WINDOW);
  const dateMatch = searchZone.match(
    /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*\d{1,2}(st|nd|rd|th)?\s*[A-Za-z]+,?\s*\d{4}/
  );
  const authorMatch = !dateMatch
    ? searchZone.match(/(?<!\bthe\s)(?<!\ban\s)(?<!\bour\s)(?<!\byour\s)(?<!\bhis\s)(?<!\bher\s)(?<!\bmy\s)\bAuthor\b[\s\u00A0]+/i)
    : null;
  const anchorMatch = dateMatch || authorMatch;

  if (!anchorMatch) {

    const capsEnd = matchCapsTitleRun(result);

    let droppedHead = '';
    if (capsEnd > 0) {
      droppedHead = result.slice(0, capsEnd);
      result = result.slice(capsEnd);
    } else if (title) {
      const found = fuzzyFind(result, title);
      if (found) {
        droppedHead = result.slice(0, found.index + found.length);
        result = result.slice(found.index + found.length);
      }
    }

    return finalizeFlatResult(result, title, droppedHead);
  }


  let before = result.slice(0, anchorMatch.index);
  const afterAnchor = result.slice(anchorMatch.index + anchorMatch[0].length);


  if (dateMatch) {
    const authorInBefore = before.match(
      /(?<!\bthe\s)(?<!\ban\s)(?<!\bour\s)(?<!\byour\s)(?<!\bhis\s)(?<!\bher\s)(?<!\bmy\s)\bAuthor\b[\s\u00A0]+/i
    );
    if (authorInBefore) {
      before =
        before.slice(0, authorInBefore.index) +
        before.slice(authorInBefore.index + authorInBefore[0].length);
    }
  }


  const capsEnd = matchCapsTitleRun(afterAnchor);

  let titleSpan = '';
  let afterTitle = afterAnchor;
  if (capsEnd > 0) {
    titleSpan = afterAnchor.slice(0, capsEnd);
    afterTitle = afterAnchor.slice(capsEnd);
  } else if (title) {
    const found = fuzzyFind(afterAnchor, title);
    if (found) {
      titleSpan = afterAnchor.slice(0, found.index + found.length);
      afterTitle = afterAnchor.slice(found.index + found.length);
    }
  }

  const droppedHead = collapseWhitespace(`${anchorMatch[0]} ${titleSpan}`);
  const beforeTrimmed = before.trim();
  const spliced = beforeTrimmed ? `${beforeTrimmed} ${afterTitle.trim()}` : afterTitle.trim();

  return finalizeFlatResult(spliced, title, droppedHead);
}

function finalizeFlatResult(content, title, droppedHead) {

  if (title) {
    const searchZone = content.slice(0, 400);
    const found = fuzzyFind(searchZone, title);
    if (found) {
      const before = content.slice(0, found.index).trim();
      const after = content.slice(found.index + found.length).trim();
      content = before ? `${before} ${after}` : after;
      droppedHead = collapseWhitespace(`${droppedHead} ${title}`);
    }
  }

  let titleConfidence = 'unknown';
  if (title) {
    const normalizeQuotes = (s) => s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');
    const normalizedTitle = normalizeQuotes(collapseWhitespace(title).toLowerCase());
    const normalizedDropped = normalizeQuotes(collapseWhitespace(droppedHead).toLowerCase());
    titleConfidence = normalizedDropped.includes(normalizedTitle) ? 'high' : 'low';
  }
  return { content: content.trim(), titleConfidence, droppedHead: collapseWhitespace(droppedHead) };
}

function stripEpisodePrefix(title) {
  if (!title) return title;
  return title.replace(/^\s*episode\s*\d+\s*[-:\u2013\u2014]\s*/i, '').trim();
}

function stripPreamble(content, { title } = {}) {
  const matchTitle = stripEpisodePrefix(title);
  return isStructured(content)
    ? stripStructuredPreamble(content)
    : stripFlatPreamble(content, { title: matchTitle });
}


function stripEmptyTags(content) {
  let prev;
  let result = content;
  do {
    prev = result;
    result = result
      .replace(/<(h3|h4|p|em|strong|span|div)[^>]*>(\s|<br\s*\/?>|&nbsp;)*<\/\1>/gi, '')
      .replace(/<a(?![^>]*download)[^>]*>\s*<\/a>/gi, '');
  } while (result !== prev);
  return result;
}


function extractOpeningScripture(content) {
  const h4Match = content.match(/^\s*<h4[^>]*>([\s\S]*?)<\/h4>\s*/i);

  if (h4Match) {
    const innerText = collapseWhitespace(stripTags(h4Match[1]));
    const found = findScriptureReference(innerText);

    if (found) {
      const quoteText = innerText
        .slice(0, found.index)
        .trim()
        .replace(/^[\u201c"]+|[\u201d"]+$/g, '')
        .trim();
      return {
        keyVerseText: quoteText,
        keyVerseRef: found.ref,
        status: 'found',
        leading: '',
        rest: content.slice(h4Match[0].length).trim(),
      };
    }

    const rest = content.slice(h4Match[0].length);
    const nextMatch = rest.match(/^\s*<p[^>]*>([\s\S]*?)<\/p>\s*/i);
    if (nextMatch) {
      const nextText = collapseWhitespace(stripTags(nextMatch[1]));
      const nextFound = findScriptureReference(nextText);
      if (nextFound && nextText.length < 60) {
        const quoteText = innerText.replace(/^[\u201c"]+|[\u201d"]+$/g, '').trim();
        return {
          keyVerseText: quoteText,
          keyVerseRef: nextFound.ref,
          status: 'found',
          leading: '',
          rest: rest.slice(nextMatch[0].length).trim(),
        };
      }
    }

    return { keyVerseText: null, keyVerseRef: null, status: 'ambiguous-h4-no-ref', leading: '', rest: content };
  }

  const SEARCH_WINDOW = 800;
  const window = content.slice(0, SEARCH_WINDOW);
  const openMatch = window.match(/(^|\s)(["'\u201c\u2018\u201d])/);
  const quoteStart = openMatch ? openMatch.index + openMatch[1].length : -1;

  if (quoteStart !== -1) {
    const leading = content.slice(0, quoteStart).trim();
    const afterQuote = window.slice(quoteStart + 1);


    const closeRe = /["'\u2018\u201c\u201d\u2019]/g;
    let closeMatch;
    let found = null;
    let usedCloseIdx = -1;
    while ((closeMatch = closeRe.exec(afterQuote))) {
      const idx = closeMatch.index;
      const candidate = findScriptureReference(afterQuote.slice(idx + 1));
      if (candidate && candidate.index <= 40) {
        found = candidate;
        usedCloseIdx = idx;
        break;
      }
    }

    if (found) {
      const quoteText = afterQuote.slice(0, usedCloseIdx).trim();
      const consumedLength = quoteStart + 1 + usedCloseIdx + 1 + found.index + found.length;
      return {
        keyVerseText: quoteText,
        keyVerseRef: found.ref,
        status: 'found',
        leading,
        rest: content.slice(consumedLength).trim(),
      };
    }
    return { keyVerseText: null, keyVerseRef: null, status: 'ambiguous-unclosed-quote', leading: '', rest: content };
  }

  const bareFound = findScriptureReference(window);
  if (bareFound && bareFound.index <= 220) {
    const quoteText = content.slice(0, bareFound.index).trim();
    return {
      keyVerseText: quoteText,
      keyVerseRef: bareFound.ref,
      status: 'found-unquoted',
      leading: '',
      rest: content.slice(bareFound.index + bareFound.length).trim(),
    };
  }

  return { keyVerseText: null, keyVerseRef: null, status: 'not-found', leading: '', rest: content };
}


const FOOTER_LABELS = ['DIG DEEPER', 'WE PRAY', 'BIBLE READING IN THE YEAR', 'DECLARE THESE WORDS'];


function splitFooter(content) {
  const idx = content.search(/DIG DEEPER/i);
  if (idx === -1) return { body: content, footerHtml: null };

 
  const tagOpenBefore = content.lastIndexOf('<p', idx);
  const cutPoint = tagOpenBefore !== -1 && idx - tagOpenBefore < 50 ? tagOpenBefore : idx;

  const body = content.slice(0, cutPoint).trim();
  const footerRaw = content.slice(idx);
  return { body, footerHtml: buildFooterHtml(footerRaw) };
}

function buildFooterHtml(footerRaw) {
  const withBreaks = footerRaw
    .replace(/<\/(p|blockquote|div)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n');
  const plain = withBreaks
    .replace(/<[^>]+>/g, ' ')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');

  const positions = [];
  FOOTER_LABELS.forEach((label) => {
    const i = plain.search(new RegExp(label, 'i'));
    if (i !== -1) positions.push({ label, index: i });
  });
  positions.sort((a, b) => a.index - b.index);
  positions.push({ label: '__END__', index: plain.length });

  const sliceFor = (label) => {
    const start = positions.find((p) => p.label === label);
    if (!start) return '';
    const end = positions[positions.indexOf(start) + 1];
    return plain
      .slice(start.index + label.length, end.index)
      .replace(/^[:\s\u2013-]+/, '')
      .trim();
  };

  const digDeeper = sliceFor('DIG DEEPER');
  const wePray = sliceFor('WE PRAY');
  const bibleReadingRaw = sliceFor('BIBLE READING IN THE YEAR');
  const declareRaw = sliceFor('DECLARE THESE WORDS');

  const dayMatch = bibleReadingRaw.match(/Day\s*(\d+):?/i);
  const day = dayMatch ? dayMatch[1] : null;
  const passages = bibleReadingRaw
    .replace(/^\s*\d{4}\s*/, '')
    .replace(/Day\s*\d+:?/i, '')
    .replace(/\n/g, ' ')
    .trim();

  const rawLines = declareRaw.split('\n').map((l) => l.trim()).filter(Boolean);
  const lines = rawLines.length > 1
    ? rawLines
    : declareRaw.split(/\s*[\u2013-]\s*/).map((s) => s.trim()).filter(Boolean);

  const closingLineIdx = lines.findIndex((l) => /Hallelujah/i.test(l));
  let closing = null;
  const declarationLines = [];
  lines.forEach((line, idx) => {
    if (idx === closingLineIdx) {
      const hallelujahMatch = line.match(/((?:OH\s+)?Hallelujah[\s\S]*)$/i);
      closing = (hallelujahMatch ? hallelujahMatch[1] : line).trim();
      const cutAt = hallelujahMatch ? hallelujahMatch.index : line.search(/Hallelujah/i);
      const before = line.slice(0, cutAt).replace(/^[\u2013-]\s*/, '').trim();
      if (before) declarationLines.push(before);
    } else {
      declarationLines.push(line.replace(/^[\u2013-]\s*/, '').trim());
    }
  });
  const declarations = declarationLines.filter(Boolean);
  const declareItems = declarations.map((d) => `<li>${d}</li>`).join('');

  return (
    `<div class="footer">` +
    (digDeeper ? `<p><span class="footerLabel">Dig Deeper</span> ${digDeeper}</p>` : '') +
    (wePray ? `<p><span class="footerLabel">We Pray</span> ${wePray}</p>` : '') +
    (passages
      ? `<p><span class="footerLabel">Bible Reading${day ? ` \u2014 Day ${day}` : ''}</span> ${passages}</p>`
      : '') +
    (declareItems ? `<p class="footerLabel">Declare These Words</p><ul>${declareItems}</ul>` : '') +
    (closing ? `<p class="closing">${closing}</p>` : '') +
    `</div>`
  );
}


function convertDashLists(text) {
  const listedDash = convertMarkerRun(
    text,
    /(\S)([\u2013\u2014-])(?=\s)/g,
    (m) => m[1].length,
    (raw) => raw.replace(/^[\u2013\u2014-]\s*/, ''),
    'ul'
  );

  const listedBoth = convertMarkerRun(
    listedDash,
    /\b(\d{1,2})\.\s(?=[A-Z])/g,
    () => 0,
    (raw) => raw.replace(/^\d{1,2}\.\s*/, ''),
    'ol'
  );

  return listedBoth;
}

function convertMarkerRun(text, markerRe, matchOffset, stripMarker, tag) {
  const markers = [];
  let m;
  while ((m = markerRe.exec(text))) {
    markers.push({ start: m.index + matchOffset(m), end: m.index + m[0].length });
  }
  if (markers.length < 2) return text;

  const maxGap = 260;
  const runs = [];
  let current = [markers[0]];
  for (let i = 1; i < markers.length; i++) {
    if (markers[i].start - markers[i - 1].start <= maxGap) {
      current.push(markers[i]);
    } else {
      if (current.length >= 2) runs.push(current);
      current = [markers[i]];
    }
  }
  if (current.length >= 2) runs.push(current);
  if (runs.length === 0) return text;

  let result = text;
  runs.slice().reverse().forEach((run) => {
    const firstMarker = run[0].start;
    const lastMarkerEnd = run[run.length - 1].end;

    const afterLastMarker = result.slice(lastMarkerEnd);
    const endMatch = afterLastMarker.match(/[.!?](?=\s+[A-Z]|\s*$)/);
    const lastItemEnd = endMatch ? lastMarkerEnd + endMatch.index + 1 : result.length;

    const before = result.slice(0, firstMarker);
    const colonIdx = before.lastIndexOf(':');
    const introEnd = colonIdx !== -1 && firstMarker - colonIdx < 150 ? colonIdx + 1 : firstMarker;
    const intro = result.slice(0, introEnd).trim();

    const listBlock = result.slice(introEnd, lastItemEnd);
    const localMarkers = run
      .map((mk) => mk.start - introEnd)
      .filter((idx) => idx >= 0 && idx <= listBlock.length);

    const items = [];
    for (let i = 0; i < localMarkers.length; i++) {
      const start = localMarkers[i];
      const end = i + 1 < localMarkers.length ? localMarkers[i + 1] : listBlock.length;
      const raw = listBlock.slice(start, end).trim();
      const cleaned = stripMarker(raw).trim();
      if (cleaned) items.push(cleaned);
    }

    if (items.length < 2) return;

    const listHtml = `<${tag}>${items.map((i) => `<li>${i}</li>`).join('')}</${tag}>`;
    const after = result.slice(lastItemEnd);
    result = `${intro} ${listHtml}${after}`;
  });

  return result;
}


const PARAGRAPH_TARGET_LENGTH = 260;

function splitBlocks(html) {
  return html
    .split(
      /(<blockquote[\s\S]*?<\/blockquote>|<ul[\s\S]*?<\/ul>|<ol[\s\S]*?<\/ol>|<h3[\s\S]*?<\/h3>|<h4[\s\S]*?<\/h4>|<p[\s\S]*?<\/p>)/gi
    )
    .filter(part => part.trim().length);
}


function paragraphizeText(text) {
  const sentences = text
  .split(/(?<=[.!?])\s+(?=[A-Z"\u201c(<])/)
  .map(s => s.trim())
  .filter(Boolean);

  const paragraphs = [];
  let current = '';

  sentences.forEach(sentence => {
    current = current
      ? `${current} ${sentence}`
      : sentence;

    if (current.length >= PARAGRAPH_TARGET_LENGTH) {
      paragraphs.push(`<p>${current}</p>`);
      current = '';
    }
  });

  if (current) {
    paragraphs.push(`<p>${current}</p>`);
  }

  return paragraphs;
}


function paragraphize(bodyHtml) {
  const parts = splitBlocks(bodyHtml);

  const htmlParts = [];

  parts.forEach(part => {
    const trimmed = part.trim();

    if (/^<(blockquote|ul|ol|h3|h4)/i.test(trimmed)) {
      htmlParts.push(trimmed);
      return;
    }

    if (/^<p/i.test(trimmed)) {
      const text = trimmed
        .replace(/^<p[^>]*>/i, "")
        .replace(/<\/p>$/i, "");

      htmlParts.push(...paragraphizeText(text));
      return;
    }

    htmlParts.push(...paragraphizeText(trimmed));
  });

  return htmlParts.join("");
}

function boldScriptureRefs(text) {
  const refRe = new RegExp(SCRIPTURE_REF.source, 'gi');
  return text.replace(refRe, (match) => `<strong>${match}</strong>`);
}

function renderKeyVerseHtml(keyVerseText, keyVerseRef) {
  if (!keyVerseText) return null;
  return (
    `<blockquote class="keyverse">` +
    `<span class="keyverse-text">\u201c${keyVerseText}\u201d</span>` +
    (keyVerseRef ? `<span class="keyverse-ref">${keyVerseRef}</span>` : '') +
    `</blockquote>`
  );
}

function processDevotionalHtml(rawHtml, { title, includeFooter = true } = {}) {
  if (!rawHtml) return '<p>No content available.</p>';

  let content = decodeEntities(rawHtml.trim());

  const stripped = stripPreamble(content, { title });
  content = stripEmptyTags(stripped.content);
  content = content.replace(
  /:-\s*((?:[\u2013\u2014-]\s*<a[\s\S]*?<\/a>\s*){2,})/gi,
  (_, items) => {
    const lis = items.replace(
      /[\u2013\u2014-]\s*(<a[\s\S]*?<\/a>)/g,
      "<li>$1</li>"
    );
    return ":<ul>" + lis + "</ul>";
  }
);

  const verse = extractOpeningScripture(content);
  const keyVerseHtml = renderKeyVerseHtml(verse.keyVerseText, verse.keyVerseRef);

const bodySource =
    verse.status === 'found' || verse.status === 'found-unquoted'
        ? verse.rest
        : content;

const { body, footerHtml } = splitFooter(bodySource);

const cleanedBody = convertDashLists(
    stripEmptyTags(body)
);

const paragraphedBody = paragraphize(cleanedBody);

  return [keyVerseHtml, paragraphedBody, includeFooter ? footerHtml : null].filter(Boolean).join('');
}

module.exports = {
  // utilities
  decodeEntities,
  escapeRegExp,
  collapseWhitespace,
  stripTags,
  fuzzyFind,
  // format
  isStructured,
  // scripture
  BOOKS,
  SCRIPTURE_REF,
  findScriptureReference,
  // preamble
  stripPreamble,
  stripEmptyTags,
  matchCapsTitleRun,
  stripEpisodePrefix,
  // lists
  convertDashLists,
  // scripture emphasis
  boldScriptureRefs,
  // opening scripture
  extractOpeningScripture,
  // footer
  FOOTER_LABELS,
  splitFooter,
  // paragraphs
  paragraphize,
  // render
  renderKeyVerseHtml,
  // top-level
  processDevotionalHtml,
};