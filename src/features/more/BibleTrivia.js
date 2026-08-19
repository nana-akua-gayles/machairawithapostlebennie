import React, { useCallback, useRef } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Animated } from 'react-native';
import { AppText } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Quote, BrainCircuit, BookOpenText, ChevronLeft, Trophy, Flame } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';

const SCREENS = { THREADS: 'ThreadsStages', SEARCH: 'WordSearchStages', SCRAMBLE: 'WordScrambleStages', LEADERBOARD: 'GameLeaderboard' };

const GAMES = [
  { key: 'THREADS', ref: 'I', title: 'Threads of Machaira', desc: 'Search the teaching to find the message that answers it', icon: Quote, screen: SCREENS.THREADS, rot: '-1.5deg' },
  { key: 'SEARCH', ref: 'II', title: 'Search Word', desc: 'Find the hidden words in the text', icon: BookOpenText, screen: SCREENS.SEARCH, rot: '1deg' },
  { key: 'SCRAMBLE', ref: 'III', title: 'Word Scramble', desc: 'Unscramble the terms', icon: BrainCircuit, screen: SCREENS.SCRAMBLE, rot: '-1deg' },
];

const RUBRIC = '#e32d18';
const GOLD = '#C9962C';

const safeHaptic = () => { try { Haptics.selectionAsync().catch(() => {}); } catch (_e) {} };
const withOpacity = (hex, a) => { const h = hex.replace('#', ''); const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16); return `rgba(${r}, ${g}, ${b}, ${a})`; };

const StampCard = ({ item, colors, isDark, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 12 }).start();
  const Icon = item.icon;

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut} accessibilityRole="button" accessibilityLabel={item.title} accessibilityHint="Opens this game mode" hitSlop={4}>
      <Animated.View style={[styles.stamp, { backgroundColor: colors.card, borderColor: withOpacity(RUBRIC, 0.35), transform: [{ scale }, { rotate: item.rot }] }]}>
        <View style={[styles.stampBadge, { backgroundColor: RUBRIC }]}><AppText type="bold" style={styles.stampNumeral}>{item.ref}</AppText></View>
        <View style={styles.stampBody}>
          <AppText type="bold" style={[styles.stampTitle, { color: colors.text }]}>{item.title}</AppText>
          <AppText style={[styles.stampDesc, { color: colors.textSecondary }]}>{item.desc}</AppText>
        </View>
        <Icon size={22} color={isDark ? GOLD : RUBRIC} strokeWidth={2.25} />
      </Animated.View>
    </Pressable>
  );
};

export const BibleTrivia = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const handleGameSelect = useCallback((key) => { const g = GAMES.find((x) => x.key === key); if (!g) return; safeHaptic(); navigation.navigate(g.screen); }, [navigation]);
  const handleLeaderboard = useCallback(() => { safeHaptic(); navigation.navigate(SCREENS.LEADERBOARD); }, [navigation]);
  const handleBack = useCallback(() => { safeHaptic(); navigation.goBack(); }, [navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={12}><ChevronLeft size={26} color={colors.text} /></Pressable>
        <View><AppText type="bold" style={[styles.headerLabel]}>BIBLE TRIVIA</AppText></View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppText type="bold" style={[styles.mainTitle, { color: colors.text }]}>Choose your{'\n'}challenge</AppText>

        <View style={styles.index}>
          {GAMES.map((game) => <StampCard key={game.key} item={game} colors={colors} isDark={isDark} onPress={() => handleGameSelect(game.key)} />)}
        </View>

        <View style={styles.sectionHeaderContainer}>
          <AppText type="bold" style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>LEAGUE OF XTRAORDINARY MINDS</AppText>
          <View style={[styles.sectionHeaderLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
        </View>

        <Pressable onPress={handleLeaderboard} accessibilityRole="button" accessibilityLabel="Top Scholars" accessibilityHint="Opens the global leaderboard" style={({ pressed }) => [styles.leaderCard, { backgroundColor: withOpacity(GOLD, isDark ? 0.16 : 0.1), borderColor: withOpacity(GOLD, 0.5), opacity: pressed ? 0.85 : 1, transform: [{ rotate: pressed ? '0deg' : '-0.5deg' }] }]}>
          <View style={[styles.trophyRing, { borderColor: GOLD }]}><Trophy size={20} color={GOLD} strokeWidth={2.25} /></View>
          <View style={styles.leaderTextWrap}>
            <AppText type="bold" style={[styles.leaderTitle, { color: colors.text }]}>Top Scholars</AppText>
            <AppText style={[styles.leaderSub, { color: colors.textSecondary }]}>Global ranking</AppText>
          </View>
          <AppText type="bold" style={[styles.leaderGo, { color: GOLD }]}>→</AppText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  backBtn: { padding: 8, marginLeft: -8 },
  headerLabel: { fontSize: 17, letterSpacing: 2.5 },
  headerSpacer: { width: 26 },
  scroll: { paddingHorizontal: 22, paddingBottom: 56 },
  mainTitle: { fontSize: 36, lineHeight: 40, marginTop: 20, marginBottom: 50, letterSpacing: -0.8 },
  index: { gap: 16, marginBottom: 8 },
  stamp: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderWidth: 1.5, borderRadius: 18 },
  stampBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  stampNumeral: { color: '#fff', fontSize: 15, letterSpacing: 0.5 },
  stampBody: { flex: 1 },
  stampTitle: { fontSize: 17, letterSpacing: -0.2, marginBottom: 3 },
  stampDesc: { fontSize: 13, lineHeight: 17 },
  sectionHeaderContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 30, marginBottom: 16 },
  sectionHeaderText: { fontSize: 11, letterSpacing: 2.5 },
  sectionHeaderLine: { flex: 1, height: StyleSheet.hairlineWidth },
  leaderCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderWidth: 1.5, borderRadius: 18 },
  trophyRing: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  leaderTextWrap: { flex: 1 },
  leaderTitle: { fontSize: 16 },
  leaderSub: { fontSize: 12.5, marginTop: 2 },
  leaderGo: { fontSize: 18 },
});
