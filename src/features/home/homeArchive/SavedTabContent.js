import React, { useState, useEffect } from 'react';
import { View, FlatList, Pressable, StyleSheet, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../config/supabaseClient';
import { AppText } from '../../../components/AppText';
import { useTheme } from '../../../context/ThemeContext';
import { Bookmark, Heart, BookOpen, ArrowLeft } from 'lucide-react-native';
import episodeBg from '../../../../assets/images/episodeBg.jpg';


export function SavedScreen({ user, navigation, onSelectEpisode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSavedDevotionals() {
      console.log('--- FETCH SAVED DEVOTIONALS STARTED ---');
      console.log('Current User object:', user);

      if (!user?.id) {
        console.log('No user ID found, aborting fetch.');
        setSavedItems([]);
        setLoading(false);
        return;
      }

      try {
        // 1. Get all saved episode numbers for this user
        console.log(`Querying saved_devotionals for user_id: ${user.id}`);
        const { data: savedRows, error: savedError } = await supabase
          .from('saved_devotionals')
          .select('episode_number')
          .eq('user_id', user.id);

        if (savedError) {
          console.error('Error from saved_devotionals query:', savedError);
          throw savedError;
        }

        console.log('Raw savedRows fetched from database:', savedRows);

        if (!savedRows || savedRows.length === 0) {
          console.log('No saved rows found for this user.');
          setSavedItems([]);
          setLoading(false);
          return;
        }

        const episodeNumbers = savedRows.map(r => r.episode_number).filter(Boolean);
        console.log('Extracted episode numbers array:', episodeNumbers);

        if (episodeNumbers.length === 0) {
          console.log('Episode numbers array is empty after filtering.');
          setSavedItems([]);
          setLoading(false);
          return;
        }

        // 2. Fetch the corresponding devotionals matching those episode numbers
        console.log(`Querying devotionals table using .in('episode_number', [${episodeNumbers.join(', ')}])`);
        const { data: devotionalRows, error: devError } = await supabase
          .from('devotionals')
          .select('*')
          .in('episode_number', episodeNumbers);

        if (devError) {
          console.error('Error from devotionals query:', devError);
          throw devError;
        }

        console.log('Devotional rows fetched successfully:', devotionalRows);
        setSavedItems(devotionalRows || []);
      } catch (err) {
        console.error('Catch block error fetching saved items:', err);
      } finally {
        console.log('--- FETCH SAVED DEVOTIONALS COMPLETED ---');
        setLoading(false);
      }
    }

    fetchSavedDevotionals();
  }, [user?.id]);

  const handleRemoveFavorite = async (episodeNumber) => {
    if (!user?.id) return;

    console.log(`Removing favorite for episode_number: ${episodeNumber}`);

    // Optimistically update UI
    setSavedItems(prev => prev.filter(item => item.episode_number !== episodeNumber && item.id !== episodeNumber));

    try {
      const { error } = await supabase
        .from('saved_devotionals')
        .delete()
        .eq('user_id', user.id)
        .eq('episode_number', episodeNumber);

      if (error) throw error;
      console.log('Successfully removed bookmark from database.');
    } catch (err) {
      console.error('Error removing saved item:', err);
    }
  };

  const getReadTime = (content) => {
    if (!content) return '5 min read';
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  };

  const renderEpisodeItem = ({ item }) => {
    const progress = item.progress || 0;
    const isCompleted = progress === 100;
    const coverSource = item.flyer_url ? { uri: item.flyer_url } : episodeBg;
    const dynamicReadTime = getReadTime(item.content || item.body || item.text);

    return (
      <Pressable 
        style={[styles.episodeCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => onSelectEpisode ? onSelectEpisode(item) : navigation.navigate('Devotional', {
          episodeId: item.id.toString(),
          title: item.title,
          date: item.date,
        })}
      >
        <View style={styles.coverWrapper}>
          <Image source={coverSource} style={[styles.episodeCover, { backgroundColor: colors.border }]} />
          <View style={[styles.textBadge, isCompleted && styles.textBadgeCompleted]}>
            <BookOpen color="#ffffff" size={10} />
          </View>
        </View>
        
        <View style={styles.episodeDetails}>
          <View style={styles.titleRow}>
            <AppText type="bold" style={[styles.episodeTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </AppText>
            <Pressable 
                hitSlop={12} 
                onPress={(e) => {
                  e.stopPropagation();
                  handleRemoveFavorite(item.episode_number || item.id);
                }}
                style={styles.favoriteButton}
              >
                <Heart color="#ef4444" fill="#ef4444" size={16} />
              </Pressable>
          </View>
          
          <AppText type="regular" style={[styles.seriesSubtitle, { color: colors.textSecondary }]}>
            {item.series || 'Read Time:'} • {dynamicReadTime}
          </AppText>

          <View style={styles.progressContainer}>
            <View style={[styles.progressBarBackground, { backgroundColor: colors.border }]}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
            <View style={styles.progressTextRow}>
              <AppText type="semiBold" style={[styles.progressText, { color: colors.textSecondary }, isCompleted && styles.completedText]}>
                {isCompleted ? 'Finished Reading' : `${progress}% Read`}
              </AppText>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.flexOne, { backgroundColor: colors.background }]}>
      {/* Custom Header with Back Button */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <Pressable 
          style={[styles.backButton, { backgroundColor: colors.border }]} 
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <ArrowLeft color={colors.text} size={20} />
        </Pressable>
        <AppText type="bold" style={[styles.headerTitle, { color: colors.text }]}>Your Machaira Shelf</AppText>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content Area */}
      {!user ? (
        <View style={styles.centerWrapper}>
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Bookmark color={colors.primary} size={48} strokeWidth={1.5} />
            <AppText type="bold" style={[styles.emptyTitle, { color: colors.text }]}>Shelf is Empty</AppText>
            <AppText type="regular" style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Sign in to view your saved Machaira episodes.
            </AppText>
          </View>
        </View>
      ) : loading ? (
        <View style={styles.centerWrapper}>
          <AppText type="regular" style={{ color: colors.textSecondary }}>Loading saved items...</AppText>
        </View>
      ) : savedItems.length === 0 ? (
        <View style={styles.centerWrapper}>
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Heart color="#fecaca" size={48} strokeWidth={1.5} fill="#fee2e2" />
            <AppText type="bold" style={[styles.emptyTitle, { color: colors.text }]}>Shelf is Empty</AppText>
            <AppText type="regular" style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Tap the favorite icon while reading Machaira episodes to save them here.
            </AppText>
          </View>
        </View>
      ) : (
        <FlatList
          data={savedItems}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderEpisodeItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17 },
  headerSpacer: { width: 38 },
  centerWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  listContent: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  episodeCard: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8 },
      android: { elevation: 1 }
    })
  },
  coverWrapper: { position: 'relative' },
  episodeCover: {
    width: 80,
    height: 80,
    borderRadius: 14,
  },
  textBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#a1a1aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBadgeCompleted: {
    backgroundColor: '#ef4444'
  },
  episodeDetails: { flex: 1, marginLeft: 16, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  episodeTitle: { fontSize: 14, flex: 1, marginRight: 8 },
  favoriteButton: { padding: 4 },
  seriesSubtitle: { fontSize: 12, marginTop: 2 },
  progressContainer: { marginTop: 10 },
  progressBarBackground: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#ef4444', borderRadius: 2 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  progressText: { fontSize: 11 },
  completedText: { color: '#ef4444' },
  emptyContainer: { borderRadius: 16, padding: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, width: '100%' },
  emptyTitle: { fontSize: 16, marginTop: 12 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 }
});