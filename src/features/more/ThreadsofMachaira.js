import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { AppText } from '../../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, XCircle, Sparkles, Trophy, RotateCcw, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { supabase } from '../../config/supabaseClient';


export const ThreadsofMachaira = ({ navigation, route }) => {
  const { stageId, stage_id, id, stageNumber } = route?.params || {};
  const activeStageId = stageId || stage_id || id;

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [speedBonusTotal, setSpeedBonusTotal] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const startTimeRef = useRef(Date.now());
  const gameStartRef = useRef(Date.now());
  const slideAnim = useRef(new Animated.Value(0)).current;

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
          require('../../../assets/audio/gameS1.mp3'),
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

  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  useEffect(() => {
    fetchStageQuestions();
  }, [activeStageId, stageNumber]);

  useEffect(() => {
    if (!isFinished) {
      setSelectedOption(null);
      setIsAnswered(false);
      startTimeRef.current = Date.now();
      
      slideAnim.setValue(30);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [currentIndex, questions, isFinished]);

  const fetchStageQuestions = async () => {
    try {
      setLoading(true);

      let query = supabase.from('threads_stages').select('questions');
      
      if (activeStageId) {
        query = query.eq('id', activeStageId);
      } else if (stageNumber) {
        query = query.eq('stage_number', stageNumber);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const stageRecord = Array.isArray(data) ? data[0] : data;

      let fetchedQuestions = [];
      if (stageRecord?.questions) {
        if (Array.isArray(stageRecord.questions)) {
          fetchedQuestions = stageRecord.questions;
        } else if (typeof stageRecord.questions === 'string') {
          fetchedQuestions = JSON.parse(stageRecord.questions);
        }
      }

      const randomizedQuestions = shuffleArray(fetchedQuestions).map(q => {
        let parsedOpts = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]');
        
        const rawTexts = parsedOpts.map(opt => opt.replace(/^[A-D]\)\s*/, ''));
        const shuffledTexts = shuffleArray(rawTexts);
        
        const prefixes = ['A) ', 'B) ', 'C) ', 'D) '];
        const formattedOpts = shuffledTexts.map((text, idx) => `${prefixes[idx]}${text}`);

        return {
          ...q,
          options: formattedOpts
        };
      });

      setQuestions(randomizedQuestions);
      gameStartRef.current = Date.now();
    } catch (err) {
      console.error('Error fetching stage questions blob:', err.message);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const saveGameSession = async (finalScore) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('No authenticated user found when attempting to save game session.');
        return;
      }

      const timeTakenSeconds = Number(((Date.now() - gameStartRef.current) / 1000).toFixed(2));
      const parsedLevelNumber = Number(stageNumber) || 1;
      const parsedStageId = activeStageId ? String(activeStageId) : null;

      const { error } = await supabase.from('game_sessions').upsert([
        {
          user_id: user.id,
          game_type: 'threads',
          level_number: parsedLevelNumber,
          score: finalScore,
          time_taken_seconds: timeTakenSeconds,
          is_completed: true,
          stage_id: parsedStageId,
          updated_at: new Date().toISOString()
        }
      ], {
        onConflict: 'user_id,game_type,stage_id'
      });

      if (error) {
        console.error('Failed to record game session score:', error.message);
      }
    } catch (err) {
      console.error('Error recording session:', err);
    }
  };

  const handleSelect = (option) => {
    if (isAnswered) return;
    
    setIsAnswered(true);
    setSelectedOption(option);
    const currentQ = questions[currentIndex];

    const cleanSelected = option.replace(/^[A-D]\)\s*/, '').trim().toLowerCase();
    const targetAnswer = currentQ?.answer || currentQ?.author || '';
    const cleanTarget = targetAnswer.replace(/^[A-D]\)\s*/, '').trim().toLowerCase();
    const isCorrect = cleanSelected === cleanTarget;

    const timeElapsedMs = Date.now() - startTimeRef.current;
    const speedBonus = Number(Math.max(0, 0.5 * (1 - timeElapsedMs / 10000)).toFixed(6));

    let updatedScore = score;
    let updatedBonus = speedBonusTotal;

    if (isCorrect) {
      updatedScore = score + 2;
      updatedBonus = Number((speedBonusTotal + speedBonus).toFixed(6));
      setScore(updatedScore);
      setSpeedBonusTotal(updatedBonus);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    const totalFinalScore = Number((updatedScore + updatedBonus).toFixed(6));

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setIsFinished(true);
        saveGameSession(totalFinalScore);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 1200);
  };

  const handleRestart = () => {
    const randomizedQuestions = shuffleArray(questions).map(q => {
      let parsedOpts = Array.isArray(q.options) ? q.options : JSON.parse(q.options || '[]');
      const rawTexts = parsedOpts.map(opt => opt.replace(/^[A-D]\)\s*/, ''));
      const shuffledTexts = shuffleArray(rawTexts);
      const prefixes = ['A) ', 'B) ', 'C) ', 'D) '];
      const formattedOpts = shuffledTexts.map((text, idx) => `${prefixes[idx]}${text}`);

      return {
        ...q,
        options: formattedOpts
      };
    });

    setQuestions(randomizedQuestions);
    setCurrentIndex(0);
    setScore(0);
    setSpeedBonusTotal(0);
    setIsFinished(false);
    setSelectedOption(null);
    setIsAnswered(false);
    gameStartRef.current = Date.now();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#e11d48" />
        </View>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <View style={styles.emptyBadge}>
            <Sparkles size={24} color="#e11d48" />
          </View>
          <AppText type="bold" style={styles.emptyTitle}>STAGE 0{stageNumber || 1}</AppText>
          <AppText style={styles.emptyText}>No questions dropped for this stage yet. Stay tuned.</AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (isFinished) {
    const maxPossibleScore = questions.length * 2;
    const integerBaseScore = Math.floor(score);
    const displayBonus = speedBonusTotal.toFixed(3);

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.scoreContainer}>
          <View style={styles.trophyBadge}>
            <Trophy size={32} color="#e11d48" />
          </View>

          <AppText type="bold" style={styles.scoreHeader}>GLORY!</AppText>
          <AppText style={styles.scoreSubHeader}>STAGE 0{stageNumber || 1} COMPLETED</AppText>

          <View style={styles.scoreCard}>
            <View style={styles.scoreRow}>
              <AppText style={styles.scoreLabelText}>BASE SCORE</AppText>
              <AppText type="bold" style={styles.scoreValueText}>{integerBaseScore} / {maxPossibleScore}</AppText>
            </View>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreRow}>
              <AppText style={styles.scoreLabelText}>SPEED BONUS</AppText>
              <AppText type="bold" style={styles.scoreValueText}>+{displayBonus}</AppText>
            </View>
          </View>

          <View style={styles.scoreActions}>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRestart} activeOpacity={0.85}>
              <RotateCcw size={18} color="#352a48" style={{ marginRight: 8 }} />
              <AppText type="bold" style={styles.retryBtnText}>REPLAY</AppText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.proceedBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <AppText type="bold" style={styles.proceedBtnText}>NEXT QUIZ</AppText>
              <ArrowRight size={18} color="#ffffff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;

  let parsedOptions = [];
  try {
    if (Array.isArray(currentQuestion.options)) {
      parsedOptions = currentQuestion.options;
    } else if (typeof currentQuestion.options === 'string') {
      parsedOptions = JSON.parse(currentQuestion.options);
    }
  } catch (err) {
    console.error('Failed to parse question options:', err);
    parsedOptions = [];
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.innerContainer, { transform: [{ translateY: slideAnim }] }]}>
        
        {/* Top Bar Header */}
        <View style={styles.headerRow}>
          <View style={styles.stageTag}>
            <Sparkles size={12} color="#e11d48" />
            <AppText type="bold" style={styles.stageTagText}>STAGE 0{stageNumber || 1}</AppText>
          </View>
          <AppText type="bold" style={styles.counterText}>
            {currentIndex + 1} <AppText style={styles.counterTotal}>/ {questions.length}</AppText>
          </AppText>
        </View>

        {/* Clean Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>

        {/* Main Quote Card */}
        <View style={styles.quoteCard}>
          <AppText style={styles.quoteText}>{currentQuestion?.question || currentQuestion?.quote}</AppText>
        </View>

        {/* Options Stack */}
        <ScrollView contentContainerStyle={styles.optionsList} showsVerticalScrollIndicator={false}>
          {parsedOptions.map((opt, index) => {
            const isSelected = selectedOption === opt;
            const cleanOpt = opt.replace(/^[A-D]\)\s*/, '').trim().toLowerCase();
            const targetAnswer = currentQuestion?.answer || currentQuestion?.author || '';
            const cleanTarget = targetAnswer.replace(/^[A-D]\)\s*/, '').trim().toLowerCase();
            const isCorrectAnswer = cleanOpt === cleanTarget;

            let optionStyle = styles.optionCard;
            let textStyle = styles.optionText;

            if (isAnswered) {
              if (isCorrectAnswer) {
                optionStyle = [styles.optionCard, styles.correctCard];
                textStyle = [styles.optionText, styles.correctText];
              } else if (isSelected && !isCorrectAnswer) {
                optionStyle = [styles.optionCard, styles.incorrectCard];
                textStyle = [styles.optionText, styles.incorrectText];
              }
            } else if (isSelected) {
              optionStyle = [styles.optionCard, styles.selectedCard];
              textStyle = [styles.optionText, styles.selectedText];
            }

            return (
              <TouchableOpacity
                key={index}
                style={optionStyle}
                onPress={() => handleSelect(opt)}
                activeOpacity={0.85}
                disabled={isAnswered}
              >
                <View style={styles.optionContent}>
                  <AppText type="bold" style={textStyle}>{opt}</AppText>
                  {isAnswered && isCorrectAnswer && <CheckCircle2 size={22} color="#16a34a" />}
                  {isAnswered && isSelected && !isCorrectAnswer && <XCircle size={22} color="#dc2626" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ffffff' 
  },
  innerContainer: { 
    flex: 1, 
    padding: 20, 
    paddingBottom: 24 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: '#ffffff' 
  },
  emptyBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff1f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecdd3'
  },
  emptyTitle: { 
    fontSize: 22, 
    color: '#352a48', 
    marginBottom: 8,
    letterSpacing: 1 
  },
  emptyText: { 
    fontSize: 14, 
    color: '#524b60', 
    textAlign: 'center' 
  },
  headerRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  stageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fecdd3',
    gap: 6
  },
  stageTagText: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#e11d48',
    lineHeight: 14
  },
  counterText: {
    fontSize: 14,
    color: '#352a48',
    letterSpacing: 1
  },
  counterTotal: {
    color: '#8d859e',
    fontSize: 13
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#f1f0f5',
    borderRadius: 3,
    marginBottom: 24,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#e11d48',
    borderRadius: 3
  },
  quoteCard: { 
    backgroundColor: '#fcfcfd', 
    borderWidth: 2, 
    borderColor: '#352a48', 
    borderRadius: 16, 
    padding: 24, 
    marginBottom: 24, 
    shadowColor: '#352a48', 
    shadowOffset: { width: 4, height: 4 }, 
    shadowOpacity: 1, 
    shadowRadius: 0, 
    elevation: 3
  },
  quoteLabel: { 
    fontSize: 10, 
    letterSpacing: 3, 
    color: '#e11d48', 
    marginBottom: 12 
  },
  quoteText: { 
    fontSize: 18, 
    color: '#352a48', 
    lineHeight: 28,
    fontWeight: '600'
  },
  optionsList: { 
    gap: 12, 
    paddingBottom: 20 
  },
  optionCard: { 
    backgroundColor: '#fcfcfd', 
    borderWidth: 2, 
    borderColor: '#352a48', 
    borderRadius: 12, 
    padding: 18,
    shadowColor: '#352a48',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%'
  },
  selectedCard: { 
    backgroundColor: '#352a48' 
  },
  correctCard: { 
    backgroundColor: '#f0fdf4', 
    borderColor: '#16a34a' 
  },
  incorrectCard: { 
    backgroundColor: '#fef2f2', 
    borderColor: '#dc2626' 
  },
  optionText: { 
    fontSize: 16, 
    color: '#352a48',
    flex: 1,
    marginRight: 10
  },
  selectedText: { 
    color: '#ffffff',
    fontWeight: 'bold'
  },
  correctText: { 
    color: '#16a34a' 
  },
  incorrectText: { 
    color: '#dc2626' 
  },
  scoreContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff'
  },
  trophyBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff1f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#fecdd3'
  },
  scoreHeader: {
    fontSize: 26,
    color: '#352a48',
    letterSpacing: -0.5,
    marginBottom: 4
  },
  scoreSubHeader: {
    fontSize: 12,
    letterSpacing: 2,
    color: '#524b60',
    marginBottom: 28
  },
  scoreCard: {
    width: '100%',
    backgroundColor: '#fcfcfd',
    borderWidth: 2,
    borderColor: '#352a48',
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    shadowColor: '#352a48',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  scoreDivider: {
    height: 2,
    backgroundColor: '#f1f0f5',
    marginVertical: 8
  },
  scoreLabelText: {
    fontSize: 13,
    color: '#524b60',
    letterSpacing: 1
  },
  scoreValueText: {
    fontSize: 18,
    color: '#352a48'
  },
  scoreActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 12
  },
  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 52,
    backgroundColor: '#f4f3f7',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#352a48',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#352a48',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2
  },
  retryBtnText: {
    fontSize: 13,
    color: '#352a48',
    letterSpacing: 1
  },
  proceedBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 52,
    backgroundColor: '#352a48',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#352a48',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#352a48',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2
  },
  proceedBtnText: {
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 1
  }
});