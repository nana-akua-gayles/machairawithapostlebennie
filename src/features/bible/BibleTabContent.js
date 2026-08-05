import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Pressable, Share, Keyboard, Platform } from 'react-native';
import { AppText } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { ChevronLeft, ChevronRight, Bookmark, FileText, Trash2, ChevronDown, Star } from 'lucide-react-native';
import { POPULAR_TRANSLATIONS, BIBLE_BOOKS } from './Bibledata';
import { FONT_MIN, FONT_MAX } from './Constants';
import { cleanVerseText, getChapterKey, getVerseKey, getHighlightKey } from './Utils';
import { Usebiblestorage } from './Usebiblestorage'; 
import { useBibleData } from './Usebibledata';
import { useVerseScroll } from './Useversescroll';
import VerseRow from './Verserow';
import ActionSheet from './Actionsheet';
import ChapterVersePicker from './Chapterversepicker';
import BooksView from './Booksview';

// Estimated rendered heights of the ActionSheet, used to nudge the scroll
// position so a selected verse near the bottom isn't hidden underneath it.
// Adjust these if they don't match the sheet's real height on device.
const SHEET_HEIGHT_ESTIMATE = 260;
const NOTE_SHEET_HEIGHT_ESTIMATE = 420;

// How long the "just navigated here" highlight stays visible before fading.
const NAV_HIGHLIGHT_DURATION_MS = 3000;

