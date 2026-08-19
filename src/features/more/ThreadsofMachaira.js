import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable, ScrollView, Animated } from 'react-native';
import { AppText } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, XCircle, Flame, Trophy, RotateCcw, ArrowRight, AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-audio';
import { supabase } from '../../config/supabaseClient';
import { useTheme } from '../../context/ThemeContext';

const RUBRIC = '#C81E3A';
const safeHaptic = (fn) => { try { fn(); } catch (_e) {} };

export const ThreadsofMachaira = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();
  const { stageId, stage_id, id, stageNumber } = route?.params || {};
  const activeStageId = stageId || stage_id || id;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(null);
  const [streak, setStreak] = useState(0);
  const [runningScore, setRunningScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(null);
  const [saveError, setSaveError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const trophyBounce = useRef(new Animated.Value(0)).current;
  const soundRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    const playBackgroundMusic = async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true });
        const { sound } = await Audio.Sound.createAsync(require('../../../assets/audio/gameS1.mp3'), { isLooping: true, volume: 0.1 });
        if (cancelled) { sound.unloadAsync().catch(() => {}); return; }
        soundRef.current = sound;
        await sound.playAsync();
      } catch (error) { console.error('Error loading background music:', error); }
    };
    playBackgroundMusic();
    return () => {
      mountedRef.current = false;
      cancelled = true;
      if (soundRef.current) { soundRef.current.unloadAsync().catch(() => {}); soundRef.current = null; }
    };
  }, []);

  const startAttempt = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (!activeStageId) throw new Error('No stage specified — check that stageId/stage_id/id is being passed in navigation params');
      console.log('[Threads] starting attempt for stage', activeStageId);
      const { data, error } = await supabase.rpc('start_threads_attempt', { p_stage_id: activeStageId });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('RPC returned no rows for this stage');
      console.log('[Threads] RPC returned', data.length, 'rows, first question:', JSON.stringify(data[0]).slice(0, 200));
      const emptyQuestionCount = data.filter((row) => !row.question).length;
      if (emptyQuestionCount > 0) {
        console.warn(`[Threads] ${emptyQuestionCount}/${data.length} rows came back with an empty question — check the "question" or "quote" key in threads_stages.questions for stage ${activeStageId}`);
      }
      if (!mountedRef.current) return;
      setAttemptId(data[0].attempt_id);
      setQuestions(data.map((row) => ({ questionIndex: row.question_index, question: row.question, options: row.options || [] })));
      setCurrentIndex(0);
      setRunningScore(0);
      setStreak(0);
      setIsFinished(false);
      setFinalScore(null);
      setSaveError(false);
    } catch (err) {
      console.error('Error starting threads attempt:', err.message);
      if (mountedRef.current) setLoadError(err.message || 'Something went wrong loading this stage.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [activeStageId]);

  useEffect(() => { startAttempt(); }, [startAttempt]);

  useEffect(() => {
    if (!isFinished && questions.length > 0) {
      setSelectedOption(null);
      setIsAnswered(false);
      setLastCorrect(null);
      slideAnim.setValue(40);
      cardScale.setValue(0.94);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
      ]).start();
    }
  }, [currentIndex, questions, isFinished]);

  useEffect(() => {
    if (isFinished) {
      trophyBounce.setValue(0);
      Animated.spring(trophyBounce, { toValue: 1, tension: 80, friction: 5, useNativeDriver: true }).start();
    }
  }, [isFinished]);

  const finishAttempt = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('finish_threads_attempt', { p_attempt_id: attemptId });
      if (error) throw error;
      setFinalScore(data?.[0]?.final_score ?? runningScore);
      setSaveError(false);
    } catch (err) {
      console.error('Failed to finalize attempt:', err.message);
      setFinalScore(runningScore);
      setSaveError(true);
    }
  }, [attemptId, runningScore]);

  const handleSelect = async (option) => {
    if (isAnswered || submitting) return;
    const currentQ = questions[currentIndex];
    setSubmitting(true);
    setSelectedOption(option);
    try {
      const { data, error } = await supabase.rpc('submit_threads_answer', {
        p_attempt_id: attemptId, p_question_index: currentQ.questionIndex, p_selected_option: option, p_client_elapsed_ms: null,
      });
      if (error) throw error;
      const result = data?.[0];
      const correct = !!result?.is_correct;
      setIsAnswered(true);
      setLastCorrect(correct);
      setStreak((prev) => (correct ? prev + 1 : 0));
      setRunningScore(result?.running_score ?? runningScore);
      safeHaptic(() => Haptics.notificationAsync(correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error));

      setTimeout(async () => {
        if (currentIndex < questions.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        } else {
          setIsFinished(true);
          await finishAttempt();
          safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
        }
      }, 1100);
    } catch (err) {
      console.error('Error submitting answer:', err.message);
      setIsAnswered(false);
      setSelectedOption(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestart = () => startAttempt();

  const s = getStyles(colors, isDark);

  if (loading) {
    return (<SafeAreaView style={s.container}><View style={s.center}><ActivityIndicator size="large" color={RUBRIC} /></View></SafeAreaView>);
  }

  if (loadError) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <View style={s.emptyBadge}><AlertTriangle size={24} color={RUBRIC} /></View>
          <AppText type="bold" style={s.emptyTitle}>SOMETHING WENT WRONG</AppText>
          <AppText style={s.emptyText}>{loadError}</AppText>
          <Pressable style={s.retryInlineBtn} onPress={startAttempt}>
            <RotateCcw size={16} color={RUBRIC} style={{ marginRight: 8 }} />
            <AppText type="bold" style={s.retryInlineText}>TRY AGAIN</AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.center}>
          <View style={s.emptyBadge}><Flame size={24} color={RUBRIC} /></View>
          <AppText type="bold" style={s.emptyTitle}>STAGE 0{stageNumber || 1}</AppText>
          <AppText style={s.emptyText}>No questions dropped for this stage yet. Stay tuned.</AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (isFinished) {
    const maxPossibleScore = questions.length * 2;
    const displayScore = finalScore ?? runningScore;
    const integerBaseScore = Math.floor(displayScore);
    const pct = maxPossibleScore > 0 ? integerBaseScore / maxPossibleScore : 0;
    const badge = pct >= 1 ? 'FLAWLESS' : pct >= 0.7 ? 'ON FIRE' : pct >= 0.4 ? 'GOOD RUN' : 'KEEP GOING';

    return (
      <SafeAreaView style={s.container}>
        <View style={s.scoreContainer}>
          <Animated.View style={[s.trophyBadge, { transform: [{ scale: trophyBounce.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }, { rotate: '-6deg' }] }]}>
            <Trophy size={36} color={RUBRIC} strokeWidth={2.25} />
          </Animated.View>

          <AppText type="bold" style={s.scoreHeader}>GLORY!</AppText>
          <View style={s.badgePill}><AppText type="bold" style={s.badgePillText}>{badge}</AppText></View>
          <AppText style={s.scoreSubHeader}>STAGE 0{stageNumber || 1} COMPLETED</AppText>

          {saveError && (
            <View style={s.saveWarning}>
              <AlertTriangle size={14} color={RUBRIC} />
              <AppText style={s.saveWarningText}>Your score may not have synced. Check your connection.</AppText>
            </View>
          )}

          <View style={s.scoreCard}>
            <AppText type="bold" style={s.scoreBig}>{integerBaseScore}<AppText style={s.scoreBigMax}> / {maxPossibleScore}+</AppText></AppText>
            <AppText style={s.scoreCaption}>TOTAL SCORE</AppText>
          </View>

          <View style={s.scoreActions}>
            <Pressable style={({ pressed }) => [s.retryBtn, pressed && s.btnPressed]} onPress={handleRestart}>
              <RotateCcw size={18} color={colors.text} style={{ marginRight: 8 }} />
              <AppText type="bold" style={s.retryBtnText}>REPLAY</AppText>
            </Pressable>
            <Pressable style={({ pressed }) => [s.proceedBtn, pressed && s.btnPressed]} onPress={() => navigation.goBack()}>
              <AppText type="bold" style={s.proceedBtnText}>NEXT QUIZ</AppText>
              <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 8 }} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;
  const options = currentQuestion?.options || [];

  return (
    <SafeAreaView style={s.container}>
      <Animated.View style={[s.innerContainer, { transform: [{ translateY: slideAnim }] }]}>
        <View style={s.headerRow}>
          <View style={s.stageTag}>
            <Flame size={12} color={RUBRIC} />
            <AppText type="bold" style={s.stageTagText}>STAGE 0{stageNumber || 1}</AppText>
          </View>
          {streak >= 2 && (
            <View style={s.streakTag}>
              <Flame size={12} color={RUBRIC} />
              <AppText type="bold" style={s.streakTagText}>{streak} STREAK</AppText>
            </View>
          )}
          <AppText type="bold" style={s.counterText}>{currentIndex + 1}<AppText style={s.counterTotal}>/{questions.length}</AppText></AppText>
        </View>

        <View style={s.progressBarTrack}>
          <View style={[s.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>

        <Animated.View style={[s.quoteCard, { transform: [{ scale: cardScale }] }]}>
          <View style={s.quoteMark}><AppText style={s.quoteMarkText}>"</AppText></View>
          <AppText style={s.quoteText}>{currentQuestion?.question}</AppText>
        </Animated.View>

        <ScrollView contentContainerStyle={s.optionsList} showsVerticalScrollIndicator={false}>
          {options.map((opt, index) => {
            const isSelected = selectedOption === opt;
            let optionStyle = s.optionCard;
            let textStyle = s.optionText;
            if (isAnswered && isSelected) {
              optionStyle = [s.optionCard, lastCorrect ? s.correctCard : s.incorrectCard];
              textStyle = [s.optionText, lastCorrect ? s.correctText : s.incorrectText];
            } else if (isSelected) {
              optionStyle = [s.optionCard, s.selectedCard];
              textStyle = [s.optionText, s.selectedText];
            }
            return (
              <Pressable key={index} style={({ pressed }) => [optionStyle, pressed && !isAnswered && s.optionPressed]} onPress={() => handleSelect(opt)} disabled={isAnswered || submitting}>
                <View style={s.optionContent}>
                  <AppText type="bold" style={textStyle}>{opt}</AppText>
                  {isAnswered && isSelected && lastCorrect && <CheckCircle2 size={22} color="#16a34a" />}
                  {isAnswered && isSelected && !lastCorrect && <XCircle size={22} color={RUBRIC} />}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const getStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  innerContainer: { flex: 1, padding: 20, paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyBadge: { width: 56, height: 56, borderRadius: 28, backgroundColor: isDark ? 'rgba(200,30,58,0.12)' : '#fff1f2', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: RUBRIC },
  emptyTitle: { fontSize: 22, color: colors.text, marginBottom: 8, letterSpacing: 1 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  retryInlineBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: RUBRIC },
  retryInlineText: { fontSize: 13, letterSpacing: 1, color: RUBRIC },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 },
  stageTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(200,30,58,0.14)' : '#fff1f2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: isDark ? 'rgba(200,30,58,0.4)' : '#fecdd3', gap: 6 },
  stageTagText: { fontSize: 11, letterSpacing: 2, color: RUBRIC, lineHeight: 14 },
  streakTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(200,30,58,0.14)' : '#fff1f2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: isDark ? 'rgba(200,30,58,0.4)' : '#fecdd3', gap: 4 },
  streakTagText: { fontSize: 11, letterSpacing: 1, color: RUBRIC, lineHeight: 14 },
  counterText: { fontSize: 15, color: colors.text, letterSpacing: 0.5, marginLeft: 'auto' },
  counterTotal: { color: colors.textSecondary, fontSize: 13 },
  progressBarTrack: { height: 10, backgroundColor: isDark ? '#27252b' : '#f1f0f5', borderRadius: 5, marginBottom: 26, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: RUBRIC, borderRadius: 5, shadowColor: RUBRIC, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 6 },
  quoteCard: { backgroundColor: colors.card, borderWidth: 2, borderColor: RUBRIC, borderRadius: 22, padding: 26, marginBottom: 24, shadowColor: RUBRIC, shadowOffset: { width: 0, height: 6 }, shadowOpacity: isDark ? 0.25 : 0.12, shadowRadius: 14, elevation: 6 },
  quoteMark: { marginBottom: -6 },
  quoteMarkText: { fontSize: 48, color: RUBRIC, fontWeight: '900', lineHeight: 48 },
  quoteText: { fontSize: 19, color: colors.text, lineHeight: 28, fontWeight: '600' },
  optionsList: { gap: 12, paddingBottom: 20 },
  optionCard: { backgroundColor: colors.card, borderWidth: 2, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1e4e7', borderRadius: 16, padding: 18 },
  optionPressed: { transform: [{ scale: 0.97 }], backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fff8f8' },
  optionContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  selectedCard: { backgroundColor: RUBRIC, borderColor: RUBRIC },
  correctCard: { backgroundColor: isDark ? '#062812' : '#f0fdf4', borderColor: '#16a34a' },
  incorrectCard: { backgroundColor: isDark ? 'rgba(200,30,58,0.14)' : '#fef2f2', borderColor: RUBRIC },
  optionText: { fontSize: 16, color: colors.text, flex: 1, marginRight: 10 },
  selectedText: { color: '#ffffff', fontWeight: 'bold' },
  correctText: { color: '#16a34a' },
  incorrectText: { color: RUBRIC },
  scoreContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  trophyBadge: { width: 88, height: 88, borderRadius: 26, backgroundColor: isDark ? 'rgba(200,30,58,0.14)' : '#fff1f2', justifyContent: 'center', alignItems: 'center', marginBottom: 18, borderWidth: 2, borderColor: RUBRIC },
  scoreHeader: { fontSize: 34, color: colors.text, letterSpacing: -1, marginBottom: 10 },
  badgePill: { backgroundColor: RUBRIC, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 10 },
  badgePillText: { fontSize: 12, letterSpacing: 2, color: '#ffffff' },
  scoreSubHeader: { fontSize: 12, letterSpacing: 2, color: colors.textSecondary, marginBottom: 20 },
  saveWarning: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: isDark ? 'rgba(200,30,58,0.14)' : '#fef2f2' },
  saveWarningText: { fontSize: 12, color: RUBRIC, flexShrink: 1 },
  scoreCard: { width: '100%', alignItems: 'center', backgroundColor: colors.card, borderRadius: 22, paddingVertical: 26, marginBottom: 28, borderWidth: 2, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1e4e7' },
  scoreBig: { fontSize: 46, color: RUBRIC, letterSpacing: -1 },
  scoreBigMax: { fontSize: 20, color: colors.textSecondary },
  scoreCaption: { fontSize: 11, letterSpacing: 2, color: colors.textSecondary, marginTop: 4 },
  scoreActions: { width: '100%', flexDirection: 'row', gap: 12 },
  btnPressed: { transform: [{ scale: 0.97 }] },
  retryBtn: { flex: 1, flexDirection: 'row', height: 54, backgroundColor: isDark ? colors.card : '#faf5f5', borderRadius: 16, borderWidth: 2, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1e4e7', alignItems: 'center', justifyContent: 'center' },
  retryBtnText: { fontSize: 13, color: colors.text, letterSpacing: 1 },
  proceedBtn: { flex: 1, flexDirection: 'row', height: 54, backgroundColor: RUBRIC, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: RUBRIC, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 5 },
  proceedBtnText: { fontSize: 13, color: '#ffffff', letterSpacing: 1 },
});
