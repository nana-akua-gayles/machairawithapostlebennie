import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Pressable, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { ArrowLeft, RotateCcw, Clock, Lightbulb, CheckCircle2, ArrowRight, Trophy, AlertTriangle } from 'lucide-react-native';
import { supabase } from '../../config/supabaseClient';
import { AppText } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-audio';
import { useTheme } from '../../context/ThemeContext';

const RUBRIC = '#C81E3A';
const AMBER = '#E8A930';
const TEAL = '#0F9D6C';
const safeHaptic = (fn) => { try { fn(); } catch (_e) {} };

export default function WordScrambleScreen({ route, navigation }) {
  const { colors, isDark } = useTheme();
  const stageNumber = route?.params?.stageNumber ?? 1;
  const stageId = route?.params?.stageId ?? null;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [puzzleId, setPuzzleId] = useState(null);
  const [wordCount, setWordCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attemptId, setAttemptId] = useState(null);
  const [hint, setHint] = useState('');

  const [shuffledLetters, setShuffledLetters] = useState([]);
  const [answerSlots, setAnswerSlots] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isError, setIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const [isStageCompleteModalVisible, setIsStageCompleteModalVisible] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [lastWordPoints, setLastWordPoints] = useState(null);
  const [wordTimeLeft, setWordTimeLeft] = useState(30);
  const [saveError, setSaveError] = useState(false);
  const timerRef = useRef(null);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const backgroundMusic = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    let isMounted = true;
    let cancelled = false;

    const playBackgroundMusic = async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true });
        const { sound } = await Audio.Sound.createAsync(require('../../../assets/audio/gameS2.mp3'), { isLooping: true, volume: 0.1 });
        if (cancelled) { sound.unloadAsync().catch(() => {}); return; }
        if (isMounted) {
          backgroundMusic.current = sound;
          await sound.playAsync();
        } else {
          await sound.unloadAsync();
        }
      } catch (error) {
        console.error('Error loading background music:', error);
      }
    };

    playBackgroundMusic();

    return () => {
      mountedRef.current = false;
      isMounted = false;
      cancelled = true;
      if (backgroundMusic.current) {
        backgroundMusic.current.unloadAsync().catch(() => {});
        backgroundMusic.current = null;
      }
    };
  }, []);

  const startWord = useCallback(async (pId, wordIndex) => {
    const myRequestId = ++requestIdRef.current;
    try {
      const { data, error } = await supabase.rpc('start_scramble_word', { p_puzzle_id: pId, p_word_index: wordIndex });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Could not load this word.');
      if (myRequestId !== requestIdRef.current) return;

      const row = data[0];
      setAttemptId(row.attempt_id);
      setHint(row.hint);
      setIsCompleted(false);
      setIsError(false);
      setLastWordPoints(null);

      const shuffled = row.scrambled.split('').map((char, i) => ({ char, id: `${i}-${char}-${Math.random()}`, used: false }));
      const initialSlots = Array.from({ length: row.word_length }).map((_, i) => ({ id: `slot-${i}`, char: '', sourceIndex: null }));
      setShuffledLetters(shuffled);
      setAnswerSlots(initialSlots);
    } catch (err) {
      if (myRequestId !== requestIdRef.current) return;
      console.error('Error starting scramble word:', err.message);
      setLoadError(err.message || 'Could not load this puzzle.');
    }
  }, []);

  const fetchStageData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let query = supabase.from('word_scramble_puzzles').select('id, stage_number, words');
      query = stageId ? query.eq('id', stageId) : query.eq('stage_number', stageNumber);
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Puzzle not found.');

      const count = Array.isArray(data.words) ? data.words.length : 0;
      if (count === 0) throw new Error('This stage has no words configured yet.');

      if (!mountedRef.current) return;
      setPuzzleId(data.id);
      setWordCount(count);
      setCurrentIndex(0);
      setTotalScore(0);
      await startWord(data.id, 0);
    } catch (error) {
      console.error('Error fetching word scramble stage:', error.message);
      if (mountedRef.current) setLoadError(error.message || 'Could not load this puzzle.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [stageNumber, stageId, startWord]);

  useEffect(() => { fetchStageData(); }, [fetchStageData]);

  useEffect(() => {
    if (loading || isCompleted || !puzzleId || isStageCompleteModalVisible) return;
    setWordTimeLeft(30);
    timerRef.current = setInterval(() => {
      setWordTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex, puzzleId, isCompleted, isStageCompleteModalVisible, loading]);

  const triggerShake = () => {
    setIsError(true);
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const submitGuess = async (slots) => {
    if (submitting) return;
    setSubmitting(true);
    const guess = slots.map((s) => s.char).join('');
    try {
      const { data, error } = await supabase.rpc('submit_scramble_guess', { p_attempt_id: attemptId, p_guess: guess });
      if (error) throw error;
      const result = data?.[0];
      if (result?.is_correct) {
        if (timerRef.current) clearInterval(timerRef.current);
        safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
        setIsCompleted(true);
        setIsError(false);
        setLastWordPoints(result.points_awarded);
        setTotalScore((prev) => prev + Number(result.points_awarded));
      } else {
        safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
        triggerShake();
      }
    } catch (err) {
      console.error('Error submitting guess:', err.message);
      safeHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectLetter = (letterObj, sourceIdx) => {
    if (letterObj.used || isCompleted || isStageCompleteModalVisible || submitting) return;
    safeHaptic(() => Haptics.selectionAsync());

    const emptySlotIndex = answerSlots.findIndex((slot) => slot.char === '');
    if (emptySlotIndex === -1) return;

    const newSlots = [...answerSlots];
    newSlots[emptySlotIndex] = { id: `${sourceIdx}-${letterObj.char}`, char: letterObj.char, sourceIndex: sourceIdx };
    setAnswerSlots(newSlots);

    const newShuffled = [...shuffledLetters];
    newShuffled[sourceIdx].used = true;
    setShuffledLetters(newShuffled);

    if (isError) setIsError(false);
    if (newSlots.every((s) => s.char !== '')) submitGuess(newSlots);
  };

  const handleRemoveLetter = (slotIndex) => {
    const slot = answerSlots[slotIndex];
    if (!slot.char || slot.sourceIndex === null || isCompleted || isStageCompleteModalVisible || submitting) return;
    safeHaptic(() => Haptics.selectionAsync());

    const newShuffled = [...shuffledLetters];
    newShuffled[slot.sourceIndex].used = false;
    setShuffledLetters(newShuffled);

    const newSlots = [...answerSlots];
    newSlots[slotIndex] = { id: `slot-${slotIndex}`, char: '', sourceIndex: null };
    setAnswerSlots(newSlots);

    if (isError) setIsError(false);
  };

  const handleSubmitWord = () => {
    if (answerSlots.some((s) => s.char === '')) return;
    submitGuess(answerSlots);
  };

  const handleReset = () => {
    if (!puzzleId || submitting) return;
    safeHaptic(() => Haptics.selectionAsync());
    startWord(puzzleId, currentIndex);
  };

  const handleNextWord = async () => {
    if (!puzzleId) return;
    safeHaptic(() => Haptics.selectionAsync());
    if (currentIndex < wordCount - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      await startWord(puzzleId, nextIdx);
    } else {
      try {
        const { data, error } = await supabase.rpc('finish_scramble_stage', { p_puzzle_id: puzzleId });
        if (error) throw error;
        setTotalScore(data?.[0]?.final_score ?? totalScore);
        setSaveError(false);
      } catch (err) {
        console.error('Failed to finalize scramble stage:', err.message);
        setSaveError(true);
      }
      setIsStageCompleteModalVisible(true);
    }
  };

  const s = getStyles(colors, isDark);

  if (loading) {
    return (
      <SafeAreaView style={s.loaderContainer}>
        <ActivityIndicator size="large" color={RUBRIC} />
        <AppText style={s.loaderText}>LOADING PUZZLE...</AppText>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={s.loaderContainer}>
        <View style={s.errorBadge}><AlertTriangle size={24} color={RUBRIC} /></View>
        <AppText style={s.errorTitle}>COULDN'T LOAD PUZZLE</AppText>
        <AppText style={s.errorText}>{loadError}</AppText>
        <Pressable style={s.retryBtn} onPress={fetchStageData}>
          <RotateCcw size={16} color={RUBRIC} style={{ marginRight: 8 }} />
          <AppText style={s.retryBtnText}>TRY AGAIN</AppText>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Pressable style={s.iconButton} onPress={() => { safeHaptic(() => Haptics.selectionAsync()); navigation?.goBack?.(); }}>
          <ArrowLeft size={20} color={colors.text} />
        </Pressable>
        <View style={s.headerTitleContainer}>
          <AppText type="bold" style={s.headerCategory}>STAGE {stageNumber}</AppText>
          <AppText type="bold" style={s.scoreHeader}>{totalScore} PTS</AppText>
        </View>
        <Pressable style={s.iconButton} onPress={handleReset}>
          <RotateCcw size={18} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.progressRow}>
          <AppText type="bold" style={s.progressText}>WORD {currentIndex + 1} OF {wordCount}</AppText>
          <View style={s.timerBadge}>
            <Clock size={13} color={wordTimeLeft <= 10 ? RUBRIC : AMBER} />
            <AppText type="bold" style={[s.timerText, wordTimeLeft <= 10 && { color: RUBRIC }]}>{wordTimeLeft}s</AppText>
          </View>
        </View>

        <View style={s.hintCard}>
          <View style={s.hintIconBadge}><Lightbulb size={16} color={AMBER} /></View>
          <View style={s.hintTextContainer}>
            <AppText type="bold" style={s.hintLabel}>HINT</AppText>
            <AppText style={s.hintText}>{hint || 'Unscramble the letters.'}</AppText>
          </View>
        </View>

        <Animated.View style={[s.slotsContainer, { transform: [{ translateX: shakeAnimation }] }]}>
          {answerSlots.map((slot, index) => (
            <Pressable
              key={slot.id}
              style={[s.slot, slot.char ? s.filledSlot : s.emptySlot, isError && s.errorSlot, isCompleted && s.completedSlot]}
              onPress={() => handleRemoveLetter(index)}
            >
              <AppText type="bold" style={[s.slotText, isError && s.errorSlotText, isCompleted && s.completedSlotText]}>
                {slot.char}
              </AppText>
            </Pressable>
          ))}
        </Animated.View>

        {!isCompleted && answerSlots.every((s2) => s2.char !== '') && (
          <Pressable style={({ pressed }) => [s.submitButton, pressed && s.btnPressed]} onPress={handleSubmitWord} disabled={submitting}>
            <AppText type="bold" style={s.submitButtonText}>{submitting ? 'Checking...' : 'Submit Answer'}</AppText>
          </Pressable>
        )}

        {isCompleted ? (
          <View style={s.successContainer}>
            <View style={s.successMessageRow}>
              <CheckCircle2 size={20} color={TEAL} />
              <AppText type="bold" style={s.successText}>Correct! +{lastWordPoints} pts</AppText>
            </View>
            <Pressable style={({ pressed }) => [s.nextButton, pressed && s.btnPressed]} onPress={handleNextWord}>
              <AppText type="bold" style={s.nextButtonText}>{currentIndex < wordCount - 1 ? 'Next Word' : 'Complete Stage'}</AppText>
              <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 8 }} />
            </Pressable>
          </View>
        ) : (
          !answerSlots.every((s2) => s2.char !== '') && <View style={s.placeholderSpacing} />
        )}

        <View style={s.poolCard}>
          <View style={s.poolContainer}>
            {shuffledLetters.map((item, index) => (
              <Pressable
                key={item.id}
                style={[s.poolTile, item.used ? s.usedTile : s.activeTile]}
                onPress={() => handleSelectLetter(item, index)}
                disabled={item.used || submitting}
              >
                <AppText type="bold" style={[s.poolTileText, item.used ? s.usedTileText : s.activeTileText]}>{item.char}</AppText>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {isStageCompleteModalVisible && (
        <View style={s.stageCompleteOverlay}>
          <View style={s.stageCompleteCard}>
            <View style={s.stageCompleteIconContainer}>
              <Trophy size={40} color={RUBRIC} strokeWidth={2.25} />
            </View>
            <AppText type="bold" style={s.stageCompleteTitle}>Stage Completed!</AppText>
            <AppText style={s.stageCompleteSubtitle}>Glory! You successfully conquered Stage {stageNumber}.</AppText>

            {saveError && (
              <View style={s.saveWarning}>
                <AlertTriangle size={13} color={RUBRIC} />
                <AppText style={s.saveWarningText}>Your score may not have synced. Check your connection.</AppText>
              </View>
            )}

            <View style={s.stageCompleteScoreBadge}>
              <AppText type="bold" style={s.stageCompleteScoreLabel}>FINAL SCORE</AppText>
              <AppText type="bold" style={s.stageCompleteScoreValue}>{totalScore} pts</AppText>
            </View>

            <Pressable style={({ pressed }) => [s.stageCompleteButton, pressed && s.btnPressed]} onPress={() => { safeHaptic(() => Haptics.selectionAsync()); navigation?.goBack?.(); }}>
              <AppText type="bold" style={s.stageCompleteButtonText}>Continue to the Journey</AppText>
              <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 8 }} />
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 },
  loaderText: { marginTop: 14, fontSize: 12, color: RUBRIC, letterSpacing: 2 },
  errorBadge: { width: 56, height: 56, borderRadius: 28, backgroundColor: isDark ? 'rgba(200,30,58,0.12)' : '#fff1f2', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: RUBRIC },
  errorTitle: { fontSize: 15, color: colors.text, letterSpacing: 1, marginBottom: 8 },
  errorText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: RUBRIC },
  retryBtnText: { fontSize: 12, letterSpacing: 1, color: RUBRIC },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1e4e7' },
  headerTitleContainer: { alignItems: 'center' },
  headerCategory: { fontSize: 12, color: colors.text, letterSpacing: 2, marginBottom: 3 },
  scoreHeader: { fontSize: 13, color: RUBRIC },
  iconButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#faf5f5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1e4e7' },
  scrollContent: { padding: 20, alignItems: 'center', paddingBottom: 40 },

  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 18 },
  progressText: { fontSize: 11, letterSpacing: 1.5, color: colors.textSecondary },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: isDark ? 'rgba(232,169,48,0.14)' : '#fef6e3', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: isDark ? 'rgba(232,169,48,0.35)' : '#f7dfa0' },
  timerText: { fontSize: 12, color: isDark ? AMBER : '#b8790f' },

  hintCard: { flexDirection: 'row', backgroundColor: isDark ? 'rgba(232,169,48,0.1)' : '#fef9ee', borderRadius: 18, padding: 18, width: '100%', alignItems: 'center', marginBottom: 26, borderWidth: 1.5, borderColor: isDark ? 'rgba(232,169,48,0.3)' : '#f7dfa0', gap: 14 },
  hintIconBadge: { width: 36, height: 36, borderRadius: 12, backgroundColor: isDark ? 'rgba(232,169,48,0.18)' : '#fef1d6', alignItems: 'center', justifyContent: 'center' },
  hintTextContainer: { flex: 1 },
  hintLabel: { fontSize: 11, color: isDark ? AMBER : '#b8790f', letterSpacing: 1, marginBottom: 3 },
  hintText: { fontSize: 14.5, color: colors.text, lineHeight: 20 },

  slotsContainer: { flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'center', marginBottom: 22, minHeight: 60, gap: 6 },
  slot: { flex: 1, maxWidth: 44, minWidth: 32, height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 2 },
  emptySlot: { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1e4e7' },
  filledSlot: { backgroundColor: isDark ? 'rgba(200,30,58,0.1)' : '#fef6f7', borderColor: RUBRIC },
  completedSlot: { backgroundColor: isDark ? 'rgba(15,157,108,0.14)' : '#e3f9ef', borderColor: TEAL },
  slotText: { fontSize: 22, color: colors.text },
  completedSlotText: { color: TEAL },
  errorSlot: { borderColor: RUBRIC, backgroundColor: isDark ? 'rgba(200,30,58,0.18)' : '#fef2f2' },
  errorSlotText: { color: RUBRIC },

  submitButton: { backgroundColor: RUBRIC, paddingVertical: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 24 },
  submitButtonText: { color: '#ffffff', fontSize: 16 },
  btnPressed: { transform: [{ scale: 0.97 }] },

  successContainer: { alignItems: 'center', marginBottom: 24, width: '100%' },
  successMessageRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: isDark ? 'rgba(15,157,108,0.14)' : '#e3f9ef', paddingVertical: 9, paddingHorizontal: 16, borderRadius: 20, marginBottom: 14, borderWidth: 1, borderColor: isDark ? 'rgba(15,157,108,0.35)' : '#a7ecce' },
  successText: { color: TEAL, fontSize: 14 },
  nextButton: { flexDirection: 'row', backgroundColor: TEAL, paddingVertical: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center', width: '100%' },
  nextButtonText: { color: '#ffffff', fontSize: 16 },

  placeholderSpacing: { height: 60 },

  poolCard: { width: '100%', backgroundColor: colors.card, borderRadius: 20, padding: 12, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1e4e7' },
  poolContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  poolTile: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', margin: 5 },
  activeTile: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#e8dcd9' },
  usedTile: { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f5f0ee', borderWidth: 1.5, borderColor: 'transparent' },
  poolTileText: { fontSize: 20 },
  activeTileText: { color: colors.text },
  usedTileText: { color: colors.textSecondary, opacity: 0.4 },

  stageCompleteOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,10,10,0.78)', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 100 },
  stageCompleteCard: { backgroundColor: colors.card, borderRadius: 26, padding: 28, width: '100%', maxWidth: 340, alignItems: 'center' },
  stageCompleteIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: isDark ? 'rgba(200,30,58,0.14)' : '#fff1f2', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: RUBRIC },
  stageCompleteTitle: { fontSize: 22, color: colors.text, marginBottom: 6, textAlign: 'center' },
  stageCompleteSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 18, lineHeight: 20 },
  saveWarning: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: isDark ? 'rgba(200,30,58,0.14)' : '#fef2f2' },
  saveWarningText: { fontSize: 11.5, color: RUBRIC, flexShrink: 1 },
  stageCompleteScoreBadge: { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#faf7f7', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center', width: '100%', marginBottom: 22, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1e4e7' },
  stageCompleteScoreLabel: { fontSize: 11, color: colors.textSecondary, letterSpacing: 1.5, marginBottom: 4 },
  stageCompleteScoreValue: { fontSize: 25, color: RUBRIC },
  stageCompleteButton: { flexDirection: 'row', backgroundColor: RUBRIC, paddingVertical: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center', width: '100%' },
  stageCompleteButtonText: { color: '#ffffff', fontSize: 15 },
});
