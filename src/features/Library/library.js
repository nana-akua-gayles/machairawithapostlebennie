import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, FlatList, ImageBackground, Linking, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import { AppText } from "../../components/AppText";
import { ShoppingBag, ChevronRight, DollarSign, Play, Newspaper } from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "../../config/supabaseClient";
import { Image } from 'expo-image';

export const LibraryScreen = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

 const { data: trendingArticles, isLoading, error } = useQuery({
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

  const BRAND_RED = "#e11d48";


  const audioSermons = [
    { id: 1, title: "The Momentum Secret", duration: "12:30", image: require('../../../assets/images/sermon1.jpg') },
    { id: 2, title: "At the Scent of Water", duration: "15:45", image: require('../../../assets/images/sermon2.jpg') },
    { id: 3, title: "Unleashed", duration: "10:20", image: require('../../../assets/images/sermon3.jpg') },
  ];

  const storeItems = [1, 2, 3, 4]; 

  const openFacebookLink = async (url) => {
    const fbUrl = url.replace("https://www.facebook.com/", "fb://facewebmodal/f?href=https://www.facebook.com/");
    const supported = await Linking.canOpenURL(fbUrl);
    if (supported) {
      await Linking.openURL(fbUrl);
    } else {
      await Linking.openURL(url);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        
        <View style={styles.header}>
          <AppText type="bold" style={[styles.mainTitle, { color: colors.text }]}>Library</AppText>
        </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <Pressable style={styles.heroFeature} onPress={() => openFacebookLink('https://www.facebook.com/share/p/18DbYj4rY2/?mibextid=wwXIfr')}>
          <ImageBackground 
            source={require('../../../assets/images/Apostle1.jpg')} 
            style={styles.heroImage}
            imageStyle={{ borderRadius: 24 }}
          >
            <View style={styles.heroOverlay}>
              <AppText type="bold" style={styles.heroBadge}>WEEKLY FEATURE</AppText>
              <AppText type="bold" style={styles.heroTitle}>The Power of Grace</AppText>
            </View>
          </ImageBackground>
        </Pressable>

        {/* Dynamic Trending Articles Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText type="bold" style={{ fontSize: 20, color: colors.text }}>Trending Articles</AppText>
            <Newspaper color={colors.text} size={20} />
          </View>
          
          {isLoading ? (
            <ActivityIndicator size="small" color={BRAND_RED} style={{ marginVertical: 20 }} />
          ) : (
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
                >
                  <Image source={{ uri: item.image_url }} style={styles.cardImage} contentFit="cover" />
                  <AppText type="semiBold" style={{ padding: 11, textAlign: 'center', color: colors.text }}>{item.title}</AppText>
                </Pressable>
              )}
            />
          )}
        </View>

        {/* Audio Sermons Section */}
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <AppText type="bold" style={{ fontSize: 20, color: colors.text }}>Audio Messages</AppText>
                <Pressable style={styles.seeAllBtn}>
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
            <Pressable style={[styles.audioCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.imageContainer}>
                <Image source={item.image} style={styles.audioImage}/>
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.gradientOverlay}
                />
                <View style={styles.centeredPlayIcon}>
                    <Play size={32} color="white" fill="white" />
                </View>
                </View>
                <View style={styles.audioCardContent}>
                <AppText type="semiBold" style={{ fontSize: 14, color: colors.text }} numberOfLines={2}>
                    {item.title}
                </AppText>
                <AppText style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                    {item.duration}
                </AppText>
                </View>
            </Pressable>
            )}
            />
        </View>

        {/* Store Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText type="bold" style={{ fontSize: 20, color: colors.text }}>Store</AppText>
            <ShoppingBag color={colors.text} size={20} />
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={storeItems}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
            renderItem={() => (
              <Pressable style={[styles.shopCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.shopImage, { backgroundColor: colors.border }]} />
                <AppText type="semiBold" style={{ color: colors.text }}>Book Title</AppText>
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
  header: { padding: 20 },
  mainTitle: { fontSize: 32, letterSpacing: -1 },
  heroFeature: { height: 300, marginHorizontal: 20, borderRadius: 24, overflow: 'hidden', marginBottom: 32 },
  heroImage: { width: '100%', height: '100%', justifyContent: 'flex-end'},
  heroOverlay: { padding: 24, backgroundColor: 'rgba(0,0,0,0.4)' },
  heroBadge: { fontSize: 10, color: '#fff', letterSpacing: 2, marginBottom: 8 },
  heroTitle: { fontSize: 26, color: '#fff' },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center' },
  card: { width: 160, padding: 0, borderRadius: 20, borderWidth: 1, overflow: 'hidden', },
  cardImage: { width: '100%', height: 180, borderRadius: 2 },
  audioCard: { width: 140, borderRadius: 12, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, borderWidth: 1},
  imageContainer: { height: 130, width: '100%'},
  audioImage: { width: '100%', height: '100%', contentFit: 'cover'},
  gradientOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%',},
  centeredPlayIcon: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -16 }, { translateY: -16 }], zIndex: 1, },
  audioCardContent: { padding: 10,},
  shopCard: { width: 150, padding: 12, borderRadius: 20, borderWidth: 1 },
  shopImage: { width: '100%', height: 140, borderRadius: 12, marginBottom: 8 },
  priceTag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 8 }
});