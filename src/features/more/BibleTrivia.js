import React, { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { AppText } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Quote, BrainCircuit, BookOpenText, ChevronLeft, Trophy, ArrowUpRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const GAMES = {
  THREADS: { title: "THREADS OF MACHAIRA", desc: "Search the teaching to find the message that answers it", icon: Quote, screen: "ThreadsStages" },
  SEARCH: { title: "SEARCH WORD", desc: "Find the hidden words in the text.", icon: BookOpenText, screen: "WordSearchStages" },
  SCRAMBLE: { title: "WORD SCRAMBLE", desc: "Unscramble the terms.", icon: BrainCircuit, screen: "WordScrambleStages" }
};

export const BibleTrivia = ({ navigation }) => {
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <ChevronLeft size={32} color="#352a48" />
        </Pressable>
        <AppText type="bold" style={styles.headerTitle}>MACHAIRA</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          <AppText type="bold" style={styles.mainTitle}>CHOOSE{'\n'}YOUR{'\n'}CHALLENGE</AppText>
          
          {Object.entries(GAMES).map(([key, game]) => (
            <Pressable key={key} onPress={() => handleGameSelect(key)} style={styles.cardContainer}>
              <View style={styles.gameCard}>
                <View style={styles.iconBox}>
                  <game.icon color="#352a48" size={28} />
                </View>
                <View style={styles.textWrap}>
                  <AppText type="bold" style={styles.cardTitle}>{game.title}</AppText>
                  <AppText style={styles.cardSub}>{game.desc}</AppText>
                </View>
              </View>
            </Pressable>
          ))}

          <View style={styles.sectionHeaderContainer}>
            <View style={styles.sectionHeaderLine} />
            <AppText type="bold" style={styles.sectionHeaderText}>STATISTICS BOARD</AppText>
            <View style={styles.sectionHeaderLine} />
          </View>

          <Pressable 
            onPress={() => {
              Haptics.selectionAsync();
              navigation.navigate('GameLeaderboard');
            }} 
            style={styles.cardContainer}
          >
            <View style={[styles.gameCard, styles.leaderboardCardOverride]}>
              <View style={[styles.iconBox, styles.leaderboardIconOverride]}>
                <Trophy color="#dc2626" size={28} />
              </View>
              <View style={styles.textWrap}>
                <AppText type="bold" style={styles.leaderboardCardTitle}>TOP SCHOLARS</AppText>
                <AppText style={styles.leaderboardCardSub}>Global Ranking</AppText>
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
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { backgroundColor: 'rgba(53,42,72,0.06)', borderRadius: 20, padding: 5 },
  headerTitle: { fontSize: 20, letterSpacing: 2, color: '#352a48' },
  mainTitle: { fontSize: 48, lineHeight: 50, marginBottom: 40, color: '#352a48' },
  scroll: { padding: 20, flexGrow: 1, paddingBottom: 50 },
  grid: { gap: 20 },
  cardContainer: { marginBottom: 5 },
  gameCard: { flexDirection: 'row', alignItems: 'center', padding: 24, backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#352a48' },
  iconBox: { padding: 12, backgroundColor: 'rgba(53,42,72,0.06)', borderWidth: 2, borderColor: '#352a48' },
  sectionHeaderContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 10, gap: 12 },
  sectionHeaderLine: { flex: 1, height: 2, backgroundColor: '#cbd5e1' },
  sectionHeaderText: { fontSize: 11, letterSpacing: 2, color: '#64748b' },
  leaderboardCardOverride: { backgroundColor: '#fef2f2', borderColor: '#dc2626' },
  leaderboardIconOverride: { backgroundColor: '#fee2e2', borderColor: '#dc2626' },
  leaderboardCardTitle: { fontSize: 18, color: '#dc2626', letterSpacing: 1 },
  leaderboardCardSub: { fontSize: 13, color: '#991b1b', marginTop: 4, textTransform: 'uppercase' },
  arrowIcon: { marginLeft: 10 },
  textWrap: { marginLeft: 20, flex: 1 },
  cardTitle: { fontSize: 18, color: '#352a48', letterSpacing: 1 },
  cardSub: { fontSize: 13, color: '#64748b', marginTop: 4, textTransform: 'uppercase' }
});