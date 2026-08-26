import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { supabase } from '../../config/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { File, Directory, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Image } from 'expo-image';
import { useTheme } from '../../context/ThemeContext';

const { width, height } = Dimensions.get('window');
const COLUMN_GAP = 8;
const SIDE_PADDING = 16;
const COLUMN_WIDTH = (width - (SIDE_PADDING * 2) - COLUMN_GAP) / 2;
const PAGE_SIZE = 30;
// Trigger the next page fetch once the user scrolls within this many px of the bottom.
const END_REACHED_THRESHOLD_PX = 400;

export default function DevotionalGalleryScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Lightbox State
  const [activeIndex, setActiveIndex] = useState(null);
  const lightboxScrollRef = useRef(null);
  const isMountedRef = useRef(true);
  // Guards against onEndReached firing multiple times for the same page
  // before the fetch has resolved and updated `hasMore`/`loadingMore`.
  const fetchInFlightRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchGalleryImages = useCallback(async (isRefresh = false, targetPage = 0) => {
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;
    try {
      if (isRefresh) setRefreshing(true);
      else if (targetPage === 0) setLoading(true);
      else setLoadingMore(true);

      const { data, error } = await supabase
        .from('gallery')
        .select('id, image, created_at')
        .order('created_at', { ascending: false })
        .range(targetPage * PAGE_SIZE, (targetPage + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      if (!isMountedRef.current) return;

      if (data && data.length > 0) {
        const formattedData = await Promise.all(
          data.map(async (item) => {
            let finalUrl = item.image;
            if (finalUrl && !finalUrl.startsWith('http')) {
              const { data: publicUrlData } = supabase.storage
                .from('gallery')
                .getPublicUrl(finalUrl);
              finalUrl = publicUrlData?.publicUrl;
            }

            // Pinterest Uneven Layout Hash Engine — deterministic per-item
            // "random" height so a given image always gets the same card
            // size across refreshes/re-renders instead of jumping around.
            let hash = 0;
            const strId = String(item.id || Math.random());
            for (let i = 0; i < strId.length; i++) {
              hash = strId.charCodeAt(i) + ((hash << 5) - hash);
            }
            // Five height buckets (px) tuned to give a believable masonry
            // look at this column width without any card feeling too
            // short (cramped footer) or too tall (dominates the scroll).
            const HEIGHT_BUCKETS_PX = [160, 210, 270, 340, 420];
            let computedHeight = HEIGHT_BUCKETS_PX[Math.abs(hash) % HEIGHT_BUCKETS_PX.length];
            
            return {
              id: item.id,
              imageUrl: finalUrl,
              height: computedHeight,
              dateFormatted: item.created_at
                ? new Date(item.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '',
            };
          })
        );

        if (!isMountedRef.current) return;

        if (isRefresh || targetPage === 0) {
          setGalleryItems(formattedData);
        } else {
          setGalleryItems((prev) => [...prev, ...formattedData]);
        }
        setHasMore(data.length === PAGE_SIZE);
        setPage(targetPage);
      } else {
        if (targetPage === 0) setGalleryItems([]);
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error fetching gallery:', err.message);
      if (isMountedRef.current) {
        Alert.alert('Something went wrong', 'Could not load the gallery. Pull down to try again.');
      }
    } finally {
      fetchInFlightRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchGalleryImages(false, 0);
  }, [fetchGalleryImages]);

  const handleRefresh = useCallback(() => {
    fetchGalleryImages(true, 0);
  }, [fetchGalleryImages]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || refreshing || loading || !hasMore) return;
    fetchGalleryImages(false, page + 1);
  }, [fetchGalleryImages, loadingMore, refreshing, loading, hasMore, page]);

  const handleScroll = useCallback(({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    if (distanceFromBottom < END_REACHED_THRESHOLD_PX) {
      handleLoadMore();
    }
  }, [handleLoadMore]);

  // Optimized, memoized Pinterest column distribution
  const { leftColumn, rightColumn } = useMemo(() => {
    const left = [];
    const right = [];
    let leftHeight = 0;
    let rightHeight = 0;

    galleryItems.forEach((item, index) => {
      if (leftHeight <= rightHeight) {
        left.push({ item, globalIndex: index });
        leftHeight += item.height + COLUMN_GAP;
      } else {
        right.push({ item, globalIndex: index });
        rightHeight += item.height + COLUMN_GAP;
      }
    });

    return { leftColumn: left, rightColumn: right };
  }, [galleryItems]);

  // Keeps the lightbox ScrollView synced whenever activeIndex changes —
  // contentOffset only applies on initial mount, so without this, jumping
  // to a different pin while already viewing one would leave the scroll
  // position stale.
  useEffect(() => {
    if (activeIndex !== null && lightboxScrollRef.current) {
      lightboxScrollRef.current.scrollTo({ x: activeIndex * width, y: 0, animated: false });
    }
  }, [activeIndex]);

  const handleDownload = async (imageUrl) => {
    if (!imageUrl || downloading) return;
    let localFile = null;
    try {
      setDownloading(true);
      const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        if (isMountedRef.current) setDownloading(false);
        Alert.alert(
          'Permission needed',
          canAskAgain
            ? 'Allow photo library access to save this image.'
            : 'Photo library access is disabled. Enable it in Settings to save images.',
        );
        return;
      }

      const destinationDir = new Directory(Paths.cache, 'gallery_downloads');
      if (!destinationDir.exists) {
        destinationDir.create();
      }

      // Unique filename with timestamp — downloadFileAsync needs a File
      // target, not a bare Directory, or repeated downloads can collide
      // on a fixed name and overwrite one another.
      const uniqueFileName = `devotional_${Date.now()}.jpg`;
      localFile = new File(destinationDir, uniqueFileName);

      const downloadedFile = await File.downloadFileAsync(imageUrl, localFile);
      await MediaLibrary.createAssetAsync(downloadedFile.uri);

      if (isMountedRef.current) {
        Alert.alert('Saved', 'Image saved to your photo library.');
      }
    } catch (err) {
      console.error('Download error:', err);
      if (isMountedRef.current) {
        Alert.alert('Download failed', 'Something went wrong saving this image. Please try again.');
      }
    } finally {
      // Remove the cached copy now that MediaLibrary has its own —
      // otherwise gallery_downloads grows without bound over time.
      try {
        if (localFile?.exists) {
          localFile.delete();
        }
      } catch (cleanupErr) {
        console.warn('Cache cleanup failed:', cleanupErr);
      }
      if (isMountedRef.current) setDownloading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <View style={styles.header}>
        <View>
          <AppText style={styles.title}>Psalms & Snapshots</AppText>
          <AppText style={styles.subtitle}>We saved two of everything. Mostly selfies !</AppText>
        </View>
        <Pressable
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressedState]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Close gallery"
        >
          <Ionicons name="close" size={20} color={colors.text} />
        </Pressable>
      </View>

      {loading && galleryItems.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : galleryItems.length === 0 ? (
        <View style={styles.centered}>
          <AppText style={styles.emptyText}>No inspiration found.</AppText>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={handleScroll}
          scrollEventThrottle={200}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <View style={styles.pinterestGrid}>
            <View style={styles.column}>
              {leftColumn.map(({ item, globalIndex }) => (
                <Pressable
                  key={`col-l-${item.id}`}
                  style={({ pressed }) => [styles.pinCard, pressed && styles.pressedState]}
                  onPress={() => setActiveIndex(globalIndex)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open photo from ${item.dateFormatted}`}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={[styles.pinImage, { height: item.height }]}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={styles.pinFooter}>
                    <AppText numberOfLines={1} style={styles.pinDateText}>{item.dateFormatted}</AppText>
                  </View>
                </Pressable>
              ))}
            </View>

            <View style={styles.column}>
              {rightColumn.map(({ item, globalIndex }) => (
                <Pressable
                  key={`col-r-${item.id}`}
                  style={({ pressed }) => [styles.pinCard, pressed && styles.pressedState]}
                  onPress={() => setActiveIndex(globalIndex)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open photo from ${item.dateFormatted}`}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={[styles.pinImage, { height: item.height }]}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={styles.pinFooter}>
                    <AppText numberOfLines={1} style={styles.pinDateText}>{item.dateFormatted}</AppText>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {loadingMore && (
            <View style={styles.loadMoreFooter}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        visible={activeIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveIndex(null)}
      >
        <View style={styles.lightboxContainer}>
          <View style={styles.lightboxTopBar}>
            <Pressable
              style={styles.glassButton}
              onPress={() => handleDownload(galleryItems[activeIndex]?.imageUrl)}
              disabled={downloading}
              accessibilityRole="button"
              accessibilityLabel="Download image"
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              )}
            </Pressable>
            <Pressable
              style={styles.glassButton}
              onPress={() => setActiveIndex(null)}
              accessibilityRole="button"
              accessibilityLabel="Close full screen view"
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {activeIndex !== null && galleryItems.length > 0 && (
            <>
              <ScrollView
                ref={lightboxScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentOffset={{ x: activeIndex * width, y: 0 }}
                onMomentumScrollEnd={(e) => {
                  const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
                  setActiveIndex(newIndex);
                }}
                style={styles.lightboxScroll}
              >
                {galleryItems.map((item) => (
                  <View key={`lb-${item.id}`} style={styles.lightboxSlide}>
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.lightboxImage}
                      contentFit="contain"
                    />
                  </View>
                ))}
              </ScrollView>

              <View style={styles.lightboxFooter}>
                <View style={styles.glassFooterPill}>
                  <AppText style={styles.lightboxCounterText}>
                    {activeIndex + 1} / {galleryItems.length}
                  </AppText>
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Built from the live theme so this screen matches light/dark mode.
// The lightbox stays near-black in both modes (standard photo-viewer
// convention) since dimming it to card colors would look wrong behind
// full-bleed images.
function createStyles(colors, isDark) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: SIDE_PADDING,
      paddingVertical: 12,
      backgroundColor: colors.background,
    },
    title: { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.4 },
    subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2, fontWeight: '400' },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollContent: { paddingHorizontal: SIDE_PADDING, paddingTop: 8, paddingBottom: 60 },
    pinterestGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    column: { width: COLUMN_WIDTH },
    pinCard: {
      width: '100%',
      marginBottom: COLUMN_GAP,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.card,
      position: 'relative',
    },
    pinImage: { width: '100%' },
    pinFooter: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: 'rgba(0,0,0,0.3)',
    },
    pinDateText: { color: '#FFFFFF', fontSize: 11, fontWeight: '500', flex: 1 },
    loadMoreFooter: { paddingVertical: 24, alignItems: 'center' },
    lightboxContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
    lightboxTopBar: {
      position: 'absolute',
      top: 50,
      left: 20,
      right: 20,
      flexDirection: 'row',
      justifyContent: 'space-between',
      zIndex: 30,
    },
    glassButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    lightboxScroll: { width: width, height: height },
    lightboxSlide: { width: width, height: height, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
    lightboxImage: { width: width, height: height * 0.8 },
    lightboxFooter: {
      position: 'absolute',
      bottom: 45,
      width: '100%',
      alignItems: 'center',
      zIndex: 20,
    },
    glassFooterPill: {
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
    },
    lightboxCounterText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
    pressedState: { opacity: 0.9, transform: [{ scale: 0.98 }] },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
    emptyText: { fontSize: 14, color: colors.textSecondary },
  });
}
