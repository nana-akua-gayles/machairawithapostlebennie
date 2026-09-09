import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import { AppText } from "../../components/AppText";
import { ChevronLeft, ArrowUpRight, RefreshCw } from "lucide-react-native";
import { supabase } from "../../config/supabaseClient";

const PAGE_SIZE = 20;
const HERO_COUNT = 3;

const INK = "#0E0B0A";
const VERMILION = "#FF3326";
const BONE = "#F4F1EA";
const STONE = "#76716D";
const BORDER_TONE = "rgba(14, 11, 10, 0.12)";

const dayLabel = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
};

const monthLabel = (dateStr) => {
  if (!dateStr) return "UNDATED";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
};

const monthKey = (dateStr) => {
  if (!dateStr) return "undated";
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}`;
};

const plateNumber = (i) => String(i + 1).padStart(2, "0");

const buildRows = (list) => {
  const rows = [];
  const heroSlice = list.slice(0, HERO_COUNT);
  const restSlice = list.slice(HERO_COUNT);

  heroSlice.forEach((item, i) => {
    rows.push({ kind: "hero", key: `hero-${item.id}`, item, index: i });
  });

  if (restSlice.length > 0) {
    rows.push({ kind: "divider", key: "archive-divider" });

    let lastMonth = null;
    restSlice.forEach((item) => {
      const key = monthKey(item.created_at);
      if (key !== lastMonth) {
        rows.push({ kind: "month", key: `month-${key}`, label: monthLabel(item.created_at) });
        lastMonth = key;
      }
      rows.push({ kind: "row", key: `row-${item.id}`, item });
    });
  }

  return rows;
};

const HeroBlock = ({ item, index, onPress }) => {
  const isRight = index % 2 === 1;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Featured: ${item.title}`}
      style={({ pressed }) => [styles.heroBlock, { opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.heroHeaderRow, isRight && styles.rowReverse]}>
        <AppText type="bold" style={styles.heroNumeral}>{plateNumber(index)}</AppText>
        <View style={styles.heroMetaStack}>
          {item.subtitle ? (
            <AppText type="bold" style={styles.heroSub}>{item.subtitle.toUpperCase()}</AppText>
          ) : null}
          <AppText style={styles.heroDate}>{dayLabel(item.created_at)}</AppText>
        </View>
      </View>

      <AppText type="bold" numberOfLines={3} style={styles.heroTitle}>
        {item.title}
      </AppText>

      {item.excerpt ? (
        <AppText numberOfLines={2} style={styles.heroExcerpt}>
          {item.excerpt}
        </AppText>
      ) : null}

      <View style={styles.heroActionRow}>
        <AppText type="bold" style={styles.heroActionText}>READ</AppText>
        <ArrowUpRight size={14} color={VERMILION} />
      </View>

      <View style={styles.solidRule} />
    </Pressable>
  );
};

const ArchiveRow = ({ item, onPress }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={`Archive item: ${item.title}`}
    style={({ pressed }) => [styles.archiveRow, { opacity: pressed ? 0.6 : 1 }]}
  >
    <View style={styles.archiveRowLeft}>
      <AppText style={styles.archiveDate}>{dayLabel(item.created_at)}</AppText>
    </View>
    <View style={styles.archiveRowCenter}>
      <AppText type="bold" numberOfLines={2} style={styles.archiveTitle}>
        {item.title}
      </AppText>
    </View>
    <View style={styles.archiveRowRight}>
      <ArrowUpRight size={13} color={STONE} />
    </View>
  </Pressable>
);

