import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, StatusBar, FlatList, ScrollView, Image, useWindowDimensions, ActivityIndicator, Platform, BackHandler, Animated } from 'react-native';
import { AppText } from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { supabase } from '../../config/supabaseClient';

const keyExtractor = (item) => item.id.toString();
const COLLAPSED_LINES = 4;
const HERO_HEIGHT_RATIO = 0.55;
const CARD_TOP_INSET_RATIO = 0.42;
const ANDROID_MIN_BOTTOM_PADDING = 24;
const EXPAND_ANIM_MS = 280;
const PAGINATION_CLEARANCE = 64;

const normalizeBody = (body) => (typeof body === 'string' ? body.replace(/\\n/g, '\n') : body);
const androidBlurFallback = Platform.OS === 'android' ? { backgroundColor: 'rgba(10,10,10,0.55)' } : null;

const ArticlePage = React.memo(function ArticlePage({ item, index, width, height, topInset, bottomClearance, isExpanded, onToggleExpand, scrollRef }) {
  const body = useMemo(() => normalizeBody(item.body), [item.body]);
  const animatedTop = useRef(new Animated.Value(topInset)).current;

  useEffect(() => {
    Animated.timing(animatedTop, {
      toValue: isExpanded ? 0 : topInset,
      duration: EXPAND_ANIM_MS,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, topInset, animatedTop]);

  return (
    <View style={{ width, height }} pointerEvents="box-none">
      <Animated.View style={[styles.cardWrapper, { width, top: animatedTop, bottom: 0 }]}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={isExpanded ? { flexGrow: 1 } : { flexGrow: 1, height: '100%' }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={isExpanded}
          bounces={isExpanded}
          nestedScrollEnabled
          overScrollMode="never"
        >
          <BlurView intensity={80} tint="dark" experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined} style={[styles.contentContainer, androidBlurFallback, isExpanded ? { minHeight: height, paddingBottom: bottomClearance } : { flex: 1 }]}>
            <View style={isExpanded ? undefined : styles.collapsedTextBlock}>
              <AppText type="bold" style={styles.indexNumber}>0{index + 1}</AppText>
              <AppText style={styles.title}>{item.title}</AppText>
              <View style={styles.line} />
              <AppText style={styles.body} numberOfLines={isExpanded ? undefined : COLLAPSED_LINES} ellipsizeMode="tail">{body}</AppText>
            </View>
            <View style={isExpanded ? styles.seeMoreSpacer : styles.seeMorePinned}>
              <TouchableOpacity onPress={() => onToggleExpand(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={isExpanded ? 'Show less of this article' : 'Show more of this article'}>
                <AppText style={styles.seeMore}>{isExpanded ? 'See less' : 'See more'}</AppText>
              </TouchableOpacity>
            </View>
          </BlurView>
        </ScrollView>
      </Animated.View>
    </View>
  );
});

export const ArticleDetailsScreen = ({ navigation, route }) => {
  const { initialIndex = 0, articlesList = [] } = route.params || {};
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const androidFloor = Platform.OS === 'android' ? ANDROID_MIN_BOTTOM_PADDING : 0;
  const safeBottom = Math.max(insets.bottom, androidFloor, 16);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [expanded, setExpanded] = useState({});
  const [heroImageUrl, setHeroImageUrl] = useState(null);
  const [heroLoading, setHeroLoading] = useState(true);
  const [heroError, setHeroError] = useState(false);
  const [articles, setArticles] = useState(articlesList);

  const isAnyExpanded = Object.values(expanded).some(Boolean);

  useEffect(() => { setArticles(articlesList); }, [articlesList]);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const onBackPress = () => {
      if (isAnyExpanded) {
        setExpanded({});
        return true;
      }
      navigation.goBack();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [navigation, isAnyExpanded]);

  const scrollRefs = useRef({});
  const flatListRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchBackground = async () => {
      setHeroLoading(true);
      setHeroError(false);
      try {
        const { data, error } = await supabase.from('articleBackground').select('article_bg_url').single();
        if (!isMounted) return;
        if (error) throw error;
        if (data?.article_bg_url) setHeroImageUrl(data.article_bg_url);
      } catch (err) {
        if (isMounted) setHeroError(true);
      } finally {
        if (isMounted) setHeroLoading(false);
      }
    };
    fetchBackground();
    return () => { isMounted = false; };
  }, []);

  const toggleExpand = useCallback((id) => {
    setExpanded((prev) => {
      const next = !prev[id];
      if (!next) {
        requestAnimationFrame(() => scrollRefs.current[id]?.scrollTo({ y: 0, animated: true }));
      }
      return { ...prev, [id]: next };
    });
  }, []);

  const handleScroll = useCallback((event) => {
    if (isAnyExpanded) return;
    const slideSize = event.nativeEvent.layoutMeasurement.width || width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    setActiveIndex(index);
  }, [width, isAnyExpanded]);

  const getItemLayout = useCallback((_, index) => ({ length: width, offset: width * index, index }), [width]);

  const handleScrollToIndexFailed = useCallback((info) => {
    setTimeout(() => flatListRef.current?.scrollToOffset({ offset: info.index * width, animated: false }), 50);
  }, [width]);

  const bottomClearance = safeBottom + 40 + PAGINATION_CLEARANCE;

  const renderItem = useCallback(({ item, index }) => (
    <ArticlePage
      item={item}
      index={index}
      width={width}
      height={height}
      topInset={height * CARD_TOP_INSET_RATIO}
      bottomClearance={bottomClearance}
      isExpanded={!!expanded[item.id]}
      onToggleExpand={toggleExpand}
      scrollRef={(r) => { scrollRefs.current[item.id] = r; }}
    />
  ), [width, height, expanded, toggleExpand, bottomClearance]);

  if (!articles.length) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <AppText style={styles.emptyText}>No articles to show.</AppText>
        <TouchableOpacity style={[styles.backButton, { bottom: safeBottom + 20, right: 40 }]} onPress={() => navigation.goBack()} accessibilityLabel="Go back" accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {heroImageUrl && !heroError && <Image source={{ uri: heroImageUrl }} style={[styles.heroImage, { width, height: height * HERO_HEIGHT_RATIO }]} resizeMode="cover" />}
      {heroLoading && !heroImageUrl && <View style={[styles.heroImage, styles.heroFallback, { width, height: height * HERO_HEIGHT_RATIO }]}><ActivityIndicator color="#B22222" /></View>}
      {(heroError || (!heroLoading && !heroImageUrl)) && <View style={[styles.heroImage, styles.heroFallback, { width, height: height * HERO_HEIGHT_RATIO }]} />}

      <FlatList
        ref={flatListRef}
        data={articles}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        directionalLockEnabled
        scrollEnabled={!isAnyExpanded}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        initialScrollIndex={initialIndex}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        removeClippedSubviews={Platform.OS === 'android'}
        overScrollMode="never"
        maxToRenderPerBatch={3}
        windowSize={3}
        initialNumToRender={1}
      />

      {!isAnyExpanded && (
        <View style={[styles.pagination, { bottom: safeBottom + 40 }]}>
          {articles.map((_, i) => <View key={i} style={[styles.dot, i === activeIndex ? styles.activeDot : null]} />)}
        </View>
      )}

      <TouchableOpacity style={[styles.backButton, { bottom: safeBottom + 20 }]} onPress={() => navigation.goBack()} accessibilityLabel="Go back" accessibilityRole="button">
        <Ionicons name="arrow-back" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#EEE', fontSize: 16 },
  heroImage: { position: 'absolute', top: 0, left: 0 },
  heroFallback: { backgroundColor: '#1a1a1a' },
  cardWrapper: { position: 'absolute' },
  contentContainer: { padding: 40, borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' },
  collapsedTextBlock: { flexShrink: 1 },
  title: { fontSize: 32, lineHeight: 38, color: '#FFF', fontWeight: '900', letterSpacing: -1 },
  indexNumber: { color: '#B22222', fontSize: 22, letterSpacing: 6, marginBottom: 15, fontWeight: '900' },
  line: { width: 70, height: 4, backgroundColor: '#B22222', marginVertical: 30 },
  body: { fontSize: 19, color: '#EEE', lineHeight: 32, marginBottom: 12 },
  seeMoreSpacer: { height: 28 },
  seeMorePinned: { marginTop: 'auto', paddingTop: 28, paddingBottom: PAGINATION_CLEARANCE },
  seeMore: { fontSize: 16, color: '#B22222', fontWeight: '700' },
  pagination: { position: 'absolute', left: 40, flexDirection: 'row' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFF', marginHorizontal: 5, opacity: 0.5 },
  activeDot: { width: 24, opacity: 1, backgroundColor: '#B22222' },
  backButton: { position: 'absolute', right: 40, zIndex: 10, width: 60, height: 60, borderRadius: 30, backgroundColor: '#B22222', justifyContent: 'center', alignItems: 'center', elevation: 8 },
});
