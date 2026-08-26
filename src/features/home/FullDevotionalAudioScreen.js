import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Pressable, Image, Dimensions, ScrollView, Alert, ActivityIndicator, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, Play, Pause, RotateCcw, RotateCw, Download, BookOpen, AlertCircle } from 'lucide-react-native';
import { AppText } from '../../components/AppText';
import { useTheme } from '../../context/ThemeContext';
import { useAudio } from '../../context/AudioContext';
import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const artworkMaxWidth = Math.min(width - 40, 520);

export function FullDevotionalAudioScreen({ route, navigation }) {
  const { colors, isDark } = useTheme();

  const {
    currentTrack,
    isPlaying,
    isLoading: isLoadingAudio,
    error: loadError,
    currentTime,
    duration,
    playAudio,
    togglePlayPause,
    seekTo,
    skipBy,
  } = useAudio();

  const routeDevotional = route?.params?.devotional || null;

  const devotional = currentTrack || routeDevotional;

  const [isDownloading, setIsDownloading] = useState(false);
  const [isControlBusy, setIsControlBusy] = useState(false);

  const [artworkAspectRatio, setArtworkAspectRatio] = useState(1);

  const isMountedRef = useRef(true);
  const progressBarWidthRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Kick off playback only if this screen was opened with a devotional that
  // isn't already the one playing — prevents restarting from 0 every time
  // the user re-opens the full screen for a track that's already playing.
  useEffect(() => {
    if (!routeDevotional?.audioUrl) return;
    if (currentTrack?.audioUrl === routeDevotional.audioUrl) return;
    playAudio(routeDevotional, routeDevotional.audioUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeDevotional?.audioUrl]);

  // Resolve artwork's natural dimensions so the container can be sized to
  // the image's real aspect ratio instead of a forced square.
  useEffect(() => {
    if (!devotional?.image) return;

    if (typeof devotional.image === 'string') {
      Image.getSize(
        devotional.image,
        (w, h) => {
          if (isMountedRef.current && w > 0 && h > 0) {
            setArtworkAspectRatio(w / h);
          }
        },
        (error) => {
          console.error('Failed to resolve image size:', error);
        }
      );
    } else {
      const resolved = Image.resolveAssetSource(devotional.image);
      if (resolved?.width && resolved?.height) {
        setArtworkAspectRatio(resolved.width / resolved.height);
      }
    }
  }, [devotional?.image]);

  // Draggable progress bar
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPercent, setScrubPercent] = useState(0);

  const scrubPercentRef = useRef(0);
  const durationRef = useRef(duration);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const updateScrubFromTouch = (evt) => {
    const barWidth = progressBarWidthRef.current || 1;
    const x = Math.min(Math.max(evt.nativeEvent.locationX, 0), barWidth);
    const pct = (x / barWidth) * 100;
    scrubPercentRef.current = pct;
    setScrubPercent(pct);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsScrubbing(true);
        updateScrubFromTouch(evt);
      },
      onPanResponderMove: (evt) => {
        updateScrubFromTouch(evt);
      },
      onPanResponderRelease: () => {
        const targetSec = (scrubPercentRef.current / 100) * (durationRef.current ?? 0);
        seekTo(targetSec);
        setIsScrubbing(false);
      },
      onPanResponderTerminate: () => {
        setIsScrubbing(false);
      },
    })
  ).current;

  const withControlGuard = (fn) => async () => {
    if (isControlBusy) return;
    setIsControlBusy(true);
    try {
      await fn();
    } catch (error) {
      console.error('Playback control error:', error);
    } finally {
      if (isMountedRef.current) setIsControlBusy(false);
    }
  };

  const handleTogglePlay = withControlGuard(async () => {
    Haptics.selectionAsync().catch(() => {});
    togglePlayPause();
  });

  const handleSkipForward = withControlGuard(async () => {
    Haptics.selectionAsync().catch(() => {});
    skipBy(15);
  });

  const handleSkipBackward = withControlGuard(async () => {
    Haptics.selectionAsync().catch(() => {});
    skipBy(-15);
  });

  // Chevron-down no longer stops playback — it just dismisses this screen.
  // Since playback lives in AudioContext (above this screen in the tree),
  // audio keeps playing and the mini player picks up automatically.
  const handleMinimize = () => {
    navigation.goBack();
  };

  const handleDownload = async () => {
    if (!devotional?.audioUrl || isDownloading) return;

    let downloadedFile = null;
    try {
      setIsDownloading(true);
      Haptics.selectionAsync().catch(() => {});

      const filename = devotional.audioUrl.split('/').pop() || 'devotional.mp3';
      const decodedFilename = decodeURIComponent(filename);

      const destinationDir = new Directory(Paths.document);
      downloadedFile = await File.downloadFileAsync(devotional.audioUrl, destinationDir);

      if (downloadedFile.name !== decodedFilename) {
        try {
          downloadedFile.move(new File(destinationDir, decodedFilename));
        } catch (renameError) {
          console.error('Rename after download failed (continuing with original name):', renameError);
        }
      }

      if (!downloadedFile.exists) {
        throw new Error('Download did not produce a file.');
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadedFile.uri);
      } else {
        Alert.alert('Success', 'Audio downloaded successfully!');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Download Failed', 'Something went wrong while downloading. Please try again.');
      try {
        if (downloadedFile?.exists) {
          downloadedFile.delete();
        }
      } catch (cleanupError) {
        console.error('Failed to clean up partial download:', cleanupError);
      }
    } finally {
      if (isMountedRef.current) setIsDownloading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!devotional) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerEmpty, { backgroundColor: colors.background }]}>
        <AppText type="bold" style={[styles.trackTitle, { color: colors.text }]}>
          No Devotional Found
        </AppText>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.backButtonSimple, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <AppText type="bold" style={{ color: colors.onPrimary }}>Go Back</AppText>
        </Pressable>
      </SafeAreaView>
    );
  }

  const positionSec = currentTime ?? 0;
  const durationSec = duration ?? (devotional?.duration || 0);
  const livePercent = durationSec > 0 ? (positionSec / durationSec) * 100 : 0;
  const progressPercent = isScrubbing ? scrubPercent : livePercent;
  const displayedPositionSec = isScrubbing ? (scrubPercent / 100) * durationSec : positionSec;

  const artworkWidth = artworkMaxWidth;
  const artworkHeight = artworkMaxWidth / (artworkAspectRatio || 1);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header Bar */}
      <View style={styles.header}>
        <Pressable
          onPress={handleMinimize}
          style={[styles.headerButton, { backgroundColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Minimize player"
        >
          <ChevronDown color={colors.text} size={24} />
        </Pressable>

        <Pressable
          onPress={handleDownload}
          disabled={isDownloading || !devotional?.audioUrl}
          style={[styles.headerButton, { backgroundColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Download audio"
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Download color={colors.text} size={20} />
          )}
        </Pressable>
      </View>

      {/* Scrollable Body */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={styles.artworkContainer}>
          <View
            style={[
              styles.artworkWrapper,
              {
                width: artworkWidth,
                height: artworkHeight,
                shadowColor: colors.primary,
                backgroundColor: colors.surfaceMuted,
              },
            ]}
          >
            {devotional.image ? (
              <Image
                source={typeof devotional.image === 'string' ? { uri: devotional.image } : devotional.image}
                style={styles.artworkImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.artworkImage, { alignItems: 'center', justifyContent: 'center' }]}>
                <BookOpen color={colors.textSecondary} size={48} />
              </View>
            )}
          </View>
        </View>

        <View style={styles.trackDetails}>
          <AppText type="bold" numberOfLines={2} style={[styles.trackTitle, { color: colors.text }]}>
            {devotional.title}
          </AppText>
          {devotional.speaker && (
            <AppText type="regular" numberOfLines={1} style={[styles.trackSubtitle, { color: colors.textSecondary }]}>
              {devotional.speaker}
            </AppText>
          )}
        </View>

        {loadError ? (
          <View style={styles.errorContainer}>
            <AlertCircle color={colors.textSecondary} size={20} />
            <AppText type="regular" style={[styles.errorText, { color: colors.textSecondary }]}>
              {loadError}
            </AppText>
          </View>
        ) : (
          <View style={styles.progressContainer}>
            <View
              style={styles.progressHitArea}
              onLayout={(e) => {
                progressBarWidthRef.current = e.nativeEvent.layout.width;
              }}
              {...panResponder.panHandlers}
            >
              <View style={[styles.progressBarBackground, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: colors.primary,
                      width: `${progressPercent}%`,
                    },
                  ]}
                />
              </View>
              <View
                pointerEvents="none"
                style={[
                  styles.progressThumb,
                  {
                    backgroundColor: colors.primary,
                    left: `${progressPercent}%`,
                    transform: [{ translateX: -8 }, { scale: isScrubbing ? 1.3 : 1 }],
                  },
                ]}
              />
            </View>
            <View style={styles.timeRow}>
              <AppText type="regular" style={[styles.timeText, { color: colors.textSecondary }]}>
                {formatTime(displayedPositionSec)}
              </AppText>
              <AppText type="regular" style={[styles.timeText, { color: colors.textSecondary }]}>
                {formatTime(durationSec)}
              </AppText>
            </View>
          </View>
        )}

        {/* Interactive Playback Controls */}
        <View style={styles.controlsContainer}>
          <Pressable
            onPress={handleSkipBackward}
            disabled={isLoadingAudio || !!loadError}
            style={[styles.secondaryControl, (isLoadingAudio || loadError) && styles.controlDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Rewind 15 seconds"
          >
            <RotateCcw color={colors.text} size={24} />
          </Pressable>

          <Pressable
            onPress={handleTogglePlay}
            disabled={isLoadingAudio || !!loadError}
            style={[
              styles.mainPlayButton,
              { backgroundColor: colors.primary },
              (isLoadingAudio || loadError) && styles.controlDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoadingAudio ? (
              <ActivityIndicator size="small" color={colors.onPrimary} />
            ) : isPlaying ? (
              <Pause color={colors.onPrimary} size={30} fill={colors.onPrimary} />
            ) : (
              <Play color={colors.onPrimary} size={30} fill={colors.onPrimary} style={{ marginLeft: 3 }} />
            )}
          </Pressable>

          <Pressable
            onPress={handleSkipForward}
            disabled={isLoadingAudio || !!loadError}
            style={[styles.secondaryControl, (isLoadingAudio || loadError) && styles.controlDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Forward 15 seconds"
          >
            <RotateCw color={colors.text} size={24} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  centerEmpty: { justifyContent: 'center', alignItems: 'center' },
  backButtonSimple: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  header: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  headerButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  artworkContainer: { width: '100%', alignItems: 'center', marginVertical: 12 },
  artworkWrapper: { borderRadius: 20, overflow: 'hidden', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6, alignItems: 'center', justifyContent: 'center' },
  artworkImage: { width: '100%', height: '100%' },
  trackDetails: { width: '100%', alignItems: 'center', marginVertical: 12, paddingHorizontal: 8 },
  trackTitle: { fontSize: 17, textAlign: 'center', marginBottom: 6 },
  trackSubtitle: { fontSize: 13, textAlign: 'center' },
  progressContainer: { width: '100%', marginVertical: 12, paddingHorizontal: 4 },
  progressHitArea: { width: '100%', height: 32, justifyContent: 'center' },
  progressBarBackground: { height: 6, borderRadius: 3, overflow: 'hidden', width: '100%' },
  progressBarFill: { height: '100%', borderRadius: 3 },
  progressThumb: { position: 'absolute', width: 16, height: 16, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 3 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  timeText: { fontSize: 11 },
  errorContainer: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginVertical: 16, paddingHorizontal: 16 },
  errorText: { fontSize: 13, textAlign: 'center', flexShrink: 1 },
  controlsContainer: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32, marginTop: 16, marginBottom: 8 },
  secondaryControl: { padding: 10 },
  controlDisabled: { opacity: 0.4 },
  mainPlayButton: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 5 },
});
