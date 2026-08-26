import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, FlatList, Image, useWindowDimensions, Pressable, Modal, StatusBar } from 'react-native';
import { AppText } from '../../components/AppText';
import { supabase } from '../../config/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export function TestimonySlider() {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const cardWidth = width * 0.82;
  const spacing = 16;

  useEffect(() => {
    async function fetchTestimonies() {
      try {
        const { data, error } = await supabase
          .from('testimonies')
          .select('id, image_url')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (data && data.length > 0) {
          const formatted = data.map(item => {
            let finalUrl = item.image_url;
            if (finalUrl && !finalUrl.startsWith('http')) {
              const { data: publicUrlData } = supabase.storage.from('testimonies').getPublicUrl(finalUrl);
              finalUrl = publicUrlData?.publicUrl;
            }
            return {
              id: item.id,
              imageUrl: finalUrl,
            };
          });
          setCards(formatted);
        }
      } catch (error) {
        console.error('Error fetching magazine testimonies:', error.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTestimonies();
  }, []);

  const handleScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / (cardWidth + spacing));
    setCurrentIndex(index);
  };

  if (loading || !cards || cards.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleStack}>
          <AppText type="black" style={styles.massiveTitle}>FAITH</AppText>
          <AppText type="black" style={[styles.massiveTitle, styles.accentTitle]}>REPORTS</AppText>
        </View>
      </View>

      <View style={styles.standfirstContainer}>
        <AppText type="regular" style={styles.standfirstText}>
          Real moments where faith met reality. These are the personal stories of answered prayers and unexpected grace, written down so we never forget.
        </AppText>
      </View>

      <FlatList
        data={cards}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + spacing}
        snapToAlignment="start"
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingLeft: 24, paddingRight: 24, paddingVertical: 12 }}
        renderItem={({ item }) => (
          <Pressable 
            style={[styles.cardContainer, { width: cardWidth, height: cardWidth * 1.3, marginRight: spacing }]}
            onPress={() => setActiveImage(item.imageUrl)}
            accessibilityRole="image"
            accessibilityLabel="Faith report story card"
          >
            <Image 
              source={{ uri: item.imageUrl }} 
              style={styles.image} 
              resizeMode="contain" 
            />
          </Pressable>
        )}
      />

      <View style={styles.paginationRow}>
        {cards.map((_, idx) => (
          <View 
            key={idx} 
            style={[
              styles.paginationDot, 
              currentIndex === idx && styles.paginationDotActive
            ]} 
          />
        ))}
      </View>

      <View style={styles.editorialFooterLine} />

      <Modal
        visible={activeImage !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveImage(null)}
      >
        <View style={styles.modalContainer}>
          <StatusBar barStyle="light-content" />
          <Pressable 
            style={styles.closeButton} 
            onPress={() => setActiveImage(null)}
            accessibilityRole="button"
            accessibilityLabel="Close image view"
          >
            <Ionicons name="close" size={22} color={colors.onPrimary} />
          </Pressable>
          {activeImage && (
            <Image 
              source={{ uri: activeImage }} 
              style={{ width: width, height: width * 1.3 }} 
              resizeMode="contain" 
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { marginVertical: 40, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 24 },
  titleStack: { flexDirection: 'column' },
  massiveTitle: { fontSize: 44, lineHeight: 40, letterSpacing: -2, color: colors.text },
  accentTitle: { color: colors.primary },
  standfirstContainer: { paddingHorizontal: 24, marginTop: 16, marginBottom: 28, maxWidth: '85%' },
  standfirstText: { fontSize: 13, lineHeight: 18, color: colors.textSecondary, fontStyle: 'italic' },
  cardContainer: { backgroundColor: colors.surfaceMuted, borderRadius: 8, overflow: 'hidden', shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  image: { width: '100%', height: '100%' },
  paginationRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 18, gap: 6 },
  paginationDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.border },
  paginationDotActive: { width: 16, backgroundColor: colors.primary },
  editorialFooterLine: { height: 1, width: '88%', backgroundColor: colors.text, alignSelf: 'center', marginTop: 24, opacity: 0.1 },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  closeButton: { position: 'absolute', top: 50, right: 24, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 10 }
});
