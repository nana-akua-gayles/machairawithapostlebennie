import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { ArrowLeft, ArrowUpRight, RefreshCw } from "lucide-react-native";
import { supabase } from "../../config/supabaseClient";

const PAGE_SIZE = 20;

// This screen's own palette — a deliberate departure from the app's
// #e11d48, warmed and deepened so "Featured" reads as a curated, elevated
// space rather than a re-skinned list screen.
const INK = "#120303";
const RED = "#C81E3A";
const RED_DEEP = "#7A0F22";
const BLUSH = "#F7E8EA";
const WARM_GRAY = "#8A7679";

const PANEL_MIN_HEIGHT = 340;

const dayLabel = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// A plate number, not a sequence marker — the huge ghost numeral behind each
// panel signals "this is a plate in a collection," the way a fine-art or
// exhibition catalogue numbers its entries. It carries scale, not order.
const plateNumber = (i) => String(i + 1).padStart(2, "0");

const Panel = ({ item, index, onPress, screenWidth }) => {
  const alignRight = index % 2 === 1;
  const revealAnim = useRef(new Animated.Value(0)).current;
  const [entered, setEntered] = useState(false);

  const handleLayout = () => {
    if (entered) return;
    setEntered(true);
    Animated.timing(revealAnim, {
      toValue: 1,
      duration: 620,
      useNativeDriver: false,
    }).start();
  };

  const ruleWidth = revealAnim.interpolate({ inputRange: [0, 1], outputRange: [0, screenWidth - 48] });
  const contentOpacity = revealAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });
  const contentTranslate = revealAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <View onLayout={handleLayout} style={styles.panelWrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Featured: ${item.title}`}
        style={({ pressed }) => [
          styles.panel,
          { minHeight: PANEL_MIN_HEIGHT, opacity: pressed ? 0.88 : 1 },
        ]}
      >
        <AppText
          type="bold"
          numberOfLines={1}
          style={[
            styles.plateNumeral,
            alignRight ? styles.plateNumeralRight : styles.plateNumeralLeft,
          ]}
        >
          {plateNumber(index)}
        </AppText>

        <Animated.View
          style={[
            styles.panelContent,
            alignRight ? styles.panelContentRight : styles.panelContentLeft,
            { opacity: contentOpacity, transform: [{ translateY: contentTranslate }] },
          ]}
        >
          {item.subtitle ? (
            <AppText type="bold" style={[styles.eyebrow, alignRight && styles.textRight]}>
              {item.subtitle.toUpperCase()}
            </AppText>
          ) : null}

          <AppText
            type="bold"
            numberOfLines={4}
            style={[styles.panelTitle, alignRight && styles.textRight]}
          >
            {item.title}
          </AppText>

          {item.excerpt ? (
            <AppText numberOfLines={2} style={[styles.panelExcerpt, alignRight && styles.textRight]}>
              {item.excerpt}
            </AppText>
          ) : null}

          <View style={[styles.panelFooter, alignRight && styles.panelFooterRight]}>
            <AppText style={styles.dateText}>{dayLabel(item.created_at)}</AppText>
            <View style={styles.readMoreRow}>
              <AppText type="bold" style={styles.readMoreText}>READ</AppText>
              <ArrowUpRight size={13} color={RED} />
            </View>
          </View>
        </Animated.View>
      </Pressable>

      <Animated.View style={[styles.rule, { width: ruleWidth }]} />
    </View>
  );
};

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

  const pillOpacity = scrollY.interpolate({ inputRange: [40, 130], outputRange: [0, 1], extrapolate: "clamp" });
  const pillTranslate = scrollY.interpolate({ inputRange: [40, 130], outputRange: [-8, 0], extrapolate: "clamp" });
  const heroOpacity = scrollY.interpolate({ inputRange: [0, 90], outputRange: [1, 0], extrapolate: "clamp" });
  const heroTranslate = scrollY.interpolate({ inputRange: [0, 130], outputRange: [0, -24], extrapolate: "clamp" });

  const renderItem = useCallback(
    ({ item, index }) => (
      <Panel
        item={item}
        index={index}
        screenWidth={width}
        onPress={() =>
          navigation.navigate("ArticleDetails", {
            initialIndex: index,
            articlesList: featuredList,
          })
        }
      />
    ),
    [navigation, featuredList, width]
  );

  const listHeader = (
    <Animated.View style={{ opacity: heroOpacity, transform: [{ translateY: heroTranslate }], marginBottom: 8 }}>
      <View style={styles.heroKicker}>
        <View style={styles.heroKickerDot} />
        <AppText type="bold" style={styles.heroKickerText}>THE ARCHIVE</AppText>
      </View>
      <AppText type="bold" style={styles.heroTitle}>Featured</AppText>
      <AppText style={styles.heroSubtitle}>
        {featuredList.length
          ? `${featuredList.length} pieces, chosen and set apart.`
          : "The pieces set apart from the rest."}
      </AppText>
    </Animated.View>
  );

  const listEmpty = !loading ? (
    <View style={styles.emptyState}>
      <AppText type="bold" style={styles.emptyTitle}>
        {errored ? "Couldn't load the archive" : "Nothing featured yet"}
      </AppText>
      <AppText style={styles.emptySubtitle}>
        {errored ? "Check your connection and try again." : "Featured pieces will appear here."}
      </AppText>
      {errored && (
        <Pressable
          onPress={handleRefresh}
          style={styles.retryButton}
          accessibilityRole="button"
          accessibilityLabel="Retry loading the featured archive"
        >
          <RefreshCw size={14} color="#FFFFFF" />
          <AppText type="bold" style={styles.retryText}>Retry</AppText>
        </Pressable>
      )}
    </View>
  ) : null;

  return (
    <View style={[styles.container, { backgroundColor: "#FFFFFF" }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pillHeader,
          { paddingTop: insets.top, opacity: pillOpacity, transform: [{ translateY: pillTranslate }] },
        ]}
      >
        <AppText type="bold" style={styles.pillTitle}>FEATURED ARCHIVE</AppText>
      </Animated.View>

      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => [
          styles.backButton,
          { top: insets.top + 12, transform: [{ scale: pressed ? 0.94 : 1 }] },
        ]}
      >
        <ArrowLeft size={16} color={INK} />
      </Pressable>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={RED} />
        </View>
      ) : (
        <Animated.FlatList
          data={featuredList}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: insets.top + 84 },
            featuredList.length === 0 && styles.listContentEmpty,
          ]}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
          })}
          scrollEventThrottle={16}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.6}
          overScrollMode="never"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={RED} colors={[RED]} />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={RED} />
              </View>
            ) : null
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  pillHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: BLUSH,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 14,
  },
  pillTitle: { fontSize: 11, letterSpacing: 3, color: RED },

  backButton: {
    position: "absolute",
    left: 24,
    zIndex: 30,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: BLUSH,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  listContent: { paddingBottom: 80 },
  listContentEmpty: { flexGrow: 1 },

  heroKicker: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, marginBottom: 14 },
  heroKickerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: RED },
  heroKickerText: { fontSize: 11, letterSpacing: 3, color: RED },
  heroTitle: {
    fontSize: 52,
    lineHeight: 54,
    letterSpacing: -1.6,
    color: INK,
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  heroSubtitle: { fontSize: 15, color: WARM_GRAY, paddingHorizontal: 24, marginBottom: 12, letterSpacing: 0.1 },

  panelWrap: { width: "100%" },
  panel: {
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 36,
    overflow: "hidden",
  },
  plateNumeral: {
    position: "absolute",
    top: -18,
    fontSize: 168,
    lineHeight: 168,
    color: BLUSH,
    letterSpacing: -6,
  },
  plateNumeralLeft: { left: 8 },
  plateNumeralRight: { right: 8 },

  panelContent: { maxWidth: "84%" },
  panelContentLeft: { alignSelf: "flex-start" },
  panelContentRight: { alignSelf: "flex-end" },
  textRight: { textAlign: "right" },

  eyebrow: { fontSize: 11, letterSpacing: 2, color: RED, marginBottom: 10 },
  panelTitle: { fontSize: 29, lineHeight: 35, letterSpacing: -0.8, color: INK, marginBottom: 10 },
  panelExcerpt: { fontSize: 14.5, lineHeight: 21, color: WARM_GRAY, marginBottom: 18 },

  panelFooter: { flexDirection: "row", alignItems: "center", gap: 14 },
  panelFooterRight: { flexDirection: "row-reverse" },
  dateText: { fontSize: 12, letterSpacing: 0.6, color: WARM_GRAY },
  readMoreRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  readMoreText: { fontSize: 11, letterSpacing: 1.5, color: RED },

  rule: { height: 2, backgroundColor: RED, alignSelf: "center", borderRadius: 1, marginBottom: 4 },

  footerLoader: { paddingVertical: 32, alignItems: "center" },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 6 },
  emptyTitle: { fontSize: 17, color: INK },
  emptySubtitle: { fontSize: 14, textAlign: "center", color: WARM_GRAY },
  retryButton: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18, paddingHorizontal: 18,
    paddingVertical: 11, borderRadius: 24, backgroundColor: RED_DEEP,  },
  retryText: { fontSize: 13, color: "#FFFFFF" },
});
