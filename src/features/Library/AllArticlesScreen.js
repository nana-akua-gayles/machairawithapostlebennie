import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { View, StyleSheet, FlatList, Pressable, ActivityIndicator, Animated, RefreshControl, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import { AppText } from "../../components/AppText";
import { ArrowLeft, ArrowUpRight, RefreshCw } from "lucide-react-native";
import { supabase } from "../../config/supabaseClient";

const PADDING = 24;
const PAGE_SIZE = 20;
const ACCENT = "#e11d48";
const HEADER_FADE_START = 30;
const HEADER_FADE_END = 90;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const monthKey = (dateStr) => {
  if (!dateStr) return "undated";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}`;
};

const monthLabel = (dateStr) => {
  if (!dateStr) return "EARLIER";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
};

const dayLabel = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
};

const readingTime = (body) => {
  if (typeof body !== "string" || !body.trim()) return null;
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
};

const buildRows = (articles) => {
  const rows = [];
  let lastKey = null;
  articles.forEach((item, i) => {
    const key = monthKey(item.created_at);
    if (key !== lastKey) {
      rows.push({ type: "header", key: `h-${key}-${i}`, label: monthLabel(item.created_at) });
      lastKey = key;
    }
    rows.push({ type: "item", key: `${item.id}-${i}`, item, number: i + 1, isFirst: i === 0 });
  });
  return rows;
};

export const AllArticlesScreen = () => {
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const [articlesList, setArticlesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errored, setErrored] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);
  const loadingMoreRef = useRef(false);

  useEffect(() => () => { isMountedRef.current = false; }, []);

  const fetchArticles = useCallback(async ({ lastItem = null, isRefresh = false } = {}) => {
    try {
      setErrored(false);
      let query = supabase.from("articles").select("*").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(PAGE_SIZE);

      if (lastItem) {
        query = query.or(`created_at.lt.${lastItem.created_at},and(created_at.eq.${lastItem.created_at},id.lt.${lastItem.id})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!isMountedRef.current) return;

      const page = data || [];
      setHasMore(page.length >= PAGE_SIZE);

      if (lastItem) {
        setArticlesList((prev) => {
          const seen = new Set(prev.map((a) => a.id));
          return [...prev, ...page.filter((a) => !seen.has(a.id))];
        });
      } else {
        setArticlesList(page);
      }
    } catch (err) {
      if (isMountedRef.current) setErrored(true);
    } finally {
      if (!isMountedRef.current) return;
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      loadingMoreRef.current = false;
    }
  }, []);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const handleLoadMore = useCallback(() => {
    if (loadingMoreRef.current || !hasMore || articlesList.length === 0) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    fetchArticles({ lastItem: articlesList[articlesList.length - 1] });
  }, [hasMore, articlesList, fetchArticles]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setHasMore(true);
    fetchArticles();
  }, [fetchArticles]);

  const rows = useMemo(() => buildRows(articlesList), [articlesList]);

  const heroOpacity = scrollY.interpolate({ inputRange: [0, 70], outputRange: [1, 0], extrapolate: "clamp" });
  const heroTranslate = scrollY.interpolate({ inputRange: [0, 100], outputRange: [0, -16], extrapolate: "clamp" });
  const pillOpacity = scrollY.interpolate({ inputRange: [HEADER_FADE_START, HEADER_FADE_END], outputRange: [0, 1], extrapolate: "clamp" });
  const pillTranslate = scrollY.interpolate({ inputRange: [HEADER_FADE_START, HEADER_FADE_END], outputRange: [-8, 0], extrapolate: "clamp" });

  const renderItem = useCallback(({ item: row }) => {
    if (row.type === "header") {
      return (
        <View style={styles.sectionHeader}>
          <AppText type="bold" style={[styles.sectionLabel, { color: colors.textSecondary }]}>{row.label}</AppText>
          <View style={[styles.sectionRule, { backgroundColor: colors.border }]} />
        </View>
      );
    }

    const { item, number, isFirst } = row;
    const mins = readingTime(item.body);

    return (
      <Pressable
        onPress={() => navigation.navigate("ArticleDetails", { initialIndex: number - 1, articlesList })}
        accessibilityRole="button"
        accessibilityLabel={`Open article: ${item.title}`}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
      >
        {({ pressed }) => (
          <>
            <AppText type="bold" style={[styles.rowNumber, { color: ACCENT }]}>{String(number).padStart(2, "0")}</AppText>
            <View style={styles.rowBody}>
              <View style={styles.metaRow}>
                <AppText style={[styles.metaText, { color: colors.textSecondary }]}>{dayLabel(item.created_at)}</AppText>
                {mins && <AppText style={[styles.metaText, { color: colors.textSecondary }]}>· {mins} MIN READ</AppText>}
              </View>
              <AppText type="bold" numberOfLines={isFirst ? 3 : 2} style={[isFirst ? styles.titleFeatured : styles.title, { color: colors.text }]}>{item.title}</AppText>
              {isFirst && item.excerpt ? <AppText numberOfLines={2} style={[styles.excerpt, { color: colors.textSecondary }]}>{item.excerpt}</AppText> : null}
            </View>
            <View style={[styles.arrowBox, { transform: [{ translateX: pressed ? 3 : 0 }, { translateY: pressed ? -3 : 0 }] }]}>
              <ArrowUpRight size={16} color={colors.textSecondary} />
            </View>
          </>
        )}
      </Pressable>
    );
  }, [colors, navigation, articlesList]);

  const listHeader = (
    <Animated.View style={{ opacity: heroOpacity, transform: [{ translateY: heroTranslate }] }}>
      <AppText type="bold" style={[styles.heroTitle, { color: colors.text }]}>Articles</AppText>
      <AppText style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
        {articlesList.length ? `${articlesList.length} pieces, newest first.` : "Field notes and dispatches."}
      </AppText>
    </Animated.View>
  );

  const listEmpty = !loading ? (
    <View style={styles.emptyState}>
      <AppText type="bold" style={[styles.emptyTitle, { color: colors.text }]}>
        {errored ? "Couldn't load articles" : "Nothing here yet"}
      </AppText>
      <AppText style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {errored ? "Check your connection and try again." : "New articles will show up here."}
      </AppText>
      {errored && (
        <Pressable onPress={handleRefresh} style={[styles.retryButton, { borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel="Retry loading articles">
          <RefreshCw size={14} color={colors.text} />
          <AppText type="bold" style={[styles.retryText, { color: colors.text }]}>Retry</AppText>
        </Pressable>
      )}
    </View>
  ) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View pointerEvents="none" style={[styles.pillHeader, { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: insets.top, opacity: pillOpacity, transform: [{ translateY: pillTranslate }] }]}>
        <AppText type="bold" style={[styles.pillTitle, { color: colors.text }]}>ARTICLES</AppText>
      </Animated.View>

      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => [styles.backButton, { top: insets.top + 12, backgroundColor: colors.card, borderColor: colors.border, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
      >
        <ArrowLeft size={16} color={colors.text} />
      </Pressable>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={ACCENT} />
        </View>
      ) : (
        <AnimatedFlatList
          data={rows}
          keyExtractor={(row) => row.key}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 88 }, rows.length === 0 && styles.listContentEmpty]}
          ListHeaderComponent={listHeader}
          ListHeaderComponentStyle={styles.listHeaderSpacing}
          ListEmptyComponent={listEmpty}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          overScrollMode="never"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ACCENT} colors={[ACCENT]} />}
          ListFooterComponent={loadingMore ? <View style={styles.footerLoader}><ActivityIndicator size="small" color={ACCENT} /></View> : null}
          renderItem={renderItem}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  pillHeader: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, borderBottomWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "flex-end", paddingBottom: 14 },
  pillTitle: { fontSize: 11, letterSpacing: 3 },
  backButton: { position: "absolute", left: PADDING, zIndex: 30, width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingHorizontal: PADDING, paddingBottom: 120 },
  listContentEmpty: { flexGrow: 1 },
  listHeaderSpacing: { marginBottom: 36 },
  heroTitle: { fontSize: 40, letterSpacing: -1.4, lineHeight: 44, marginBottom: 8 },
  heroSubtitle: { fontSize: 14, letterSpacing: 0.1 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginTop: 28, marginBottom: 14, gap: 12 },
  sectionLabel: { fontSize: 10.5, letterSpacing: 2.5 },
  sectionRule: { flex: 1, height: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 18, gap: 14 },
  rowNumber: { fontSize: 12, letterSpacing: 1, width: 22, marginTop: 3 },
  rowBody: { flex: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  metaText: { fontSize: 10.5, letterSpacing: 1.2 },
  title: { fontSize: 17, lineHeight: 23, letterSpacing: -0.3 },
  titleFeatured: { fontSize: 22, lineHeight: 30, letterSpacing: -0.6 },
  excerpt: { fontSize: 14, lineHeight: 20, marginTop: 8 },
  arrowBox: { width: 24, height: 24, alignItems: "center", justifyContent: "center", marginTop: 4 },
  footerLoader: { paddingVertical: 28, alignItems: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 6 },
  emptyTitle: { fontSize: 17 },
  emptySubtitle: { fontSize: 14, textAlign: "center" },
  retryButton: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  retryText: { fontSize: 13 },
});