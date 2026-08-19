import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { ChevronLeft, Check, Lock, ArrowRight } from 'lucide-react-native';
import { supabase } from '../../config/supabaseClient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { AppText } from '../../components/AppText';
import { useTheme } from '../../context/ThemeContext';

const RUBRIC = '#C81E3A';
const safeHaptic = (fn) => { try { fn(); } catch (_e) {} };

export default function WordSearchStages({ navigation }) {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [stages, setStages] = useState([]);
  const requestIdRef = useRef(0);

  const fetchStagesAndProgress = useCallback(async () => {
    const myId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setNeedsAuth(false);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) { if (myId === requestIdRef.current) { setNeedsAuth(true); setLoading(false); } return; }

      const { data: puzzleStages, error: puzzleError } = await supabase
        .from('word_search_puzzles')
        .select('id, stage_number, title')
        .order('stage_number', { ascending: true });
      if (puzzleError) throw puzzleError;

      const { data: userSessions, error: sessionFetchError } = await supabase
        .from('game_sessions')
        .select('level_number, is_completed, score')
        .eq('user_id', session.user.id)
        .eq('game_type', 'search');
      if (sessionFetchError) throw sessionFetchError;

      if (myId !== requestIdRef.current) return;

      let highestUnlockedLevel = 1;
      const completedLevels = (userSessions || []).filter((s) => s.is_completed).map((s) => s.level_number);
      if (completedLevels.length > 0) highestUnlockedLevel = Math.max(...completedLevels) + 1;

      setStages((puzzleStages || []).map((stage) => {
        const sessionRecord = userSessions?.find((s) => s.level_number === stage.stage_number);
        return {
          id: stage.id,
          stageNumber: stage.stage_number,
          title: stage.title || `Stage ${stage.stage_number}`,
          isCompleted: sessionRecord?.is_completed || false,
          score: sessionRecord?.score || 0,
          isUnlocked: stage.stage_number <= highestUnlockedLevel,
        };
      }));
    } catch (err) {
      if (myId !== requestIdRef.current) return;
      console.error('Error loading word search stages:', err.message);
      setError('Could not load puzzles. Check your connection and try again.');
    } finally {
      if (myId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStagesAndProgress(); }, [fetchStagesAndProgress]);

  const s = getStyles(colors, isDark);

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <ActivityIndicator size="small" color={RUBRIC} />
          <AppText type="bold" style={s.loaderText}>LOADING PUZZLES...</AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Pressable style={s.backBtn} onPress={() => { safeHaptic(() => Haptics.selectionAsync()); navigation?.goBack?.(); }}>
          <ChevronLeft size={20} color={colors.text} />
        </Pressable>
        <AppText type="bold" style={[s.headerTitle, { color: colors.text }]}>WORD SEARCH</AppText>
        <View style={s.placeholderButton} />
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.introContainer}>
          <View style={s.introAccentLine} />
          <AppText type="bold" style={[s.introTitle, { color: colors.text }]}>The Journey</AppText>
          <AppText style={[s.introSubtitle, { color: colors.textSecondary }]}>Uncover words, conquer daily trials, and rise through the ranks.</AppText>
        </View>

        {needsAuth ? (
          <View style={s.stateBox}>
            <AppText type="bold" style={[s.stateTitle, { color: colors.text }]}>SIGN IN REQUIRED</AppText>
            <AppText style={[s.stateText, { color: colors.textSecondary }]}>Log in to track your puzzle progress.</AppText>
          </View>
        ) : error ? (
          <View style={s.stateBox}>
            <AppText type="bold" style={[s.stateTitle, { color: colors.text }]}>SOMETHING WENT WRONG</AppText>
            <AppText style={[s.stateText, { color: colors.textSecondary }]}>{error}</AppText>
            <Pressable style={s.retryBtn} onPress={fetchStagesAndProgress}>
              <AppText type="bold" style={s.retryBtnText}>TRY AGAIN</AppText>
            </Pressable>
          </View>
        ) : stages.length === 0 ? (
          <View style={s.stateBox}>
            <AppText type="bold" style={[s.stateTitle, { color: colors.text }]}>NO PUZZLES YET</AppText>
            <AppText style={[s.stateText, { color: colors.textSecondary }]}>Check back soon for new stages.</AppText>
          </View>
        ) : (
          <View style={s.listContainer}>
            {stages.map((stage) => {
              const { isUnlocked, isCompleted } = stage;
              return (
                <Pressable
                  key={stage.id || stage.stageNumber}
                  disabled={!isUnlocked}
                  onPress={() => { safeHaptic(() => Haptics.selectionAsync()); navigation.navigate('WordSearchScreen', { stageNumber: stage.stageNumber, stageId: stage.id }); }}
                  style={({ pressed }) => [s.rowItem, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }, !isUnlocked && s.rowItemLocked, pressed && isUnlocked && s.rowItemPressed]}
                >
                  <View style={s.rowLeft}>
                    <View style={[s.rowBadge, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }, isCompleted && s.rowBadgeCompleted, !isUnlocked && s.rowBadgeLocked]}>
                      <AppText type="bold" style={[s.rowBadgeText, { color: colors.text }, isCompleted && s.rowBadgeTextCompleted, !isUnlocked && { color: colors.textSecondary }]}>
                        {String(stage.stageNumber).padStart(2, '0')}
                      </AppText>
                    </View>
                    <View style={s.rowTextContainer}>
                      <AppText numberOfLines={1} type="bold" style={[s.rowTitle, { color: colors.text }, !isUnlocked && { color: colors.textSecondary }]}>{stage.title}</AppText>
                      <AppText style={[s.rowMeta, { color: colors.textSecondary }]}>
                        {!isUnlocked ? 'LOCKED LEVEL' : stage.score > 0 ? `${stage.score} PTS COMPLETED` : 'READY TO PLAY'}
                      </AppText>
                    </View>
                  </View>
                  <View style={[s.statusIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }, (isCompleted || isUnlocked) && s.statusIconAccent]}>
                    {isCompleted ? <Check size={14} color={RUBRIC} /> : isUnlocked ? <ArrowRight size={14} color={RUBRIC} /> : <Lock size={13} color={colors.textSecondary} />}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 16, fontSize: 11, color: RUBRIC, letterSpacing: 3 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9' },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' },
  headerTitle: { fontSize: 13, letterSpacing: 2.5 },
  placeholderButton: { width: 38, height: 38 },
  scrollContent: { padding: 20, paddingBottom: 50 },
  introContainer: { marginBottom: 28, paddingHorizontal: 4 },
  introAccentLine: { width: 24, height: 3, backgroundColor: RUBRIC, borderRadius: 2, marginBottom: 12 },
  introTitle: { fontSize: 23, marginBottom: 6, letterSpacing: -0.5 },
  introSubtitle: { fontSize: 13, lineHeight: 20 },
  stateBox: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  stateTitle: { fontSize: 13, letterSpacing: 1.5, marginBottom: 8 },
  stateText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 18, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: RUBRIC },
  retryBtnText: { fontSize: 12, letterSpacing: 1, color: RUBRIC },
  listContainer: { gap: 14 },
  rowItem: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18, paddingHorizontal: 18, borderRadius: 18, borderWidth: 1 },
  rowItemLocked: { borderStyle: 'dashed', opacity: 0.7 },
  rowItemPressed: { transform: [{ scale: 0.98 }] },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1, paddingRight: 8 },
  rowBadge: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  rowBadgeCompleted: { backgroundColor: 'rgba(200,30,58,0.1)', borderColor: 'rgba(200,30,58,0.3)' },
  rowBadgeLocked: { opacity: 0.7 },
  rowBadgeText: { fontSize: 14, letterSpacing: 0.5 },
  rowBadgeTextCompleted: { color: RUBRIC },
  rowTextContainer: { flex: 1, justifyContent: 'center' },
  rowTitle: { fontSize: 15, letterSpacing: 0.3, marginBottom: 4 },
  rowMeta: { fontSize: 9, letterSpacing: 1.2, fontWeight: '700', textTransform: 'uppercase' },
  statusIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  statusIconAccent: { backgroundColor: 'rgba(200,30,58,0.1)', borderColor: 'rgba(200,30,58,0.3)' },
});
