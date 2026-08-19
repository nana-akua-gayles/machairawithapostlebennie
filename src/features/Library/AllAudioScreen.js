import React from "react";
import { View, StyleSheet, FlatList, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "../../context/ThemeContext";
import { AppText } from "../../components/AppText";
import { ArrowLeft, Play } from "lucide-react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = (SCREEN_WIDTH - 52) / 2;
const COLUMN_IMAGE_HEIGHT = COLUMN_WIDTH * 0.9;

export const AllAudioScreen = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { audioList = [] } = route.params || {};

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
        <AppText type="bold" style={[styles.headerTitle, { color: colors.text }]}>Audio Messages</AppText>
        <View style={styles.headerPlaceholder} />
      </View>

      <FlatList
        data={audioList}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item }) => (
          <Pressable 
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={`Audio message: ${item.title}, duration ${item.duration}`}
          >
            <View style={styles.imageContainer}>
              <Image source={item.image} style={styles.cardImage} contentFit="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.gradientOverlay}
              />
              <View style={styles.centeredPlayIcon}>
                <Play size={24} color="white" fill="white" />
              </View>
            </View>
            <View style={styles.cardContent}>
              <AppText type="semiBold" style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                {item.title}
              </AppText>
              <AppText style={[styles.cardDuration, { color: colors.textSecondary }]}>
                {item.duration}
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
  gradientOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  centeredPlayIcon: { position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -12 }, { translateY: -12 }], zIndex: 1 },
  cardContent: { padding: 12 },
  cardTitle: { fontSize: 13, lineHeight: 18 },
  cardDuration: { fontSize: 11, marginTop: 4 }
});