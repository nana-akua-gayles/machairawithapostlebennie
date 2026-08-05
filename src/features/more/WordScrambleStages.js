import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { AppText } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Lock, CheckCircle2, Play } from 'lucide-react-native';
import { supabase } from '../../config/supabaseClient';
import * as Haptics from 'expo-haptics';

export const WordScrambleStages = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState([]);
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    fetchStagesAndProgress();
  }, []);

  const fetchStagesAndProgress = async () => {
    try {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (!sessionError && session) {
        const { data: progressData, error: progressError } = await supabase
          .from('game_sessions')
          .select('level_number')
          .eq('user_id', session.user.id)
          .eq('game_type', 'scramble')
          .eq('is_completed', true)
          .order('level_number', { ascending: false })
          .limit(1);

        if (!progressError && progressData && progressData.length > 0) {
          setUnlockedLevel(progressData[0].level_number + 1);
        }
      }

      // Fetch all stage numbers from word_scramble_puzzles
      const { data: stageData, error: stageError } = await supabase
        .from('word_scramble_puzzles')
        .select('stage_number')
        .order('stage_number', { ascending: true });

      if (stageError) throw stageError;

      // Extract unique stage numbers
      const uniqueStages = [];
      const seenStages = new Set();
      
      (stageData || []).forEach((item) => {
        if (!seenStages.has(item.stage_number)) {
          seenStages.add(item.stage_number);
          uniqueStages.push({
            stage_number: item.stage_number,
            title: `STAGE ${item.stage_number}`,
            subtitle: `Word Scramble Challenge`
          });
        }
      });

      setStages(uniqueStages);
    } catch (err) {
      console.error('Error loading scramble stages:', err.message);
      setErrorMessage('Failed to load stages.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStage = (stage) => {
    const stageNum = stage.stage_number;
    if (stageNum > unlockedLevel) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorMessage(`Complete Stage ${stageNum - 1} to unlock this stage.`);
      return;
    }

    Haptics.selectionAsync();
    setErrorMessage(null);
    navigation.navigate('WordScrambleScreen', { stageNumber: stageNum });
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
        <AppText type="bold" style={styles.headerTitle}>WORD SCRAMBLE</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#352a48" />
            <AppText style={styles.loaderText}>LOADING STAGES...</AppText>
          </View>
        ) : (
          <View style={styles.pathContainer}>
            <View style={styles.pathHeaderRow}>
              <AppText type="bold" style={styles.sectionHeading}>SELECT STAGE</AppText>
            </View>

            {errorMessage && <AppText style={styles.errorText}>{errorMessage}</AppText>}

            {stages.length === 0 ? (
              <AppText style={styles.actDesc}>No scramble stages available yet. Check back soon!</AppText>
            ) : (
              <View style={styles.timelineWrapper}>
                {stages.map((stage, index) => {
                  const stageNum = stage.stage_number;
                  const isLocked = stageNum > unlockedLevel;
                  const isCompleted = stageNum < unlockedLevel;
                  const isCurrentActive = stageNum === unlockedLevel;

                  return (
                    <View key={stageNum} style={styles.timelineRow}>
                      {index < stages.length - 1 && (
                        <View style={[
                          styles.timelineConnector,
                          stageNum < unlockedLevel ? styles.connectorCompleted : styles.connectorDefault
                        ]} />
                      )}

                      <Pressable 
                        onPress={() => handleSelectStage(stage)} 
                        style={({ pressed }) => [
                          styles.pathCard,
                          isCompleted && styles.pathCardCompleted,
                          isCurrentActive && styles.pathCardActive,
                          isLocked && styles.pathCardLocked,
                          pressed && { transform: [{ scale: 0.98 }] }
                        ]}
                      >
                        <View style={styles.pathCardLeft}>
                          <View style={[
                            styles.pathIndexBox,
                            isCompleted && styles.pathIndexBoxCompleted,
                            isCurrentActive && styles.pathIndexBoxActive,
                            isLocked && styles.pathIndexBoxLocked
                          ]}>
                            <AppText type="bold" style={[
                              styles.pathIndexText,
                              isCompleted && styles.pathIndexTextCompleted,
                              isCurrentActive && styles.pathIndexTextActive,
                              isLocked && styles.pathIndexTextLocked
                            ]}>
                              {stageNum < 10 ? `0${stageNum}` : stageNum}
                            </AppText>
                          </View>

                          <View style={styles.pathTextWrap}>
                            <AppText type="bold" numberOfLines={1} style={[
                              styles.actTitle,
                              isLocked && styles.actTitleLocked
                            ]}>
                              {stage.title}
                            </AppText>
                            <AppText numberOfLines={1} style={[
                              styles.actDesc,
                              isLocked && styles.actDescLocked
                            ]}>
                              {isLocked ? 'LOCKED — COMPLETE PREVIOUS STAGE' : stage.subtitle}
                            </AppText>
                          </View>
                        </View>

                        <View style={styles.pathCardRight}>
                          {isCompleted && (
                            <View style={styles.statusPillCompleted}>
                              <CheckCircle2 size={14} color="#16a34a" />
                              <AppText type="bold" style={styles.statusPillTextCompleted}>DONE</AppText>
                            </View>
                          )}

                          {isCurrentActive && (
                            <View style={styles.statusPillActive}>
                              <Play size={12} color="#ffffff" fill="#ffffff" style={{ marginRight: 2 }} />
                              <AppText type="bold" style={styles.statusPillTextActive}>PLAY</AppText>
                            </View>
                          )}

                          {isLocked && <Lock size={20} color="#94a3b8" />}
                        </View>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  backBtn: { backgroundColor: 'rgba(53,42,72,0.06)', borderRadius: 20, padding: 5 },
  headerTitle: { fontSize: 20, letterSpacing: 2, color: '#352a48' },
  scroll: { padding: 20, flexGrow: 1 },
  loaderContainer: { marginTop: 100, alignItems: 'center', justifyContent: 'center', gap: 15 },
  loaderText: { fontSize: 12, letterSpacing: 2, color: '#352a48' },
  
  pathContainer: { gap: 15 },
  pathHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionHeading: { fontSize: 26, color: '#352a48', letterSpacing: 1 },

  timelineWrapper: { paddingLeft: 10, paddingRight: 5, gap: 16 },
  timelineRow: { position: 'relative' },
  timelineConnector: { position: 'absolute', left: 29, top: 60, width: 4, height: 20, zIndex: 1 },
  connectorDefault: { backgroundColor: '#cbd5e1' },
  connectorCompleted: { backgroundColor: '#16a34a' },

  pathCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#352a48', padding: 18 },
  pathCardActive: { backgroundColor: 'rgba(53,42,72,0.04)', borderColor: '#352a48' },
  pathCardCompleted: { backgroundColor: '#f0fdf4', borderColor: '#16a34a' },
  pathCardLocked: { backgroundColor: '#f8fafc', borderColor: '#cbd5e1' },

  pathCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  pathIndexBox: { width: 40, height: 40, backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#352a48', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  pathIndexBoxActive: { backgroundColor: '#352a48', borderColor: '#352a48' },
  pathIndexBoxCompleted: { backgroundColor: '#dcfce7', borderColor: '#16a34a' },
  pathIndexBoxLocked: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },

  pathIndexText: { fontSize: 16, color: '#352a48' },
  pathIndexTextActive: { color: '#ffffff' },
  pathIndexTextCompleted: { color: '#16a34a' },
  pathIndexTextLocked: { color: '#94a3b8' },

  pathTextWrap: { flex: 1, minWidth: 0 },
  actTitle: { fontSize: 16, color: '#352a48' },
  actTitleLocked: { color: '#94a3b8' },
  actDesc: { fontSize: 11, color: '#64748b', marginTop: 3 },
  actDescLocked: { color: '#94a3b8' },

  pathCardRight: { alignItems: 'center', justifyContent: 'center', minWidth: 60 },
  statusPillCompleted: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingVertical: 4, paddingHorizontal: 8, borderWidth: 1.5, borderColor: '#16a34a', gap: 2 },
  statusPillTextCompleted: { fontSize: 9, color: '#16a34a', letterSpacing: 1 },
  statusPillActive: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#352a48', paddingVertical: 4, paddingHorizontal: 8, borderWidth: 1.5, borderColor: '#352a48', gap: 2 },
  statusPillTextActive: { fontSize: 9, color: '#ffffff', letterSpacing: 1 },

  errorText: { color: '#352a48', fontSize: 12, fontWeight: 'bold', marginBottom: 15 }
});