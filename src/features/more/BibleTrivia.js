import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { AppText } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Quote, BrainCircuit, BookOpenText, ChevronLeft, Trophy, ArrowUpRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';

const GAMES = {
  THREADS: { title: "THREADS OF MACHAIRA", desc: "Search the teaching to find the message that answers it", icon: Quote, screen: "ThreadsStages" },
  SEARCH: { title: "SEARCH WORD", desc: "Find the hidden words in the text.", icon: BookOpenText, screen: "WordSearchStages" },
  SCRAMBLE: { title: "WORD SCRAMBLE", desc: "Unscramble the terms.", icon: BrainCircuit, screen: "WordScrambleStages" }
};

export const BibleTrivia = ({ navigation }) => {
  const { colors, isDarkMode } = useTheme();

  const handleGameSelect = (key) => {
    Haptics.selectionAsync();
    const targetScreen = GAMES[key]?.screen;
    if (targetScreen) {
      navigation.navigate(targetScreen);
    }
  };

  const handleBack = () => {
    Haptics.selectionAsync();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable 
          onPress={handleBack} 
          style={[styles.backBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(53,42,72,0.06)' }]}
        >
          <ChevronLeft size={32} color={colors.text} />
        </Pressable>
        <AppText type="bold" style={[styles.headerTitle, { color: colors.text }]}>MACHAIRA</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          <AppText type="bold" style={[styles.mainTitle, { color: colors.text }]}>CHOOSE{'\n'}YOUR{'\n'}CHALLENGE</AppText>
          
          {Object.entries(GAMES).map(([key, game]) => {
            const GameIcon = game.icon;
            return (
              <Pressable key={key} onPress={() => handleGameSelect(key)} style={styles.cardContainer}>
                <View style={[
                  styles.gameCard, 
                  { 
                    backgroundColor: colors.card, 
                    borderColor: isDarkMode ? '#334155' : '#352a48' 
                  }
                ]}>
                  <View style={[
                    styles.iconBox, 
                    { 
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(53,42,72,0.06)',
                      borderColor: isDarkMode ? '#475569' : '#352a48'
                    }
                  ]}>
                    <GameIcon color={colors.text} size={28} />
                  </View>
                  <View style={styles.textWrap}>
                    <AppText type="bold" style={[styles.cardTitle, { color: colors.text }]}>{game.title}</AppText>
                    <AppText style={[styles.cardSub, { color: colors.textSecondary }]}>{game.desc}</AppText>
                  </View>
                </View>
              </Pressable>
            );
          })}

          <View style={styles.sectionHeaderContainer}>
            <View style={[styles.sectionHeaderLine, { backgroundColor: isDarkMode ? '#334155' : '#cbd5e1' }]} />
            <AppText type="bold" style={[styles.sectionHeaderText, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>STATISTICS BOARD</AppText>
            <View style={[styles.sectionHeaderLine, { backgroundColor: isDarkMode ? '#334155' : '#cbd5e1' }]} />
          </View>

          <Pressable 
            onPress={() => {
              Haptics.selectionAsync();
              navigation.navigate('GameLeaderboard');
            }} 
            style={styles.cardContainer}
          >
            <View style={[
              styles.gameCard, 
              { 
                backgroundColor: colors.card, 
                borderColor: isDarkMode ? '#dc2626' : '#dc2626' 
              }
            ]}>
              <View style={[
                styles.iconBox, 
                { 
                  backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.15)' : '#fee2e2', 
                  borderColor: '#dc2626' 
                }
              ]}>
                <Trophy color="#dc2626" size={28} />
              </View>
              <View style={styles.textWrap}>
                <AppText type="bold" style={[styles.leaderboardCardTitle, { color: colors.text }]}>TOP SCHOLARS</AppText>
                <AppText style={[styles.leaderboardCardSub, { color: colors.textSecondary }]}>Global Ranking</AppText>
              </View>
              <ArrowUpRight color="#dc2626" size={24} style={styles.arrowIcon} />
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { borderRadius: 20, padding: 5 },
  headerTitle: { fontSize: 20, letterSpacing: 2 },
  mainTitle: { fontSize: 48, lineHeight: 50, marginBottom: 40 },
  scroll: { padding: 20, flexGrow: 1, paddingBottom: 50 },
  grid: { gap: 20 },
  cardContainer: { marginBottom: 5 },
  gameCard: { flexDirection: 'row', alignItems: 'center', padding: 24, borderWidth: 2 },
  iconBox: { padding: 12, borderWidth: 2 },
  sectionHeaderContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 10, gap: 12 },
  sectionHeaderLine: { flex: 1, height: 2 },
  sectionHeaderText: { fontSize: 11, letterSpacing: 2 },
  leaderboardCardTitle: { fontSize: 18, letterSpacing: 1 },
  leaderboardCardSub: { fontSize: 13, marginTop: 4, textTransform: 'uppercase' },
  arrowIcon: { marginLeft: 10 },
  textWrap: { marginLeft: 20, flex: 1 },
  cardTitle: { fontSize: 18, letterSpacing: 1 },
  cardSub: { fontSize: 13, marginTop: 4, textTransform: 'uppercase' }
});