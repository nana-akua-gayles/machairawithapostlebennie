import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Pressable, Dimensions, Image } from 'react-native';
import { AppText } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Trophy, Crown, User, Sparkles, Flame } from 'lucide-react-native';
import { supabase } from '../../config/supabaseClient';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const LEADERBOARD_GAMES = [
  { key: 'threads', title: 'THREADS OF MACHAIRA' },
  { key: 'scramble', title: 'WORD SCRAMBLE' },
  { key: 'search', title: 'SEARCH WORD' }
];

export const GameLeaderboard = ({ navigation }) => {
  const { isDark } = useTheme();

  const colors = {
    background: isDark ? '#09090b' : '#f8fafc',
    cardBg: isDark ? '#18181b' : '#ffffff',
    centerCardBg: isDark ? '#1a1213' : '#fff8f8',
    textMain: isDark ? '#ffffff' : '#0f172a',
    subText: isDark ? '#a1a1aa' : '#64748b',
    border: isDark ? '#27272a' : '#f1f5f9',
    accent: isDark ? '#f87171' : '#e11d48', // Softer, muted rose-red
    accentLight: isDark ? '#231416' : '#fff1f2',
    accentBorder: isDark ? '#4c1d22' : '#fecdd3',
    backBtnBg: isDark ? '#27272a' : '#f1f5f9',
    myStatsBg: isDark ? '#121214' : '#0f172a',
    dropdownBg: isDark ? '#18181b' : '#ffffff',
    dropdownActiveBg: isDark ? '#231416' : '#fff1f2',
  };

  const [loading, setLoading] = useState(true);
  const [selectedGameKey, setSelectedGameKey] = useState('threads');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [topUsers, setTopUsers] = useState([]);
  const [currentUserRankData, setCurrentUserRankData] = useState({ rank: '#-', totalPoints: 0, avatarUrl: null });

  useEffect(() => {
    fetchLeaderboardData();
  }, [selectedGameKey]);

  const fetchLeaderboardData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('game_sessions')
        .select(`
          user_id,
          score,
          profiles:user_id (
            id,
            name,
            avatar_url
          )
        `)
        .eq('game_type', selectedGameKey);

      if (sessionsError) throw sessionsError;

      const userScoresMap = {};
      
      if (sessionsData) {
        sessionsData.forEach(row => {
          const userId = row.user_id;
          const profile = row.profiles;
          const scoreVal = row.score || 0;

          if (!userScoresMap[userId]) {
            userScoresMap[userId] = {
              id: userId,
              name: profile?.name || 'Machaira Scholar',
              avatarUrl: profile?.avatar_url || null,
              totalPoints: 0
            };
          }
          userScoresMap[userId].totalPoints += scoreVal;
        });
      }

      const formattedProfiles = Object.values(userScoresMap).map(user => ({
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        points: Math.floor(user.totalPoints),
        rawPoints: user.totalPoints
      }));

      formattedProfiles.sort((a, b) => {
        if (b.rawPoints !== a.rawPoints) {
          return b.rawPoints - a.rawPoints;
        }
        return a.name.localeCompare(b.name);
      });

      const rankedProfiles = formattedProfiles.map((user, index) => ({
        ...user,
        rank: index + 1
      }));

      setTopUsers(rankedProfiles);

      if (currentUserId) {
        const userObj = rankedProfiles.find(u => u.id === currentUserId);
        if (userObj) {
          setCurrentUserRankData({
            rank: `#${userObj.rank}`,
            totalPoints: userObj.points,
            avatarUrl: userObj.avatarUrl
          });
        } else {
          const { data: currentUserProfile } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .eq('id', currentUserId)
            .single();

          setCurrentUserRankData({
            rank: '#-',
            totalPoints: 0,
            avatarUrl: currentUserProfile ? currentUserProfile.avatar_url : null
          });
        }
      }
    } catch (err) {
      console.error('Error fetching leaderboard data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    Haptics.selectionAsync();
    navigation.goBack();
  };

  const handleSelectCategory = (key) => {
    Haptics.selectionAsync();
    setSelectedGameKey(key);
    setDropdownOpen(false);
  };

  const currentCategoryTitle = LEADERBOARD_GAMES.find(g => g.key === selectedGameKey)?.title || 'CHOOSE CATEGORY';
  
  const firstPlace = topUsers[0] || null;
  const secondPlace = topUsers[1] || null;
  const thirdPlace = topUsers[2] || null;

  const remainingUsers = topUsers.slice(3, 13);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, borderBottomWidth: isDark ? 1 : 0 }]}>
        <TouchableOpacity onPress={handleBack} style={[styles.backBtn, { backgroundColor: colors.backBtnBg }]}>
          <ChevronLeft size={24} color={colors.textMain} />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <AppText type="bold" style={[styles.headerTitle, { color: colors.textMain }]}>LEADERSHIP DASHBOARD</AppText>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={[styles.heroBadge, { backgroundColor: colors.accentLight }]}>
            <Flame size={14} color={colors.accent} />
            <AppText type="bold" style={[styles.heroBadgeText, { color: colors.accent }]}>LIVE ARENA</AppText>
          </View>
          <AppText type="bold" style={[styles.heroTitle, { color: colors.textMain }]}>The Scroll of Honor</AppText>
          <AppText style={[styles.heroSubtitle, { color: colors.subText }]}>Devotion measured by truth and wisdom.</AppText>
        </View>

        <View style={styles.pickerWrapper}>
          <AppText type="bold" style={[styles.pickerLabel, { color: colors.subText }]}>CHOOSE CATEGORY</AppText>
          <Pressable 
            onPress={() => {
              Haptics.selectionAsync();
              setDropdownOpen(prev => !prev);
            }} 
            style={[styles.dropdownBtn, { backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}
          >
            <AppText type="bold" style={[styles.dropdownBtnText, { color: colors.textMain }]}>{currentCategoryTitle}</AppText>
            <AppText style={[styles.dropdownChevron, { color: colors.subText }]}>{dropdownOpen ? '▲' : '▼'}</AppText>
          </Pressable>

          {dropdownOpen && (
            <View style={[styles.dropdownMenu, { backgroundColor: colors.dropdownBg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
              {LEADERBOARD_GAMES.map(game => (
                <Pressable 
                  key={game.key} 
                  style={[styles.dropdownOption, { borderBottomColor: colors.border }, selectedGameKey === game.key && { backgroundColor: colors.dropdownActiveBg }]}
                  onPress={() => handleSelectCategory(game.key)}
                >
                  <AppText type="bold" style={[styles.dropdownOptionText, { color: colors.subText }, selectedGameKey === game.key && { color: colors.accent }]}>
                    {game.title}
                  </AppText>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <AppText style={[styles.loaderText, { color: colors.subText }]}>RETRIEVING RECORDS...</AppText>
          </View>
        ) : (
          <>
            <View style={styles.podiumWrapper}>
              <View style={[styles.podiumColumn, styles.podiumSide, { backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
                <View style={[styles.podiumAvatarCircle, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}>
                  {secondPlace?.avatarUrl ? (
                    <Image source={{ uri: secondPlace.avatarUrl }} style={styles.podiumAvatarImage} />
                  ) : (
                    <AppText type="bold" style={[styles.podiumAvatarInitial, { color: colors.accent }]}>
                      {secondPlace ? secondPlace.name.charAt(0) : '2'}
                    </AppText>
                  )}
                  <View style={[styles.podiumRankBubbleSide, { backgroundColor: colors.accent }]}>
                    <AppText type="bold" style={styles.podiumRankBubbleText}>2</AppText>
                  </View>
                </View>
                <AppText type="bold" numberOfLines={1} style={[styles.podiumName, { color: colors.textMain }]}>
                  {secondPlace ? secondPlace.name : '—'}
                </AppText>
                <AppText style={[styles.podiumScore, { color: colors.accent }]}>
                  {secondPlace ? `${secondPlace.points} pts` : '0 pts'}
                </AppText>
              </View>

              <View style={[styles.podiumColumn, styles.podiumCenter, { backgroundColor: colors.centerCardBg, borderColor: colors.accentBorder, borderWidth: 1.5 }]}>
                <View style={styles.crownGlow}>
                  <Crown size={26} color={colors.accent} />
                </View>
                <View style={[styles.podiumAvatarCircleCenter, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}>
                  {firstPlace?.avatarUrl ? (
                    <Image source={{ uri: firstPlace.avatarUrl }} style={styles.podiumAvatarImageCenter} />
                  ) : (
                    <AppText type="bold" style={[styles.podiumAvatarInitialCenter, { color: colors.accent }]}>
                      {firstPlace ? firstPlace.name.charAt(0) : '1'}
                    </AppText>
                  )}
                  <View style={[styles.podiumRankBubbleCenter, { backgroundColor: colors.accent }]}>
                    <AppText type="bold" style={styles.podiumRankBubbleText}>1</AppText>
                  </View>
                </View>
                <AppText type="bold" numberOfLines={1} style={[styles.podiumNameCenter, { color: colors.textMain }]}>
                  {firstPlace ? firstPlace.name : '—'}
                </AppText>
                <AppText type="bold" style={[styles.podiumScoreCenter, { color: colors.accent }]}>
                  {firstPlace ? `${firstPlace.points} pts` : '0 pts'}
                </AppText>
              </View>

              <View style={[styles.podiumColumn, styles.podiumSide, { backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
                <View style={[styles.podiumAvatarCircle, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}>
                  {thirdPlace?.avatarUrl ? (
                    <Image source={{ uri: thirdPlace.avatarUrl }} style={styles.podiumAvatarImage} />
                  ) : (
                    <AppText type="bold" style={[styles.podiumAvatarInitial, { color: colors.accent }]}>
                      {thirdPlace ? thirdPlace.name.charAt(0) : '3'}
                    </AppText>
                  )}
                  <View style={[styles.podiumRankBubbleSide, { backgroundColor: colors.accent }]}>
                    <AppText type="bold" style={styles.podiumRankBubbleText}>3</AppText>
                  </View>
                </View>
                <AppText type="bold" numberOfLines={1} style={[styles.podiumName, { color: colors.textMain }]}>
                  {thirdPlace ? thirdPlace.name : '—'}
                </AppText>
                <AppText style={[styles.podiumScore, { color: colors.accent }]}>
                  {thirdPlace ? `${thirdPlace.points} pts` : '0 pts'}
                </AppText>
              </View>
            </View>

            <View style={[styles.myStatsCard, { backgroundColor: colors.myStatsBg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
              <View style={styles.myStatsLeft}>
                <AppText type="bold" style={[styles.myStatsHeader, { color: colors.subText }]}>YOUR POSITION</AppText>
                <AppText type="bold" style={[styles.myStatsPointsVal, { color: colors.textMain }]}>{currentUserRankData.totalPoints} <AppText style={[styles.myStatsPointsLabel, { color: colors.subText }]}>pts</AppText></AppText>
              </View>
              <View style={[styles.myStatsCenterAvatarBox, { backgroundColor: colors.accent }]}>
                {currentUserRankData.avatarUrl ? (
                  <Image source={{ uri: currentUserRankData.avatarUrl }} style={styles.myStatsAvatarImage} />
                ) : (
                  <User size={26} color="#ffffff" />
                )}
              </View>
              <View style={styles.myStatsRight}>
                <AppText type="bold" style={[styles.myStatsHeaderRight, { color: colors.subText }]}>GLOBAL RANK</AppText>
                <AppText type="bold" style={[styles.myStatsRankVal, { color: colors.accent }]}>{currentUserRankData.rank}</AppText>
              </View>
            </View>

            <View style={[styles.rankingsListContainer, { backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
              <AppText type="bold" style={[styles.rankingsListHeader, { color: colors.subText }]}>ORDER OF MERIT</AppText>
              {remainingUsers.length === 0 ? (
                <AppText style={[styles.emptyText, { color: colors.subText }]}>The path is open for you to lead.</AppText>
              ) : (
                remainingUsers.map((user) => {
                  return (
                    <View key={user.id} style={[styles.rankRow, { borderBottomColor: colors.border }]}>
                      <View style={[styles.rankNumBadge, { backgroundColor: colors.backBtnBg }]}>
                        <AppText type="bold" style={[styles.rankNumText, { color: colors.subText }]}>{user.rank}</AppText>
                      </View>
                      <View style={[styles.rankAvatarContainer, { backgroundColor: colors.accentLight }]}>
                        {user.avatarUrl ? (
                          <Image source={{ uri: user.avatarUrl }} style={styles.rankAvatarImage} />
                        ) : (
                          <View style={[styles.rankAvatarFallback, { backgroundColor: colors.accentLight }]}>
                            <AppText type="bold" style={[styles.rankAvatarFallbackText, { color: colors.accent }]}>{user.name.charAt(0)}</AppText>
                          </View>
                        )}
                      </View>
                      <View style={styles.rankInfo}>
                        <AppText type="bold" numberOfLines={1} style={[styles.rankName, { color: colors.textMain }]}>{user.name}</AppText>
                        <AppText style={[styles.rankPointsSub, { color: colors.subText }]}>{user.points} points</AppText>
                      </View>
                      <Trophy size={16} color={colors.subText} />
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { borderRadius: 20, padding: 8 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 16, letterSpacing: 2 },
  scroll: { padding: 20, flexGrow: 1, paddingBottom: 50 },
  heroSection: { alignItems: 'center', marginBottom: 25, marginTop: 5 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, gap: 6, marginBottom: 10 },
  heroBadgeText: { fontSize: 10, letterSpacing: 1.5 },
  heroTitle: { fontSize: 28, letterSpacing: 0.5, textAlign: 'center' },
  heroSubtitle: { fontSize: 13, textAlign: 'center', marginTop: 7 },
  pickerWrapper: { marginBottom: 40, position: 'relative', zIndex: 20 },
  pickerLabel: { fontSize: 10, letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  dropdownBtn: { borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  dropdownBtnText: { fontSize: 14, letterSpacing: 1 },
  dropdownChevron: { fontSize: 10 },
  dropdownMenu: { position: 'absolute', top: '115%', left: 0, right: 0, borderRadius: 16, overflow: 'hidden', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, zIndex: 30 },
  dropdownOption: { padding: 16, borderBottomWidth: 1 },
  dropdownOptionText: { fontSize: 13, letterSpacing: 0.5 },
  loaderContainer: { marginTop: 80, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText: { fontSize: 11, letterSpacing: 2 },
  podiumWrapper: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 30, gap: 12 },
  podiumColumn: { flex: 1, alignItems: 'center', borderRadius: 20, paddingVertical: 18, paddingHorizontal: 8, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  podiumSide: { transform: [{ translateY: 12 }] },
  podiumCenter: { borderRadius: 24, paddingVertical: 24, shadowColor: '#e11d48', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  crownGlow: { marginBottom: -4 },
  podiumAvatarCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: 10, borderWidth: 1.5, overflow: 'visible' },
  podiumAvatarCircleCenter: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: 10, borderWidth: 1.5, overflow: 'visible' },
  podiumAvatarImage: { width: '100%', height: '100%', borderRadius: 25 },
  podiumAvatarImageCenter: { width: '100%', height: '100%', borderRadius: 30 },
  podiumAvatarInitial: { fontSize: 18 },
  podiumAvatarInitialCenter: { fontSize: 22 },
  podiumRankBubbleSide: { position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', zIndex: 10, borderWidth: 1.5, borderColor: '#ffffff' },
  podiumRankBubbleCenter: { position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', zIndex: 10, borderWidth: 1.5, borderColor: '#ffffff' },
  podiumRankBubbleText: { fontSize: 10, color: '#ffffff' },
  podiumName: { fontSize: 11, textAlign: 'center', marginBottom: 2, width: '100%' },
  podiumNameCenter: { fontSize: 12, textAlign: 'center', marginBottom: 2, width: '100%' },
  podiumScore: { fontSize: 10, fontWeight: 'bold' },
  podiumScoreCenter: { fontSize: 11 },
  myStatsCard: { borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 5 },
  myStatsLeft: { flex: 1 },
  myStatsHeader: { fontSize: 9, letterSpacing: 1.5, marginBottom: 4 },
  myStatsPointsVal: { fontSize: 22 },
  myStatsPointsLabel: { fontSize: 12, fontWeight: 'normal' },
  myStatsCenterAvatarBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginHorizontal: 10, overflow: 'hidden' },
  myStatsAvatarImage: { width: '100%', height: '100%' },
  myStatsRight: { flex: 1, alignItems: 'flex-end' },
  myStatsHeaderRight: { fontSize: 9, letterSpacing: 1.5, marginBottom: 4 },
  myStatsRankVal: { fontSize: 22 },
  rankingsListContainer: { borderRadius: 20, padding: 18, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 3 },
  rankingsListHeader: { fontSize: 10, letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 },
  emptyText: { fontSize: 12, textAlign: 'center', paddingVertical: 20 },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  rankNumBadge: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rankNumText: { fontSize: 11 },
  rankAvatarContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  rankAvatarImage: { width: '100%', height: '100%' },
  rankAvatarFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  rankAvatarFallbackText: { fontSize: 13 },
  rankInfo: { flex: 1, minWidth: 0 },
  rankName: { fontSize: 13 },
  rankPointsSub: { fontSize: 10, marginTop: 1 }
});