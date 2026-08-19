import React from "react";
import { View, StyleSheet, ScrollView, Pressable, FlatList, ActivityIndicator, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import { AppText } from "../../components/AppText";
import { ChevronRight, DollarSign, Play, Star } from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "../../config/supabaseClient";
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CARD_WIDTH = SCREEN_WIDTH * 0.38;
const CARD_IMAGE_HEIGHT = CARD_WIDTH * 1.1; 

export const LibraryScreen = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const BRAND_RED = "#e11d48";

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
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, 
  });

  const { 
    data: featuredArticles, 
    isLoading: isFeaturedLoading, 
    error: featuredError 
  } = useQuery({
    queryKey: ['featured_articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("featured_articles")
        .select("*")
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const activeFeature = featuredArticles?.find(item => item.is_active) || featuredArticles?.[0];
  const archivedFeatures = featuredArticles?.filter(item => item.id !== activeFeature?.id) || [];

  const audioSermons = [
    { id: 1, title: "The Momentum Secret", duration: "12:30", image: require('../../../assets/images/sermon1.jpg') },
    { id: 2, title: "At the Scent of Water", duration: "15:45", image: require('../../../assets/images/sermon2.jpg') },
    { id: 3, title: "Unleashed", duration: "10:20", image: require('../../../assets/images/sermon3.jpg') },
  ];

  const storeItems = [1, 2, 3, 4]; 

  if (isArticlesLoading || isFeaturedLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={BRAND_RED} />
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
          style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: BRAND_RED, borderRadius: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Retry loading content"
        >
          <AppText style={{ color: '#fff', fontWeight: 'bold' }}>Retry</AppText>
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
      >
        {activeFeature && (
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
              source={{ uri: activeFeature.image_url || activeFeature.hero_image_url }} 
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
              <AppText style={{ color: BRAND_RED, marginRight: 4 }}>See All</AppText>
              <ChevronRight color={BRAND_RED} size={16} />
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

        {archivedFeatures.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.archiveHeaderRow}>
                <AppText type="bold" style={{ fontSize: 20, color: colors.text }}>Featured Archive</AppText>
                <Star color={BRAND_RED} size={18} fill={BRAND_RED} />
              </View>
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={archivedFeatures}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
              renderItem={({ item, index }) => (
                <Pressable 
                  style={[styles.archiveCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => navigation.navigate('ArticleDetails', { 
                    initialIndex: index,
                    articlesList: archivedFeatures 
                  })}
                  accessibilityRole="button"
                  accessibilityLabel={`Archived feature: ${item.title}`}
                >
                  <Image source={{ uri: item.image_url || item.hero_image_url }} style={styles.archiveImage} contentFit="cover" />
                  <View style={styles.archiveContent}>
                    <AppText type="semiBold" style={{ fontSize: 13, color: colors.text }} numberOfLines={2}>
                      {item.title}
                    </AppText>
                    <AppText style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                      {new Date(item.published_at || item.created_at).toLocaleDateString()}
                    </AppText>
                  </View>
                </Pressable>
              )}
            />
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText type="bold" style={{ fontSize: 20, color: colors.text }}>Audio Messages</AppText>
            <Pressable 
              style={styles.seeAllBtn}
              onPress={() => navigation.navigate('AllAudio', { audioList: audioSermons })}
              accessibilityRole="button"
              accessibilityLabel="See all audio messages"
            >
              <AppText style={{ color: BRAND_RED, marginRight: 4 }}>See All</AppText>
              <ChevronRight color={BRAND_RED} size={16} />
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
                    <Play size={28} color="white" fill="white" />
                  </View>
                </View>
                <View style={styles.audioCardContent}>
                  <AppText type="semiBold" style={{ fontSize: 13, color: colors.text }} numberOfLines={2}>
                    {item.title}
                  </AppText>
                  <AppText style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
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
              onPress={() => navigation.navigate('AllStore', { storeItems: storeItems })}
              accessibilityRole="button"
              accessibilityLabel="See all store items"
            >
              <AppText style={{ color: BRAND_RED, marginRight: 4 }}>See All</AppText>
              <ChevronRight color={BRAND_RED} size={16} />
            </Pressable>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={storeItems}
            keyExtractor={(_, index) => index.toString()}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
            renderItem={() => (
              <Pressable 
                style={[styles.shopCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel="Book item priced at 19.99 dollars"
              >
                <View style={[styles.shopImage, { backgroundColor: colors.border }]} />
                <AppText type="semiBold" style={{ color: colors.text, fontSize: 14 }}>Book Title</AppText>
                <View style={[styles.priceTag, { backgroundColor: BRAND_RED }]}>
                  <DollarSign size={12} color="#fff" />
                  <AppText type="bold" style={{ color: '#fff', fontSize: 12 }}>19.99</AppText>
                </View>
              </Pressable>
            )}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  mainTitle: { fontSize: 32, letterSpacing: -1 },
  heroFeature: { height: 260, marginHorizontal: 20, borderRadius: 24, overflow: 'hidden', marginBottom: 32, borderWidth: 1, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, justifyContent: 'flex-end', height: '65%' },
  heroBadge: { fontSize: 10, color: '#fff', letterSpacing: 2, marginBottom: 6 },
  heroTitle: { fontSize: 22, color: '#fff', lineHeight: 28 },
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
  priceTag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 6 }
});