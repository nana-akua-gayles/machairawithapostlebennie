import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, StyleSheet, FlatList, Pressable, useWindowDimensions, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import { AppText } from "../../components/AppText";
import { ChevronLeft, Heart, ShoppingBag, RefreshCw } from "lucide-react-native";
import { supabase } from "../../config/supabaseClient";
import { Image } from 'expo-image';

const GRID_PADDING = 20;
const GRID_GAP = 12;
const PAGE_SIZE = 20;

const formatPrice = (price) => {
  const numeric = typeof price === "number" ? price : Number(price);
  if (Number.isNaN(numeric)) return "";
  return `GH₵${numeric.toFixed(2)}`;
};

export const AllStoreScreen = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  const [storeItems, setStoreItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errored, setErrored] = useState(false);
  const [favorites, setFavorites] = useState(() => new Set());

  const isMountedRef = useRef(true);
  const loadingMoreRef = useRef(false);

  useEffect(() => () => { isMountedRef.current = false; }, []);

  const fetchStoreItems = useCallback(async ({ lastItem = null } = {}) => {
    try {
      setErrored(false);
      let query = supabase.from("store_items").select("*").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(PAGE_SIZE);

      if (lastItem) {
        query = query.or(`created_at.lt.${lastItem.created_at},and(created_at.eq.${lastItem.created_at},id.lt.${lastItem.id})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!isMountedRef.current) return;

      const page = data || [];
      setHasMore(page.length >= PAGE_SIZE);

      if (lastItem) {
        setStoreItems((prev) => {
          const seen = new Set(prev.map((a) => a.id));
          return [...prev, ...page.filter((a) => !seen.has(a.id))];
        });
      } else {
        setStoreItems(page);
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

  useEffect(() => { fetchStoreItems(); }, [fetchStoreItems]);

  const handleLoadMore = useCallback(() => {
    if (loadingMoreRef.current || !hasMore || storeItems.length === 0) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    fetchStoreItems({ lastItem: storeItems[storeItems.length - 1] });
  }, [hasMore, storeItems, fetchStoreItems]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setHasMore(true);
    fetchStoreItems();
  }, [fetchStoreItems]);

  const columns = width >= 1024 ? 4 : width >= 768 ? 3 : 3;
  const columnWidth = (width - GRID_PADDING * 2 - GRID_GAP * (columns - 1)) / columns;
  const imageHeight = columnWidth * 0.95;

  const toggleFavorite = useCallback((id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const renderItem = useCallback(({ item }) => {
    const isFavorite = favorites.has(item.id);
    return (
      <Pressable
        onPress={() => navigation.navigate("StoreItemDetails", { item })}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${formatPrice(item.price)}`}
        style={({ pressed }) => [styles.card, { width: columnWidth, backgroundColor: colors.card, borderColor: colors.border, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={[styles.image, { height: imageHeight }]} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.imageFallback, { height: imageHeight, backgroundColor: colors.border }]}>
            <ShoppingBag size={22} color={colors.textSecondary} />
          </View>
        )}
        <Pressable
          onPress={() => toggleFavorite(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? `Remove ${item.title} from wishlist` : `Add ${item.title} to wishlist`}
          style={[styles.heartButton, { backgroundColor: colors.card }]}
        >
          <Heart size={12} color={isFavorite ? colors.primary : colors.textSecondary} fill={isFavorite ? colors.primary : "transparent"} />
        </Pressable>

        <View style={styles.priceTag}>
          <AppText type="bold" style={styles.priceText}>{formatPrice(item.price)}</AppText>
        </View>

        <AppText type="semiBold" style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</AppText>
      </Pressable>
    );
  }, [colors, columnWidth, imageHeight, favorites, navigation, toggleFavorite, styles]);

  const listEmpty = !loading ? (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ShoppingBag size={26} color={colors.textSecondary} />
      </View>
      <AppText type="bold" style={[styles.emptyTitle, { color: colors.text }]}>
        {errored ? "Couldn't load the store" : "Nothing here yet"}
      </AppText>
      <AppText style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        {errored ? "Check your connection and try again." : "New goodies are on their way."}
      </AppText>
      {errored && (
        <Pressable onPress={handleRefresh} style={[styles.retryButton, { borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel="Retry loading the store">
          <RefreshCw size={14} color={colors.text} />
          <AppText type="bold" style={[styles.retryText, { color: colors.text }]}>Retry</AppText>
        </Pressable>
      )}
    </View>
  ) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backButton, { backgroundColor: colors.card, borderColor: colors.border, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={19} color={colors.text} />
        </Pressable>
        <AppText type="bold" style={[styles.headerTitle, { color: colors.text }]}>Store</AppText>
        <View style={[styles.countPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <AppText type="semiBold" style={[styles.countText, { color: colors.textSecondary }]}>{storeItems.length}</AppText>
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          key={`grid-${columns}`}
          data={storeItems}
          keyExtractor={(item, index) => (item.id ? String(item.id) : index.toString())}
          numColumns={columns}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.gridContainer, storeItems.length === 0 && styles.gridContainerEmpty]}
          columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
          ListEmptyComponent={listEmpty}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          ListFooterComponent={loadingMore ? <View style={styles.footerLoader}><ActivityIndicator size="small" color={colors.primary} /></View> : null}
          overScrollMode="never"
          renderItem={renderItem}
        />
      )}
    </View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 17 },
  backButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 19, letterSpacing: -0.3 },
  countPill: { minWidth: 32, paddingHorizontal: 10, height: 28, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  countText: { fontSize: 12 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  gridContainer: { paddingHorizontal: GRID_PADDING, paddingBottom: 40 },
  gridContainerEmpty: { flexGrow: 1 },
  columnWrapper: { justifyContent: "space-between", marginBottom: GRID_GAP },
  card: { padding: 8, borderRadius: 20, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, position: 'relative' },
  image: { width: "100%", borderRadius: 14 },
  imageFallback: { alignItems: "center", justifyContent: "center", borderRadius: 14 },
  heartButton: { position: "absolute", top: 14, right: 14, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", zIndex: 2 },
  priceTag: { alignSelf: "flex-start", backgroundColor: colors.primary, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, marginTop: -13, marginLeft: 5, shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 3, zIndex: 2 },
  priceText: { color: colors.onPrimary, fontSize: 11, letterSpacing: -0.1, fontWeight: '700' },
  cardTitle: { fontSize: 12, lineHeight: 16, marginTop: 8, paddingHorizontal: 2 },
  footerLoader: { paddingVertical: 24, alignItems: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 40 },
  emptyIconCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 16 },
  emptySubtitle: { fontSize: 13.5, textAlign: "center" },
  retryButton: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  retryText: { fontSize: 13 },
});