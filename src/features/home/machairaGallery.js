import React, { useEffect, useState, useMemo, useRef } from 'react';
import { StyleSheet, View, Image, Pressable, useWindowDimensions, Modal, ScrollView, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { AppText } from '../../components/AppText';
import { supabase } from '../../config/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";
import { File, Directory, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../context/ThemeContext';

export function MachairaGallery() { 
  const navigation = useNavigation(); 
  const { width } = useWindowDimensions();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [activeIndex, setActiveIndex] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const lightboxScrollRef = useRef(null);
  const isMountedRef = useRef(true);

  const horizontalPadding = 20;
  const contentWidth = width - (horizontalPadding * 2);
  const cardHeight = useMemo(() => Math.min(Math.round(contentWidth * 0.52), 220), [contentWidth]);

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
          .limit(4);

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

  useEffect(() => {
    if (activeIndex !== null && lightboxScrollRef.current) {
      lightboxScrollRef.current.scrollTo({ x: activeIndex * width, y: 0, animated: false });
    }
  }, [activeIndex, width]);

  const handleOpenFullGallery = () => {
    if (navigation) {
      navigation.navigate('fullAlbum');
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
            : 'Photo library access is disabled. Enable it in Settings to save images.'
        );
        return;
      }

      const destinationDir = new Directory(Paths.cache, 'gallery_downloads');
      if (!destinationDir.exists) {
        destinationDir.create();
      }

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
    return <View style={[styles.sectionContainer, { height: 120 }]} />;
  }

  if (fetchError && galleryItems.length === 0) {
    return (
      <View style={[styles.sectionContainer, styles.errorContainer]}>
        <AppText numberOfLines={2} style={styles.errorText}>Unable to load gallery right now.</AppText>
      </View>
    );
  }

  return (
    <View style={styles.sectionContainer}>
      {/* Editorial Header */}
      <View style={styles.paddedBlock}>
        <Pressable 
          onPress={handleOpenFullGallery} 
          style={({ pressed }) => [styles.headerWrapper, pressed && styles.pressedState]} 
          accessibilityRole="button" 
          accessibilityLabel="Open Machaira Vault gallery archive"
        >
          <View style={styles.headerTopRow}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.liveIndicator} />
              <AppText style={styles.headerTitle}>GALLERY</AppText>
            </View>
            <BlurView intensity={isDark ? 25 : 50} tint={isDark ? 'dark' : 'light'} style={styles.explorePill}>
              <AppText style={styles.exploreText}>View Archive</AppText>
              <Ionicons name="arrow-forward" size={11} color={colors.text} />
            </BlurView>
          </View>
        </Pressable>
      </View>

      {/* 2x2 Editorial Grid Showcase */}
      <View style={[styles.gridContainer, { paddingHorizontal: horizontalPadding }]}>
        {galleryItems.map((item, index) => (
          <Pressable 
            key={item.id}
            onPress={() => setActiveIndex(index)} 
            style={({ pressed }) => [styles.gridCard, { height: cardHeight }, pressed && styles.pressedState]}
          >
            <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
          </Pressable>
        ))}
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
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="download-outline" size={18} color="#FFFFFF" />
              )}
            </Pressable>
            <Pressable
              style={styles.glassButton}
              onPress={() => setActiveIndex(null)}
            >
              <Ionicons name="close" size={18} color="#FFFFFF" />
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
                style={{ width: width, height: '100%' }}
              >
                {galleryItems.map((item) => (
                  <View key={`lb-${item.id}`} style={[styles.lightboxSlide, { width: width }]}>
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={{ width: width - 32, height: width * 1.25 }}
                      resizeMode="contain"
                    />
                  </View>
                ))}
              </ScrollView>

              <View style={styles.lightboxFooter}>
                <BlurView intensity={50} tint="dark" style={styles.glassFooterPill}>
                  <AppText style={styles.lightboxCounterText}>
                    {activeIndex + 1} / {galleryItems.length}
                  </AppText>
                </BlurView>
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors, isDark) {
  return StyleSheet.create({
    sectionContainer: { paddingVertical: 28, backgroundColor: colors.background, width: '100%' },
    paddedBlock: { paddingHorizontal: 20 },
    headerWrapper: { marginBottom: 18 },
    pressedState: { opacity: 0.9, transform: [{ scale: 0.99 }] },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    liveIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text },
    headerTitle: { fontSize: 11, fontWeight: '900', color: colors.text, letterSpacing: 3 },
    explorePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, overflow: 'hidden', borderWidth: 0.5, borderColor: colors.border },
    exploreText: { fontSize: 10, fontWeight: '700', color: colors.text, letterSpacing: 0.8, textTransform: 'uppercase' },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, width: '100%' },
    gridCard: { width: '48.8%', borderRadius: 16, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 0.5, borderColor: colors.border },
    image: { width: '100%', height: '100%' },
    errorContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
    errorText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    lightboxContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    lightboxTopBar: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', zIndex: 30 },
    glassButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255, 255, 255, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.3)' },
    lightboxSlide: { justifyContent: 'center', alignItems: 'center' },
    lightboxFooter: { position: 'absolute', bottom: 45, width: '100%', alignItems: 'center', zIndex: 20 },
    glassFooterPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)' },
    lightboxCounterText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', letterSpacing: 1 }
  });
}