import React, { useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, View, Image, Pressable, useWindowDimensions, Modal, ScrollView, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { AppText } from '../../components/AppText';
import { supabase } from '../../config/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native'; 
import { File, Directory, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useTheme } from '../../context/ThemeContext';

export function MachairaGallery() { 
  const navigation = useNavigation(); 
  const { width, height } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  // Lightbox Modal State
  const [activeIndex, setActiveIndex] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const lightboxScrollRef = useRef(null);
  const isMountedRef = useRef(true);

  const horizontalPadding = 20;
  const contentWidth = width - (horizontalPadding * 2);
  const heroImageHeight = useMemo(() => Math.min(Math.round(contentWidth * 0.9), 380), [contentWidth]);
  const splitImageHeight = useMemo(() => Math.min(Math.round(contentWidth * 0.55), 240), [contentWidth]);

  useEffect(() => {
    isMountedRef.current = true;

    async function fetchGalleryImages() {
      try {
        setLoading(true);
        setFetchError(false);
        const { data, error } = await supabase
          .from('gallery')
          .select('id, image, created_at')
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) throw error;
        if (!isMountedRef.current) return;

        if (data && data.length > 0) {
          const formattedData = data.map(item => {
            let finalUrl = item.image;
            if (finalUrl && !finalUrl.startsWith('http')) {
              const { data: publicUrlData } = supabase.storage.from('gallery').getPublicUrl(finalUrl);
              finalUrl = publicUrlData?.publicUrl;
            }
            return {
              id: item.id,
              imageUrl: finalUrl,
            };
          });
          setGalleryItems(formattedData);
        }
      } catch (err) {
        console.error('Error fetching gallery images:', err.message);
        if (isMountedRef.current) setFetchError(true);
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    }

    fetchGalleryImages();
    return () => { isMountedRef.current = false; };
  }, []);

  // Keep the lightbox ScrollView in sync whenever activeIndex changes
  // (fixes: contentOffset only applies on initial mount, so re-opening
  // the modal on a different index previously left the scroll position stale)
  useEffect(() => {
    if (activeIndex !== null && lightboxScrollRef.current) {
      lightboxScrollRef.current.scrollTo({ x: activeIndex * width, y: 0, animated: false });
    }
  }, [activeIndex, width]);

  const handleOpenFullGallery = () => {
    if (navigation) {
      navigation.navigate('fullAlbum');
    } else {
      console.warn('Navigation container context is missing');
    }
  };

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

      // Unique filename with timestamp to prevent "Destination already exists" errors
      const uniqueFileName = `machaira_${Date.now()}.jpg`;
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
      // Clean up the cached copy now that MediaLibrary has its own copy —
      // avoids unbounded growth of gallery_downloads over repeated downloads.
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

  if (loading || (galleryItems.length === 0 && !fetchError)) {
    return <View style={[styles.sectionContainer, { height: 100 }]} />;
  }

  // Soft-fail UI: previously errors were swallowed silently with only a
  // console.error, leaving users looking at an empty gap with no explanation.
  if (fetchError && galleryItems.length === 0) {
    return (
      <View style={[styles.sectionContainer, styles.errorContainer]}>
        <AppText numberOfLines={2} style={styles.errorText}>Unable to load gallery right now.</AppText>
      </View>
    );
  }

  return (
    <View style={styles.sectionContainer}>
      <Pressable 
        onPress={handleOpenFullGallery} 
        style={({ pressed }) => [styles.headerWrapper, pressed && styles.pressedState]} 
        accessibilityRole="button" 
        accessibilityLabel="Open Machaira Vault gallery archive"
      >
        <View style={styles.paddedBlock}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.liveIndicator} />
              <AppText numberOfLines={1} ellipsizeMode="tail" style={styles.headerTitle}>SNAPSHOTS</AppText>
            </View>
            <View style={styles.exploreAction}>
              <AppText numberOfLines={1} ellipsizeMode="tail" style={styles.exploreText}>View Album</AppText>
              <Ionicons name="arrow-forward" size={12} color={colors.text} />
            </View>
          </View>
          <View style={styles.headerRule} />
        </View>
      </Pressable>

      {galleryItems[0] && (
        <Pressable 
          onPress={() => setActiveIndex(0)} 
          style={({ pressed }) => [styles.fullBleedHero, { height: heroImageHeight }, pressed && styles.pressedState]}
          accessibilityRole="button"
          accessibilityLabel="Open featured vault image in full screen"
        >
          <Image source={{ uri: galleryItems[0].imageUrl }} style={styles.image} resizeMode="cover" />
        </Pressable>
      )}

      <View style={styles.paddedBlock}>
        <View style={styles.textBridge}>
          <AppText numberOfLines={2} ellipsizeMode="tail" style={styles.quoteBody}>Moments held in time.</AppText>
        </View>
      </View>

      <View style={[styles.fullBleedSplitTrack, { paddingHorizontal: horizontalPadding }]}>
        {galleryItems[1] && (
          <Pressable 
            onPress={() => setActiveIndex(1)} 
            style={({ pressed }) => [styles.splitFrame, { height: splitImageHeight }, pressed && styles.pressedState]}
            accessibilityRole="button"
            accessibilityLabel="Open second vault image in full screen"
          >
            <Image source={{ uri: galleryItems[1].imageUrl }} style={styles.image} resizeMode="cover" />
          </Pressable>
        )}
        {galleryItems[2] && (
          <Pressable 
            onPress={() => setActiveIndex(2)} 
            style={({ pressed }) => [styles.splitFrame, { height: splitImageHeight }, pressed && styles.pressedState]}
            accessibilityRole="button"
            accessibilityLabel="Open third vault image in full screen"
          >
            <Image source={{ uri: galleryItems[2].imageUrl }} style={styles.image} resizeMode="cover" />
          </Pressable>
        )}
      </View>

      <View style={styles.paddedBlock}>
        <View style={styles.bottomBorder} />
      </View>

      {/* Lightbox Modal */}
      <Modal
        visible={activeIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveIndex(null)}
      >
        <View style={styles.lightboxContainer}>
          <StatusBar barStyle="light-content" />
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
                style={{ width: width, height: height }}
              >
                {galleryItems.map((item) => (
                  <View key={`lb-${item.id}`} style={[styles.lightboxSlide, { width: width, height: height }]}>
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={{ width: width, height: height * 0.8 }}
                      resizeMode="contain"
                    />
                  </View>
                ))}
              </ScrollView>

              <View style={styles.lightboxFooter}>
                <View style={styles.glassFooterPill}>
                  <AppText numberOfLines={1} style={styles.lightboxCounterText}>
                    {activeIndex + 1} / {galleryItems.length}
                  </AppText>
                </View>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

// Built from the live theme so the gallery matches light/dark mode.
// The lightbox itself stays near-black in both modes (photo-viewer convention),
// but uses the theme's card color at low opacity for its glass buttons so it
// still shifts subtly with theme.
function createStyles(colors, isDark) {
  return StyleSheet.create({
    sectionContainer: { paddingVertical: 32, backgroundColor: colors.background, width: '100%' },
    paddedBlock: { paddingHorizontal: 20 },
    headerWrapper: { marginBottom: 20 },
    pressedState: { opacity: 0.85 },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    headerTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, minWidth: 0 },
    liveIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text },
    headerTitle: { fontSize: 10, fontWeight: '900', color: colors.text, letterSpacing: 3.5, flexShrink: 1 },
    exploreAction: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
    exploreText: { fontSize: 11, fontWeight: '700', color: colors.text, letterSpacing: 0.5, textTransform: 'uppercase' },
    headerRule: { height: 1.5, backgroundColor: colors.text, width: '100%' },
    fullBleedHero: { width: '100%', backgroundColor: colors.card, overflow: 'hidden' },
    textBridge: { paddingVertical: 32, alignItems: 'center' },
    quoteBody: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, fontWeight: '500', letterSpacing: 0.2, textAlign: 'center', maxWidth: '80%', textTransform: 'uppercase' },
    fullBleedSplitTrack: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    splitFrame: { width: '48.8%', backgroundColor: colors.card, overflow: 'hidden' },
    image: { width: '100%', height: '100%' },
    bottomBorder: { height: 1, backgroundColor: colors.border, marginTop: 32 },
    errorContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
    errorText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    lightboxContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
    lightboxTopBar: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 30 },
    glassButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
    lightboxSlide: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
    lightboxFooter: { position: 'absolute', bottom: 45, width: '100%', alignItems: 'center', zIndex: 20 },
    glassFooterPill: { backgroundColor: 'rgba(0, 0, 0, 0.6)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
    lightboxCounterText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' }
  });
}
