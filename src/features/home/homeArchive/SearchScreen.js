import React, { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Pressable, StyleSheet, Image, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../../config/supabaseClient';
import { AppText } from '../../../components/AppText';
import { useTheme } from '../../../context/ThemeContext';
import { Search, ArrowLeft, BookOpen, X } from 'lucide-react-native';
import episodeBg from '../../../../assets/images/episodeBg.jpg';

export function SearchScreen({ navigation, onSelectEpisode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        performSearch(searchQuery.trim());
      } else {
        setResults([]);
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async (queryText) => {
    setLoading(true);
    try {
      let query = supabase
        .from('devotionals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      const isNumeric = !isNaN(queryText);

      if (isNumeric) {
        query = query.or(`title.ilike.%${queryText}%,category.ilike.%${queryText}%,episode_number.eq.${queryText}`);
      } else {
        query = query.or(`title.ilike.%${queryText}%,category.ilike.%${queryText}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setResults(data || []);
    } catch (err) {
      console.error('Error searching devotionals:', err);
    } finally {
      setLoading(false);
    }
  };

  const getReadTime = (content) => {
    if (!content || typeof content !== 'string') return '1 min read';
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    if (words === 0) return '1 min read';
    const minutes = Math.max(1, Math.round(words / 200));
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
          <AppText type="bold" style={[styles.episodeTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </AppText>
          
          <AppText type="regular" style={[styles.seriesSubtitle, { color: colors.textSecondary }]}>
            {item.series || 'Estimated Read Time'} • {dynamicReadTime}
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
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={[styles.flexOne, { backgroundColor: colors.background }]}
    >
      {/* Header with Search Bar */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <Pressable 
          style={[styles.backButton, { backgroundColor: colors.border }]} 
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <ArrowLeft color={colors.text} size={20} />
        </Pressable>

        <View style={[styles.searchBarContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search color={colors.textSecondary} size={18} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search episodes, titles, content..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8} style={styles.clearButton}>
              <X color={colors.textSecondary} size={16} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Results Section */}
      {loading ? (
        <View style={styles.centerWrapper}>
          <AppText type="regular" style={{ color: colors.textSecondary }}>Searching archives...</AppText>
        </View>
      ) : searchQuery.trim().length === 0 ? (
        <View style={styles.centerWrapper}>
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Search color={colors.primary} size={48} strokeWidth={1.5} />
            <AppText type="bold" style={[styles.emptyTitle, { color: colors.text }]}>Find Any Machaira Episode</AppText>
            <AppText type="regular" style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Type titles or episode numbers to search through all the Machaira episodes.
            </AppText>
          </View>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.centerWrapper}>
          <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Search color="#fecaca" size={48} strokeWidth={1.5} />
            <AppText type="bold" style={[styles.emptyTitle, { color: colors.text }]}>No Results Found</AppText>
            <AppText type="regular" style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              We couldn't find any matches for "{searchQuery}". Try checking your spelling or using different keywords.
            </AppText>
          </View>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderEpisodeItem}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flexOne: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearButton: { padding: 4 },
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