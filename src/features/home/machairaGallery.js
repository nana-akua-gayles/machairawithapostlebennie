import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { AppText } from '../../components/AppText';
import { supabase } from '../../config/supabaseClient';

export function MachairaGallery() {
  const [galleryItems, setGalleryItems] = useState([]);

  useEffect(() => {
    async function fetchGalleryImages() {
      try {
        const { data, error } = await supabase
          .from('gallery')
          .select('id, image')
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) throw error;

        if (data && data.length > 0) {
          const formattedData = data.map(item => {
            let finalUrl = item.image;
            if (finalUrl && !finalUrl.startsWith('http')) {
              const { data: publicUrlData } = supabase.storage
                .from('gallery')
                .getPublicUrl(finalUrl);
              finalUrl = publicUrlData?.publicUrl;
            }
            return { id: item.id, imageUrl: finalUrl };
          });
          setGalleryItems(formattedData);
        }
      } catch (err) {
        console.error('Error fetching gallery images:', err.message);
      }
    }
    fetchGalleryImages();
  }, []);

  return (
    <View style={styles.sectionContainer}>
      
      {/* Clean, Un-Numbered Header */}
      <View style={styles.paddedBlock}>
        <View style={styles.headerRow}>
          <AppText style={styles.headerTitle}>THE MACHAIRA VAULT</AppText>
          <View style={styles.headerLine} />
        </View>
      </View>

      {galleryItems[0] && (
        <View style={styles.fullBleedHero}>
          <Image source={{ uri: galleryItems[0].imageUrl }} style={styles.image} resizeMode="cover" />
        </View>
      )}

      {/* Typographic Bridge */}
      <View style={styles.paddedBlock}>
        <View style={styles.textBridge}>
          <AppText style={styles.quoteBody}>
            "Just moments caught on camera. Frame by frame, memory by memory."
          </AppText>
        </View>
      </View>

      <View style={styles.fullBleedSplitTrack}>
        {galleryItems[1] && (
          <View style={styles.splitFrame}>
            <Image source={{ uri: galleryItems[1].imageUrl }} style={styles.image} resizeMode="cover" />
          </View>
        )}

        {galleryItems[2] && (
          <View style={styles.splitFrame}>
            <Image source={{ uri: galleryItems[2].imageUrl }} style={styles.image} resizeMode="cover" />
          </View>
        )}
      </View>

      {/* Bottom Divider */}
      <View style={styles.paddedBlock}>
        <View style={styles.bottomBorder} />
      </View>
      
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: { paddingVertical: 36, backgroundColor: '#FFFFFF' },
  paddedBlock: { paddingHorizontal: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, width: '100%' },
  headerTitle: { fontSize: 13, fontWeight: '800', color: '#1C1C1E', letterSpacing: 2.5 },
  headerLine: { flex: 1, height: 1, backgroundColor: '#000000', opacity: 0.08, marginLeft: 16 },
  fullBleedHero: { width: '100%', height: 280, backgroundColor: '#F2F2F7', position: 'relative' },
  textBridge: { paddingVertical: 36, alignItems: 'center' },
  quoteBody: { fontSize: 14, color: '#1C1C1E', lineHeight: 22, fontWeight: '400', fontStyle: 'italic', textAlign: 'center', maxWidth: '85%' },
  fullBleedSplitTrack: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', height: 200 },
  splitFrame: { width: '49.6%', height: '100%', backgroundColor: '#F2F2F7' },
  image: { width: '100%', height: '100%' },
  bottomBorder: { height: 1, backgroundColor: '#000000', opacity: 0.08, marginTop: 36 }
});