import { useRef, useCallback } from 'react';

export const useVerseScroll = () => {
  const scrollRef = useRef(null);
  const versePositionsRef = useRef({});
  const pendingScrollVerseRef = useRef(null);
  const lastReadVerseRef = useRef(null);

  const handleVerseLayout = useCallback((verseNum, yPosition) => {
    if (yPosition === undefined) return;

    versePositionsRef.current[verseNum] = yPosition;

    if (pendingScrollVerseRef.current === verseNum) {
      pendingScrollVerseRef.current = null;

      scrollRef.current?.scrollTo({
        y: Math.max(0, yPosition - 100),
        animated: true,
      });
    }
  }, []);

  const scrollToVerseIfReady = useCallback((verseNum) => {
    const y = versePositionsRef.current[verseNum];

    if (y !== undefined) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 100), animated: true });
    } else {
      pendingScrollVerseRef.current = verseNum;
    }
  }, []);

  const handleScrollPositionChange = useCallback((offsetY) => {
    const positions = versePositionsRef.current;
    const entries = Object.entries(positions);
    if (entries.length === 0) return;

    let closestVerse = null;
    let closestDistance = Infinity;
    for (const [verse, y] of entries) {
      const distance = Math.abs(y - offsetY);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestVerse = Number(verse);
      } else {
        // Positions are laid out top-to-bottom in verse order, so once
        // distance starts increasing it will only keep increasing.
        break;
      }
    }
    if (closestVerse != null) {
      lastReadVerseRef.current = closestVerse;
    }
  }, []);

  // Call when navigating to a different chapter/book so stale y-positions
  // from the previous chapter can't be matched against new scroll offsets.
  // Deliberately does NOT touch pendingScrollVerseRef: a caller may have just
  // set it (e.g. jumping to a verse in a chapter that's about to load), and
  // that target needs to survive until the new chapter's verses lay out.
  const resetVersePositions = useCallback(() => {
    versePositionsRef.current = {};
  }, []);

  return {
    scrollRef,
    versePositionsRef,
    pendingScrollVerseRef,
    lastReadVerseRef,
    handleVerseLayout,
    scrollToVerseIfReady,
    handleScrollPositionChange,
    resetVersePositions,
  };
};