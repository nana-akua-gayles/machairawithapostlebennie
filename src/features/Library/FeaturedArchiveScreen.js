import React from "react";
import { View, StyleSheet, FlatList, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import { AppText } from "../../components/AppText";
import { ArrowLeft, Star } from "lucide-react-native";
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = (SCREEN_WIDTH - 52) / 2;
const COLUMN_IMAGE_HEIGHT = COLUMN_WIDTH * 1.25;

export const FeaturedArchiveScreen = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { featuredList = [] } = route.params || {};

  const BRAND_RED = "#e11d48";

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable 
          onPress={() => navigation.goBack()} 
          style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <AppText type="bold" style={[styles.headerTitle, { color: colors.text }]}>Featured Archive</AppText>
        <View style={styles.headerPlaceholder} />
      </View>

      <FlatList
        data={featuredList}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item, index }) => (
          <Pressable 
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.navigate('ArticleDetails', { 
              initialIndex: index,
              articlesList: featuredList 
            })}
            accessibilityRole="button"
            accessibilityLabel={`Featured article: ${item.title}`}
          >
            <View style={styles.imageContainer}>
              <Image source={{ uri: item.image_url || item.hero_image_url }} style={styles.cardImage} contentFit="cover" />
              <View style={[styles.badgeContainer, { backgroundColor: BRAND_RED }]}>
                <Star size={10} color="#fff" fill="#fff" />
                <AppText type="bold" style={styles.badgeText}>FEATURED</AppText>
              </View>
            </View>
            <View style={styles.cardContent}>
              <AppText type="semiBold" style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                {item.title}
              </AppText>
              <AppText style={[styles.cardDate, { color: colors.textSecondary }]}>
                {new Date(item.published_at || item.created_at).toLocaleDateString()}
              </AppText>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  backButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, letterSpacing: -0.3 },
  headerPlaceholder: { width: 40 },
  gridContainer: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
  columnWrapper: { justifyContent: 'space-between', marginBottom: 16 },
  card: { width: COLUMN_WIDTH, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  imageContainer: { width: '100%', height: COLUMN_IMAGE_HEIGHT, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  badgeContainer: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 9, color: '#fff', letterSpacing: 1 },
  cardContent: { padding: 12 },
  cardTitle: { fontSize: 13, lineHeight: 18 },
  cardDate: { fontSize: 11, marginTop: 6 }
});