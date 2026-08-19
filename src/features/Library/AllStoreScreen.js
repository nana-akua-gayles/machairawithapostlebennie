import React, { useState, useCallback, useMemo } from "react";
import { View, StyleSheet, FlatList, Pressable, Image, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import { AppText } from "../../components/AppText";
import { ArrowLeft, Heart, ShoppingBag } from "lucide-react-native";

const GRID_PADDING = 20;
const GRID_GAP = 12;
const BRAND_RED = "#e11d48";

const formatPrice = (price) => {
  const numeric = typeof price === "number" ? price : Number(price);
  if (Number.isNaN(numeric)) return "";
  return `GH₵${numeric.toFixed(2)}`;
};

export const AllStoreScreen = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();
  const { storeItems = [] } = route.params || {};

  const [favorites, setFavorites] = useState(() => new Set());

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
        <View style={[styles.imageWrapper, { height: imageHeight, backgroundColor: colors.border }]}>
          {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" /> : <View style={[styles.image, styles.imageFallback]}><ShoppingBag size={22} color={colors.textSecondary} /></View>}
          <Pressable
            onPress={() => toggleFavorite(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? `Remove ${item.title} from wishlist` : `Add ${item.title} to wishlist`}
            style={styles.heartButton}
          >
            <Heart size={12} color={isFavorite ? BRAND_RED : "#9CA3AF"} fill={isFavorite ? BRAND_RED : "transparent"} />
          </Pressable>
        </View>

        <View style={styles.priceTag}>
          <AppText type="bold" style={styles.priceText}>{formatPrice(item.price)}</AppText>
        </View>

        <AppText type="semiBold" style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</AppText>
      </Pressable>
    );
  }, [colors, columnWidth, imageHeight, favorites, navigation, toggleFavorite]);

  const listEmpty = (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ShoppingBag size={26} color={colors.textSecondary} />
      </View>
      <AppText type="bold" style={[styles.emptyTitle, { color: colors.text }]}>Nothing here yet</AppText>
      <AppText style={[styles.emptySubtitle, { color: colors.textSecondary }]}>New goodies are on their way.</AppText>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backButton, { backgroundColor: colors.card, borderColor: colors.border, transform: [{ scale: pressed ? 0.94 : 1 }] }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={19} color={colors.text} />
        </Pressable>
        <AppText type="bold" style={[styles.headerTitle, { color: colors.text }]}>Store</AppText>
        <View style={[styles.countPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <AppText type="semiBold" style={[styles.countText, { color: colors.textSecondary }]}>{storeItems.length}</AppText>
        </View>
      </View>

      <AppText style={[styles.subtitle, { color: colors.textSecondary }]}>Curated goods, just for you</AppText>

      <FlatList
        key={`grid-${columns}`}
        data={storeItems}
        keyExtractor={(item, index) => (item.id ? String(item.id) : index.toString())}
        numColumns={columns}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.gridContainer, storeItems.length === 0 && styles.gridContainerEmpty]}
        columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
        ListEmptyComponent={listEmpty}
        overScrollMode="never"
        renderItem={renderItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 14 },
  backButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 19, letterSpacing: -0.3 },
  countPill: { minWidth: 32, paddingHorizontal: 10, height: 28, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  countText: { fontSize: 12 },
  subtitle: { fontSize: 13, paddingHorizontal: 20, marginTop: 6, marginBottom: 18 },
  gridContainer: { paddingHorizontal: GRID_PADDING, paddingBottom: 40 },
  gridContainerEmpty: { flexGrow: 1 },
  columnWrapper: { justifyContent: "space-between", marginBottom: GRID_GAP },
  card: { padding: 10, borderRadius: 26, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 3 },
  imageWrapper: { width: "100%", borderRadius: 18, overflow: "hidden", position: "relative" },
  image: { width: "100%", height: "100%" },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  heartButton: { position: "absolute", top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" },
  priceTag: { alignSelf: "flex-start", backgroundColor: BRAND_RED, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14, marginTop: -16, marginLeft: 6, shadowColor: BRAND_RED, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  priceText: { color: "#fff", fontSize: 12.5, letterSpacing: -0.1 },
  cardTitle: { fontSize: 13.5, lineHeight: 18, marginTop: 10, paddingHorizontal: 2 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 40 },
  emptyIconCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 16 },
  emptySubtitle: { fontSize: 13.5, textAlign: "center" },
});