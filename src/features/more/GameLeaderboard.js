import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Pressable, Dimensions, Image } from 'react-native';
import { AppText } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Trophy, Crown, User, Sparkles, Flame } from 'lucide-react-native';
import { supabase } from '../../config/supabaseClient';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

const LEADERBOARD_GAMES = [
  { key: 'threads', title: 'THREADS OF MACHAIRA' },
  { key: 'scramble', title: 'WORD SCRAMBLE' },
  { key: 'search', title: 'SEARCH WORD' }
];

export const GameLeaderboard = ({ navigation }) => {
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

      // Fetch game sessions for the selected game type
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

      // Aggregate scores per user
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

      // Convert map to array and sort descending by totalPoints
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
          // If user hasn't played this category yet, fetch their profile details for display
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <AppText type="bold" style={styles.headerTitle}>LEADERSHIP DASHBOARD</AppText>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.heroBadge}>
            <Flame size={14} color="#dc2626" />
            <AppText type="bold" style={styles.heroBadgeText}>LIVE ARENA</AppText>
          </View>
          <AppText type="bold" style={styles.heroTitle}>The Scroll of Honor</AppText>
          <AppText style={styles.heroSubtitle}>Devotion measured by truth and wisdom.</AppText>
        </View>

        <View style={styles.pickerWrapper}>
          <AppText type="bold" style={styles.pickerLabel}>CHOOSE CATEGORY</AppText>
          <Pressable 
            onPress={() => {
              Haptics.selectionAsync();
              setDropdownOpen(prev => !prev);
            }} 
            style={styles.dropdownBtn}
          >
            <AppText type="bold" style={styles.dropdownBtnText}>{currentCategoryTitle}</AppText>
            <AppText style={styles.dropdownChevron}>{dropdownOpen ? '▲' : '▼'}</AppText>
          </Pressable>

          {dropdownOpen && (
            <View style={styles.dropdownMenu}>
              {LEADERBOARD_GAMES.map(game => (
                <Pressable 
                  key={game.key} 
                  style={[styles.dropdownOption, selectedGameKey === game.key && styles.dropdownOptionActive]}
                  onPress={() => handleSelectCategory(game.key)}
                >
                  <AppText type="bold" style={[styles.dropdownOptionText, selectedGameKey === game.key && styles.dropdownOptionTextActive]}>
                    {game.title}
                  </AppText>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#dc2626" />
            <AppText style={styles.loaderText}>RETRIEVING RECORDS...</AppText>
          </View>
        ) : (
          <>
            <View style={styles.podiumWrapper}>
              <View style={[styles.podiumColumn, styles.podiumSide]}>
                <View style={styles.podiumAvatarCircle}>
                  {secondPlace?.avatarUrl ? (
                    <Image source={{ uri: secondPlace.avatarUrl }} style={styles.podiumAvatarImage} />
                  ) : (
                    <AppText type="bold" style={styles.podiumAvatarInitial}>
                      {secondPlace ? secondPlace.name.charAt(0) : '2'}
                    </AppText>
                  )}
                  <View style={styles.podiumRankBubbleSide}>
                    <AppText type="bold" style={styles.podiumRankBubbleText}>2</AppText>
                  </View>
                </View>
                <AppText type="bold" numberOfLines={1} style={styles.podiumName}>
                  {secondPlace ? secondPlace.name : '—'}
                </AppText>
                <AppText style={styles.podiumScore}>
                  {secondPlace ? `${secondPlace.points} pts` : '0 pts'}
                </AppText>
              </View>

              <View style={[styles.podiumColumn, styles.podiumCenter]}>
                <View style={styles.crownGlow}>
                  <Crown size={26} color="#dc2626" />
                </View>
                <View style={styles.podiumAvatarCircleCenter}>
                  {firstPlace?.avatarUrl ? (
                    <Image source={{ uri: firstPlace.avatarUrl }} style={styles.podiumAvatarImageCenter} />
                  ) : (
                    <AppText type="bold" style={styles.podiumAvatarInitialCenter}>
                      {firstPlace ? firstPlace.name.charAt(0) : '1'}
                    </AppText>
                  )}
                  <View style={styles.podiumRankBubbleCenter}>
                    <AppText type="bold" style={styles.podiumRankBubbleText}>1</AppText>
                  </View>
                </View>
                <AppText type="bold" numberOfLines={1} style={styles.podiumNameCenter}>
                  {firstPlace ? firstPlace.name : '—'}
                </AppText>
                <AppText type="bold" style={styles.podiumScoreCenter}>
                  {firstPlace ? `${firstPlace.points} pts` : '0 pts'}
                </AppText>
              </View>

              <View style={[styles.podiumColumn, styles.podiumSide]}>
                <View style={styles.podiumAvatarCircle}>
                  {thirdPlace?.avatarUrl ? (
                    <Image source={{ uri: thirdPlace.avatarUrl }} style={styles.podiumAvatarImage} />
                  ) : (
                    <AppText type="bold" style={styles.podiumAvatarInitial}>
                      {thirdPlace ? thirdPlace.name.charAt(0) : '3'}
                    </AppText>
                  )}
                  <View style={styles.podiumRankBubbleSide}>
                    <AppText type="bold" style={styles.podiumRankBubbleText}>3</AppText>
                  </View>
                </View>
                <AppText type="bold" numberOfLines={1} style={styles.podiumName}>
                  {thirdPlace ? thirdPlace.name : '—'}
                </AppText>
                <AppText style={styles.podiumScore}>
                  {thirdPlace ? `${thirdPlace.points} pts` : '0 pts'}
                </AppText>
              </View>
            </View>

            <View style={styles.myStatsCard}>
              <View style={styles.myStatsLeft}>
                <AppText type="bold" style={styles.myStatsHeader}>YOUR POSITION</AppText>
                <AppText type="bold" style={styles.myStatsPointsVal}>{currentUserRankData.totalPoints} <AppText style={styles.myStatsPointsLabel}>pts</AppText></AppText>
              </View>
              <View style={styles.myStatsCenterAvatarBox}>
                {currentUserRankData.avatarUrl ? (
                  <Image source={{ uri: currentUserRankData.avatarUrl }} style={styles.myStatsAvatarImage} />
                ) : (
                  <User size={26} color="#ffffff" />
                )}
              </View>
              <View style={styles.myStatsRight}>
                <AppText type="bold" style={styles.myStatsHeaderRight}>GLOBAL RANK</AppText>
                <AppText type="bold" style={styles.myStatsRankVal}>{currentUserRankData.rank}</AppText>
              </View>
            </View>

            <View style={styles.rankingsListContainer}>
              <AppText type="bold" style={styles.rankingsListHeader}>ORDER OF MERIT</AppText>
              {remainingUsers.length === 0 ? (
                <AppText style={styles.emptyText}>The path is open for you to lead.</AppText>
              ) : (
                remainingUsers.map((user) => {
                  return (
                    <View key={user.id} style={styles.rankRow}>
                      <View style={styles.rankNumBadge}>
                        <AppText type="bold" style={styles.rankNumText}>{user.rank}</AppText>
                      </View>
                      <View style={styles.rankAvatarContainer}>
                        {user.avatarUrl ? (
                          <Image source={{ uri: user.avatarUrl }} style={styles.rankAvatarImage} />
                        ) : (
                          <View style={styles.rankAvatarFallback}>
                            <AppText type="bold" style={styles.rankAvatarFallbackText}>{user.name.charAt(0)}</AppText>
                          </View>
                        )}
                      </View>
                      <View style={styles.rankInfo}>
                        <AppText type="bold" numberOfLines={1} style={styles.rankName}>{user.name}</AppText>
                        <AppText style={styles.rankPointsSub}>{user.points} points</AppText>
                      </View>
                      <Trophy size={16} color="#94a3b8" />
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { backgroundColor: '#f1f5f9', borderRadius: 20, padding: 8 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 16, letterSpacing: 2, color: '#0f172a' },
  scroll: { padding: 20, flexGrow: 1, paddingBottom: 50 },
  heroSection: { alignItems: 'center', marginBottom: 25, marginTop: 5 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, gap: 6, marginBottom: 10 },
  heroBadgeText: { fontSize: 10, color: '#dc2626', letterSpacing: 1.5 },
  heroTitle: { fontSize: 28, color: '#0f172a', letterSpacing: 0.5, textAlign: 'center' },
  heroSubtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 7 },
  pickerWrapper: { marginBottom: 40, position: 'relative', zIndex: 20 },
  pickerLabel: { fontSize: 10, color: '#64748b', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  dropdownBtn: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  dropdownBtnText: { fontSize: 14, color: '#0f172a', letterSpacing: 1 },
  dropdownChevron: { fontSize: 10, color: '#64748b' },
  dropdownMenu: { position: 'absolute', top: '115%', left: 0, right: 0, backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, zIndex: 30 },
  dropdownOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  dropdownOptionActive: { backgroundColor: '#fee2e2' },
  dropdownOptionText: { fontSize: 13, color: '#64748b', letterSpacing: 0.5 },
  dropdownOptionTextActive: { color: '#dc2626' },
  loaderContainer: { marginTop: 80, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText: { fontSize: 11, letterSpacing: 2, color: '#64748b' },
  podiumWrapper: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 30, gap: 12 },
  podiumColumn: { flex: 1, alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 20, paddingVertical: 18, paddingHorizontal: 8, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  podiumSide: { transform: [{ translateY: 12 }] },
  podiumCenter: { backgroundColor: '#fff5f5', borderRadius: 24, paddingVertical: 24, borderWidth: 1.5, borderColor: '#fecaca', shadowColor: '#dc2626', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  crownGlow: { marginBottom: -4 },
  podiumAvatarCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: 10, borderWidth: 1.5, borderColor: '#ef4444', overflow: 'visible' },
  podiumAvatarCircleCenter: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: 10, borderWidth: 1.5, borderColor: '#ef4444', overflow: 'visible' },
  podiumAvatarImage: { width: '100%', height: '100%', borderRadius: 25 },
  podiumAvatarImageCenter: { width: '100%', height: '100%', borderRadius: 30 },
  podiumAvatarInitial: { fontSize: 18, color: '#dc2626' },
  podiumAvatarInitialCenter: { fontSize: 22, color: '#dc2626' },
  podiumRankBubbleSide: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#dc2626', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', zIndex: 10, borderWidth: 1.5, borderColor: '#ffffff' },
  podiumRankBubbleCenter: { position: 'absolute', bottom: -4, right: -4, backgroundColor: '#dc2626', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', zIndex: 10, borderWidth: 1.5, borderColor: '#ffffff' },
  podiumRankBubbleText: { fontSize: 10, color: '#ffffff' },
  podiumName: { fontSize: 11, color: '#0f172a', textAlign: 'center', marginBottom: 2, width: '100%' },
  podiumNameCenter: { fontSize: 12, color: '#0f172a', textAlign: 'center', marginBottom: 2, width: '100%' },
  podiumScore: { fontSize: 10, color: '#dc2626', fontWeight: 'bold' },
  podiumScoreCenter: { fontSize: 11, color: '#dc2626' },
  myStatsCard: { backgroundColor: '#0f172a', borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 5 },
  myStatsLeft: { flex: 1 },
  myStatsHeader: { fontSize: 9, color: '#94a3b8', letterSpacing: 1.5, marginBottom: 4 },
  myStatsPointsVal: { fontSize: 22, color: '#ffffff' },
  myStatsPointsLabel: { fontSize: 12, color: '#94a3b8', fontWeight: 'normal' },
  myStatsCenterAvatarBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center', marginHorizontal: 10, overflow: 'hidden' },
  myStatsAvatarImage: { width: '100%', height: '100%' },
  myStatsRight: { flex: 1, alignItems: 'flex-end' },
  myStatsHeaderRight: { fontSize: 9, color: '#94a3b8', letterSpacing: 1.5, marginBottom: 4 },
  myStatsRankVal: { fontSize: 22, color: '#f87171' },
  rankingsListContainer: { backgroundColor: '#ffffff', borderRadius: 20, padding: 18, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.04, shadowRadius: 16, elevation: 3 },
  rankingsListHeader: { fontSize: 10, color: '#64748b', letterSpacing: 1.5, marginBottom: 12, marginLeft: 4 },
  emptyText: { fontSize: 12, color: '#64748b', textAlign: 'center', paddingVertical: 20 },
  rankRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  rankNumBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rankNumText: { fontSize: 11, color: '#64748b' },
  rankAvatarContainer: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  rankAvatarImage: { width: '100%', height: '100%' },
  rankAvatarFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fee2e2' },
  rankAvatarFallbackText: { fontSize: 13, color: '#dc2626' },
  rankInfo: { flex: 1, minWidth: 0 },
  rankName: { fontSize: 13, color: '#0f172a' },
  rankPointsSub: { fontSize: 10, color: '#64748b', marginTop: 1 }
});