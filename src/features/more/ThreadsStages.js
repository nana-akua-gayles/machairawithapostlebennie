import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable, FlatList, ActivityIndicator, Dimensions } from 'react-native';
import { AppText } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, ChevronLeft, Zap, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../config/supabaseClient';

const { width } = Dimensions.get('window');

export const ThreadsStages = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [highestCompletedStage, setHighestCompletedStage] = useState(0);
  const PAGE_SIZE = 20;

  useFocusEffect(
    useCallback(() => {
      fetchUserDataAndStages();
    }, [])
  );

  const fetchUserDataAndStages = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      let maxCompleted = 0;

      if (user) {
        // Querying level_number to match your database schema
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('game_sessions')
          .select('level_number, is_completed')
          .eq('user_id', user.id)
          .eq('game_type', 'threads')
          .eq('is_completed', true);

        console.log('Fetched completed sessions:', sessionsData);

        if (!sessionsError && sessionsData && sessionsData.length > 0) {
          const completedStages = sessionsData
            .map(s => Number(s.level_number))
            .filter(n => !isNaN(n));
          
          if (completedStages.length > 0) {
            maxCompleted = Math.max(...completedStages);
          }
        }
      }

      setHighestCompletedStage(maxCompleted);
      console.log('Highest Completed Stage Set To:', maxCompleted);

      const from = 0;
      const to = PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('threads_stages')
        .select('id, stage_number, title, description')
        .order('stage_number', { ascending: true })
        .range(from, to);

      if (error) throw error;

      if (data.length < PAGE_SIZE) {
        setHasMore(false);
      }

      const processedStages = data.map((stage, index) => {
        const stageNum = Number(stage.stage_number || index + 1);
        const isUnlocked = stageNum === 1 || stageNum <= maxCompleted + 1;
        
        return {
          ...stage,
          stage_number: stageNum,
          isUnlocked,
          isCurrent: stageNum === maxCompleted + 1
        };
      });

      setStages(processedStages);
      setPage(0);
    } catch (err) {
      console.error('Error fetching thread stages:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreStages = async () => {
    if (loading || !hasMore) return;
    try {
      setLoading(true);
      const nextPage = page + 1;
      const from = nextPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('threads_stages')
        .select('id, stage_number, title, description')
        .order('stage_number', { ascending: true })
        .range(from, to);

      if (error) throw error;

      if (data.length < PAGE_SIZE) {
        setHasMore(false);
      }

      const processedNewStages = data.map((stage, index) => {
        const stageNum = Number(stage.stage_number || (from + index + 1));
        const isUnlocked = stageNum === 1 || stageNum <= highestCompletedStage + 1;
        return {
          ...stage,
          stage_number: stageNum,
          isUnlocked,
          isCurrent: stageNum === highestCompletedStage + 1
        };
      });

      setStages(prev => [...prev, ...processedNewStages]);
      setPage(nextPage);
    } catch (err) {
      console.error('Error loading more stages:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStageSelect = (stage) => {
    const stageNum = Number(stage.stage_number);
    if (!stage.isUnlocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('ThreadsofMachaira', { stageId: stage.id, stageNumber: stageNum });
  };

  const renderStageCard = ({ item }) => {
    const stageNum = Number(item.stage_number);
    const isUnlocked = item.isUnlocked;
    const isCurrent = item.isCurrent;

    return (
      <Pressable
        onPress={() => handleStageSelect(item)}
        style={({ pressed }) => [
          styles.neoCard,
          !isUnlocked && styles.neoCardLocked,
          isCurrent && styles.neoCardCurrent,
          pressed && isUnlocked && styles.neoCardPressed
        ]}
      >
        <View style={[styles.accentStrip, isCurrent && styles.accentStripCurrent, !isUnlocked && styles.accentStripLocked]} />

        <View style={[styles.stageFrame, isCurrent && styles.stageFrameCurrent, !isUnlocked && styles.stageFrameLocked]}>
          {isUnlocked ? (
            <AppText type="bold" style={[styles.stageNumText, isCurrent && styles.stageNumTextCurrent]}>
              {stageNum < 10 ? `0${stageNum}` : stageNum}
            </AppText>
          ) : (
            <Lock size={18} color="#94a3b8" />
          )}
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.statusGlitchTag, isCurrent && styles.statusGlitchTagActive, !isUnlocked && styles.statusGlitchTagLocked]}>
              {isCurrent ? (
                <Zap size={11} color="#4f46e5" style={{ marginRight: 4 }} />
              ) : isUnlocked ? (
                <Sparkles size={11} color="#059669" style={{ marginRight: 4 }} />
              ) : (
                <Lock size={11} color="#94a3b8" style={{ marginRight: 4 }} />
              )}
              <AppText type="bold" style={[styles.statusGlitchText, isCurrent && styles.statusGlitchTextActive, !isUnlocked && styles.statusGlitchTextLocked]}>
                {isCurrent ? 'CURRENT LEVEL' : isUnlocked ? 'UNLOCKED' : 'LOCKED'}
              </AppText>
            </View>
            <AppText type="bold" style={[styles.levelIndicatorText, !isUnlocked && styles.textLocked]}>
              STAGE {stageNum}
            </AppText>
          </View>

          <AppText type="bold" style={[styles.cardTitle, !isUnlocked && styles.textLocked]} numberOfLines={1}>
            {item.title}
          </AppText>
          <AppText style={[styles.cardDesc, !isUnlocked && styles.textLocked]} numberOfLines={2}>
            {item.description}
          </AppText>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hudHeader}>
        <Pressable 
          onPress={() => { Haptics.selectionAsync(); navigation.goBack(); }} 
          style={styles.backBtn}
        >
          <ChevronLeft size={22} color="#1e293b" />
        </Pressable>
        
        <View style={styles.headerTitleGroup}>
          <AppText type="bold" style={styles.headerTitle}>Threads of Machaira</AppText>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={stages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderStageCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.heroSection}>
            <AppText type="bold" style={styles.heroTitle}>The Journey of Knowledge</AppText>
            <AppText style={styles.heroSub}>Digging Deep into the Word with Apostle Bennie.</AppText>
            <AppText style={styles.heroSubHighlight}>Quiz or get quizzed ?</AppText>
          </View>
        }
        onEndReached={loadMoreStages}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && page > 0 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#4f46e5" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  hudHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    backgroundColor: '#ffffff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#e2e8f0' 
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    backgroundColor: '#f1f5f9', 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#cbd5e1', 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1
  },
  headerTitleGroup: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 17, color: '#0f172a', letterSpacing: -0.3 },

  listContainer: { padding: 20, paddingBottom: 60 },
  heroSection: { marginBottom: 28, marginTop: 10 },
  heroTitle: { fontSize: 28, lineHeight: 34, color: '#0f172a', letterSpacing: -1, marginBottom: 8 },
  heroSub: { fontSize: 15, color: '#475569', lineHeight: 22 },
  heroSubHighlight: { fontSize: 15, color: '#d97706', lineHeight: 22, marginTop: 2, fontWeight: '600' },

  neoCard: { 
    position: 'relative', 
    overflow: 'hidden', 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ffffff', 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 16, 
    shadowColor: '#64748b', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 8, 
    elevation: 2 
  },
  neoCardCurrent: { 
    backgroundColor: '#faf5ff', 
    borderColor: '#c084fc',
    borderWidth: 1.5,
    shadowColor: '#a855f7',
    shadowOpacity: 0.12,
    shadowRadius: 10
  },
  neoCardLocked: { 
    backgroundColor: '#f8fafc', 
    borderColor: '#e2e8f0', 
    opacity: 0.65,
    shadowOpacity: 0
  },
  neoCardPressed: { 
    transform: [{ scale: 0.98 }] 
  },

  accentStrip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: '#059669' },
  accentStripCurrent: { backgroundColor: '#7c3aed' },
  accentStripLocked: { backgroundColor: '#cbd5e1' },

  stageFrame: { 
    width: 52, 
    height: 52, 
    borderRadius: 12, 
    backgroundColor: '#f1f5f9', 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 16
  },
  stageFrameCurrent: { 
    backgroundColor: '#7c3aed', 
    borderColor: '#6d28d9' 
  },
  stageFrameLocked: { 
    backgroundColor: '#f8fafc', 
    borderColor: '#e2e8f0' 
  },
  stageNumText: { fontSize: 16, color: '#1e293b', letterSpacing: -0.5 },
  stageNumTextCurrent: { color: '#ffffff' },

  cardContent: { flex: 1 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  
  statusGlitchTag: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ecfdf5', 
    paddingVertical: 3, 
    paddingHorizontal: 8, 
    borderRadius: 6, 
    borderWidth: 1, 
    borderColor: '#a7f3d0' 
  },
  statusGlitchTagActive: { 
    backgroundColor: '#f3e8ff', 
    borderColor: '#d8b4fe' 
  },
  statusGlitchTagLocked: { 
    backgroundColor: '#f1f5f9', 
    borderColor: '#e2e8f0' 
  },

  statusGlitchText: { fontSize: 9, color: '#059669', letterSpacing: 1 },
  statusGlitchTextActive: { color: '#7c3aed' },
  statusGlitchTextLocked: { color: '#94a3b8' },

  levelIndicatorText: { fontSize: 10, color: '#94a3b8', letterSpacing: 1 },

  cardTitle: { fontSize: 16, color: '#0f172a', letterSpacing: -0.3, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#475569', lineHeight: 18 },
  textLocked: { color: '#94a3b8' },

  footerLoader: { paddingVertical: 20, alignItems: 'center' }
});