import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, FlatList, ActivityIndicator, Dimensions, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import { AppText } from "../../components/AppText";
import { ChevronRight, Play, Star, ShoppingBag } from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "../../config/supabaseClient";
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CARD_WIDTH = SCREEN_WIDTH * 0.38;
const CARD_IMAGE_HEIGHT = CARD_WIDTH * 1.1;
const STORE_PREVIEW_LIMIT = 5;
const ARTICLES_PREVIEW_LIMIT = 5;
const FEATURED_PREVIEW_LIMIT = 5;

const formatPrice = (price) => {
  const numeric = typeof price === "number" ? price : Number(price);
  if (Number.isNaN(numeric)) return "";
  return `GH₵${numeric.toFixed(2)}`;
};

export const LibraryScreen = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [refreshing, setRefreshing] = useState(false);

  const { 
    data: trendingArticles, 
    isLoading: isArticlesLoading, 
    error: articlesError, 
    refetch: refetchArticles 
  } = useQuery({
    queryKey: ['articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(ARTICLES_PREVIEW_LIMIT);
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, 
  });

  const { 
    data: featuredArticles, 
    isLoading: isFeaturedLoading, 
    error: featuredError,
    refetch: refetchFeatured
  } = useQuery({
    queryKey: ['featured_articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("featured_articles")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(FEATURED_PREVIEW_LIMIT);
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: storeItems = [],
    isLoading: isStoreLoading,
    error: storeError,
    refetch: refetchStore,
  } = useQuery({
    queryKey: ['store_items_preview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(STORE_PREVIEW_LIMIT);
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchArticles(),
        refetchFeatured(),
        refetchStore(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchArticles, refetchFeatured, refetchStore]);

  const activeFeature = featuredArticles?.find(item => item.is_active) || featuredArticles?.[0];
  const archivedFeatures = featuredArticles?.filter(item => item.id !== activeFeature?.id) || [];

  const audioSermons = [
    { id: 1, title: "The Momentum Secret", duration: "12:30", image: require('../../../assets/images/sermon1.jpg') },
    { id: 2, title: "At the Scent of Water", duration: "15:45", image: require('../../../assets/images/sermon2.jpg') },
    { id: 3, title: "Unleashed", duration: "10:20", image: require('../../../assets/images/sermon3.jpg') },
  ];

  if (isArticlesLoading || isFeaturedLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (articlesError || featuredError) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background, paddingTop: insets.top, paddingHorizontal: 20 }]}>
        <AppText style={{ color: colors.text, textAlign: 'center', marginBottom: 12, fontSize: 16 }}>
          Could not load library content. Please check your connection.
        </AppText>
        <Pressable 
          onPress={() => refetchArticles()} 
          style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Retry loading content"
        >
          <AppText style={{ color: colors.onPrimary, fontWeight: 'bold' }}>Retry</AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppText type="bold" style={[styles.mainTitle, { color: colors.text }]}>Library</AppText>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary} 
            colors={[colors.primary]} 
          />
        }
      >
        {activeFeature && (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <AppText type="bold" style={{ fontSize: 20, color: colors.text }}>Featured Articles</AppText>
      <Pressable 
        style={styles.seeAllBtn}
        onPress={() => navigation.navigate('FeaturedArchive', { featuredList: featuredArticles })}
        accessibilityRole="button"
        accessibilityLabel="View all featured articles"
      >
        <AppText style={{ color: colors.primary, marginRight: 4 }}>See All</AppText>
        <ChevronRight color={colors.primary} size={16} />
      </Pressable>
    </View>

    <Pressable 
      style={[styles.heroFeature, { backgroundColor: colors.card, borderColor: colors.border }]} 
      onPress={() => navigation.navigate('ArticleDetails', { 
        initialIndex: 0,
        articlesList: [activeFeature] 
      })}
      accessibilityRole="button"
      accessibilityLabel={`${activeFeature.subtitle || 'WEEKLY FEATURE'}: ${activeFeature.title}`}
    >
      <Image 
        source={{ uri: activeFeature.hero_image_url }} 
        style={styles.heroImage}
        contentFit="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.75)']}
        style={styles.heroOverlay}
      >
        <AppText type="bold" style={styles.heroBadge}>
          {activeFeature.subtitle || 'WEEKLY FEATURE'}
        </AppText>
        <AppText type="bold" style={styles.heroTitle} numberOfLines={2}>
          {activeFeature.title}
        </AppText>
      </LinearGradient>
    </Pressable>
  </View>
)}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText type="bold" style={{ fontSize: 20, color: colors.text }}>Trending Articles</AppText>
            <Pressable 
              style={styles.seeAllBtn}
              onPress={() => navigation.navigate('AllArticles', { articlesList: trendingArticles })}
              accessibilityRole="button"
              accessibilityLabel="View all past trending articles"
            >
              <AppText style={{ color: colors.primary, marginRight: 4 }}>See All</AppText>
              <ChevronRight color={colors.primary} size={16} />
            </Pressable>
          </View>
          
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={trendingArticles}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
            renderItem={({ item, index }) => (
              <Pressable 
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('ArticleDetails', { 
                  initialIndex: index,
                  articlesList: trendingArticles 
                })}
                accessibilityRole="button"
                accessibilityLabel={`Article: ${item.title}`}
              >
                <Image source={{ uri: item.image_url }} style={styles.cardImage} contentFit="cover" />
                <View style={styles.cardTextContainer}>
                  <AppText type="semiBold" style={[styles.cardText, { color: colors.text }]} numberOfLines={2}>
                    {item.title}
                  </AppText>
                </View>
              </Pressable>
            )}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText type="bold" style={{ fontSize: 20, color: colors.text }}>Audio Messages</AppText>
            <Pressable 
              style={styles.seeAllBtn}
              onPress={() => navigation.navigate('AllAudio', { audioList: audioSermons })}
              accessibilityRole="button"
              accessibilityLabel="See all audio messages"
            >
              <AppText style={{ color: colors.primary, marginRight: 4 }}>See All</AppText>
              <ChevronRight color={colors.primary} size={16} />
            </Pressable>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={audioSermons}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
            renderItem={({ item }) => (
              <Pressable 
                style={[styles.audioCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={`Audio message: ${item.title}, duration ${item.duration}`}
              >
                <View style={styles.imageContainer}>
                  <Image source={item.image} style={styles.audioImage} contentFit="cover" />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.gradientOverlay}
                  />
                  <View style={styles.centeredPlayIcon}>
                    <Play size={28} color={colors.onPrimary} fill={colors.onPrimary} />
                  </View>
                </View>
                <View style={styles.audioCardContent}>
                  <AppText type="semiBold" style={{ fontSize: 13, color: colors.text }} numberOfLines={2}>
                    {item.title}
                  </AppText>
                  <AppText numberOfLines={1} style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                    {item.duration}
                  </AppText>
                </View>
              </Pressable>
            )}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText type="bold" style={{ fontSize: 20, color: colors.text }}>Store</AppText>
            <Pressable 
              style={styles.seeAllBtn}
              onPress={() => navigation.navigate('AllStore')}
              accessibilityRole="button"
              accessibilityLabel="See all store items"
            >
              <AppText style={{ color: colors.primary, marginRight: 4 }}>See All</AppText>
              <ChevronRight color={colors.primary} size={16} />
            </Pressable>
          </View>

          {isStoreLoading ? (
            <View style={styles.storeLoadingRow}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={[styles.shopCard, styles.shopSkeleton, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.shopImage, { backgroundColor: colors.border }]} />
                </View>
              ))}
            </View>
          ) : storeError ? (
            <View style={styles.sectionMessageBox}>
              <AppText style={{ color: colors.textSecondary, fontSize: 13 }}>Couldn't load store items.</AppText>
              <Pressable onPress={() => refetchStore()} accessibilityRole="button" accessibilityLabel="Retry loading store items">
                <AppText style={{ color: colors.primary, fontWeight: '700', marginTop: 6 }}>Retry</AppText>
              </Pressable>
            </View>
          ) : storeItems.length === 0 ? (
            <View style={styles.sectionMessageBox}>
              <AppText style={{ color: colors.textSecondary, fontSize: 13 }}>No items in the store yet.</AppText>
            </View>
          ) : (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={storeItems}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
              renderItem={({ item }) => (
                <Pressable 
                  style={[styles.shopCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('StoreItemDetails', { item })}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title}, ${formatPrice(item.price)}`}
                >
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.shopImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.shopImage, styles.shopImageFallback, { backgroundColor: colors.border }]}>
                      <ShoppingBag size={20} color={colors.textSecondary} />
                    </View>
                  )}
                  <AppText type="semiBold" numberOfLines={1} style={{ color: colors.text, fontSize: 14 }}>{item.title}</AppText>
                  <View style={[styles.priceTag, { backgroundColor: colors.primary }]}>
                    <AppText type="bold" style={{ color: colors.onPrimary, fontSize: 12 }}>{formatPrice(item.price)}</AppText>
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  mainTitle: { fontSize: 32, letterSpacing: -1 },
  heroFeature: { height: 260, marginHorizontal: 20, borderRadius: 24, overflow: 'hidden', marginBottom: 32, borderWidth: 1, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, justifyContent: 'flex-end', height: '65%' },
  heroBadge: { fontSize: 10, color: colors.onPrimary, letterSpacing: 2, marginBottom: 6 },
  heroTitle: { fontSize: 22, color: colors.onPrimary, lineHeight: 28 },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14 },
  archiveHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center' },
  card: { width: CARD_WIDTH, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  cardImage: { width: '100%', height: CARD_IMAGE_HEIGHT },
  cardTextContainer: { padding: 11, justifyContent: 'center', alignItems: 'center' },
  cardText: { textAlign: 'center', fontSize: 13, lineHeight: 18 },
  archiveCard: { width: SCREEN_WIDTH * 0.38, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  archiveImage: { width: '100%', height: 110 },
  archiveContent: { padding: 10 },
  audioCard: { width: 135, borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  imageContainer: { height: 120, width: '100%', position: 'relative' },
  audioImage: { width: '100%', height: '100%' },
  gradientOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  centeredPlayIcon: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -14 }, { translateY: -14 }], zIndex: 1 },
  audioCardContent: { padding: 10 },
  shopCard: { width: 140, padding: 12, borderRadius: 20, borderWidth: 1 },
  shopImage: { width: '100%', height: 130, borderRadius: 12, marginBottom: 8 },
  shopImageFallback: { alignItems: 'center', justifyContent: 'center' },
  shopSkeleton: { opacity: 0.5 },
  storeLoadingRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 16 },
  sectionMessageBox: { paddingHorizontal: 20, paddingVertical: 8 },
  priceTag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 6 }
});