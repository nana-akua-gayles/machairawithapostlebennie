import React, { useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, Animated, PanResponder, Dimensions } from 'react-native';
import { Play, Pause, X, Volume2 } from 'lucide-react-native';
import { navigationRef } from "../../../App";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { useAudio } from '../../context/AudioContext';
import { useTheme } from '../../context/ThemeContext';

const { height: screenHeight } = Dimensions.get('window');

const TAB_BAR_BASE_HEIGHT = 64;
const GAP_ABOVE_TAB_BAR = 8;
const BAR_HEIGHT_ESTIMATE = 62;

export function MiniAudioPlayer() {
  const { colors, isDark } = useTheme();
  const { currentTrack, isPlaying, pauseAudio, resumeAudio, stopAudio, focusedRouteName } = useAudio();
  const insets = useSafeAreaInsets();

  const isOnFullPlayerScreen = focusedRouteName === 'FullDevotionalAudio';

  const tabBarHeight = TAB_BAR_BASE_HEIGHT + insets.bottom;
  const defaultBottomOffset = tabBarHeight + GAP_ABOVE_TAB_BAR;

  const translateY = useRef(new Animated.Value(0)).current;
  const lastOffsetRef = useRef(0);

  const minTranslateY = -(screenHeight - defaultBottomOffset - BAR_HEIGHT_ESTIMATE - insets.top - 20);
  const maxTranslateY = tabBarHeight;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderGrant: () => {
        translateY.setOffset(lastOffsetRef.current);
        translateY.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        const proposed = lastOffsetRef.current + gestureState.dy;
        const clamped = Math.min(Math.max(proposed, minTranslateY), maxTranslateY);
        translateY.setValue(clamped - lastOffsetRef.current);
      },
      onPanResponderRelease: (evt, gestureState) => {
        translateY.flattenOffset();
        const proposed = lastOffsetRef.current + gestureState.dy;
        const clamped = Math.min(Math.max(proposed, minTranslateY), maxTranslateY);
        lastOffsetRef.current = clamped;
        translateY.setValue(clamped);
      },
      onPanResponderTerminate: () => {
        translateY.flattenOffset();
      },
    })
  ).current;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPlaying]);

  if (!currentTrack || isOnFullPlayerScreen) return null;

  const handleTogglePlay = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      resumeAudio();
    }
  };

  const handleExpandPlayer = () => {
  if (navigationRef.isReady()) {
    navigationRef.navigate('FullDevotionalAudio');
  }
};

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: defaultBottomOffset,
          backgroundColor: colors.card,
          borderColor: colors.border,
          transform: [{ translateY }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Pressable
        onPress={handleExpandPlayer}
        style={styles.expandableArea}
        accessibilityRole="button"
        accessibilityLabel="Open full player view"
      >
        <View style={[styles.iconWrapper, { backgroundColor: colors.surfaceActive }]}>
          <Volume2 color={colors.primary} size={18} />
        </View>

        <View style={styles.trackInfo}>
          <View style={styles.statusRow}>
            <Animated.View
              style={[
                styles.liveDot,
                { backgroundColor: isPlaying ? '#10b981' : '#f59e0b', transform: [{ scale: pulseAnim }] },
              ]}
            />
            <AppText type="regular" style={[styles.statusText, { color: colors.textSecondary }]}>
              {isPlaying ? 'Now Playing' : 'Paused'}
            </AppText>
          </View>
          <AppText type="bold" numberOfLines={1} style={[styles.titleText, { color: colors.text }]}>
            {currentTrack?.title || 'Devotional Audio'}
          </AppText>
        </View>
      </Pressable>

      <View style={styles.controls}>
        <Pressable
          onPress={handleTogglePlay}
          style={[styles.playButton, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
        >
          {isPlaying ? (
            <Pause color={colors.onPrimary} size={16} fill={colors.onPrimary} />
          ) : (
            <Play color={colors.onPrimary} size={16} fill={colors.onPrimary} style={styles.playOffset} />
          )}
        </Pressable>

        <Pressable
          onPress={stopAudio}
          style={[styles.closeButton, { backgroundColor: colors.surfaceMuted }]}
          accessibilityRole="button"
          accessibilityLabel="Close audio player"
        >
          <X color={colors.textSecondary} size={16} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 14, right: 14, borderRadius: 16, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 6, zIndex: 999 },
  expandableArea: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  iconWrapper: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  trackInfo: { flex: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  titleText: { fontSize: 13 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 2 },
  playOffset: { marginLeft: 2 },
  closeButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
