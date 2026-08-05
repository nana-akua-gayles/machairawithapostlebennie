import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, StatusBar, Dimensions, FlatList, ScrollView, Image } from 'react-native';
import { AppText } from "../../components/AppText";
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { supabase } from "../../config/supabaseClient"; 

const { width, height } = Dimensions.get('window');

const keyExtractor = (item) => item.id.toString();
const getItemLayout = (_, index) => ({ length: width, offset: width * index, index });

export const ArticleDetailsScreen = ({ navigation, route }) => {
  const { initialIndex, articlesList } = route.params || {};

  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(initialIndex || 0);
  const [expanded, setExpanded] = useState({});
  const [heroImageUrl, setHeroImageUrl] = useState(null);
  
  const [articles, setArticles] = useState(articlesList || []); 
  
  const scrollRefs = useRef({});
  const flatListRef = useRef(null);

  useEffect(() => {
    const fetchBackground = async () => {
      const { data: bgData } = await supabase
        .from('articleBackground')
        .select('article_bg_url')
        .single();
      if (bgData?.article_bg_url) setHeroImageUrl(bgData.article_bg_url);
    };
    fetchBackground();

    if (flatListRef.current && initialIndex !== undefined) {
      setTimeout(() => {
        flatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
      }, 100);
    }
  }, [initialIndex]);

  const toggleExpand = (id) => {
    const next = !expanded[id];
    setExpanded((prev) => ({ ...prev, [id]: next }));
    scrollRefs.current[id]?.scrollTo({ y: next ? 400 : 0, animated: true });
  };

  const handleScroll = (event) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / slideSize);
    setActiveIndex(index);
  };

  const renderItem = ({ item, index }) => {
    const isExpanded = !!expanded[item.id];
    const formattedBody = typeof item.body === 'string' 
      ? item.body.replace(/\\n/g, '\n') 
      : item.body;

    return (
      <View style={{ width }}>
        <ScrollView
          ref={(r) => { scrollRefs.current[item.id] = r; }}
          contentContainerStyle={{ paddingTop: 400 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={isExpanded}
        >
          <BlurView 
            intensity={80} 
            tint="dark" 
            style={[styles.contentContainer, { paddingBottom: insets.bottom + 140 }]}
          >
            <AppText type='bold' style={styles.indexNumber}>0{index + 1}</AppText>
            <AppText style={styles.title}>{item.title}</AppText>
            <View style={styles.line} />
            
            {/* RENDER THE FORMATTED TEXT HERE */}
            <AppText
              style={styles.body}
              numberOfLines={isExpanded ? undefined : 4}
              ellipsizeMode="tail"
            >
              {formattedBody}
            </AppText>

            <TouchableOpacity onPress={() => toggleExpand(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <AppText style={styles.seeMore}>{isExpanded ? 'See less' : 'See more'}</AppText>
            </TouchableOpacity>
          </BlurView>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {heroImageUrl && (
        <Image 
          source={{ uri: heroImageUrl }} 
          style={styles.heroImage} 
        />
      )}

      <FlatList
        ref={flatListRef}
        data={articles}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        initialScrollIndex={initialIndex || 0}
      />

      <View style={[styles.pagination, { bottom: insets.bottom + 40 }]}>
        {articles.map((_, i) => (
          <View 
            key={i} 
            style={[styles.dot, i === activeIndex ? styles.activeDot : null]} 
          />
        ))}
      </View>

      <TouchableOpacity 
        style={[styles.backButton, { bottom: insets.bottom + 20 }]} 
        onPress={() => navigation.goBack()}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <Ionicons name="arrow-back" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  heroImage: { position: 'absolute', width, height: 600, resizeMode: 'cover' },
  contentContainer: { padding: 40, borderTopLeftRadius: 40, borderTopRightRadius: 40, minHeight: height },
  title: { fontSize: 32, lineHeight: 38, color: '#FFF', fontWeight: '900', letterSpacing: -1 },
  indexNumber: { color: '#B22222', fontSize: 23, letterSpacing: 6, marginBottom: 15, fontWeight: '900' },
  line: { width: 70, height: 4, backgroundColor: '#B22222', marginVertical: 30 },
  body: { fontSize: 19, color: '#EEE', lineHeight: 32, marginBottom: 12 },
  seeMore: { fontSize: 16, color: '#B22222', fontWeight: '700' },
  pagination: { position: 'absolute', left: 40, flexDirection: 'row' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF', marginHorizontal: 5, opacity: 0.5 },
  activeDot: { width: 24, opacity: 1, backgroundColor: '#B22222' }, 
  backButton: { position: 'absolute', right: 40, zIndex: 10, width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#B22222', justifyContent: 'center', alignItems: 'center', elevation: 8,
  },
});