import { useState, useCallback } from 'react';
import { KJV_BOOKS, OFFLINE_TRANSLATION } from './Constants';

const BOLLS_BASE = 'https://bolls.life/get-text';

const readFromKJV = (bookName, chapter) => {
  const bookData = KJV_BOOKS[bookName];

  if (!bookData) {
    throw new Error(`Book "${bookName}" not found in offline KJV data.`);
  }

  const chapterData = bookData.chapters.find(
    (c) => parseInt(c.chapter, 10) === chapter
  );

  if (!chapterData) {
    throw new Error(
      `Chapter ${chapter} not found in "${bookName}" offline KJV data.`
    );
  }

  return chapterData.verses.map((v, index) => ({
    pk:    index + 1,
    verse: parseInt(v.verse, 10),
    text:  v.text,
  }));
};

// ── Online reader ─────────────────────────────────────────────────────────────
const fetchFromBolls = async (version, bookId, chapter) => {
  const res = await fetch(`${BOLLS_BASE}/${version}/${bookId}/${chapter}/`);
  if (!res.ok) throw new Error('Translation text segment unavailable.');
  const json = await res.json();
  if (!Array.isArray(json)) throw new Error('Invalid data received from server.');
  return json;
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useBibleData = (activeVersion) => {
  const [verses,              setVerses]              = useState([]);
  const [loading,             setLoading]             = useState(true);
  const [error,               setError]               = useState(null);
  const [isOffline,           setIsOffline]           = useState(false);
  const [wizardVerses,        setWizardVerses]        = useState([]);
  const [wizardVersesLoading, setWizardVersesLoading] = useState(false);

  const resolveChapter = async (version, bookId, chapter, bookName) => {
    if (version === OFFLINE_TRANSLATION) {
      setIsOffline(true);
      return readFromKJV(bookName, chapter);
    }

    // Online path — fetch from bolls.life.
    setIsOffline(false);
    try {
      return await fetchFromBolls(version, bookId, chapter);
    } catch (err) {
      // Network failed. If KJV is available as a fallback, use it and
      // let the caller know via the isOffline flag.
      if (KJV_BOOKS[bookName]) {
        setIsOffline(true);
        const fallback = readFromKJV(bookName, chapter);
        throw new OfflineFallbackResult(fallback);
      }
      throw err;
    }
  };

  /**
   * @param {object}   opts
   * @param {number}   opts.bookId
   * @param {number}   opts.chapter
   * @param {string}   opts.bookName          - e.g. "Genesis"
   * @param {object}   opts.versePositionsRef
   * @param {object}   opts.pendingScrollVerseRef
   * @param {Function} opts.clearNavHighlight
   * @param {Function} opts.onScrollToTop
   */
  const fetchScripture = useCallback(async ({
    bookId,
    chapter,
    bookName,
    versePositionsRef,
    pendingScrollVerseRef,
    clearNavHighlight,
    onScrollToTop,
  }) => {
    setLoading(true);
    setError(null);
    versePositionsRef.current = {};

    if (!pendingScrollVerseRef.current) clearNavHighlight();

    try {
      const result = await resolveChapter(activeVersion, bookId, chapter, bookName);
      setVerses(result);
      if (!pendingScrollVerseRef.current) onScrollToTop();
    } catch (err) {
      if (err instanceof OfflineFallbackResult) {
        // Network failed but we recovered with KJV — show the verses
        // and surface a gentle warning rather than a hard error.
        setVerses(err.verses);
        setError('No internet connection. Showing KJV offline.');
        if (!pendingScrollVerseRef.current) onScrollToTop();
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVersion]);

  const fetchWizardChapterVerseCount = async (bookId, chapterNum, bookName) => {
    setWizardVersesLoading(true);
    try {
      const result = await resolveChapter(activeVersion, bookId, chapterNum, bookName);
      if (Array.isArray(result)) setWizardVerses(result);
    } catch (err) {
      if (err instanceof OfflineFallbackResult) {
        setWizardVerses(err.verses);
      } else {
        console.error('[useBibleData] wizard verse count failed', err);
      }
    } finally {
      setWizardVersesLoading(false);
    }
  };

  const resetWizardVerses = () => setWizardVerses([]);

  return {
    verses,
    loading,
    error,
    isOffline,
    wizardVerses,
    wizardVersesLoading,
    fetchScripture,
    fetchWizardChapterVerseCount,
    resetWizardVerses,
  };
};


class OfflineFallbackResult {
  constructor(verses) {
    this.verses = verses || [];
  }
}