export const BibleTabContent = ({ tabBarHeight = 60 }) => {
  const [activeTab, setActiveTab] = useState('books');
  const [activeVersion, setActiveVersion] = useState('KJV');
  const [activeBook, setActiveBook] = useState({ id: 1, name: 'Genesis', chapters: 50 });
  const [activeChapter, setActiveChapter] = useState(1);
  const [selectedBookForChapters, setSelectedBookForChapters] = useState(null);
  const [selectedChapterForVerses, setSelectedChapterForVerses] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVerse, setSelectedVerse] = useState(null);
  const [selectedVerses, setSelectedVerses] = useState([]); 
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [underlinedVerses, setUnderlinedVerses] = useState(new Set());
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [navHighlightKey, setNavHighlightKey] = useState(null);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState('chapters');
  const [tempSelectedChapter, setTempSelectedChapter] = useState(null);
  const [selectedVerseEnd, setSelectedVerseEnd] = useState(null);
  const pendingNavHighlightRef = useRef(null);
  const [isCopied, setIsCopied] = useState(false);
  const verseLayoutsRef = useRef({});
  const focusedVerseTimeoutRef = useRef(null);
  const storage = Usebiblestorage();  
  const { verses, loading, error, wizardVerses, wizardVersesLoading, fetchScripture, fetchWizardChapterVerseCount, resetWizardVerses } = useBibleData(activeVersion);
  const { scrollRef, versePositionsRef, pendingScrollVerseRef, lastReadVerseRef, handleVerseLayout, scrollToVerseIfReady, handleScrollPositionChange, resetVersePositions } = useVerseScroll();
  const scrollToTop = useCallback(() => { requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false })); }, [scrollRef]);
  const clearNavHighlight = useCallback(() => setNavHighlightKey(null), []);
  const [focusedVerse, setFocusedVerse] = useState(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);


  useFocusEffect(useCallback(() => { setActiveTab('books'); setSelectedBookForChapters(null); setSelectedChapterForVerses(null); setSearchQuery(''); }, []));

  const runFetchScripture = useCallback(() => {
    fetchScripture({ bookId: activeBook.id, chapter: activeChapter, bookName: activeBook.name, versePositionsRef, pendingScrollVerseRef, clearNavHighlight, onScrollToTop: scrollToTop, onFetchComplete: () => { if (pendingNavHighlightRef.current) { setNavHighlightKey(pendingNavHighlightRef.current); pendingNavHighlightRef.current = null; } }, });
  }, [activeBook.id, activeBook.name, activeChapter, fetchScripture, clearNavHighlight, scrollToTop, versePositionsRef, pendingScrollVerseRef]);

  useEffect(() => {
    if (activeTab !== 'read') return;
    resetVersePositions();
    runFetchScripture();
  }, [activeTab, activeBook.id, activeBook.name, activeChapter, activeVersion, runFetchScripture, resetVersePositions]);

  // Clean up any pending focused-verse timer on unmount
  useEffect(() => {
    return () => {
      if (focusedVerseTimeoutRef.current) clearTimeout(focusedVerseTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isSheetOpen || !selectedVerse) return;
    const targetVerse = isSelectionMode
      ? Math.max(...selectedVerses)
      : (selectedVerseEnd || selectedVerse);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToVerseIfReady(targetVerse);
      });
    });
  }, [isSheetOpen, isEditingNote, selectedVerse, selectedVerseEnd, isSelectionMode, selectedVerses, scrollToVerseIfReady]);

  const dynamicLineHeight = storage.fontSizeScale * 1.45;
  const dynamicVerseSpacing = storage.fontSizeScale * 0.35;
  const activeBookFull = BIBLE_BOOKS.find((b) => b.id === activeBook.id) ?? { ...activeBook, chapters: 50 };
  const isInsideSelectionWizard = activeTab === 'books' && selectedBookForChapters !== null;
  const floatingNavBottom = tabBarHeight + 12;
  const bottomSpacerHeight = 120 + (isSheetOpen
    ? (isEditingNote ? NOTE_SHEET_HEIGHT_ESTIMATE + keyboardHeight : SHEET_HEIGHT_ESTIMATE)
    : 0);
  const filteredBooks = Array.isArray(BIBLE_BOOKS) ? BIBLE_BOOKS.filter((b) => b.name.toLowerCase().includes(searchQuery.toLowerCase())) : [];

  const getRangeVerses = useCallback(() => {
    if (!selectedVerse) return [];
    const end = selectedVerseEnd || selectedVerse;
    const rangeStart = Math.min(selectedVerse, end);
    const rangeEnd = Math.max(selectedVerse, end);
    return verses.filter((v) => v.verse >= rangeStart && v.verse <= rangeEnd);
  }, [selectedVerse, selectedVerseEnd, verses]);
  const isVerseInRange = useCallback((verseNum) => {
    if (!selectedVerse) return false;
    const end = selectedVerseEnd || selectedVerse;
    const rangeStart = Math.min(selectedVerse, end);
    const rangeEnd = Math.max(selectedVerse, end);
    return verseNum >= rangeStart && verseNum <= rangeEnd;
  }, [selectedVerse, selectedVerseEnd]);
  const clearSelection = () => {
  setSelectedVerse(null);
  setSelectedVerseEnd(null);
  setSelectedVerses([]);
  setIsSelectionMode(false);
  setIsSheetOpen(false);
  setIsEditingNote(false);
  setNoteText('');
  setNoteTitle('');
};
  const getCurrentBookChapters = useCallback((bookId) => { const b = BIBLE_BOOKS.find((b) => b.id === bookId); return b?.chapters ?? 50; }, []);
  const handleNextChapter = () => { clearSelection(); setNavHighlightKey(null); const total = getCurrentBookChapters(activeBook.id); if (activeChapter < total) setActiveChapter((prev) => prev + 1); else { const idx = BIBLE_BOOKS.findIndex((b) => b.id === activeBook.id); if (idx !== -1 && idx < BIBLE_BOOKS.length - 1) { const next = BIBLE_BOOKS[idx + 1]; setActiveBook({ id: next.id, name: next.name, chapters: next.chapters }); setActiveChapter(1); } } };
  const handlePrevChapter = () => { clearSelection(); setNavHighlightKey(null); if (activeChapter > 1) setActiveChapter((prev) => prev - 1); else { const idx = BIBLE_BOOKS.findIndex((b) => b.id === activeBook.id); if (idx > 0) { const prevBook = BIBLE_BOOKS[idx - 1]; setActiveBook({ id: prevBook.id, name: prevBook.name, chapters: prevBook.chapters }); setActiveChapter(prevBook.chapters || 1); } } };
  const handleVerseSingleTap = useCallback((verse) => {
  // If we are in selection mode, tapping toggles selection
  if (isSelectionMode) {
    const isSelected = selectedVerses.includes(verse.verse);
    const nextSelected = isSelected 
      ? selectedVerses.filter(v => v !== verse.verse) 
      : [...selectedVerses, verse.verse];

    setSelectedVerses(nextSelected);

    if (nextSelected.length === 0) {
      setIsSelectionMode(false);
      setIsSheetOpen(false);
    }
  } else {
    const highlightKey = getHighlightKey(activeBook.name, activeChapter, verse.verse);
    const isCurrentlyHighlighted = !!storage?.highlights?.[highlightKey];
    if (isCurrentlyHighlighted) {
      storage.toggleHighlight({ book: activeBook.name, chapter: activeChapter, verse: verse.verse }, null);
    } else {
      const noteKey = getHighlightKey(activeBook.name, activeChapter, verse.verse);
      setUnderlinedVerses(prev => {
        const next = new Set(prev);
        if (next.has(noteKey)) next.delete(noteKey); else next.add(noteKey);
        return next;
      });
    }
  }
}, [isSelectionMode, selectedVerses, activeBook.name, activeChapter, storage]);

  const getTargetVerses = useCallback(() => {
    if (isSelectionMode) {
      return verses.filter((v) => selectedVerses.includes(v.verse));
    }
    return getRangeVerses();
  }, [isSelectionMode, selectedVerses, verses, getRangeVerses]);

  const buildRangeRef = (targetVerses) => {
    if (targetVerses.length === 0) return `${activeBook.name} ${activeChapter}`;
    const nums = targetVerses.map((v) => v.verse);
    const isContiguous = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
    if (!isContiguous) {
      return `${activeBook.name} ${activeChapter}:${nums.join(', ')}`;
    }
    const first = nums[0];
    const last = nums[nums.length - 1];
    return first === last
      ? `${activeBook.name} ${activeChapter}:${first}`
      : `${activeBook.name} ${activeChapter}:${first}–${last}`;
  };

  const handleCopy = async () => {
    const targetVerses = getTargetVerses();
    if (targetVerses.length === 0) return;
    const text = isSelectionMode
      ? targetVerses.map((v) => `${v.verse}. ${cleanVerseText(v.text)}`).join(' ')
      : cleanVerseText(targetVerses.map((v) => v.text).join(' '));
    const ref = buildRangeRef(targetVerses);
    try {
      await Clipboard.setStringAsync(`${ref} (${activeVersion})\n${text}`);
    } catch (e) {
      // Clipboard write failed; still let the UI settle back down below.
    }
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
      clearSelection();
    }, 2000);
  };
  const handleShareVerse = async () => {
    const targetVerses = getTargetVerses();
    if (targetVerses.length === 0) return;
    const text = isSelectionMode
      ? targetVerses.map((v) => `${v.verse}. ${cleanVerseText(v.text)}`).join(' ')
      : cleanVerseText(targetVerses.map((v) => v.text).join(' '));
    const ref = buildRangeRef(targetVerses);
    try {
      await Share.share({ message: `${ref} (${activeVersion})\n${text}`, });
    } catch (e) {
      // Share sheet dismissed or failed; nothing more to do.
    }
    clearSelection();
  };
  const handleToggleSaveVerse = async () => {
    const targetVerses = getTargetVerses();
    if (targetVerses.length === 0) return;
    for (const v of targetVerses) {
      await storage.toggleSave({ book: activeBook.name, chapter: activeChapter, verse: v.verse, text: cleanVerseText(v.text), version: activeVersion });
    }
    clearSelection();
  };

  const handleHighlightColorSelect = (color) => {
    const targetVerses = getTargetVerses();
    if (targetVerses.length === 0) return;
    targetVerses.forEach((v) => {
      storage.toggleHighlight({ book: activeBook.name, chapter: activeChapter, verse: v.verse }, color);
    });
    clearSelection();
  };

  const handleSaveNote = () => { const key = getVerseKey(activeBook.name, activeChapter, selectedVerse); storage.saveNote(key, { book: activeBook.name, chapter: activeChapter, verse: selectedVerse, title: noteTitle }, noteText); clearSelection(); };
  const handlePickerSelectChapter = (chapNum) => { setTempSelectedChapter(chapNum); setActiveChapter(chapNum); setPickerStep('verses'); };
  const handlePickerSelectVerse = (verseNum) => {
  const chap = tempSelectedChapter || activeChapter;
  const key = getHighlightKey(activeBook.name, chap, verseNum);  
  setNavHighlightKey(key);
  pendingNavHighlightRef.current = key;
  setIsPickerOpen(false);
  setFocusedVerse(verseNum);
  scrollToVerseIfReady(verseNum);
    if (focusedVerseTimeoutRef.current) clearTimeout(focusedVerseTimeoutRef.current);
    // FIX 3: shortened from 10s to 3s
    focusedVerseTimeoutRef.current = setTimeout(() => { setFocusedVerse(null); clearNavHighlight(); }, NAV_HIGHLIGHT_DURATION_MS);
};
  const handleBooksSelectChapter = (chapNum) => { setSelectedChapterForVerses(chapNum); fetchWizardChapterVerseCount(selectedBookForChapters.id, chapNum, selectedBookForChapters.name); };
  const resetSelectionWizard = useCallback(() => { setSelectedBookForChapters(null); setSelectedChapterForVerses(null); resetWizardVerses(); }, [resetWizardVerses]);
  const handleBooksSelectVerse = (verseNum) => {
  const book = selectedBookForChapters;
  const chapter = selectedChapterForVerses;
  const key = getHighlightKey(book.name, chapter, verseNum);
  
  setNavHighlightKey(key);
  pendingNavHighlightRef.current = key;
  setActiveBook({ id: book.id, name: book.name, chapters: book.chapters });
  setActiveChapter(chapter);
  setSelectedVerse(null);
  setIsSheetOpen(false);
  pendingScrollVerseRef.current = verseNum;
  setFocusedVerse(verseNum);
  resetSelectionWizard();
  setActiveTab('read');
  if (focusedVerseTimeoutRef.current) clearTimeout(focusedVerseTimeoutRef.current);
  // FIX 3: shortened from 10s to 3s
  focusedVerseTimeoutRef.current = setTimeout(() => { setFocusedVerse(null); clearNavHighlight(); }, NAV_HIGHLIGHT_DURATION_MS);
};
  return (
    <SafeAreaView style={styles.appContainer} edges={['top', 'left', 'right']}>
      {!isInsideSelectionWizard && (
        <View style={styles.topControlHeader}>
          {activeTab === 'read' ? (
            <>
              <Pressable onPress={() => { setActiveTab('books'); resetSelectionWizard(); }} style={styles.bookSelectorLink}><AppText style={styles.mainDisplayTitle}>{activeBook.name} {activeChapter}</AppText></Pressable>
              <View style={styles.headerRightSettingsRow}>
                <View style={styles.fontPillContainer}>
                  <Pressable onPress={async () => {
                    const verse = lastReadVerseRef.current;
                      await storage.decreaseFontSize();
                      requestAnimationFrame(() => {
                        if (verse != null) {
                          scrollToVerseIfReady(verse);
                        }
                      });
                    }} disabled={storage.fontSizeScale <= FONT_MIN} style={styles.fontPillBtn} hitSlop={8}><AppText style={[styles.fontPillText, storage.fontSizeScale <= FONT_MIN && styles.disabledPillText]}>A-</AppText></Pressable>
                  <View style={styles.fontPillDivider} />
                  <Pressable onPress={async () => {
                    const verse = lastReadVerseRef.current;
                    await storage.increaseFontSize();
                    requestAnimationFrame(() => {
                      if (verse != null) {
                        scrollToVerseIfReady(verse);
                      }
                    });
                  }} disabled={storage.fontSizeScale >= FONT_MAX} style={styles.fontPillBtn} hitSlop={8}><AppText style={[styles.fontPillText, storage.fontSizeScale >= FONT_MAX && styles.disabledPillText]}>A+</AppText></Pressable>
                </View>
                <Pressable onPress={() => setActiveTab('versions')} style={styles.versionPillTab}><AppText style={styles.versionPillText}>{activeVersion}</AppText><ChevronDown size={10} color="#ffffff" style={styles.versionPillChevron} /></Pressable>
              </View>
            </>
          ) : activeTab === 'versions' ? (
            <Pressable onPress={() => setActiveTab('read')} style={styles.backFromVersionsRow}><ChevronLeft size={22} color="#352a48" style={styles.backFromVersionsChevron} /><AppText style={styles.mainDisplayTitle}>Back</AppText></Pressable>
          ) : (
            <>
              <View style={styles.metaBreadcrumbRow}><AppText style={styles.mainDisplayTitle}>Bible</AppText></View>
              <View style={styles.headerActionButtonGroup}>
                <Pressable onPress={() => setActiveTab(activeTab === 'notes' ? 'books' : 'notes')} style={[styles.premiumWorkspaceTab, activeTab === 'notes' && styles.premiumWorkspaceTabActive]}><FileText size={13} color={activeTab === 'notes' ? '#ffffff' : '#352a48'} style={styles.tabIcon} /><AppText style={[styles.premiumTabLabel, activeTab === 'notes' && styles.premiumTabLabelActive]}>Notes</AppText></Pressable>
                <Pressable onPress={() => setActiveTab(activeTab === 'saved' ? 'books' : 'saved')} style={[styles.premiumWorkspaceTab, activeTab === 'saved' && styles.premiumWorkspaceTabActive]}><Star size={13} color={activeTab === 'saved' ? '#ffffff' : '#352a48'} fill={activeTab === 'saved' ? '#ffffff' : 'transparent'} style={styles.tabIcon} /><AppText style={[styles.premiumTabLabel, activeTab === 'saved' && styles.premiumTabLabelActive]}>Saved</AppText></Pressable>
              </View>
            </>
          )}
        </View>
      )}
      {!isInsideSelectionWizard && <View style={styles.headerUnderlineWidth} />}
      <View style={styles.centralModuleWorkspace}>
        {activeTab === 'read' && (
          <View style={styles.flex1}>
            {loading ? (
              <View style={styles.loadingWrapperPane}>
                <ActivityIndicator size="small" color="#352a48" />
                <AppText style={styles.loadingIndicatorSubtitle}>Loading Scripture...</AppText>
              </View>
            ) : error ? (
              <View style={styles.loadingWrapperPane}>
                <AppText style={styles.networkErrorTitle}>Couldn't load this chapter</AppText>
                <AppText style={styles.networkErrorBodyText}>Check your connection and try again.</AppText>
                <Pressable onPress={runFetchScripture} style={styles.rectRetryButton}>
                  <AppText style={styles.rectRetryButtonLabel}>Retry</AppText>
                </Pressable>
              </View>
            ) : (
              <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.textCanvasLayoutPadding} onScroll={(e) => handleScrollPositionChange(e.nativeEvent.contentOffset.y)} scrollEventThrottle={16} scrollEnabled={true}>
                <View style={styles.editorialParagraphBlock}>
                  {Array.isArray(verses) && verses.map((v) => {
                    const noteKey = getHighlightKey(activeBook.name, activeChapter, v.verse);
                    const highlightColor = storage?.highlights?.[noteKey] ?? null;
                    return (
                      <VerseRow 
                        key={v.pk} 
                        v={v} 
                        onLayout={(y) => handleVerseLayout(v.verse, y)}
                        isSelected={isSelectionMode ? selectedVerses.includes(v.verse) : isVerseInRange(v.verse)} 
                        isNavHighlight={navHighlightKey === noteKey}
                        isHighlighted={!!storage?.highlights?.[noteKey]} 
                        isUnderlined={underlinedVerses.has(noteKey)}
                        hasNote={!!storage?.verseNotes?.[noteKey]} 
                        isSaved={!!storage?.savedVerses?.[noteKey]}
                        fontSizeScale={storage.fontSizeScale} 
                        dynamicLineHeight={dynamicLineHeight} 
                        dynamicVerseSpacing={dynamicVerseSpacing} 
                        highlightColor={highlightColor} 
                        isFocused={focusedVerse === v.verse} 
                        onSingleTap={() => handleVerseSingleTap(v)} 
                        onLongPress={() => {
                        setIsSelectionMode(true);
                        setSelectedVerses([v.verse]);
                        setSelectedVerse(v.verse);
                        setIsEditingNote(false);
                        setNoteText('');
                        setNoteTitle('');
                        setIsSheetOpen(true);
                        }}
                      />
                    );
                  })}
                  <View style={{ height: bottomSpacerHeight }} />
                </View>
              </ScrollView>
            )}
            {selectedVerse && isSheetOpen && !isPickerOpen && (
              <ActionSheet bookName={activeBook.name} chapter={activeChapter} verseNum={selectedVerse} verseEnd={selectedVerseEnd} 
              isSaved={!!storage.savedVerses[getVerseKey(activeBook.name, activeChapter, selectedVerse)]} 
              isEditingNote={isEditingNote} noteText={noteText} onNoteChange={setNoteText}
              noteTitle={noteTitle} onNoteTitleChange={setNoteTitle} onClose={clearSelection}
              isCopied={isCopied} isMultiSelect={isSelectionMode} selectedCount={selectedVerses.length} onCopy={handleCopy} onShare={handleShareVerse} onToggleSave={handleToggleSaveVerse} 
               onHighlightColorSelect={handleHighlightColorSelect} onOpenNote={() => setIsEditingNote(true)} 
               onSaveNote={handleSaveNote} onCancelNote={() => setIsEditingNote(false)} 
               bottomOffset={floatingNavBottom + 68 + (isEditingNote ? keyboardHeight : 0)} />
            )}
            <View style={[styles.floatingTurnPageRow, { bottom: floatingNavBottom }]}>
              <Pressable onPress={handlePrevChapter} style={styles.turnPageCircleActionBtn}><ChevronLeft color="#352a48" size={20} strokeWidth={2.5} /></Pressable>
              <Pressable onPress={() => { setPickerStep('chapters'); setIsPickerOpen(!isPickerOpen); }} style={styles.centerReaderPillLink}><AppText style={styles.centerReaderPillText}>Chapter {activeChapter}</AppText><ChevronDown color="#352a48" size={13} style={styles.centerReaderChevron} /></Pressable>
              <Pressable onPress={handleNextChapter} style={styles.turnPageCircleActionBtn}><ChevronRight color="#352a48" size={20} strokeWidth={2.5} /></Pressable>
            </View>
            <ChapterVersePicker isOpen={isPickerOpen} bookName={activeBook.name} bookChapterCount={activeBookFull?.chapters || 50} activeChapter={activeChapter} pickerStep={pickerStep} tempSelectedChapter={tempSelectedChapter} verseCount={verses?.length > 0 ? verses.length : wizardVerses?.length > 0 ? wizardVerses.length : 30} onClose={() => setIsPickerOpen(false)} onSelectChapter={handlePickerSelectChapter} onSelectVerse={handlePickerSelectVerse} onBackToChapters={() => setPickerStep('chapters')} tabBarHeight={tabBarHeight} />
          </View>
        )}
        {activeTab === 'books' && (
          <BooksView filteredBooks={filteredBooks} searchQuery={searchQuery} onSearchChange={setSearchQuery} onSearchClear={() => setSearchQuery('')} selectedBook={selectedBookForChapters} selectedChapter={selectedChapterForVerses} wizardVerses={wizardVerses} wizardVersesLoading={wizardVersesLoading} onSelectBook={(bookItem) => { setSearchQuery(''); setSelectedBookForChapters(bookItem); }} onSelectChapter={handleBooksSelectChapter} onSelectVerse={handleBooksSelectVerse} onBackFromChapters={() => setSelectedBookForChapters(null)} onBackFromVerses={() => setSelectedChapterForVerses(null)} tabBarHeight={tabBarHeight} />
        )}
        {activeTab === 'versions' && (
          <View style={styles.flex1}>
            <ScrollView contentContainerStyle={styles.versionsScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.versionsTitleBlock}><AppText style={styles.versionsTitleText}>Translations</AppText><AppText style={styles.versionsSubtitleText}>Select your preferred Bible translation</AppText></View>
              <View style={styles.translationsList}>
                {POPULAR_TRANSLATIONS.map((translation) => (
                  <Pressable key={translation.code} style={[styles.archiveNoteDataCard, activeVersion === translation.code && styles.activeTranslationCard]} onPress={() => { if (lastReadVerseRef.current) pendingScrollVerseRef.current = lastReadVerseRef.current; setActiveVersion(translation.code); setActiveTab('read'); }}>
                    <AppText style={styles.translationCode}>{translation.code}</AppText><AppText style={styles.translationLabel}>{translation.label}</AppText>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
        {activeTab === 'notes' && (
          <ScrollView contentContainerStyle={styles.userDashboardArchiveScroll} showsVerticalScrollIndicator={false}>
            <AppText style={styles.dashboardViewMainHeader}>My Notes</AppText>
            {Object.keys(storage.verseNotes).length === 0 ? (
              <AppText style={styles.emptyDashboardStatusText}>No notes yet. Long press a verse while reading to add one.</AppText>
            ) : (
              Object.entries(storage.verseNotes).map(([noteKey, noteData]) => (
                <View key={noteKey} style={styles.archiveNoteDataCard}>
                  <View style={styles.archiveCardMetaHeader}><AppText style={[styles.archiveCardVerseTitle, !noteData.title?.trim() && styles.archiveCardVerseTitleEmpty]}>{noteData.title?.trim() || 'Untitled note'}</AppText><Pressable onPress={() => storage.removeNote(noteKey)}><Trash2 color="#ef4444" size={16} /></Pressable></View>
                  <AppText style={styles.noteVerseRefSubtitle}>{noteData.book} {noteData.chapter}:{noteData.verse}</AppText>
                  <AppText style={styles.archiveCardBodyContent}>{noteData.note}</AppText><AppText style={styles.noteTimestamp}>{new Date(noteData.timestamp).toLocaleDateString()}</AppText>
                </View>
              ))
            )}
          </ScrollView>
        )}
        {activeTab === 'saved' && (
          <ScrollView contentContainerStyle={styles.userDashboardArchiveScroll} showsVerticalScrollIndicator={false}>
            <AppText style={styles.dashboardViewMainHeader}>Saved Verses</AppText>
            {Object.keys(storage.savedVerses).length === 0 ? (
              <AppText style={styles.emptyDashboardStatusText}>No saved verses yet.</AppText>
            ) : (
              (Object.entries(storage.savedVerses || {}).map(([saveKey, saveData]) => (
                <View key={saveKey} style={styles.archiveNoteDataCard}>
                  <View style={styles.archiveCardMetaHeader}><AppText style={styles.archiveCardVerseTitle}>{saveData.book} {saveData.chapter}:{saveData.verse}</AppText>
                  <Pressable onPress={() => storage.deleteSavedVerse(saveKey, saveData)}>
                    <Trash2 color="#ef4444" size={16} />
                  </Pressable></View>
                  <AppText style={styles.archiveCardBodyContent}>{saveData.text}</AppText>
                </View>
              )))
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  flex1: { flex: 1 },
  tabIcon: { marginRight: 4 },
  centerReaderChevron: { marginLeft: 4 },
  backFromVersionsRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  backFromVersionsChevron: { marginLeft: -4 },
  appContainer: { flex: 1, backgroundColor: '#ffffff' },
  topControlHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6, backgroundColor: '#ffffff' },
  mainDisplayTitle: { fontSize: 21, color: '#352a48', letterSpacing: -0.5 },
  headerActionButtonGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaBreadcrumbRow: {},
  premiumWorkspaceTab: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 10, height: 34, justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  premiumWorkspaceTabActive: { backgroundColor: '#352a48', borderColor: '#352a48' },
  premiumTabLabel: { fontSize: 12, color: '#352a48' },
  premiumTabLabelActive: { color: '#ffffff' },
  headerUnderlineWidth: { height: 1, backgroundColor: '#f1f5f9', width: '100%' },
  centralModuleWorkspace: { flex: 1, backgroundColor: '#ffffff' },
  textCanvasLayoutPadding: { paddingHorizontal: 24, paddingTop: 0, paddingBottom: 150 },
  editorialParagraphBlock: { width: '100%' },
  bookSelectorLink: { paddingVertical: 4 },
  headerRightSettingsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fontPillContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#6b7280', borderRadius: 20, paddingHorizontal: 12, height: 36 },
  fontPillBtn: { paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center' },
  fontPillText: { fontSize: 13, fontWeight: '600', color: '#000000' },
  disabledPillText: { color: '#cbd5e1' },
  fontPillDivider: { width: 1, height: 16, backgroundColor: '#6b7280', marginHorizontal: 8 },
  versionPillTab: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2e2541', borderRadius: 20, paddingHorizontal: 14, height: 36 },
  versionPillText: { fontSize: 12, color: '#ffffff', letterSpacing: 0.5 },
  versionPillChevron: { marginLeft: 4, marginTop: 1 },
  floatingTurnPageRow: { position: 'absolute', left: 16, right: 16, height: 56, backgroundColor: '#352a48', borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, elevation: 12, zIndex: 5 },
  turnPageCircleActionBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  centerReaderPillLink: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 42, borderRadius: 21, backgroundColor: '#ffffff' },
  centerReaderPillText: { fontSize: 13, color: '#352a48' },
  loadingWrapperPane: { flex: 0.8, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  loadingIndicatorSubtitle: { fontSize: 12, color: '#352a48' },
  networkErrorTitle: { fontSize: 16, color: '#09090b', textAlign: 'center', marginBottom: 6 },
  networkErrorBodyText: { fontSize: 13, color: '#352a48', textAlign: 'center', lineHeight: 20 },
  rectRetryButton: { backgroundColor: '#352a48', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  rectRetryButtonLabel: { color: '#ffffff', fontSize: 12 },
  versionsScroll: { paddingHorizontal: 16, paddingBottom: 100 },
  versionsTitleBlock: { paddingVertical: 14 },
  versionsTitleText: { fontSize: 22, color: '#352a48', marginBottom: 4, fontWeight: '700' },
  versionsSubtitleText: { color: '#64748b', fontSize: 14 },
  translationsList: { marginTop: 8, gap: 10 },
  activeTranslationCard: { borderLeftWidth: 4, borderLeftColor: '#352a48', backgroundColor: '#f5f3ff' },
  translationCode: { color: '#352a48', fontSize: 16, fontWeight: '700' },
  translationLabel: { color: '#64748b', fontSize: 12, marginTop: 2 },
  userDashboardArchiveScroll: { padding: 24, paddingBottom: 100 },
  dashboardViewMainHeader: { fontSize: 20, color: '#09090b', marginBottom: 16 },
  emptyDashboardStatusText: { fontSize: 14, color: '#a1a1aa', textAlign: 'center', marginTop: 40 },
  noteTimestamp: { fontSize: 11, color: '#94a3b8', marginTop: 6 },
  noteVerseRefSubtitle: { fontSize: 11, color: '#94a3b8', marginTop: -4, marginBottom: 4 },
  archiveNoteDataCard: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#352a48', marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  archiveCardMetaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  archiveCardVerseTitle: { fontSize: 14, color: '#09090b' },
  archiveCardVerseTitleEmpty: { color: '#a1a1aa', fontStyle: 'italic' },
  archiveCardBodyContent: { fontSize: 13, color: '#352a48', lineHeight: 18 },
});