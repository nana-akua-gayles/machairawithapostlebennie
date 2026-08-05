import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabaseClient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { AppText } from '../../components/AppText';

export default function WordSearchStages({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState([]);

  useEffect(() => {
    fetchStagesAndProgress();
  }, []);

  const fetchStagesAndProgress = async () => {
    try {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) return;

      const { data: puzzleStages, error: puzzleError } = await supabase
        .from('word_search_puzzles')
        .select('id, stage_number, title')
        .order('stage_number', { ascending: true });

      if (puzzleError) throw puzzleError;

      const { data: userSessions, error: sessionFetchError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('game_type', 'search');

      if (sessionFetchError) throw sessionFetchError;

      let highestUnlockedLevel = 1;
      if (userSessions && userSessions.length > 0) {
        const completedLevels = userSessions
          .filter(s => s.is_completed)
          .map(s => s.level_number);
        
        if (completedLevels.length > 0) {
          highestUnlockedLevel = Math.max(...completedLevels) + 1;
        }
      }

      const formattedStages = (puzzleStages || []).map((stage) => {
        const sessionRecord = userSessions?.find(s => s.level_number === stage.stage_number);
        const isUnlocked = stage.stage_number <= highestUnlockedLevel;

        return {
          id: stage.id,
          stageNumber: stage.stage_number,
          title: stage.title || `Stage ${stage.stage_number}`,
          isCompleted: sessionRecord?.is_completed || false,
          score: sessionRecord?.score || 0,
          isUnlocked: isUnlocked,
        };
      });

      setStages(formattedStages);
    } catch (err) {
      console.error('Error loading word search stages:', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color="#e11d48" />
        <AppText type="bold" style={styles.loaderText}>LOADING PUZZLES...</AppText>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => { Haptics.selectionAsync(); navigation?.goBack?.(); }}
        >
          <Ionicons name="chevron-back" size={20} color="#1e293b" />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>WORD SEARCH</AppText>
        <View style={styles.placeholderButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Classy Intro Section */}
        <View style={styles.introContainer}>
          <View style={styles.introAccentLine} />
          <AppText type="bold" style={styles.introTitle}>The Journey</AppText>
          <AppText style={styles.introSubtitle}>
            Uncover words, conquer daily trials, and rise through the ranks.
          </AppText>
        </View>

        <View style={styles.listContainer}>
          {stages.map((stage) => {
            const isUnlocked = stage.isUnlocked;
            const isCompleted = stage.isCompleted;

            return (
              <TouchableOpacity
                key={stage.id || stage.stageNumber}
                activeOpacity={0.8}
                disabled={!isUnlocked}
                onPress={() => {
                  Haptics.selectionAsync();
                  navigation.navigate('WordSearchScreen', { 
                    stageNumber: stage.stageNumber, 
                    stageId: stage.id 
                  });
                }}
                style={[styles.rowItem, !isUnlocked && styles.rowItemLocked]}
              >
                <View style={styles.rowLeft}>
                  <View style={[
                    styles.rowBadge, 
                    isCompleted && styles.rowBadgeCompleted, 
                    !isUnlocked && styles.rowBadgeLocked
                  ]}>
                    <AppText type="bold" style={[
                      styles.rowBadgeText, 
                      isCompleted && styles.rowBadgeTextCompleted, 
                      !isUnlocked && styles.rowBadgeTextLocked
                    ]}>
                      {String(stage.stageNumber).padStart(2, '0')}
                    </AppText>
                  </View>

                  <View style={styles.rowTextContainer}>
                    <AppText numberOfLines={1} type="bold" style={[styles.rowTitle, !isUnlocked && styles.rowTitleLocked]}>
                      {stage.title}
                    </AppText>
                    <AppText style={[styles.rowMeta, !isUnlocked && styles.rowMetaLocked]}>
                      {!isUnlocked ? 'LOCKED LEVEL' : stage.score > 0 ? `${stage.score} PTS COMPLETED` : 'READY TO PLAY'}
                    </AppText>
                  </View>
                </View>

                <View style={styles.rowRight}>
                  {isCompleted ? (
                    <View style={styles.statusCompletedIcon}>
                      <Ionicons name="checkmark" size={14} color="#e11d48" />
                    </View>
                  ) : isUnlocked ? (
                    <View style={styles.statusOpenIcon}>
                      <Ionicons name="arrow-forward" size={14} color="#e11d48" />
                    </View>
                  ) : (
                    <View style={styles.statusLockedIcon}>
                      <Ionicons name="lock-closed" size={13} color="#64748b" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loaderText: { marginTop: 16, fontSize: 11, color: '#e11d48', letterSpacing: 3 },
  
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  backBtn: { 
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  headerTitle: { fontSize: 13, letterSpacing: 2.5, color: '#1e293b' },
  placeholderButton: { width: 38, height: 38 },

  scrollContent: { padding: 20, paddingBottom: 50 },

  introContainer: {
    marginBottom: 28,
    paddingHorizontal: 4
  },
  introAccentLine: {
    width: 24,
    height: 3,
    backgroundColor: '#e11d48',
    borderRadius: 2,
    marginBottom: 12
  },
  introTitle: { fontSize: 26, color: '#0f172a', marginBottom: 6, letterSpacing: -0.5 },
  introSubtitle: { fontSize: 13, color: '#64748b', lineHeight: 20 },

  listContainer: {
    gap: 14
  },
  rowItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2
  },
  rowItemLocked: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    opacity: 1
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
    paddingRight: 8
  },
  rowBadge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  rowBadgeCompleted: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3'
  },
  rowBadgeLocked: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0'
  },
  rowBadgeText: {
    fontSize: 14,
    color: '#1e293b',
    letterSpacing: 0.5
  },
  rowBadgeTextCompleted: {
    color: '#e11d48'
  },
  rowBadgeTextLocked: {
    color: '#64748b'
  },
  rowTextContainer: {
    flex: 1,
    justifyContent: 'center'
  },
  rowTitle: {
    fontSize: 15,
    color: '#1e293b',
    letterSpacing: 0.3,
    marginBottom: 4
  },
  rowTitleLocked: {
    color: '#334155'
  },
  rowMeta: {
    fontSize: 9,
    color: '#64748b',
    letterSpacing: 1.2,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  rowMetaLocked: {
    color: '#94a3b8'
  },
  rowRight: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusCompletedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusOpenIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fecdd3'
  },
  statusLockedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0'
  }
});