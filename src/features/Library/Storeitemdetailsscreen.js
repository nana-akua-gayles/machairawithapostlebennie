import React, { useState, useCallback, useRef } from "react";
import { View, StyleSheet, Pressable, ScrollView, useWindowDimensions, Animated, Linking, Alert, Share } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import { AppText } from "../../components/AppText";
import { ChevronLeft, Heart, Minus, Plus, ShoppingBag, MessageCircle, Mail, Share2, AlertCircle, CheckCircle2, CreditCard } from "lucide-react-native";
import { usePaystack } from "react-native-paystack-webview";
import { supabase } from "../../config/supabaseClient";

const WHATSAPP_NUMBER = "233241234567";
const CONTACT_EMAIL = "orders@yourstore.com";
const BRAND_RED = "#e11d48";
const MAX_QTY = 99;

const formatPrice = (price) => {
  const numeric = typeof price === "number" ? price : Number(price);
  if (Number.isNaN(numeric)) return "";
  return `GH₵${numeric.toFixed(2)}`;
};

export const StoreItemDetailsScreen = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { width, height } = useWindowDimensions();
  const { item } = route.params || {};
  const { popup } = usePaystack();

  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [sendingInquiry, setSendingInquiry] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [payingWithCard, setPayingWithCard] = useState(false);
  const imageOpacity = useRef(new Animated.Value(0)).current;

  const imageHeight = height * 0.48;

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
    Animated.timing(imageOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [imageOpacity]);

  const decreaseQty = useCallback(() => setQuantity((q) => Math.max(1, q - 1)), []);
  const increaseQty = useCallback(() => setQuantity((q) => Math.min(MAX_QTY, q + 1)), []);

  const buildMessage = useCallback(() => {
    return `Hi! I'd like to order:\n\n${item?.title}\nQuantity: ${quantity}\nEstimated total: ${formatPrice((typeof item?.price === "number" ? item.price : Number(item?.price) || 0) * quantity)}\n\nItem ID: ${item?.id}`;
  }, [item, quantity]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: `Check out ${item?.title} on our store for ${formatPrice(item?.price)}!` });
    } catch (err) {}
  }, [item]);

  const handleOrderViaWhatsApp = useCallback(async () => {
    if (sendingInquiry) return;
    setSendingInquiry(true);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(buildMessage())}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert("WhatsApp not available", "Please use the email option below to place your order.");
    } catch (err) {
      Alert.alert("Couldn't open WhatsApp", "Try emailing us instead using the button below.");
    } finally {
      setSendingInquiry(false);
    }
  }, [buildMessage, sendingInquiry]);

  const handleOrderViaEmail = useCallback(async () => {
    const subject = `Order inquiry: ${item?.title}`;
    const url = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(buildMessage())}`;
    try {
      await Linking.openURL(url);
    } catch (err) {
      Alert.alert("Couldn't open Mail", `Please email us directly at ${CONTACT_EMAIL}`);
    }
  }, [buildMessage, item]);

  const total = (typeof item?.price === "number" ? item.price : Number(item?.price) || 0) * quantity;

  const handlePayWithCard = useCallback(async () => {
    if (payingWithCard || !item) return;
    setPayingWithCard(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({ item_id: item.id, quantity, total, currency: "GHS", status: "pending", user_id: user?.id })
        .select()
        .single();
      if (orderError || !order) throw orderError;

      popup.checkout({
        email: user?.email || "guest@yourstore.com",
        amount: Math.round(total * 100),
        reference: order.id,
        currency: "GHS",
        metadata: { item_id: item.id, quantity },
        onSuccess: async () => {
          const { data, error } = await supabase.functions.invoke("paystack-verify", { body: { reference: order.id } });
          if (error || !data?.verified) {
            Alert.alert("Payment couldn't be confirmed", "If you were charged, contact support and we'll sort it out.");
            return;
          }
          Alert.alert("Payment received", "Your order is confirmed. We'll reach out to arrange delivery.");
        },
        onCancel: () => setPayingWithCard(false),
        onError: () => {
          Alert.alert("Payment failed", "Please try again or order via WhatsApp.");
          setPayingWithCard(false);
        },
      });
    } catch (err) {
      Alert.alert("Couldn't start payment", "Please try again.");
    } finally {
      setPayingWithCard(false);
    }
  }, [payingWithCard, item, quantity, total, popup]);

  if (!item) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <AppText type="bold" style={[styles.errorTitle, { color: colors.text }]}>Item not found</AppText>
        <AppText style={[styles.errorSubtitle, { color: colors.textSecondary }]}>This product may have been removed.</AppText>
        <Pressable onPress={() => navigation.goBack()} style={[styles.errorBackButton, { backgroundColor: colors.card, borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel="Go back">
          <AppText type="semiBold" style={{ color: colors.text }}>Go back</AppText>
        </Pressable>
      </View>
    );
  }

  const stockCount = item.stock !== undefined ? item.stock : 10;
  const isOutOfStock = stockCount === 0;
  const isLowStock = stockCount > 0 && stockCount <= 3;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 200 }} overScrollMode="never">
        <View style={[styles.imageWrapper, { width, height: imageHeight, backgroundColor: colors.border }]}>
          {item.imageUrl ? (
            <Animated.Image source={{ uri: item.imageUrl }} style={[styles.image, { opacity: imageOpacity }]} resizeMode="cover" onLoad={handleImageLoad} accessibilityLabel={item.title} />
          ) : (
            <View style={[styles.image, styles.imageFallback]}><ShoppingBag size={40} color={colors.textSecondary} /></View>
          )}
        </View>

        <View style={[styles.detailCard, { backgroundColor: colors.background }]}>
          <View style={styles.topBadgeRow}>
            <View style={styles.priceTag}><AppText type="bold" style={styles.priceText}>{formatPrice(item.price)}</AppText></View>
            <View style={[styles.stockBadge, { backgroundColor: isOutOfStock ? '#fee2e2' : isLowStock ? '#fef3c7' : '#dcfce7' }]}>
              {isOutOfStock ? <AlertCircle size={12} color="#dc2626" /> : <CheckCircle2 size={12} color={isLowStock ? "#d97706" : "#16a34a"} />}
              <AppText type="semiBold" style={[styles.stockText, { color: isOutOfStock ? "#dc2626" : isLowStock ? "#d97706" : "#16a34a" }]}>
                {isOutOfStock ? "Out of stock" : isLowStock ? `Only ${stockCount} left!` : "In stock"}
              </AppText>
            </View>
          </View>

          <AppText type="bold" style={[styles.title, { color: colors.text }]}>{item.title}</AppText>

          {item.description ? (
            <View style={styles.descriptionContainer}>
              <AppText style={[styles.description, { color: colors.textSecondary }]} numberOfLines={isDescriptionExpanded ? undefined : 3}>{item.description}</AppText>
              {item.description.length > 120 && (
                <Pressable onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)} hitSlop={8}>
                  <AppText type="semiBold" style={{ color: colors.primary, fontSize: 13, marginTop: 4 }}>{isDescriptionExpanded ? "Read less" : "Read more"}</AppText>
                </Pressable>
              )}
            </View>
          ) : null}

          <View style={styles.quantityRow}>
            <AppText type="semiBold" style={[styles.quantityLabel, { color: colors.text }]}>Quantity</AppText>
            <View style={[styles.stepper, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable onPress={decreaseQty} disabled={quantity <= 1 || isOutOfStock} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Decrease quantity" style={[styles.stepperButton, (quantity <= 1 || isOutOfStock) && styles.stepperButtonDisabled]}>
                <Minus size={15} color={quantity <= 1 || isOutOfStock ? colors.border : colors.text} />
              </Pressable>
              <AppText type="bold" style={[styles.quantityValue, { color: colors.text }]}>{quantity}</AppText>
              <Pressable onPress={increaseQty} disabled={quantity >= MAX_QTY || isOutOfStock} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Increase quantity" style={[styles.stepperButton, isOutOfStock && styles.stepperButtonDisabled]}>
                <Plus size={15} color={isOutOfStock ? colors.border : colors.text} />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" style={({ pressed }) => [styles.floatingButton, { top: insets.top + 10, left: 20, backgroundColor: "rgba(255,255,255,0.95)", transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
        <ChevronLeft size={18} color="#111" />
      </Pressable>

      <View style={[styles.floatingRightGroup, { top: insets.top + 10 }]}>
        <Pressable onPress={handleShare} accessibilityRole="button" accessibilityLabel="Share product" style={({ pressed }) => [styles.floatingButton, { backgroundColor: "rgba(255,255,255,0.95)", transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
          <Share2 size={17} color="#111" />
        </Pressable>
        <Pressable onPress={() => setIsFavorite((f) => !f)} accessibilityRole="button" accessibilityLabel={isFavorite ? `Remove ${item.title} from wishlist` : `Add ${item.title} to wishlist`} style={({ pressed }) => [styles.floatingButton, { backgroundColor: "rgba(255,255,255,0.95)", transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
          <Heart size={18} color={isFavorite ? BRAND_RED : "#111"} fill={isFavorite ? BRAND_RED : "transparent"} />
        </Pressable>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 14, backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <View style={styles.fulfillmentHint}>
          <AppText style={[styles.fulfillmentText, { color: colors.textSecondary }]}>📦 Pickup & local delivery options arranged via chat</AppText>
        </View>

        <View style={styles.bottomBarTop}>
          <View>
            <AppText style={[styles.bottomBarLabel, { color: colors.textSecondary }]}>Estimated total</AppText>
            <AppText type="bold" style={[styles.bottomBarPrice, { color: colors.text }]}>{formatPrice(total)}</AppText>
          </View>
          <Pressable onPress={handleOrderViaEmail} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Order via email instead" style={[styles.emailButton, { borderColor: colors.border }]}>
            <Mail size={16} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Pressable onPress={handlePayWithCard} disabled={payingWithCard || isOutOfStock} accessibilityRole="button" accessibilityLabel="Pay with card" style={({ pressed }) => [styles.addButton, { backgroundColor: isOutOfStock ? colors.border : colors.primary, opacity: payingWithCard || isOutOfStock ? 0.7 : 1, transform: [{ scale: pressed && !isOutOfStock ? 0.97 : 1 }], marginBottom: 10 }]}>
          <CreditCard size={18} color="#fff" />
          <AppText type="bold" style={styles.addButtonText}>{payingWithCard ? "Processing..." : "Pay with Card"}</AppText>
        </Pressable>

        <Pressable onPress={handleOrderViaWhatsApp} disabled={sendingInquiry || isOutOfStock} accessibilityRole="button" accessibilityLabel="Order via WhatsApp" style={({ pressed }) => [styles.addButton, { backgroundColor: isOutOfStock ? colors.border : "#25D366", opacity: sendingInquiry || isOutOfStock ? 0.7 : 1, transform: [{ scale: pressed && !isOutOfStock ? 0.97 : 1 }] }]}>
          <MessageCircle size={18} color="#fff" />
          <AppText type="bold" style={styles.addButtonText}>{isOutOfStock ? "Out of Stock" : "Order via WhatsApp"}</AppText>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 6 },
  errorTitle: { fontSize: 17 },
  errorSubtitle: { fontSize: 14, textAlign: "center" },
  errorBackButton: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, borderWidth: 1 },
  imageWrapper: { position: "relative" },
  image: { width: "100%", height: "100%" },
  imageFallback: { alignItems: "center", justifyContent: "center" },
  floatingButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 4 },
  floatingRightGroup: { position: "absolute", right: 20, flexDirection: "row", gap: 10, zIndex: 10 },
  detailCard: { paddingHorizontal: 22, paddingTop: 20 },
  topBadgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  priceTag: { backgroundColor: BRAND_RED, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 16, shadowColor: BRAND_RED, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  priceText: { color: "#fff", fontSize: 14, letterSpacing: -0.1 },
  stockBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  stockText: { fontSize: 11 },
  title: { fontSize: 22, lineHeight: 30, letterSpacing: -0.5, marginBottom: 8 },
  descriptionContainer: { marginBottom: 20 },
  description: { fontSize: 14.5, lineHeight: 21 },
  quantityRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, marginBottom: 10 },
  quantityLabel: { fontSize: 15 },
  stepper: { flexDirection: "row", alignItems: "center", borderRadius: 18, borderWidth: 1, paddingHorizontal: 4 },
  stepperButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  stepperButtonDisabled: { opacity: 0.4 },
  quantityValue: { fontSize: 15, minWidth: 26, textAlign: "center" },
  bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  fulfillmentHint: { marginBottom: 8, alignItems: "center" },
  fulfillmentText: { fontSize: 11 },
  bottomBarTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  bottomBarLabel: { fontSize: 12 },
  bottomBarPrice: { fontSize: 19, marginTop: 2 },
  emailButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  addButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  addButtonText: { color: "#fff", fontSize: 15 },
});