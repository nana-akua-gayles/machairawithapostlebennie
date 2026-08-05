import React, { useState, useEffect, useMemo } from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { Layers, ArrowUpRight } from 'lucide-react-native';
import { supabase } from '../../../config/supabaseClient';
import { AppText } from '../../../components/AppText'; 
import { useTheme } from '../../../context/ThemeContext';
import episodeBg from '../../../../assets/images/episodeBg.jpg';

export const RelatedTabContent = ({ onSelectEpisode }) => {
  const { colors, isDark } = useTheme();
  const softTint = isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff';

  const [relatedItems, setRelatedItems] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    async function fetchRelated() {
      try {
        const { data: latestData, error: latestError } = await supabase
          .from('devotionals')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (latestError || !latestData || latestData.length === 0) {
          setHasLoaded(true);
          return;
        }

        const currentDevotional = latestData[0];
        const relatedQueryCategory = currentDevotional.category;

        if (!relatedQueryCategory) {
          setHasLoaded(true);
          return;
        }

        const { data, error } = await supabase
          .from('devotionals')
          .select('*')
          .eq('category', relatedQueryCategory)
          .neq('id', currentDevotional.id)
          .order('created_at', { ascending: false })
          .limit(4);

        if (data && !error) {
          const mappedData = data.map((item) => ({
            id: item.id,
            episode: `Episode ${item.episode_number || item.id}`,
            title: item.title,
            date: item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '',
            image: item.flyer_url ? { uri: item.flyer_url } : episodeBg,
            category: item.category,
          }));
          setRelatedItems(mappedData);
        }
      } catch (err) {
        console.error('Error fetching related items:', err);
      } finally {
        setHasLoaded(true);
      }
    }

    fetchRelated();
  }, []);

  const leftColumnItems = useMemo(() => relatedItems.filter((_, i) => i % 2 === 0), [relatedItems]);
  const rightColumnItems = useMemo(() => relatedItems.filter((_, i) => i % 2 !== 0), [relatedItems]);

  const renderCard = (item) => (
    <Pressable
      key={item.id}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && styles.cardPressed,
      ]}
      onPress={() => onSelectEpisode?.(item)}
    >
      <View
        style={[
          styles.isolatedImageContainer,
          { backgroundColor: colors.border, borderColor: colors.border },
        ]}
      >
        <Image source={item.image} style={styles.pureCardImage} />
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardMetaRow}>
          <AppText type="bold" style={[styles.episodeNumber, { color: colors.primary }]}>
            {item.episode}
          </AppText>
        </View>
        
        <AppText
          type="bold"
          style={[styles.archiveCardTitle, { color: colors.text }]}
          numberOfLines={2}
        >
          {item.title}
        </AppText>
        
        <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
          <AppText type="semiBold" style={[styles.cardDateText, { color: colors.textSecondary }]}>
            {item.date}
          </AppText>
          <View style={[styles.actionIconCircle, { backgroundColor: softTint }]}>
            <ArrowUpRight color={colors.primary} size={12} strokeWidth={2.5} />
          </View>
        </View>
      </View>
    </Pressable>
  );

  if (hasLoaded && relatedItems.length === 0) {
    return (
      <View style={[styles.fallbackContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Layers color={colors.primary} size={24} />
        <AppText type="semiBold" style={[styles.fallbackText, { color: colors.textSecondary }]}>
          No related content available.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.masonryGrid}>
        <View style={styles.gridColumn}>
          {leftColumnItems.map((item) => renderCard(item))}
        </View>
        <View style={styles.gridColumn}>
          {rightColumnItems.map((item) => renderCard(item))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  masonryGrid: { flexDirection: 'row', width: '100%', gap: 12 },
  gridColumn: { flex: 1, flexDirection: 'column', gap: 12 },
  card: { flex: 1, borderRadius: 20, overflow: 'hidden', borderWidth: 1, elevation: 2, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8 },
  cardPressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  isolatedImageContainer: { width: '100%', aspectRatio: 1.75, overflow: 'hidden', borderBottomWidth: 1 },
  pureCardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardContent: { padding: 12, flex: 1, justifyContent: 'space-between' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  episodeNumber: { fontSize: 10 },
  archiveCardTitle: { fontSize: 13, lineHeight: 18, marginBottom: 8, minHeight: 36 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 8, marginTop: 'auto' },
  cardDateText: { fontSize: 11 },
  actionIconCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  fallbackContainer: { borderRadius: 16, padding: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 10 },
  fallbackText: { fontSize: 14, marginTop: 8 },
});