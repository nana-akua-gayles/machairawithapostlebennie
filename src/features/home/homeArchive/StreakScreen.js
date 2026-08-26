import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flame, Trophy, Calendar, ArrowLeft, Zap, Award, Crown, RotateCcw, User } from 'lucide-react-native';
import { AppText } from '../../../components/AppText';
import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../config/supabaseClient';

export default function StreakScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: null,
  });
  const [topReaders, setTopReaders] = useState([]);

  const fetchStreakAndLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Table is `profiles`, not `user_profiles` — there is no
      // user_profiles table in this project's schema. Columns here match
      // the actual profiles table: current_streak, longest_streak,
      // last_active_date (avatar column is avatar_url, not photo).
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('current_streak, longest_streak, last_devotional_date')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profileData) {
        setStreakData({
          currentStreak: profileData.current_streak ?? 0,
          // longest_streak has no default in the schema (nullable, no
          // default 0 like current_streak has), so a brand-new profile
          // row can have it as null — guard the same way current_streak
          // already does.
          longestStreak: profileData.longest_streak ?? 0,
          // last_active_date exists as a column but nothing in this app
          // currently writes to it — only last_devotional_date is
          // actually kept up to date (by DevotionalScreen's
          // recordStreakEngagement, on both reading and listening). Using
          // last_active_date here would make the weekly grid always show
          // zero active days regardless of real activity, so this reads
          // the column that's actually live.
          lastActiveDate: profileData.last_devotional_date,
        });
      }

      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, current_streak')
        .order('current_streak', { ascending: false })
        .limit(10);

      if (leaderboardError) throw leaderboardError;
      setTopReaders(leaderboardData || []);
    } catch (err) {
      console.error('Error fetching streak/leaderboard data:', err);
      setError('Unable to load streak data right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStreakAndLeaderboard();
  }, [fetchStreakAndLeaderboard]);

  // Honest "was this day actually active" instead of the previous
  // approximation (which just highlighted the most recent N calendar days
  // based on the current streak count — that misrepresents reality once a
  // streak is close to lapsing, e.g. a 3-day streak last touched 2 days
  // ago would still show today as "active"). This compares each day
  // against last_active_date and infers backwards only when the streak is
  // still currently live (i.e. last activity was today or yesterday) —
  // if the streak has already lapsed, we don't backfill any days as
  // active, since we don't have real per-day history to know which ones
  // genuinely were.
  const weekDays = React.useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActive = streakData.lastActiveDate ? new Date(streakData.lastActiveDate) : null;
    if (lastActive) lastActive.setHours(0, 0, 0, 0);

    const daysSinceLastActive = lastActive
      ? Math.floor((today - lastActive) / (1000 * 60 * 60 * 24))
      : null;
    // A streak is still "live" (not yet lapsed) if the user was active
    // today or yesterday — mirrors the >1 day gap = reset logic used
    // elsewhere in this app (PastTabContent's streak diffing).
    const streakIsLive = daysSinceLastActive !== null && daysSinceLastActive <= 1;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      // Only mark a day active if it falls within the current live
      // streak's span counting back from lastActiveDate — not just "the
      // last N days" regardless of whether the streak actually covered
      // them.
      const daysBeforeLastActive = lastActive
        ? Math.floor((lastActive - d) / (1000 * 60 * 60 * 24))
        : null;
      const isActive =
        streakIsLive &&
        daysBeforeLastActive !== null &&
        daysBeforeLastActive >= 0 &&
        daysBeforeLastActive < streakData.currentStreak;

      days.push({
        dayName: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        dateNum: d.getDate(),
        isActive,
      });
    }
    return days;
  }, [streakData.currentStreak, streakData.lastActiveDate]);

  const topThree = topReaders.slice(0, 3);
  const remainingReaders = topReaders.slice(3, 10);
  const orderedPodium = topThree.length >= 3 ? [topThree[1], topThree[0], topThree[2]] : topThree;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.backButtonCircle, { backgroundColor: colors.surfaceMuted }]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color={colors.text} size={16} strokeWidth={1.8} />
        </Pressable>
        <AppText type="medium" style={[styles.headerTitleText, { color: colors.text }]}>Study Streaks</AppText>
        <View style={{ width: 34 }} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.loaderContainer}>
          <AppText type="regular" style={[styles.errorText, { color: colors.textSecondary }]}>
            {error}
          </AppText>
          <Pressable
            onPress={fetchStreakAndLeaderboard}
            style={({ pressed }) => [styles.retryBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.7 }]}
          >
            <RotateCcw color={colors.onPrimary} size={16} style={{ marginRight: 8 }} />
            <AppText type="medium" style={[styles.retryText, { color: colors.onPrimary }]}>Try Again</AppText>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Main Streak Display */}
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.flameIconWrapper, { backgroundColor: colors.surfaceActive }]}>
              <Flame color={colors.primary} size={30} strokeWidth={1.8} />
            </View>
            <AppText type="regular" style={[styles.heroCountNumber, { color: colors.text }]}>
              {streakData.currentStreak}
            </AppText>
            <AppText type="medium" style={[styles.heroLabelText, { color: colors.textSecondary }]}>Day Active Streak</AppText>
            <AppText type="regular" style={[styles.heroSubText, { color: colors.textSecondary }]}>
              {streakData.currentStreak > 0 ? "You're keeping a steady rhythm. Keep going." : "Read a devotional today to start your streak."}
            </AppText>
          </View>

          {/* Weekly Grid */}
          <View style={[styles.cardContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <Calendar color={colors.textSecondary} size={15} strokeWidth={1.8} />
              <AppText type="medium" style={[styles.cardTitleText, { color: colors.text }]}>This Week</AppText>
            </View>
            <View style={styles.weekGridRow}>
              {weekDays.map((item, index) => (
                <View key={index} style={styles.dayColumn}>
                  <AppText type="regular" style={[styles.dayNameLabel, { color: colors.textSecondary }]}>{item.dayName}</AppText>
                  <View style={[
                    styles.dayBubble,
                    { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                    item.isActive && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}>
                    <AppText type="regular" style={[styles.dayNumText, { color: colors.text }, item.isActive && { color: colors.onPrimary }]}>
                      {item.dateNum}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Trophy color={colors.textSecondary} size={16} strokeWidth={1.8} />
              <AppText type="regular" style={[styles.statValue, { color: colors.text }]}>{streakData.longestStreak}</AppText>
              <AppText type="regular" style={[styles.statLabel, { color: colors.textSecondary }]}>Longest Streak</AppText>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Zap color={colors.textSecondary} size={16} strokeWidth={1.8} />
              <AppText type="regular" style={[styles.statValue, { color: colors.text }]}>Active</AppText>
              <AppText type="regular" style={[styles.statLabel, { color: colors.textSecondary }]}>Current Status</AppText>
            </View>
          </View>

          {/* Leaderboard Section */}
          <View style={styles.leaderboardHeader}>
            <Award color={colors.textSecondary} size={16} strokeWidth={1.8} />
            <AppText type="medium" style={[styles.leaderboardTitle, { color: colors.text }]}>Top Readers</AppText>
          </View>
          <AppText type="regular" style={[styles.leaderboardSub, { color: colors.textSecondary }]}>Ranked by current streak, across the whole community.</AppText>

          {/* Editorial Podium (2nd, 1st, 3rd) */}
          {orderedPodium.length > 0 && (
            <View style={styles.podiumRow}>
              {orderedPodium.map((reader, index) => {
                const rank = reader === topThree[0] ? 1 : reader === topThree[1] ? 2 : 3;
                const isFirst = rank === 1;

                return (
                  <View
                    key={reader.id || index}
                    style={[
                      styles.podiumCol,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isFirst && styles.podiumColFirst
                    ]}
                  >
                    {isFirst && <Crown color="#eab308" size={15} style={styles.podiumCrown} />}
                    <View style={[
                      styles.podiumBadge,
                      rank === 1 ? styles.badgeGold : rank === 2 ? styles.badgeSilver : styles.badgeBronze
                    ]}>
                      <AppText type="regular" style={styles.badgeText}>{rank}</AppText>
                    </View>
                    {reader.avatar_url ? (
                      <Image source={{ uri: reader.avatar_url }} style={styles.podiumAvatar} />
                    ) : (
                      <View style={[styles.podiumAvatar, styles.avatarFallback]}>
                        <User color={colors.textSecondary} size={18} strokeWidth={1.8} />
                      </View>
                    )}
                    <AppText type="medium" numberOfLines={1} style={[styles.podiumName, { color: colors.text }]}>{reader.name || 'Reader'}</AppText>
                    <AppText type="regular" style={[styles.podiumStreak, { color: colors.textSecondary }]}>{reader.current_streak} days</AppText>
                  </View>
                );
              })}
            </View>
          )}

          {/* Remaining Ranks 4-10 */}
          {remainingReaders.length > 0 && (
            <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {remainingReaders.map((reader, index) => {
                const rankNum = index + 4;
                return (
                  <View key={reader.id || index} style={[styles.listRow, index !== remainingReaders.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    <View style={styles.listLeft}>
                      <AppText type="regular" style={[styles.listRank, { color: colors.textSecondary }]}>{rankNum}</AppText>
                      {reader.avatar_url ? (
                        <Image source={{ uri: reader.avatar_url }} style={styles.listAvatar} />
                      ) : (
                        <View style={[styles.listAvatar, styles.avatarFallback]}>
                          <User color={colors.textSecondary} size={14} strokeWidth={1.8} />
                        </View>
                      )}
                      <AppText type="regular" numberOfLines={1} style={[styles.listName, { color: colors.text }]}>{reader.name || 'Member'}</AppText>
                    </View>
                    <View style={[styles.listStreakBox, { backgroundColor: colors.surfaceActive }]}>
                      <Flame color={colors.primary} size={11} />
                      <AppText type="regular" style={[styles.listStreakNum, { color: colors.text }]}>{reader.current_streak}</AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backButtonCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  headerTitleText: { fontSize: 15, letterSpacing: -0.2 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  errorText: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  retryText: {},
  scrollContent: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 40 },

  heroCard: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  flameIconWrapper: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  heroCountNumber: { fontSize: 32, letterSpacing: -0.4, lineHeight: 38 },
  heroLabelText: { fontSize: 12.5, marginTop: 2 },
  heroSubText: { fontSize: 11.5, textAlign: 'center', marginTop: 4, opacity: 0.65 },

  cardContainer: { borderRadius: 16, padding: 14, borderWidth: 1, marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  cardTitleText: { fontSize: 13.5 },
  weekGridRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayColumn: { alignItems: 'center', gap: 5 },
  dayNameLabel: { fontSize: 9.5, textTransform: 'uppercase', opacity: 0.55 },
  dayBubble: { width: 34, height: 38, borderRadius: 9, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  dayNumText: { fontSize: 11.5 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1, alignItems: 'flex-start', gap: 3 },
  statValue: { fontSize: 16, marginTop: 2, letterSpacing: -0.2 },
  statLabel: { fontSize: 10.5, opacity: 0.65 },

  leaderboardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  leaderboardTitle: { fontSize: 14 },
  leaderboardSub: { fontSize: 11.5, opacity: 0.65, marginBottom: 12 },

  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 },
  podiumCol: { flex: 1, borderRadius: 14, padding: 10, alignItems: 'center', borderWidth: 1, position: 'relative' },
  podiumColFirst: { paddingVertical: 16, marginTop: -6 },
  podiumCrown: { position: 'absolute', top: -9 },
  podiumBadge: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  badgeGold: { backgroundColor: '#eab308' },
  badgeSilver: { backgroundColor: '#94a3b8' },
  badgeBronze: { backgroundColor: '#b45309' },
  badgeText: { color: '#ffffff', fontSize: 8.5 },
  podiumAvatar: { width: 36, height: 36, borderRadius: 18, marginBottom: 6, backgroundColor: '#e2e8f0' },
  podiumName: { fontSize: 11.5, textAlign: 'center', marginBottom: 2 },
  podiumStreak: { fontSize: 10.5, opacity: 0.65 },

  listCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', paddingHorizontal: 12, marginBottom: 12 },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9 },
  listLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  listRank: { fontSize: 11.5, width: 14, textAlign: 'center', opacity: 0.55 },
  listAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#e2e8f0' },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  listName: { fontSize: 12.5, flex: 1 },
  listStreakBox: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  listStreakNum: { fontSize: 11.5 },
});
