import React, { useState, useEffect, useMemo } from 'react';
import { View, Pressable, StyleSheet, Image } from 'react-native';
import { Flame, ArrowUpRight } from 'lucide-react-native';
import { supabase } from '../../../config/supabaseClient';
import { AppText } from '../../../components/AppText'; 
import { useTheme } from '../../../context/ThemeContext';
import episodeBg from '../../../../assets/images/episodeBg.jpg';

export const PastTabContent = ({ onSelectEpisode, userId }) => {
  const { colors, isDark } = useTheme();
  const softTint = isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2';

  const [archives, setArchives] = useState([]);
  const [streakCount, setStreakCount] = useState(0);
  const [loadingStreak, setLoadingStreak] = useState(true);

  // Fetch archives and server-validated streak count
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        // 1. Fetch Archives
        const { data: devotionalData, error: devotionalError } = await supabase
          .from('devotionals')
          .select('*')
          .order('created_at', { ascending: false })
          .range(1, 4);

        if (devotionalData && !devotionalError && isMounted) {
          const mappedData = devotionalData.map((item) => ({
            id: item.id,
            title: item.title,
            date: item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '',
            image: item.flyer_url ? { uri: item.flyer_url } : episodeBg,
          }));
          setArchives(mappedData);
        }

        // 2. Fetch User Profile Streak
        if (userId) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('current_streak, last_devotional_date')
            .eq('id', userId)
            .single();

          if (profileData && !profileError && isMounted) {
            const today = new Date().toISOString().split('T')[0];
            const lastDate = profileData.last_devotional_date;
            
            if (lastDate) {
              const diffTime = new Date(today) - new Date(lastDate);
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              
              // If more than 1 day passed, visually reflect 0 (server RPC formalizes reset on next check-in)
              setStreakCount(diffDays > 1 ? 0 : (profileData.current_streak || 0));
            } else {
              setStreakCount(0);
            }
          }
        }
      } catch (err) {
        console.error('Error loading past tab data:', err);
      } finally {
        if (isMounted) setLoadingStreak(false);
      }
    }

    fetchData();
    return () => { isMounted = false; };
  }, [userId]);

  const leftColumnItems = useMemo(() => archives.filter((_, i) => i % 2 === 0), [archives]);
  const rightColumnItems = useMemo(() => archives.filter((_, i) => i % 2 !== 0), [archives]);

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

  return (
    <View style={styles.pastContainer}>
      {/* Dynamic Functional Streak Banner */}
      <View style={[styles.streakBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.streakLeft}>
          <View style={[styles.flameCircle, { backgroundColor: softTint }]}>
            <AppText type="bold" style={[styles.streakCountText, { color: colors.primary }]}>🔥</AppText>
          </View>
          <View>
            <AppText type="bold" style={[styles.streakTitle, { color: colors.text }]}>
              {loadingStreak ? 'Loading streak...' : `${streakCount}-Day Devotional Streak`}
            </AppText>
            <AppText type="regular" style={[styles.streakSubtitle, { color: colors.textSecondary }]}>
              {streakCount > 0 ? "You're on fire! Keep feeding your spirit." : "Read a devotional today to ignite your streak!"}
            </AppText>
          </View>
        </View>
      </View>

      {/* Grid Layout Core Feed */}
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
  pastContainer: { width: '100%' },
  streakBanner: { 
    borderRadius: 16, 
    padding: 14, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 20,
    borderWidth: 1, 
    elevation: 2, 
    shadowColor: '#0f172a', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 6 
  },
  streakLeft: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  flameCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  streakTitle: { fontSize: 13 },
  streakSubtitle: { fontSize: 11, marginTop: 1 },
  masonryGrid: { flexDirection: 'row', width: '100%', gap: 12 },
  gridColumn: { flex: 1, flexDirection: 'column', gap: 12 },
  card: { 
    flex: 1, 
    borderRadius: 20, 
    overflow: 'hidden', 
    borderWidth: 1, 
    elevation: 2, 
    shadowColor: '#0f172a', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.02, 
    shadowRadius: 8 
  },
  cardPressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  isolatedImageContainer: { width: '100%', aspectRatio: 1.75, overflow: 'hidden', borderBottomWidth: 1 },
  pureCardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardContent: { padding: 12, flex: 1, justifyContent: 'space-between' },
  archiveCardTitle: { fontSize: 13, lineHeight: 18, marginBottom: 8, minHeight: 36 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 8, marginTop: 'auto' },
  cardDateText: { fontSize: 11 },
  actionIconCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});