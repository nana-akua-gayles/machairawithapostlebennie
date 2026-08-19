import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { AppText } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Lock, CheckCircle2, Play, AlertTriangle } from 'lucide-react-native';
import { supabase } from '../../config/supabaseClient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';

const RUBRIC = '#C81E3A';
const AMBER = '#E8A930';
const TEAL = '#0F9D6C';
const safeHaptic = (fn) => { try { fn(); } catch (_e) {} };

export const WordScrambleStages = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [lockedTapMessage, setLockedTapMessage] = useState(null);
  const [stages, setStages] = useState([]);
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [needsAuth, setNeedsAuth] = useState(false);

  const requestIdRef = useRef(0);

  const fetchStagesAndProgress = useCallback(async () => {
    const myRequestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(null);
    setNeedsAuth(false);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      let nextUnlockedLevel = 1;
      if (session) {
        const { data: progressData, error: progressError } = await supabase
          .from('game_sessions')
          .select('level_number')
          .eq('user_id', session.user.id)
          .eq('game_type', 'scramble')
          .eq('is_completed', true)
          .order('level_number', { ascending: false })
          .limit(1);

        if (progressError) throw progressError;
        if (progressData && progressData.length > 0) {
          nextUnlockedLevel = progressData[0].level_number + 1;
        }
      }

      const { data: stageData, error: stageError } = await supabase
        .from('word_scramble_puzzles')
        .select('stage_number')
        .order('stage_number', { ascending: true });

      if (stageError) throw stageError;
      if (myRequestId !== requestIdRef.current) return;

      const uniqueStages = [];
      const seenStages = new Set();
      (stageData || []).forEach((item) => {
        if (!seenStages.has(item.stage_number)) {
          seenStages.add(item.stage_number);
          uniqueStages.push({
            stage_number: item.stage_number,
            title: `STAGE ${item.stage_number}`,
            subtitle: 'Word Scramble Challenge',
          });
        }
      });

      setUnlockedLevel(nextUnlockedLevel);
      setStages(uniqueStages);
      if (!session) setNeedsAuth(true);
    } catch (err) {
      if (myRequestId !== requestIdRef.current) return;
      console.error('Error loading scramble stages:', err.message);
      setLoadError('Could not load stages. Check your connection and try again.');
    } finally {
      if (myRequestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStagesAndProgress(); }, [fetchStagesAndProgress]);

  const handleSelectStage = (stage) => {
    const stageNum = stage.stage_number;
    if (stageNum > unlockedLevel) {
      safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
      setLockedTapMessage(`Complete Stage ${stageNum - 1} to unlock this stage.`);
      return;
    }

    safeHaptic(() => Haptics.selectionAsync());
    setLockedTapMessage(null);
    navigation.navigate('WordScrambleScreen', { stageNumber: stageNum });
  };

  const handleBack = () => {
    safeHaptic(() => Haptics.selectionAsync());
    navigation.goBack();
  };

  const s = getStyles(colors, isDark);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Pressable onPress={handleBack} style={s.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <ChevronLeft size={28} color={colors.text} />
        </Pressable>
        <AppText type="bold" style={s.headerTitle}>WORD SCRAMBLE</AppText>
        <View style={s.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={s.loaderContainer}>
            <ActivityIndicator size="large" color={RUBRIC} />
            <AppText style={s.loaderText}>LOADING STAGES...</AppText>
          </View>
        ) : loadError ? (
          <View style={s.stateBox}>
            <View style={s.stateBadge}><AlertTriangle size={22} color={RUBRIC} /></View>
            <AppText type="bold" style={s.stateTitle}>COULDN'T LOAD STAGES</AppText>
            <AppText style={s.stateText}>{loadError}</AppText>
            <Pressable style={s.retryBtn} onPress={fetchStagesAndProgress}>
              <AppText type="bold" style={s.retryBtnText}>TRY AGAIN</AppText>
            </Pressable>
          </View>
        ) : (
          <View style={s.pathContainer}>
            <View style={s.pathHeaderRow}>
              <AppText type="bold" style={s.sectionHeading}>SELECT STAGE</AppText>
            </View>

            {needsAuth && (
              <View style={s.authNotice}>
                <AppText style={s.authNoticeText}>Sign in to track your progress across stages.</AppText>
              </View>
            )}

            {lockedTapMessage && (
              <View style={s.lockedNotice}>
                <Lock size={13} color={AMBER} />
                <AppText style={s.lockedNoticeText}>{lockedTapMessage}</AppText>
              </View>
            )}

            {stages.length === 0 ? (
              <View style={s.stateBox}>
                <View style={s.stateBadge}><Play size={20} color={RUBRIC} /></View>
                <AppText type="bold" style={s.stateTitle}>NO STAGES YET</AppText>
                <AppText style={s.stateText}>No scramble stages available yet. Check back soon!</AppText>
              </View>
            ) : (
              <View style={s.timelineWrapper}>
                {stages.map((stage, index) => {
                  const stageNum = stage.stage_number;
                  const isLocked = stageNum > unlockedLevel;
                  const isCompleted = stageNum < unlockedLevel;
                  const isCurrentActive = stageNum === unlockedLevel;

                  return (
                    <View key={stageNum} style={s.timelineRow}>
                      {index < stages.length - 1 && (
                        <View style={[s.timelineConnector, isCompleted ? s.connectorCompleted : s.connectorDefault]} />
                      )}

                      <Pressable
                        onPress={() => handleSelectStage(stage)}
                        style={({ pressed }) => [
                          s.pathCard,
                          isCompleted && s.pathCardCompleted,
                          isCurrentActive && s.pathCardActive,
                          isLocked && s.pathCardLocked,
                          pressed && !isLocked && s.pathCardPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={stage.title}
                      >
                        <View style={s.pathCardLeft}>
                          <View style={[
                            s.pathIndexBox,
                            isCompleted && s.pathIndexBoxCompleted,
                            isCurrentActive && s.pathIndexBoxActive,
                            isLocked && s.pathIndexBoxLocked,
                          ]}>
                            {isCompleted ? (
                              <CheckCircle2 size={18} color={TEAL} />
                            ) : (
                              <AppText type="bold" style={[
                                s.pathIndexText,
                                isCurrentActive && s.pathIndexTextActive,
                                isLocked && s.pathIndexTextLocked,
                              ]}>
                                {stageNum < 10 ? `0${stageNum}` : stageNum}
                              </AppText>
                            )}
                          </View>

                          <View style={s.pathTextWrap}>
                            <AppText type="bold" numberOfLines={1} style={[s.actTitle, isLocked && s.actTitleLocked]}>
                              {stage.title}
                            </AppText>
                            <AppText numberOfLines={1} style={[s.actDesc, isLocked && s.actDescLocked]}>
                              {isLocked ? 'LOCKED — COMPLETE PREVIOUS STAGE' : stage.subtitle}
                            </AppText>
                          </View>
                        </View>

                        <View style={s.pathCardRight}>
                          {isCompleted && (
                            <View style={s.statusPillCompleted}>
                              <CheckCircle2 size={13} color={TEAL} />
                              <AppText type="bold" style={s.statusPillTextCompleted}>DONE</AppText>
                            </View>
                          )}
                          {isCurrentActive && (
                            <View style={s.statusPillActive}>
                              <Play size={11} color="#ffffff" fill="#ffffff" style={{ marginRight: 2 }} />
                              <AppText type="bold" style={s.statusPillTextActive}>PLAY</AppText>
                            </View>
                          )}
                          {isLocked && <Lock size={18} color={colors.textSecondary} />}
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

const getStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(200,30,58,0.05)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, letterSpacing: 2, color: colors.text },
  headerSpacer: { width: 40 },
  scroll: { padding: 20, paddingTop: 4, flexGrow: 1 },

  loaderContainer: { marginTop: 100, alignItems: 'center', justifyContent: 'center', gap: 15 },
  loaderText: { fontSize: 12, letterSpacing: 2, color: RUBRIC },

  stateBox: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
  stateBadge: { width: 52, height: 52, borderRadius: 26, backgroundColor: isDark ? 'rgba(200,30,58,0.12)' : '#fff1f2', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1.5, borderColor: RUBRIC },
  stateTitle: { fontSize: 15, letterSpacing: 1, color: colors.text, marginBottom: 6 },
  stateText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 18, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: RUBRIC },
  retryBtnText: { fontSize: 12, letterSpacing: 1, color: RUBRIC },

  pathContainer: { gap: 15 },
  pathHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionHeading: { fontSize: 22, color: colors.text, letterSpacing: 0.5 },

  authNotice: { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8f5f2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1e4e7' },
  authNoticeText: { fontSize: 12.5, color: colors.textSecondary },

  lockedNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isDark ? 'rgba(232,169,48,0.14)' : '#fef6e3', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: isDark ? 'rgba(232,169,48,0.35)' : '#f7dfa0' },
  lockedNoticeText: { fontSize: 12.5, color: isDark ? AMBER : '#b8790f', flexShrink: 1 },

  timelineWrapper: { paddingLeft: 4, gap: 16 },
  timelineRow: { position: 'relative' },
  timelineConnector: { position: 'absolute', left: 29, top: 62, width: 3, height: 20, zIndex: 1, borderRadius: 2 },
  connectorDefault: { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#e8dcd9' },
  connectorCompleted: { backgroundColor: TEAL },

  pathCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderRadius: 16, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1e4e7', padding: 16 },
  pathCardActive: { borderColor: RUBRIC, borderWidth: 1.5 },
  pathCardCompleted: { backgroundColor: isDark ? 'rgba(15,157,108,0.08)' : '#f2fbf7', borderColor: isDark ? 'rgba(15,157,108,0.3)' : '#bdead6' },
  pathCardLocked: { opacity: 0.6 },
  pathCardPressed: { transform: [{ scale: 0.98 }] },

  pathCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  pathIndexBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#faf7f7', borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1e4e7', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  pathIndexBoxActive: { backgroundColor: RUBRIC, borderColor: RUBRIC },
  pathIndexBoxCompleted: { backgroundColor: isDark ? 'rgba(15,157,108,0.16)' : '#e3f9ef', borderColor: isDark ? 'rgba(15,157,108,0.4)' : '#a7ecce' },
  pathIndexBoxLocked: { opacity: 0.7 },

  pathIndexText: { fontSize: 15, color: colors.text },
  pathIndexTextActive: { color: '#ffffff' },
  pathIndexTextLocked: { color: colors.textSecondary },

  pathTextWrap: { flex: 1, minWidth: 0 },
  actTitle: { fontSize: 15, color: colors.text },
  actTitleLocked: { color: colors.textSecondary },
  actDesc: { fontSize: 11, color: colors.textSecondary, marginTop: 3, letterSpacing: 0.3 },
  actDescLocked: { color: colors.textSecondary },

  pathCardRight: { alignItems: 'center', justifyContent: 'center', minWidth: 58 },
  statusPillCompleted: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(15,157,108,0.16)' : '#e3f9ef', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 20, gap: 3 },
  statusPillTextCompleted: { fontSize: 9, color: TEAL, letterSpacing: 1 },
  statusPillActive: { flexDirection: 'row', alignItems: 'center', backgroundColor: RUBRIC, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 20, gap: 3 },
  statusPillTextActive: { fontSize: 9, color: '#ffffff', letterSpacing: 1 },
});
