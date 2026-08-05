import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabaseClient';
import { AppText } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');

export default function WordScrambleScreen({ route, navigation }) {
  const stageNumber = route?.params?.stageNumber ?? 1;
  const stageId = route?.params?.stageId ?? null;

  const [loading, setLoading] = useState(true);
  const [stageData, setStageData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [shuffledLetters, setShuffledLetters] = useState([]);
  const [answerSlots, setAnswerSlots] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [scoreEarned, setScoreEarned] = useState(false);
  const [isError, setIsError] = useState(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  // Stage Completion UI State
  const [isStageCompleteModalVisible, setIsStageCompleteModalVisible] = useState(false);

  // Advanced Scoring & Metrics State
  const [totalScore, setTotalScore] = useState(0);
  const [incorrectAttempts, setIncorrectAttempts] = useState(0);
  const [wordTimeLeft, setWordTimeLeft] = useState(30);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Background music effect
  useEffect(() => {
    let backgroundSound;

    const playBackgroundMusic = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        const { sound: playbackObject } = await Audio.Sound.createAsync(
          require('../../../assets/audio/gameS2.mp3'),
          { 
            isLooping: true, 
            volume: 0.1      
          }
        );

        backgroundSound = playbackObject;
        await playbackObject.playAsync();
      } catch (error) {
        console.error('Error loading background music:', error);
      }
    };

    playBackgroundMusic();

    return () => {
      if (backgroundSound) {
        backgroundSound.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    fetchStageData();
  }, [stageNumber, stageId]);

  // Timer effect for speed/time bonus
  useEffect(() => {
    if (loading || isCompleted || !stageData || isStageCompleteModalVisible) return;

    setWordTimeLeft(30);
    timerRef.current = setInterval(() => {
      setWordTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, stageData, isCompleted, isStageCompleteModalVisible]);

  const fetchStageData = async () => {
    try {
      setLoading(true);
      let query = supabase.from('word_scramble_puzzles').select('*');
      
      if (stageId) {
        query = query.eq('id', stageId);
      } else {
        query = query.eq('stage_number', stageNumber);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      if (data) {
        let formattedWords = [];
        
        if (data.words && Array.isArray(data.words)) {
          formattedWords = data.words.map(item => ({
            word: (item.word || item.target_word || '').replace(/\s+/g, '').toUpperCase(),
            scrambled: (item.scrambled || item.scrambled_word || '').replace(/\s+/g, '').toUpperCase(),
            hint: item.hint || item.clue || 'Unscramble the letters to find the correct word.'
          }));
        } else if (data.target_word) {
          formattedWords = [{
            word: data.target_word.replace(/\s+/g, '').toUpperCase(),
            scrambled: data.scrambled_word ? data.scrambled_word.replace(/\s+/g, '').toUpperCase() : null,
            hint: data.hint || data.clue || 'Unscramble the letters to find the correct word.'
          }];
        }

        setStageData({
          stage_number: data.stage_number || stageNumber,
          title: data.title || `STAGE ${stageNumber}`,
          subtitle: data.subtitle || '',
          words: formattedWords,
        });
        
        if (formattedWords.length > 0) {
          initializeWord(formattedWords, 0);
        } else {
          setIsStageCompleteModalVisible(true);
          navigation?.goBack?.();
        }
      } else {
        setIsStageCompleteModalVisible(true);
        navigation?.goBack?.();
      }
    } catch (error) {
      console.error('Error fetching word scramble stage:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const initializeWord = (wordsList, index) => {
    const currentItem = wordsList[index];
    const targetWord = currentItem.word.toUpperCase();
    
    let shuffled = [];

    if (currentItem.scrambled) {
      shuffled = currentItem.scrambled.split('').map((char, i) => ({
        char,
        id: `${i}-${char}-${Math.random()}`,
        used: false,
      }));
    } else {
      const letters = targetWord.split('');
      do {
        shuffled = [...letters]
          .map((char, i) => ({
            char,
            id: `${i}-${char}-${Math.random()}`,
            used: false,
          }))
          .sort(() => Math.random() - 0.5);
      } while (shuffled.map(item => item.char).join('') === targetWord && targetWord.length > 1);
    }

    const initialSlots = Array.from({ length: targetWord.length }).map(
      (_, i) => ({
        id: `slot-${i}`,
        char: '',
        sourceIndex: null,
      })
    );

    setShuffledLetters(shuffled);
    setAnswerSlots(initialSlots);
    setIsCompleted(false);
    setScoreEarned(false);
    setIsError(false);
    setIncorrectAttempts(0);
    startTimeRef.current = Date.now();
  };

  const handleSelectLetter = (letterObj, sourceIdx) => {
    if (letterObj.used || isCompleted || isStageCompleteModalVisible) return;
    Haptics.selectionAsync();

    const emptySlotIndex = answerSlots.findIndex((slot) => slot.char === '');
    if (emptySlotIndex === -1) return;

    const newSlots = [...answerSlots];
    newSlots[emptySlotIndex] = {
      id: `${sourceIdx}-${letterObj.char}`,
      char: letterObj.char,
      sourceIndex: sourceIdx,
    };
    setAnswerSlots(newSlots);

    const newShuffled = [...shuffledLetters];
    newShuffled[sourceIdx].used = true;
    setShuffledLetters(newShuffled);

    if (isError) setIsError(false);

    if (newSlots.every(s => s.char !== '')) {
      checkWordSubmission(newSlots);
    }
  };

  const handleRemoveLetter = (slotIndex) => {
    const slot = answerSlots[slotIndex];
    if (!slot.char || slot.sourceIndex === null || isCompleted || isStageCompleteModalVisible) return;
    Haptics.selectionAsync();

    const newShuffled = [...shuffledLetters];
    newShuffled[slot.sourceIndex].used = false;
    setShuffledLetters(newShuffled);

    const newSlots = [...answerSlots];
    newSlots[slotIndex] = {
      id: `slot-${slotIndex}`,
      char: '',
      sourceIndex: null,
    };
    setAnswerSlots(newSlots);

    if (isError) setIsError(false);
  };

  const checkWordSubmission = (slotsToCheck) => {
    if (!stageData) return;
    const formedWord = slotsToCheck.map((s) => s.char).join('');
    const targetWord = stageData.words[currentIndex].word;

    if (formedWord === targetWord) {
      if (timerRef.current) clearInterval(timerRef.current);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsCompleted(true);
      setIsError(false);

      if (!scoreEarned) {
        let basePoints = 5;
        let firstAttemptBonus = incorrectAttempts === 0 ? 2 : 0;
        let speedBonus = wordTimeLeft > 0 ? 2.5 : 0;
        let penalty = incorrectAttempts * 1;
        
        let finalWordScore = Math.max(1, Math.round((basePoints + firstAttemptBonus + speedBonus) - penalty));

        setTotalScore((prev) => prev + finalWordScore);
        setScoreEarned(true);
      }
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIncorrectAttempts((prev) => prev + 1);
      triggerShake();
    }
  };

  const handleSubmitWord = () => {
    const formedWord = answerSlots.map((s) => s.char).join('');
    const targetWord = stageData.words[currentIndex].word;

    if (formedWord.length < targetWord.length) return;
    checkWordSubmission(answerSlots);
  };

  const saveGameSession = async (finalTotalScore) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) return;

      const durationMs = Date.now() - startTimeRef.current;
      const timeTakenSeconds = Number((durationMs / 1000).toFixed(2));

      const { data: existingSession, error: fetchError } = await supabase
        .from('game_sessions')
        .select('id, score, is_completed')
        .eq('user_id', session.user.id)
        .eq('game_type', 'scramble')
        .eq('level_number', stageNumber)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching existing session:', fetchError.message);
        return;
      }

      if (existingSession) {
        await supabase
          .from('game_sessions')
          .update({
            score: Math.max(finalTotalScore, existingSession.score || 0),
            time_taken_seconds: timeTakenSeconds,
            is_completed: true,
            completed_at: new Date(),
            updated_at: new Date()
          })
          .eq('id', existingSession.id);
      } else {
        await supabase.from('game_sessions').insert({
          user_id: session.user.id,
          game_type: 'scramble',
          level_number: stageNumber,
          score: finalTotalScore,
          time_taken_seconds: timeTakenSeconds,
          is_completed: true,
          completed_at: new Date(),
          updated_at: new Date()
        });
      }

      const nextStageNum = stageNumber + 1;
      const { data: nextSession, error: nextFetchError } = await supabase
        .from('game_sessions')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('game_type', 'scramble')
        .eq('level_number', nextStageNum)
        .maybeSingle();

      if (!nextFetchError && !nextSession) {
        await supabase.from('game_sessions').insert({
          user_id: session.user.id,
          game_type: 'scramble',
          level_number: nextStageNum,
          score: 0,
          is_completed: false,
          updated_at: new Date()
        });
      }
    } catch (err) {
      console.error('Failed to record game session & unlock next stage:', err.message);
    }
  };

  const handleReset = () => {
    if (!stageData) return;
    Haptics.selectionAsync();
    setIsError(false);
    initializeWord(stageData.words, currentIndex);
  };

  const handleNextWord = async () => {
    if (!stageData) return;
    Haptics.selectionAsync();
    if (currentIndex < stageData.words.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      initializeWord(stageData.words, nextIdx);
    } else {
      await saveGameSession(totalScore);
      setIsStageCompleteModalVisible(true);
    }
  };

  const triggerShake = () => {
    setIsError(true);
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  if (loading || !stageData) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <AppText style={styles.loaderText}>Loading puzzle challenge...</AppText>
      </View>
    );
  }

  const currentItem = stageData.words[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => { Haptics.selectionAsync(); navigation?.goBack?.(); }}>
          <Ionicons name="arrow-back" size={22} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <AppText style={styles.headerCategory}>STAGE {stageNumber}</AppText>
          <AppText style={styles.scoreHeader}>Score: {totalScore}</AppText>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={handleReset}>
          <Ionicons name="refresh" size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Live Metrics Row (Timer) */}
        <View style={styles.metricsRow}>
          <View style={styles.metricBadge}>
            <Ionicons name="time-outline" size={16} color="#D97706" />
            <AppText style={styles.metricText}>{wordTimeLeft}s</AppText>
            <AppText style={styles.timerSubtitleInline}> (Solve under 30s for bonus!)</AppText>
          </View>
        </View>

        {/* Hint Box */}
        <View style={styles.hintCard}>
          <View style={styles.hintTextContainer}>
            <AppText style={styles.hintLabel}>HINT</AppText>
            <AppText style={styles.hintText}>{currentItem?.hint || 'Unscramble the letters.'}</AppText>
          </View>
        </View>

        {/* Answer Slot Containers with Shake & Error Styling */}
        <Animated.View 
          style={[
            styles.slotsContainer, 
            { transform: [{ translateX: shakeAnimation }] }
          ]}
        >
          {answerSlots.map((slot, index) => (
            <TouchableOpacity
              key={slot.id}
              style={[
                styles.slot, 
                slot.char ? styles.filledSlot : styles.emptySlot,
                isError && styles.errorSlot
              ]}
              onPress={() => handleRemoveLetter(index)}
              activeOpacity={0.8}
            >
              <AppText style={[styles.slotText, isError && styles.errorSlotText]}>
                {slot.char}
              </AppText>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Submit Button (Shown when slots are full and word isn't completed yet) */}
        {!isCompleted && answerSlots.every(s => s.char !== '') && (
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmitWord} activeOpacity={0.85}>
            <AppText style={styles.submitButtonText}>Submit Answer</AppText>
          </TouchableOpacity>
        )}

        {/* Completion Feedback State */}
        {isCompleted ? (
          <View style={styles.successContainer}>
            <View style={styles.successMessageRow}>
              <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              <AppText style={styles.successText}>Correct Answer!</AppText>
            </View>
            <TouchableOpacity style={styles.nextButton} onPress={handleNextWord} activeOpacity={0.85}>
              <AppText style={styles.nextButtonText}>
                {currentIndex < stageData.words.length - 1 ? 'Next Word' : 'Complete Stage'}
              </AppText>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        ) : (
          !answerSlots.every(s => s.char !== '') && <View style={styles.placeholderSpacing} />
        )}

        {/* Scrambled Letter Tiles Pool */}
        <View style={styles.poolCard}>
          <View style={styles.poolContainer}>
            {shuffledLetters.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.poolTile, item.used ? styles.usedTile : styles.activeTile]}
                onPress={() => handleSelectLetter(item, index)}
                disabled={item.used}
                activeOpacity={0.7}
              >
                <AppText style={[styles.poolTileText, item.used ? styles.usedTileText : styles.activeTileText]}>
                  {item.char}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Stage Completion Success UI Overlay */}
      {isStageCompleteModalVisible && (
        <View style={styles.stageCompleteOverlay}>
          <View style={styles.stageCompleteCard}>
            <View style={styles.stageCompleteIconContainer}>
              <Ionicons name="trophy" size={42} color="#F59E0B" />
            </View>
            <AppText style={styles.stageCompleteTitle}>Stage Completed!</AppText>
            <AppText style={styles.stageCompleteSubtitle}>
              Glory! You successfully conquered Stage {stageNumber}.
            </AppText>
            
            <View style={styles.stageCompleteScoreBadge}>
              <AppText style={styles.stageCompleteScoreLabel}>Final Score</AppText>
              <AppText style={styles.stageCompleteScoreValue}>{totalScore} pts</AppText>
            </View>

            <TouchableOpacity 
              style={styles.stageCompleteButton} 
              onPress={() => {
                Haptics.selectionAsync();
                navigation?.goBack?.();
              }}
              activeOpacity={0.85}
            >
              <AppText style={styles.stageCompleteButtonText}>Continue to the Journey</AppText>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  loaderText: { marginTop: 12, fontSize: 15, color: '#64748B', fontWeight: '500' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitleContainer: { alignItems: 'center' },
  headerCategory: { fontSize: 16, fontWeight: '700', color: '#352a48', letterSpacing: 1.2, marginBottom: 2 },
  scoreHeader: { fontSize: 13, fontWeight: '600', color: '#6366F1' },
  iconButton: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 20, alignItems: 'center', paddingBottom: 40 },

  metricsRow: { flexDirection: 'row', justifyContent: 'center', width: '100%', marginBottom: 16 },
  metricBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FEF3C7' },
  metricText: { marginLeft: 6, fontSize: 13, fontWeight: '700', color: '#92400E' },
  timerSubtitleInline: { fontSize: 12, color: '#D97706', fontWeight: '500', opacity: 0.8 },

  hintCard: { flexDirection: 'row', backgroundColor: '#FFFBEB', borderRadius: 14, padding: 26, width: '100%', alignItems: 'center', marginBottom: 28, borderWidth: 1, borderColor: '#FEF3C7' },
  hintTextContainer: { flex: 1 },
  hintLabel: { fontSize: 14, fontWeight: '700', color: '#D97706', letterSpacing: 0.8, marginBottom: 2 },
  hintText: { fontSize: 16, color: '#92400E', lineHeight: 20, marginTop: 4},

  slotsContainer: { flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'center', marginBottom: 20, minHeight: 64 },
  slot: { flex: 1, maxWidth: 41, minWidth: 32, height: 51, marginHorizontal: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1 },
  emptySlot: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
  filledSlot: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
  slotText: { fontSize: 22, fontWeight: '800', color: '#1E293B' },

  errorSlot: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  errorSlotText: { color: '#EF4444' },

  submitButton: { backgroundColor: '#10B981', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 24, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  submitButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

  successContainer: { alignItems: 'center', marginBottom: 24, width: '100%' },
  successMessageRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginBottom: 14, borderWidth: 1, borderColor: '#A7F3D0' },
  successText: { marginLeft: 8, color: '#065F46', fontWeight: '700', fontSize: 14 },
  nextButton: { flexDirection: 'row', backgroundColor: '#6366F1', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4, width: '100%' },
  nextButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },

  placeholderSpacing: { height: 60 },

  poolCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 11, shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  poolContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  poolTile: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center', margin: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  activeTile: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E2E8F0' },
  usedTile: { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', shadowOpacity: 0, elevation: 0 },
  poolTileText: { fontSize: 20, fontWeight: '800' },
  activeTileText: { color: '#1E293B' },
  usedTileText: { color: '#CBD5E1' },

  // Custom Stage Complete UI Overlay Styles
  stageCompleteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 100,
  },
  stageCompleteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  stageCompleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stageCompleteTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
    textAlign: 'center',
  },
  stageCompleteSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  stageCompleteScoreBadge: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stageCompleteScoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  stageCompleteScoreValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#6366F1',
  },
  stageCompleteButton: {
    flexDirection: 'row',
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  stageCompleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});