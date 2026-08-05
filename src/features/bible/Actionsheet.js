import React from 'react';
import { View, Pressable, TextInput, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { AppText } from '../../components/AppText';
import { Copy, Share2, Bookmark, FileText, X, Check } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';

const ActionSheet = ({
  bookName, chapter, verseNum, verseEnd, isSaved, isEditingNote, noteText, noteTitle, isCopied,
  onNoteChange, onNoteTitleChange, onClose, onCopy, onShare, onToggleSave, onHighlightColorSelect, onOpenNote, onSaveNote, onCancelNote,
  bottomOffset = 90,
}) => {
  const { colors } = useTheme();
  const isRange = verseEnd && verseEnd !== verseNum;
  const verseRef = isRange ? `${bookName} ${chapter}:${verseNum}–${verseEnd}` : `${bookName} ${chapter}:${verseNum}`;
  // The header always shows the verse location for context. The note's own
  // title (typed by the user) is separate and lives in the note editor below.
  const title = verseRef;
  
  const [showPalette, setShowPalette] = React.useState(false);
  const COLORS = ['#fde047', '#86efac', '#93c5fd', '#fca5a5'];

  // The sheet is anchored by `bottom` only, so nothing stops it from growing
  // upward past the top of the screen once a note gets long and/or the
  // keyboard pushes bottomOffset way up. Cap the whole sheet's height to
  // whatever room is actually left, and let the body scroll internally
  // if the content still doesn't fit.
  const screenHeight = Dimensions.get('window').height;
  const SAFE_TOP_MARGIN = 60;
  const maxSheetHeight = Math.max(180, screenHeight - bottomOffset - SAFE_TOP_MARGIN);

  const HighlightIcon = () => (
    <View style={styles.ringContainer}>
      {COLORS.map((c, i) => <View key={i} style={[styles.miniCircle, { backgroundColor: c }]} />)}
    </View>
  );

  return (
    <View
      style={[
        styles.actionSheetContainer,
        {
          bottom: bottomOffset,
          maxHeight: maxSheetHeight,
          backgroundColor: colors.card,
          borderColor: colors.text,
        },
      ]}
    >
      <View style={[styles.actionSheetHeader, { borderBottomColor: colors.border }]}>
        <AppText style={[styles.actionSheetTitle, { color: colors.text }]}>{title}</AppText>
        <Pressable onPress={onClose} hitSlop={8}><X color={colors.text} size={20} /></Pressable>
      </View>

      <ScrollView
        style={styles.sheetBodyScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      {!isEditingNote ? (
        <View style={styles.actionButtonsRow}>
          <Pressable 
            onPress={onCopy} 
            style={[styles.actionToolButton, isCopied && styles.actionToolButtonSuccess]}
          >
            {isCopied ? (
              <Check color="#ffffff" size={20} /> 
            ) : (
              <Copy color={colors.text} size={20} />
            )}
            <AppText style={[styles.actionToolLabel, { color: colors.text }, isCopied && styles.actionToolLabelSuccess]}>
              {isCopied ? 'Copied' : 'Copy'}
            </AppText>
          </Pressable>
          <Pressable onPress={onShare} style={styles.actionToolButton}>
            <Share2 color={colors.text} size={20} />
            <AppText style={[styles.actionToolLabel, { color: colors.text }]}>Share</AppText>
          </Pressable>
          <Pressable onPress={onToggleSave} style={styles.actionToolButton}>
            <Bookmark
              color={isSaved ? colors.primary : colors.text}
              fill={isSaved ? colors.primary : 'transparent'}
              size={20}
            />
            <AppText style={[styles.actionToolLabel, { color: colors.text }]}>
              {isSaved ? 'Saved' : 'Save'}
            </AppText>
          </Pressable>

          {showPalette ? (
  <View style={styles.paletteContainer}>
    {COLORS.map((color, index) => (
      <Pressable 
        key={index} 
        style={[styles.colorCircle, { backgroundColor: color }]} 
        onPress={() => { onHighlightColorSelect(color); setShowPalette(false); }} 
      />
    ))}
  </View>
) : (
  <Pressable onPress={() => setShowPalette(true)} style={styles.actionToolButton}>
    <HighlightIcon />
    <AppText style={[styles.actionToolLabel, { color: colors.text }]}>Highlight</AppText>
  </Pressable>
)}

          <Pressable onPress={onOpenNote} style={styles.actionToolButton}>
            <FileText color={colors.text} size={20} />
            <AppText style={[styles.actionToolLabel, { color: colors.text }]}>Note</AppText>
          </Pressable>
        </View>
      ) : (
        <View style={styles.noteEditorWrapper}>
          <TextInput
            style={[
              styles.noteTitleField,
              { backgroundColor: colors.border, borderColor: colors.textSecondary, color: colors.text },
            ]}
            placeholder="Add a title (optional)"
            placeholderTextColor={colors.textSecondary}
            value={noteTitle}
            onChangeText={onNoteTitleChange}
            autoFocus
          />
          <TextInput
            style={[
              styles.noteInputField,
              { backgroundColor: colors.border, borderColor: colors.textSecondary, color: colors.text },
            ]}
            placeholder="Write your thoughts..."
            placeholderTextColor={colors.textSecondary}
            multiline
            value={noteText}
            onChangeText={onNoteChange}
            scrollEnabled
          />
          <View style={styles.noteActionButtons}>
            <Pressable
              onPress={onCancelNote}
              style={[styles.noteCancelButton, { borderColor: colors.textSecondary }]}
            >
              <AppText style={[styles.noteCancelText, { color: colors.textSecondary }]}>Back</AppText>
            </Pressable>
            <Pressable
              onPress={onSaveNote}
              style={[styles.noteSaveButton, { backgroundColor: colors.primary }]}
            >
              <AppText style={styles.noteSaveText}>Save Note</AppText>
            </Pressable>
          </View>
        </View>
      )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  actionSheetContainer: { position: 'absolute', left: 16, right: 16, borderRadius: 24, padding: 20, borderWidth: 1.5, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 12, zIndex: 10 },
  actionSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, paddingBottom: 10 },
  sheetBodyScroll: { flexShrink: 1 },
  actionSheetTitle: { fontSize: 16, fontWeight: '700' },
  actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  actionToolButton: { alignItems: 'center', justifyContent: 'center', flex: 1, gap: 3 },
  actionToolLabel: { fontSize: 11, fontWeight: '500' },
  noteEditorWrapper: { marginTop: 4 },
  noteTitleField: { width: '100%', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontWeight: '600', marginBottom: 8 },
  // Capped height (was unbounded before) so a long note scrolls internally
  // instead of growing the whole sheet upward off the top of the screen.
  noteInputField: { width: '100%', minHeight: 80, maxHeight: 160, borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, textAlignVertical: 'top' },
  noteActionButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  noteCancelButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1 },
  noteCancelText: { fontSize: 13 },
  noteSaveButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 }, 
  noteSaveText: { fontSize: 13, color: '#ffffff' },
  ringContainer: { width: 22, height: 22, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'space-between', padding: 2 },
  miniCircle: { width: 8, height: 8, borderRadius: 4 },
  paletteContainer: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', flex: 2, paddingHorizontal: 5 },
  colorCircle: { width: 28, height: 28, borderRadius: 14 },
  actionToolButtonSuccess: { backgroundColor: '#22c55e', },
  actionToolLabelSuccess: { color: '#ffffff', fontWeight: '700' },
});

export default ActionSheet;