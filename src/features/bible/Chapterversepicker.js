import React from 'react';
import { View, Pressable, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { AppText } from '../../components/AppText';
import { ChevronLeft, X } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const GRID_PADDING = 16;
const ITEM_GAP     = 10;
const COLUMNS      = 5;
const SQUARE_SIZE  = (width - GRID_PADDING * 2 - ITEM_GAP * (COLUMNS - 1)) / COLUMNS;

const ChapterVersePicker = ({
  isOpen, bookName, bookChapterCount, activeChapter, pickerStep, tempSelectedChapter,
  verseCount, onClose, onSelectChapter, onSelectVerse, onBackToChapters, tabBarHeight = 60,
}) => {
  if (!isOpen) return null;

  return (
    <View style={styles.customPickerInlineOverlay}>
      <Pressable style={styles.customPickerClickDismiss} onPress={onClose} />

      <View style={[styles.customPickerContentPanel, { bottom: tabBarHeight }]}>
        <View style={styles.customPickerContentHeader}>
          <View style={styles.headerRow}>
            {pickerStep === 'verses' && (
              <Pressable onPress={onBackToChapters} style={styles.backButtonWrapper} hitSlop={8}>
                <ChevronLeft color="#352a48" size={20} />
              </Pressable>
            )}
            <AppText style={styles.customPickerTitleText}>
              {bookName}{pickerStep === 'verses' ? ` ${tempSelectedChapter}` : ''}
            </AppText>
          </View>
          <Pressable onPress={onClose} hitSlop={12}>
            <X color="#352a48" size={20} />
          </Pressable>
        </View>

        <AppText style={styles.customPickerSubtitleText}>
          {pickerStep === 'chapters' ? 'Select Chapter' : 'Select Verse'}
        </AppText>

        <ScrollView contentContainerStyle={styles.customPickerGridContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.gridContainerMatrix}>
            {pickerStep === 'chapters' &&
              Array.from({ length: bookChapterCount }, (_, i) => i + 1).map((chapNum, idx) => (
                <Pressable
                  key={chapNum}
                  onPress={() => onSelectChapter(chapNum)}
                  style={[
                    styles.chapterGridSelectSquare,
                    (idx + 1) % COLUMNS === 0 && styles.noRightMargin,
                    activeChapter === chapNum && styles.chapterGridSelectSquareActive,
                  ]}
                >
                  <AppText style={styles.chapterSquareText}>{chapNum}</AppText>
                </Pressable>
              ))}

            {pickerStep === 'verses' &&
              Array.from({ length: verseCount }, (_, i) => i + 1).map((verseNum, idx) => (
                <Pressable
                  key={verseNum}
                  onPress={() => onSelectVerse(verseNum)}
                  style={[styles.chapterGridSelectSquare, (idx + 1) % COLUMNS === 0 && styles.noRightMargin]}
                >
                  <AppText style={styles.chapterSquareText}>{verseNum}</AppText>
                </Pressable>
              ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  customPickerInlineOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 },
  customPickerClickDismiss: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
  customPickerContentPanel: {
    position: 'absolute', left: 0, right: 0, backgroundColor: '#ffffff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 20, paddingHorizontal: GRID_PADDING, paddingBottom: 24, maxHeight: '65%',
  },
  customPickerContentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButtonWrapper: { marginRight: 8 },
  customPickerTitleText: { fontSize: 20, color: '#352a48' },
  customPickerSubtitleText: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  customPickerGridContainer: { paddingBottom: 24 },
  gridContainerMatrix: { flexDirection: 'row', flexWrap: 'wrap' },
  chapterGridSelectSquare: {
    width: SQUARE_SIZE, height: SQUARE_SIZE, marginRight: ITEM_GAP, marginBottom: ITEM_GAP,
    borderRadius: 12, backgroundColor: '#f5f3ff', borderWidth: 1.5, borderColor: '#352a48',
    alignItems: 'center', justifyContent: 'center', elevation: 2,
    shadowColor: '#352a48', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2,
  },
  noRightMargin: { marginRight: 0 },
  chapterGridSelectSquareActive: { backgroundColor: '#f3e8ff', borderColor: '#352a48' },
  chapterSquareText: { fontSize: 14, color: '#352a48', textAlign: 'center', includeFontPadding: false, textAlignVertical: 'center' },
});

export default ChapterVersePicker;