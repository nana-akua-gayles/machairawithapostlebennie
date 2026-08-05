import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Image, Dimensions } from 'react-native';
import { AppText } from '../../components/AppText';
import { supabase } from '../../config/supabaseClient';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.84;
const SPACING = 20;

export function TestimonySlider() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTestimonies() {
      try {
        const { data, error } = await supabase
          .from('testimonies')
          .select('id, image_url')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) setCards(data);
      } catch (error) {
        console.error('Error fetching magazine testimonies:', error.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTestimonies();
  }, []);

  if (loading || !cards || cards.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      
      {/* Magazine Editorial Header */}
      <View style={styles.header}>
        <View style={styles.titleStack}>
          <AppText type="black" style={styles.massiveTitle}>FAITH</AppText>
          <AppText type="black" style={[styles.massiveTitle, styles.accentTitle]}>REPORTS</AppText>
        </View>
      </View>

      {/* Editorial Standfirst / Subtitle */}
      <View style={styles.standfirstContainer}>
        <AppText type="regular" style={styles.standfirstText}>
        Real moments where faith met reality. These are the personal stories of answered prayers and unexpected grace, written down so we never forget.</AppText>
      </View>

      {/* Full-Bleed Lookbook Carousel */}
      <FlatList
        data={cards}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + SPACING}
        decelerationRate="fast"
        contentContainerStyle={styles.listPadding}
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            <Image 
              source={{ uri: item.image_url }} 
              style={styles.image} 
              resizeMode="stretch"
            />
          </View>
        )}
      />

      {/* Minimal Structural Accent Line */}
      <View style={styles.editorialFooterLine} />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 40, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 24 },
  titleStack: { flexDirection: 'column' },
  massiveTitle: { fontSize: 44, lineHeight: 40, letterSpacing: -2, color: '#000000' },
  accentTitle: { color: '#d91c2b' },
  standfirstContainer: { paddingHorizontal: 24, marginTop: 16, marginBottom: 32, maxWidth: '85%' },
  standfirstText: { fontSize: 13, lineHeight: 18, color: '#475569', fontStyle: 'italic' },
  listPadding: { paddingLeft: 24, paddingRight: width - CARD_WIDTH - 24, paddingVertical: 12 },
  cardContainer: { width: CARD_WIDTH, height: CARD_WIDTH * 1.25, marginRight: SPACING, backgroundColor: '#ffffff', overflow: 'hidden', shadowColor: '#000000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 6 },
  image: { width: '100%', height: '100%' },
  editorialFooterLine: { height: 1, width: width - 48, backgroundColor: '#000000', alignSelf: 'center', marginTop: 32, opacity: 0.1 },
});