export const FeaturedArchiveScreen = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const [featuredList, setFeaturedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errored, setErrored] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);
  const loadingMoreRef = useRef(false);

  useEffect(() => () => { isMountedRef.current = false; }, []);

  const fetchFeatured = useCallback(async ({ lastItem = null } = {}) => {
    try {
      setErrored(false);
      let query = supabase
        .from("featured_articles")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(PAGE_SIZE);

      if (lastItem) {
        query = query.or(
          `created_at.lt.${lastItem.created_at},and(created_at.eq.${lastItem.created_at},id.lt.${lastItem.id})`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!isMountedRef.current) return;

      const page = data || [];
      setHasMore(page.length >= PAGE_SIZE);

      if (lastItem) {
        setFeaturedList((prev) => {
          const seen = new Set(prev.map((a) => a.id));
          return [...prev, ...page.filter((a) => !seen.has(a.id))];
        });
      } else {
        setFeaturedList(page);
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

  useEffect(() => { fetchFeatured(); }, [fetchFeatured]);

  const handleLoadMore = useCallback(() => {
    if (loadingMoreRef.current || !hasMore || featuredList.length === 0) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    fetchFeatured({ lastItem: featuredList[featuredList.length - 1] });
  }, [hasMore, featuredList, fetchFeatured]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setHasMore(true);
    fetchFeatured();
  }, [fetchFeatured]);

  const rows = useMemo(() => buildRows(featuredList), [featuredList]);

  const headerOpacity = scrollY.interpolate({ inputRange: [0, 50], outputRange: [1, 0], extrapolate: "clamp" });

  const openArticle = useCallback(
    (item) => {
      const initialIndex = featuredList.findIndex((a) => a.id === item.id);
      navigation.navigate("ArticleDetails", { initialIndex, articlesList: featuredList });
    },
    [navigation, featuredList]
  );

  const renderItem = useCallback(
    ({ item: row }) => {
      if (row.kind === "hero") {
        return <HeroBlock item={row.item} index={row.index} onPress={() => openArticle(row.item)} />;
      }
      if (row.kind === "divider") {
        return (
          <View style={styles.sectionDivider}>
            <View style={styles.dividerBullet} />
            <AppText type="bold" style={styles.dividerText}>FULL INDEX LOG</AppText>
            <View style={styles.dividerLine} />
          </View>
        );
      }
      if (row.kind === "month") {
        return <AppText type="bold" style={styles.monthLabel}>{row.label}</AppText>;
      }
      return <ArchiveRow item={row.item} onPress={() => openArticle(row.item)} />;
    },
    [openArticle]
  );

  const listHeader = (
    <Animated.View style={[styles.headerContainer, { opacity: headerOpacity }]}>
      <AppText type="bold" style={styles.headerTitle}>Featured</AppText>
    </Animated.View>
  );

  const listEmpty = !loading ? (
    <View style={styles.emptyState}>
      <AppText type="bold" style={styles.emptyTitle}>
        {errored ? "Sync Error" : "Empty Registry"}
      </AppText>
      <AppText style={styles.emptySubtitle}>
        {errored ? "Check database connection." : "No records found."}
      </AppText>
      {errored && (
        <Pressable onPress={handleRefresh} style={styles.retryButton}>
          <RefreshCw size={13} color="#FFFFFF" />
          <AppText type="bold" style={styles.retryText}>Reload</AppText>
        </Pressable>
      )}
    </View>
  ) : null;

  return (
    <View style={[styles.container, { backgroundColor: BONE }]}>
      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => [styles.backButton, { top: insets.top + 10, opacity: pressed ? 0.6 : 1 }]}
      >
        <ChevronLeft size={16} color={INK} />
      </Pressable>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={VERMILION} />
        </View>
      ) : (
        <Animated.FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: insets.top + 52 },
            rows.length === 0 && styles.listContentEmpty,
          ]}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.6}
          overScrollMode="never"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={VERMILION} colors={[VERMILION]} />}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={VERMILION} />
              </View>
            ) : null
          }
          renderItem={renderItem}
          windowSize={7}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  backButton: {
    position: "absolute",
    left: 20,
    zIndex: 30,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(14, 11, 10, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { paddingBottom: 80, paddingHorizontal: 20 },
  listContentEmpty: { flexGrow: 1 },
  headerContainer: { marginBottom: 24 },
  headerTitle: { fontSize: 38, lineHeight: 40, letterSpacing: -1.2, color: INK, marginBottom: 4 },
  headerSub: { fontSize: 13, color: STONE, letterSpacing: -0.1 },
  heroBlock: { paddingVertical: 22, },
  heroHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10},
  rowReverse: { flexDirection: "row-reverse"},
  heroNumeral: { fontSize: 24, lineHeight: 24, letterSpacing: -1, color: VERMILION },
  heroMetaStack: { alignItems: "flex-end" },
  heroSub: { fontSize: 9.5, letterSpacing: 2, color: STONE, marginBottom: 2 },
  heroDate: { fontSize: 10, color: STONE, letterSpacing: 0.5 },
  heroTitle: { fontSize: 21, lineHeight: 26, letterSpacing: -0.6, color: INK, marginBottom: 8 },
  heroExcerpt: { fontSize: 13, lineHeight: 18, color: STONE, marginBottom: 14 },
  heroActionRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 18,},
  heroActionText: { fontSize: 10, letterSpacing: 1.5, color: VERMILION },
  solidRule: { height: 1, backgroundColor: BORDER_TONE, width: "100%" },
  sectionDivider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 24,},
  dividerBullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: VERMILION },
  dividerText: { fontSize: 10, letterSpacing: 2, color: INK },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER_TONE },
  monthLabel: { fontSize: 10, letterSpacing: 2, color: STONE, marginBottom: 8, marginTop: 6,},
  archiveRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER_TONE,
    gap: 12 },
  archiveRowLeft: { width: 56 },
  archiveDate: { fontSize: 10, color: STONE, letterSpacing: 0.5 },
  archiveRowCenter: { flex: 1 },
  archiveTitle: { fontSize: 13.5, lineHeight: 18, letterSpacing: -0.2, color: INK },
  archiveRowRight: { width: 20, alignItems: "flex-end" },
  footerLoader: { paddingVertical: 24, alignItems: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 6, marginTop: 80 },
  emptyTitle: { fontSize: 15, color: INK, letterSpacing: -0.2 },
  emptySubtitle: { fontSize: 13, textAlign: "center", color: STONE },
  retryButton: { marginTop: 12, paddingHorizontal: 18, paddingVertical: 9, backgroundColor: INK, borderRadius: 14,},
  retryText: { fontSize: 12, color: "#FFFFFF", letterSpacing: 0.5 },
});