import React, { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { AppText } from '../../components/AppText';
import { ASH } from './Constants';
import { cleanVerseText } from './Utils';
import { useTheme } from '../../context/ThemeContext';

const VerseRow = memo(({
  v,
  onLayout,
  onSingleTap,
  onLongPress,
  isSelected,
  isNavHighlight,
  isHighlighted,
  isUnderlined,
  hasNote,
  isFocused,
  isSaved,
  fontSizeScale,
  dynamicLineHeight,
  dynamicVerseSpacing,
  highlightColor,
}) => {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <Pressable
      onPress={() => onSingleTap?.(v)}
      onLongPress={() => onLongPress?.(v)}
      delayLongPress={300}
      onLayout={(event) => {
        onLayout(event.nativeEvent.layout.y);
      }}
      android_ripple={{ color: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(53,42,72,0.1)' }}
      style={[
        styles.verseLineBlockWrapper,
        isFocused && styles.spotlightHighlight,
        isNavHighlight && styles.navigationHighlight,
        isSelected && styles.selectionHighlight,
        isHighlighted && !highlightColor && styles.savedHighlight,
        { marginBottom: dynamicVerseSpacing },
        // highlightColor is a color the USER picked for this verse — exempt
        // from the grayscale-chrome rule, so it stays exactly as chosen in
        // both light and dark mode.
        highlightColor && { backgroundColor: highlightColor },
      ]}
    >
      <AppText style={[styles.miniVerseSuperscriptIndex, { fontSize: Math.max(10, fontSizeScale - 6) }]}>
        {v.verse}
      </AppText>
      <View style={styles.verseTextContainer}>
        <AppText style={[
          styles.coreReadingVerseString, 
          { fontSize: fontSizeScale, lineHeight: dynamicLineHeight }, 
          isUnderlined && styles.underlinedVerse
        ]}>
          {cleanVerseText(v.text)}
        </AppText>
        {(hasNote || isSaved) && (
          <View style={styles.indicatorPillContainer}>
            {isSaved && (
              <View style={[styles.indicatorPill, styles.savedPill]}>
                <AppText style={styles.indicatorPillText}>Saved</AppText>
              </View>
            )}
            {hasNote && (
              <View style={[styles.indicatorPill, styles.notePill]}>
                <AppText style={styles.indicatorPillText}>Note</AppText>
              </View>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
});

const createStyles = (colors, isDark) => StyleSheet.create({
  verseLineBlockWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  miniVerseSuperscriptIndex: {
    width: 28,
    minWidth: 28,
    color: colors.text,
    fontWeight: '700',
    opacity: 0.45,
    marginTop: 1,
    flexShrink: 0,
  },
  verseTextContainer: {
    flex: 1,
    paddingLeft: 6,
  },
  coreReadingVerseString: {
    color: colors.text,
    textAlign: 'left',
    fontWeight: '400',
  },
  underlinedVerse: {
    textDecorationLine: 'underline',
    textDecorationColor: colors.text,
    textDecorationStyle: 'solid',
  },
  indicatorPillContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  indicatorPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  // Saved/Note badges are app chrome (not a user-picked color), so per the
  // "dark mode is grayscale" rule they flip from their brand colors to a
  // plain white pill with black text in dark mode.
  savedPill: {
    backgroundColor: isDark ? '#ffffff' : '#ef4444',
  },
  notePill: {
    backgroundColor: isDark ? '#ffffff' : '#352a48',
  },
  indicatorPillText: {
    fontSize: 9,
    color: isDark ? '#000000' : '#ffffff',
    fontWeight: '700',
  },
  navigationHighlight: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(53,42,72,0.16)',
    borderRadius: 10,
  },
  selectionHighlight: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(53,42,72,0.10)',
    borderRadius: 10,
  },
  savedHighlight: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : ASH.highlightFill,
    borderRadius: 10,
  },
  spotlightHighlight: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.28)' : '#68518e',
    borderRadius: 10,
    marginVertical: 4,
  },
});

export default VerseRow;