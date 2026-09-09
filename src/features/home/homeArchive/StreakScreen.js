import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator, Image, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flame, Trophy, Calendar, ChevronLeft, Zap, Award, Crown, RotateCcw, User } from 'lucide-react-native';
import { AppText } from '../../../components/AppText';
import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../config/supabaseClient';

const { width } = Dimensions.get('window');

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

  const horizontalScrollRef = useRef(null);

  const fetchStreakAndLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('current_streak, longest_streak, last_devotional_date')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profileData) {
        setStreakData({
          currentStreak: profileData.current_streak ?? 0,
          longestStreak: profileData.longest_streak ?? 0,
          lastActiveDate: profileData.last_devotional_date,
        });
      }

      const { data: leaderboardData, error: leaderboardError } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, current_streak, longest_streak, updated_at')
        .gt('current_streak', 0)
        .order('current_streak', { ascending: false })
        .order('longest_streak', { ascending: false })
        .order('updated_at', { ascending: true })
        .order('name', { ascending: true })
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

  useEffect(() => {
    if (!loading && horizontalScrollRef.current) {
      setTimeout(() => {
        horizontalScrollRef.current?.scrollToEnd({ animated: false });
      }, 60);
    }
  }, [loading]);

  const weekDays = React.useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActive = streakData.lastActiveDate ? new Date(streakData.lastActiveDate) : null;
    if (lastActive) lastActive.setHours(0, 0, 0, 0);

    const daysSinceLastActive = lastActive
      ? Math.floor((today - lastActive) / (1000 * 60 * 60 * 24))
      : null;
    const streakIsLive = daysSinceLastActive !== null && daysSinceLastActive <= 1;

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);

      const daysBeforeLastActive = lastActive
        ? Math.floor((lastActive - d) / (1000 * 60 * 60 * 24))
        : null;
      const isActive =
        streakIsLive &&
        daysBeforeLastActive !== null &&
        daysBeforeLastActive >= 0 &&
        daysBeforeLastActive < streakData.currentStreak;

      days.push({
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
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
      <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
        <Pressable style={[styles.backButtonCircle, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]} onPress={() => navigation.goBack()}>
          <ChevronLeft color={colors.text} size={18} strokeWidth={1.5} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <AppText type="medium" style={[styles.headerTitleText, { color: colors.text }]}>Streaks Board</AppText>
        </View>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.loaderContainer}>
          <AppText type="regular" style={[styles.errorText, { color: colors.textSecondary }]}>{error}</AppText>
          <Pressable onPress={fetchStreakAndLeaderboard} style={({ pressed }) => [styles.retryBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.7 }]}>
            <RotateCcw color={colors.onPrimary} size={16} style={{ marginRight: 8 }} />
            <AppText type="medium" style={[styles.retryText, { color: colors.onPrimary }]}>Try Again</AppText>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.heroOrbBackground, { backgroundColor: colors.primary }]} />
            
            <View style={styles.heroTopRow}>
              <View style={[styles.heroIconBubble, { backgroundColor: colors.primary }]}>
                <Flame color={colors.onPrimary} size={22} strokeWidth={1.5} />
              </View>
            </View>

            <View style={styles.heroMainContent}>
              <View style={styles.heroNumberGroup}>
                <AppText type="regular" style={[styles.heroCountNumber, { color: colors.text }]}>
                  {streakData.currentStreak}
                </AppText>
                <AppText type="medium" style={[styles.heroUnitLabel, { color: colors.primary }]}>
                  {streakData.currentStreak === 1 ? 'DAY' : 'DAYS'}
                </AppText>
              </View>
              
              <View style={[styles.dividerVertical, { backgroundColor: colors.border }]} />

              <View style={{ flex: 1 }}>
                <AppText type="medium" style={[styles.heroLabelText, { color: colors.text }]}>
                  Active Study 
                </AppText>
                <AppText type="regular" style={[styles.heroSubText, { color: colors.textSecondary }]}>
                  {streakData.currentStreak > 0 ? "Each day with God strengthens your heart and renews your spirit." : "Every great journey begins with one faithful step."}
                </AppText>
              </View>
            </View>
          </View>

          <View style={[styles.cardContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <AppText type="semiBold" style={[styles.cardTitleText, { color: colors.text }]}>WEEKLY CHECK-INS</AppText>
            </View>
            <ScrollView ref={horizontalScrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalGridScroll}>
              {weekDays.map((item, index) => (
                <View key={index} style={[styles.dayPill, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }, item.isActive && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                  <AppText type="regular" style={[styles.dayNameLabel, { color: colors.textSecondary }, item.isActive && { color: colors.onPrimary, opacity: 0.85 }]}>{item.dayName}</AppText>
                  <AppText type="semiBold" style={[styles.dayNumText, { color: colors.text }, item.isActive && { color: colors.onPrimary }]}>{item.dateNum}</AppText>
                  {item.isActive && <Flame color={colors.onPrimary} size={12} style={styles.activeFlameIcon} />}
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.leaderboardHeaderArea}>
            <View style={styles.leaderboardTitleGroup}>
              <AppText type="medium" style={[styles.leaderboardTitle, { color: colors.text }]}>Global Machaira Nerds</AppText>
            </View>
          </View>

          {orderedPodium.length > 0 && (
            <View style={styles.podiumRow}>
              {orderedPodium.map((reader, index) => {
                const rank = reader === topThree[0] ? 1 : reader === topThree[1] ? 2 : 3;
                const isFirst = rank === 1;

                return (
                  <View key={reader.id || index} style={[styles.podiumCol, { backgroundColor: colors.card, borderColor: colors.border }, isFirst && styles.podiumColFirst]}>
                    {isFirst && <Crown color="#eab308" size={16} style={styles.podiumCrown} />}
                    <View style={[styles.podiumBadge, rank === 1 ? styles.badgeGold : rank === 2 ? styles.badgeSilver : styles.badgeBronze]}>
                      <AppText type="medium" style={styles.badgeText}>0{rank}</AppText>
                    </View>
                    
                    <View style={styles.podiumAvatarContainer}>
                      {reader.avatar_url ? (
                        <Image source={{ uri: reader.avatar_url }} style={styles.podiumAvatar} />
                      ) : (
                        <View style={[styles.podiumAvatar, styles.avatarFallback, { backgroundColor: colors.surfaceMuted }]}>
                          <User color={colors.textSecondary} size={18} strokeWidth={1.5} />
                        </View>
                      )}
                    </View>

                    <AppText type="medium" numberOfLines={1} style={[styles.podiumName, { color: colors.text }]}>
                      {reader.name || 'Reader'}
                    </AppText>
                    <AppText type="regular" style={[styles.podiumStreak, { color: colors.primary }]}>
                      {reader.current_streak} {reader.current_streak === 1 ? 'day' : 'days'}
                    </AppText>
                  </View>
                );
              })}
            </View>
          )}

          {remainingReaders.length > 0 && (
            <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {remainingReaders.map((reader, index) => {
                const rankNum = index + 4;
                const formattedRank = rankNum < 10 ? `0${rankNum}` : `${rankNum}`;
                return (
                  <View key={reader.id || index} style={[styles.listRow, index !== remainingReaders.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                    <View style={styles.listLeft}>
                      <AppText type="medium" style={[styles.listRank, { color: colors.textSecondary }]}>{formattedRank}</AppText>
                      {reader.avatar_url ? (
                        <Image source={{ uri: reader.avatar_url }} style={styles.listAvatar} />
                      ) : (
                        <View style={[styles.listAvatar, styles.avatarFallback, { backgroundColor: colors.surfaceMuted }]}>
                          <User color={colors.textSecondary} size={13} strokeWidth={1.5} />
                        </View>
                      )}
                      <AppText type="medium" numberOfLines={1} style={[styles.listName, { color: colors.text }]}>{reader.name || 'Member'}</AppText>
                    </View>
                    <View style={[styles.listStreakBox, { backgroundColor: colors.surfaceActive, borderColor: colors.border }]}>
                      <Flame color={colors.primary} size={12} />
                      <AppText type="medium" style={[styles.listStreakNum, { color: colors.text }]}>{reader.current_streak}</AppText>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  backButtonCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitleContainer: { alignItems: 'center', flex: 1, marginHorizontal: 10 },
  headerTitleText: { fontSize: 15, letterSpacing: -0.3 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  errorText: { fontSize: 13, textAlign: 'center', marginBottom: 16 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  retryText: {},
  scrollContent: { paddingHorizontal: 20, paddingVertical: 24, paddingBottom: 64 },
  heroCard: { padding: 24, borderRadius: 26, borderWidth: 1, marginBottom: 20, overflow: 'hidden', position: 'relative' },
  heroOrbBackground: { position: 'absolute', top: -60, right: -60, width: 160, height: 160, borderRadius: 80, opacity: 0.06 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 20 },
  heroIconBubble: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  heroMainContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroNumberGroup: { alignItems: 'flex-start' },
  heroCountNumber: { fontSize: 56, letterSpacing: -2, lineHeight: 58 },
  heroUnitLabel: { fontSize: 10, letterSpacing: 1.2, marginTop: -2 },
  dividerVertical: { width: 1, height: 48, opacity: 0.15 },
  heroLabelText: { fontSize: 14.5, letterSpacing: -0.2, marginBottom: 4 },
  heroSubText: { fontSize: 11.5, lineHeight: 17, opacity: 0.65 },
  cardContainer: { borderRadius: 22, padding: 18, borderWidth: 1, marginBottom: 20 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitleText: { fontSize: 10, letterSpacing: 1.2 },
  horizontalGridScroll: { gap: 10, paddingBottom: 2 },
  dayPill: { width: 60, height: 76, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center', gap: 4, position: 'relative' },
  dayNameLabel: { fontSize: 9, letterSpacing: 0.5, opacity: 0.6 },
  dayNumText: { fontSize: 15 },
  activeFlameIcon: { position: 'absolute', bottom: 8 },
  leaderboardHeaderArea: { marginBottom: 16, marginTop: 16 },
  leaderboardTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  leaderboardTitle: { fontSize: 16, letterSpacing: -0.2, marginBottom: 10 },
  podiumRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 20 },
  podiumCol: { flex: 1, borderRadius: 22, padding: 14, alignItems: 'center', borderWidth: 1, position: 'relative' },
  podiumColFirst: { paddingVertical: 24, marginTop: -10 },
  podiumCrown: { position: 'absolute', top: -10 },
  podiumBadge: { position: 'absolute', top: 10, right: 10, paddingHorizontal: 6, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  badgeGold: { backgroundColor: '#eab308' },
  badgeSilver: { backgroundColor: '#94a3b8' },
  badgeBronze: { backgroundColor: '#b40937' },
  badgeText: { color: '#ffffff', fontSize: 9.5, letterSpacing: 0.5 },
  podiumAvatarContainer: { position: 'relative', marginBottom: 8 },
  podiumAvatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  podiumName: { fontSize: 12, textAlign: 'center', marginBottom: 2 },
  podiumStreak: { fontSize: 11 },
  listCard: { borderRadius: 22, borderWidth: 1, overflow: 'hidden', paddingHorizontal: 16 },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  listLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, marginRight: 12 },
  listRank: { fontSize: 11.5, width: 22, opacity: 0.5, letterSpacing: 0.5 },
  listAvatar: { width: 34, height: 34, borderRadius: 17 },
  listName: { fontSize: 13, flex: 1, letterSpacing: -0.1 },
  listStreakBox: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  listStreakNum: { fontSize: 12 },
});