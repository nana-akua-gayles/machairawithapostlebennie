import React, { memo } from 'react';
import {
  View,
  Pressable,
  SectionList,
  FlatList,
  TextInput,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { AppText } from '../../components/AppText';
import { Search, X, ChevronLeft } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const BooksView = memo(({
  filteredBooks, searchQuery, onSearchChange, onSearchClear,
  selectedBook, selectedChapter, wizardVerses, wizardVersesLoading,
  onSelectBook, onSelectChapter, onSelectVerse, onBackFromChapters, onBackFromVerses,
  tabBarHeight = 60,
}) => {

  // ── VERSE GRID ────────────────────────────────
  if (selectedBook && selectedChapter) {
    return (
      <View style={styles.container}>
        <View style={styles.drillHeader}>
          <Pressable onPress={onBackFromVerses} style={styles.backPill} hitSlop={8}>
            <ChevronLeft size={16} color="#ffffff" />
            <AppText style={styles.backPillText}>Back</AppText>
          </Pressable>
          <AppText style={styles.drillBookTitle}>
            {selectedBook.name} {selectedChapter}
          </AppText>
        </View>

        <AppText style={styles.sectionLabel}>Select Verse</AppText>

        {wizardVersesLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color="#352a48" />
          </View>
        ) : (
          <FlatList
            data={wizardVerses}
            keyExtractor={(item) => item.pk?.toString() ?? item.verse?.toString()}
            numColumns={5}
            contentContainerStyle={[styles.gridContent, { paddingBottom: tabBarHeight + 24 }]}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSelectVerse(item.verse)}
                style={styles.cell}
              >
                <AppText style={styles.cellText}>{item.verse}</AppText>
              </Pressable>
            )}
          />
        )}
      </View>
    );
  }

  // ── CHAPTER GRID ──────────────────────────────
  if (selectedBook) {
    const chapterCount = selectedBook.chapters ?? 50;
    const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1);

    return (
      <View style={styles.container}>
        <View style={styles.drillHeader}>
          <Pressable onPress={onBackFromChapters} style={styles.backPill} hitSlop={8}>
            <ChevronLeft size={16} color="#ffffff" />
            <AppText style={styles.backPillText}>Back</AppText>
          </Pressable>
          <AppText style={styles.drillBookTitle}>{selectedBook.name}</AppText>
        </View>

        <AppText style={styles.sectionLabel}>Select Chapter</AppText>

        <FlatList
          data={chapters}
          keyExtractor={(item) => item.toString()}
          numColumns={5}
          contentContainerStyle={[styles.gridContent, { paddingBottom: tabBarHeight + 24 }]}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelectChapter(item)}
              style={styles.cell}
            >
              <AppText style={styles.cellText}>{item}</AppText>
            </Pressable>
          )}
        />
      </View>
    );
  }

  const isSearching = searchQuery.trim().length > 0;

  const sections = isSearching
    ? [{ title: null, data: pairUp(filteredBooks) }]
    : [
        {
          title: 'Old Testament',
          subtitle: '39 Books',
          data: pairUp(filteredBooks.filter((b) => b.testament === 'OT')),
        },
        {
          title: 'New Testament',
          subtitle: '27 Books',
          data: pairUp(filteredBooks.filter((b) => b.testament === 'NT')),
        },
      ];

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Search color="#352a48" size={16} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search books..."
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={onSearchClear} hitSlop={8}>
            <X color="#94a3b8" size={16} />
          </Pressable>
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(pair, index) => `pair-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 24 }]}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.centered}>
            <AppText style={styles.emptyText}>No books found</AppText>
          </View>
        }
        renderSectionHeader={({ section }) => {
          if (!section.title) return null;
          return (
            <View style={styles.testamentHeader}>
              <View style={styles.testamentHeaderLeft}>
                <AppText style={styles.testamentTitle}>{section.title}</AppText>
                <AppText style={styles.testamentSubtitle}>{section.subtitle}</AppText>
              </View>
              <View style={styles.testamentDividerLine} />
            </View>
          );
        }}
        renderItem={({ item: pair }) => (
          <View style={styles.bookRow}>
            {pair.map((book) => (
              <Pressable
                key={book.id}
                onPress={() => onSelectBook(book)}
                style={styles.bookCard}
              >
                <AppText style={styles.bookTitle}>{book.name}</AppText>
                <AppText style={styles.bookSubtitle}>{book.chapters} {book.chapters === 1 ? 'Chapter' : 'Chapters'}
                </AppText>
              </Pressable>
            ))}
            {pair.length === 1 && <View style={styles.bookCardPlaceholder} />}
          </View>
        )}
      />
    </View>
  );
});

// ── Helpers ───────────────────────────────────
// Group flat array into pairs for the 2-column layout
const pairUp = (arr) => {
  const pairs = [];
  for (let i = 0; i < arr.length; i += 2) {
    pairs.push(arr.slice(i, i + 2));
  }
  return pairs;
};

// ── Sizing ────────────────────────────────────
const CARD_MARGIN  = 6;
const CARD_WIDTH   = (width - 40) / 2;
const CELL_MARGIN  = 4;
const GRID_PADDING = 16;
const CELL_SIZE    = (width - GRID_PADDING * 2 - CELL_MARGIN * 2 * 5) / 5;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  centered:  { alignItems: 'center', justifyContent: 'center', marginTop: 60 },

  // ── Search bar ─────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    margin: 16,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#352a48',
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#000' },

  // ── Section list ───────────────────────────────
  listContent: { paddingHorizontal: 12, paddingBottom: 40 },

  // ── Testament section header ───────────────────
  testamentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingTop: 20,
    paddingBottom: 10,
    gap: 12,
  },
  testamentHeaderLeft: {
  },
  testamentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#352a48',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  testamentSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  testamentDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },

  // ── Book cards ─────────────────────────────────
  bookRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  bookCard: {
    width: CARD_WIDTH,
    margin: CARD_MARGIN,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#352a48',
  },
  bookCardPlaceholder: {
    width: CARD_WIDTH,
    margin: CARD_MARGIN,
  },
  bookTitle:    { fontSize: 15, fontWeight: '700', color: '#352a48' },
  bookSubtitle: { fontSize: 11, color: '#64748b', marginTop: 4 },
  emptyText:    { color: '#94a3b8' },

  // ── Drill-down header ──────────────────────────
  drillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#352a48',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 4,
  },
  backPillText:   { fontSize: 14, color: '#ffffff', fontWeight: '600' },
  drillBookTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#352a48',
    letterSpacing: -0.5,
  },

  // ── Section label (chapter / verse screens) ────
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#09090b',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },

  // ── Chapter / verse grid ───────────────────────
  gridContent: {
    paddingHorizontal: GRID_PADDING,
    paddingBottom: 40,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    margin: CELL_MARGIN,
    borderRadius: 12,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#c4b5fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { fontSize: 15, color: '#352a48', fontWeight: '600' },
});

export default BooksView;