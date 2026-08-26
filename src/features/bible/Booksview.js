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
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const BooksView = memo(({
  filteredBooks, searchQuery, onSearchChange, onSearchClear,
  selectedBook, selectedChapter, wizardVerses, wizardVersesLoading,
  onSelectBook, onSelectChapter, onSelectVerse, onBackFromChapters, onBackFromVerses,
  tabBarHeight = 60,
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  if (selectedBook && selectedChapter) {
    return (
      <View style={styles.container}>
        <View style={styles.drillHeader}>
          <Pressable onPress={onBackFromVerses} style={styles.backPill} hitSlop={8}>
            <ChevronLeft size={16} color={colors.onPrimary} />
            <AppText style={styles.backPillText}>Back</AppText>
          </Pressable>
          <AppText style={styles.drillBookTitle}>
            {selectedBook.name} {selectedChapter}
          </AppText>
        </View>

        <AppText style={styles.sectionLabel}>Select Verse</AppText>

        {wizardVersesLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="small" color={colors.text} />
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

  if (selectedBook) {
    const chapterCount = selectedBook.chapters ?? 50;
    const chapters = Array.from({ length: chapterCount }, (_, i) => i + 1);

    return (
      <View style={styles.container}>
        <View style={styles.drillHeader}>
          <Pressable onPress={onBackFromChapters} style={styles.backPill} hitSlop={8}>
            <ChevronLeft size={16} color={colors.onPrimary} />
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
        <Search color={colors.text} size={16} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search books..."
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={onSearchClear} hitSlop={8}>
            <X color={colors.textSecondary} size={16} />
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

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered:  { alignItems: 'center', justifyContent: 'center', marginTop: 60 },

  // ── Search bar ─────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    margin: 16,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorderAccent,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: colors.text },

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
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  testamentSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  testamentDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
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
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.cardBorderAccent,
  },
  bookCardPlaceholder: {
    width: CARD_WIDTH,
    margin: CARD_MARGIN,
  },
  bookTitle:    { fontSize: 15, fontWeight: '700', color: colors.text },
  bookSubtitle: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  emptyText:    { color: colors.textSecondary },

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
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 4,
  },
  backPillText:   { fontSize: 14, color: colors.onPrimary, fontWeight: '600' },
  drillBookTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },

  // ── Section label (chapter / verse screens) ────
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
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
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.cardBorderAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: { fontSize: 15, color: colors.text, fontWeight: '600' },
});

export default BooksView;
