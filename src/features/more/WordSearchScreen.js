import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions, Alert, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../config/supabaseClient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppText } from '../../components/AppText';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Audio } from 'expo-audio';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function WordSearchScreen({ route, navigation }) {
  const stageNumber = route?.params?.stageNumber ?? 1;
  const stageId = route?.params?.stageId ?? null;

  const [loading, setLoading] = useState(true);
  const [attemptId, setAttemptId] = useState(null);
  const [grid, setGrid] = useState([]);
  const [wordsToFind, setWordsToFind] = useState([]);
  const [foundCellCoordinates, setFoundCellCoordinates] = useState([]);
  const [activeSelection, setActiveSelection] = useState([]);
  const [totalScore, setTotalScore] = useState(0);
  const [isStageCompleteModalVisible, setIsStageCompleteModalVisible] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);

  const gridRef = useRef(null);
  const gridLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const appState = useRef(AppState.currentState);
  const backgroundMusic = useRef(null);

  const storageKey = `active_word_search_stage_${stageNumber}`;

  // Background Music Setup & Playback Handling
  useEffect(() => {
    let isMounted = true;
    let cancelled = false;

    async function setupAndPlayMusic() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          require('../../../assets/audio/gameS3.mp3'),
          { isLooping: true, volume: 0.1 }
        );

        if (cancelled) {
          await sound.unloadAsync();
          return;
        }

        if (isMounted) {
          backgroundMusic.current = sound;
          await sound.playAsync();
          setIsMusicPlaying(true);
        } else {
          await sound.unloadAsync();
        }
      } catch (error) {
        console.warn('Failed to load or play background music:', error);
      }
    }

    setupAndPlayMusic();

    return () => {
      isMounted = false;
      cancelled = true;
      if (backgroundMusic.current) {
        backgroundMusic.current.unloadAsync();
        backgroundMusic.current = null;
      }
    };
  }, []);

  const toggleBackgroundMusic = async () => {
    if (!backgroundMusic.current) return;
    try {
      Haptics.selectionAsync();
      if (isMusicPlaying) {
        await backgroundMusic.current.pauseAsync();
        setIsMusicPlaying(false);
      } else {
        await backgroundMusic.current.playAsync();
        setIsMusicPlaying(true);
      }
    } catch (err) {
      console.warn('Failed to toggle background music:', err);
    }
  };

  // Fetch puzzle data on mount — now via the server-verified attempt RPC
  // instead of a direct table select, so the score/word-found tracking
  // this stage produces can't be tampered with client-side.
  useEffect(() => {
    fetchStageData();
  }, [stageNumber, stageId]);

  // Handle AppState changes (saving state when user leaves/minimizes app)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        if (grid.length > 0 && !isStageCompleteModalVisible) {
          try {
            const activeState = {
              foundCellCoordinates,
              wordsToFind,
              moveCount,
              signature: JSON.stringify(wordsToFind.map(w => w.word)) + JSON.stringify(grid)
            };
            await AsyncStorage.setItem(storageKey, JSON.stringify(activeState));
          } catch (err) {
            console.error('Failed to save state on background:', err);
          }
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [foundCellCoordinates, wordsToFind, moveCount, grid, isStageCompleteModalVisible]);

  const fetchStageData = async () => {
    try {
      setLoading(true);

      let puzzleQuery = supabase.from('word_search_puzzles').select('id, stage_number, title');
      puzzleQuery = stageId ? puzzleQuery.eq('id', stageId) : puzzleQuery.eq('stage_number', stageNumber);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Network request timed out')), 8000)
      );

      const { data: puzzleMeta, error: metaError } = await Promise.race([puzzleQuery.maybeSingle(), timeoutPromise]);
      if (metaError) throw metaError;

      if (!puzzleMeta) {
        Alert.alert('Error', 'Puzzle not found.');
        navigation?.goBack?.();
        return;
      }

      const { data, error } = await supabase.rpc('start_word_search_attempt', { p_puzzle_id: puzzleMeta.id });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Could not start this puzzle.');

      await processLoadedStage(data[0]);
    } catch (error) {
      console.warn('Supabase fetch failed or timed out:', error.message);
      // Fallback to local active session if offline
      await loadFromActiveSessionOrExit();
    } finally {
      setLoading(false);
    }
  };

  const processLoadedStage = async (row) => {
    const serverSignature = JSON.stringify(row.words) + JSON.stringify(row.grid);
    const formattedWords = (row.words || []).map(w => ({
      word: (w.word || w).toUpperCase(),
      found: false
    }));

    setAttemptId(row.attempt_id);
    setGrid(row.grid || []);

    // Check if there is an active session saved for this exact puzzle layout
    try {
      const savedStateString = await AsyncStorage.getItem(storageKey);
      if (savedStateString) {
        const parsed = JSON.parse(savedStateString);
        if (parsed.signature === serverSignature && parsed.wordsToFind) {
          setFoundCellCoordinates(parsed.foundCellCoordinates || []);
          setWordsToFind(parsed.wordsToFind);
          setMoveCount(parsed.moveCount || 0);
          return;
        } else {
          await AsyncStorage.removeItem(storageKey);
        }
      }
    } catch (e) {
      console.error('Error reading active session:', e);
    }

    setFoundCellCoordinates([]);
    setWordsToFind(formattedWords);
    setMoveCount(0);
    setTotalScore(0);
  };

  const loadFromActiveSessionOrExit = async () => {
    try {
      const savedStateString = await AsyncStorage.getItem(storageKey);
      if (savedStateString) {
        const parsed = JSON.parse(savedStateString);
        if (parsed.wordsToFind) {
          setWordsToFind(parsed.wordsToFind || []);
          setFoundCellCoordinates(parsed.foundCellCoordinates || []);
          setMoveCount(parsed.moveCount || 0);
          return;
        }
      }
      Alert.alert('Connection Error', 'Unable to fetch puzzle data and no active session found.');
      navigation?.goBack?.();
    } catch (err) {
      navigation?.goBack?.();
    }
  };

  const measureGrid = () => {
    gridRef.current?.measure((fx, fy, width, height, px, py) => {
      gridLayoutRef.current = { x: px, y: py, width, height };
    });
  };

  const getCellFromTouch = (pageX, pageY) => {
    const { x, y, width, height } = gridLayoutRef.current;
    if (grid.length === 0 || width === 0 || height === 0) return null;

    const relX = pageX - x;
    const relY = pageY - y;

    const numRows = grid.length;
    const numCols = grid[0].length;

    const cellWidth = width / numCols;
    const cellHeight = height / numRows;

    const col = Math.floor(relX / cellWidth);
    const row = Math.floor(relY / cellHeight);

    if (row >= 0 && row < numRows && col >= 0 && col < numCols) {
      return { row, col, char: grid[row][col] };
    }
    return null;
  };

  const handleTouchMove = (event) => {
    const touch = event.nativeEvent;
    const cell = getCellFromTouch(touch.pageX, touch.pageY);
    if (!cell) return;

    setActiveSelection(prevSelection => {
      if (prevSelection.length === 0) {
        Haptics.selectionAsync();
        return [cell];
      }

      const lastCell = prevSelection[prevSelection.length - 1];
      if (lastCell.row === cell.row && lastCell.col === cell.col) {
        return prevSelection;
      }

      if (prevSelection.length > 1) {
        const secondLastCell = prevSelection[prevSelection.length - 2];
        if (secondLastCell.row === cell.row && secondLastCell.col === cell.col) {
          Haptics.selectionAsync();
          return prevSelection.slice(0, -1);
        }
      }

      if (prevSelection.some(c => c.row === cell.row && c.col === cell.col)) {
        return prevSelection;
      }

      const firstCell = prevSelection[0];
      const targetR = cell.row;
      const targetC = cell.col;

      const rDiff = Math.abs(targetR - firstCell.row);
      const cDiff = Math.abs(targetC - firstCell.col);

      if (rDiff === cDiff || rDiff === 0 || cDiff === 0) {
        Haptics.selectionAsync();
        const newSelection = [];
        const steps = Math.max(rDiff, cDiff);
        const actualRStep = rDiff === 0 ? 0 : (targetR > firstCell.row ? 1 : -1);
        const actualCStep = cDiff === 0 ? 0 : (targetC > firstCell.col ? 1 : -1);

        for (let i = 0; i <= steps; i++) {
          const r = firstCell.row + (i * actualRStep);
          const c = firstCell.col + (i * actualCStep);
          newSelection.push({ row: r, col: c, char: grid[r][c] });
        }
        return newSelection;
      }

      return prevSelection;
    });
  };

  const handleTouchEnd = () => {
    setActiveSelection(currentSelection => {
      if (currentSelection.length === 0) return currentSelection;

      const formedWord = currentSelection.map(c => c.char).join('');
      const reverseWord = [...currentSelection].reverse().map(c => c.char).join('');

      const matchedIndex = wordsToFind.findIndex(
        w => !w.found && (w.word === formedWord || w.word === reverseWord)
      );
      const isCorrectGuess = matchedIndex > -1;

      setMoveCount(prev => prev + 1);

      // Score/word-found tracking now goes through the server, which
      // validates the word is real and not already claimed, and owns the
      // move count used for the efficiency penalty — the client can no
      // longer just insert whatever score it wants.
      supabase.rpc('record_word_found', {
        p_attempt_id: attemptId,
        p_word: isCorrectGuess ? wordsToFind[matchedIndex].word : formedWord,
        p_is_correct_guess: isCorrectGuess,
      }).then(({ data, error }) => {
        if (error) {
          console.error('Error recording move:', error.message);
          return;
        }
        const accepted = data?.[0]?.accepted;
        if (!isCorrectGuess || !accepted) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        setWordsToFind(prevWords => {
          const updatedWords = [...prevWords];
          updatedWords[matchedIndex].found = true;

          if (updatedWords.every(w => w.found)) {
            finalizeStageScore();
          }
          return updatedWords;
        });

        setFoundCellCoordinates(prev => [...prev, ...currentSelection]);
        setTotalScore(prev => prev + 2);
      });

      if (!isCorrectGuess) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      return [];
    });
  };

  const finalizeStageScore = async () => {
    try {
      const { data, error } = await supabase.rpc('finish_word_search_attempt', { p_attempt_id: attemptId });
      if (error) throw error;
      setTotalScore(data?.[0]?.final_score ?? totalScore);
    } catch (err) {
      console.error('Failed to finalize word search attempt:', err.message);
    }

    try {
      await AsyncStorage.removeItem(storageKey);
    } catch (e) {
      console.error('Failed to clear active session:', e);
    }

    setIsStageCompleteModalVisible(true);
  };

  if (loading || grid.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#e11d48" />
        <AppText style={styles.loaderText}>Loading grid puzzle...</AppText>
      </View>
    );
  }

  const numCols = grid[0]?.length || 10;
  const availableWidth = SCREEN_WIDTH - 48;
  const dynamicCellSize = Math.floor(availableWidth / numCols);

  const currentActiveWordString = activeSelection.map(c => c.char).join('');

  return (
    <GestureHandlerRootView style={styles.rootWrapper}>
      <SafeAreaView style={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => { Haptics.selectionAsync(); navigation?.goBack?.(); }}>
            <Ionicons name="arrow-back" size={22} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <AppText style={styles.headerCategory}>STAGE {stageNumber}</AppText>
            <View style={styles.headerSubRow}>
              <AppText style={styles.scoreHeader}>Score: {totalScore}</AppText>
              <AppText style={styles.timerHeader}>🎯 Moves: {moveCount}</AppText>
            </View>
          </View>
          <View style={styles.headerRightActions}>
            <TouchableOpacity style={styles.iconButton} onPress={toggleBackgroundMusic}>
              <Ionicons name={isMusicPlaying ? "musical-notes" : "musical-notes-outline"} size={20} color={isMusicPlaying ? "#e11d48" : "#1E293B"} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => { setActiveSelection([]); }}>
              <Ionicons name="refresh" size={20} color="#1E293B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Screen Layout */}
        <View style={styles.contentContainer}>
          {/* 1. Puzzle Grid at the TOP */}
          <View 
            ref={gridRef}
            style={styles.gridContainer}
            onLayout={measureGrid}
            onStartShouldSetResponder={() => true}
            onStartShouldSetResponderCapture={() => true}
            onMoveShouldSetResponder={() => true}
            onMoveShouldSetResponderCapture={() => true}
            onResponderGrant={(e) => {
              measureGrid();
              const touch = e.nativeEvent;
              const cell = getCellFromTouch(touch.pageX, touch.pageY);
              if (cell) {
                Haptics.selectionAsync();
                setActiveSelection([cell]);
              }
            }}
            onResponderMove={handleTouchMove}
            onResponderRelease={handleTouchEnd}
            onResponderTerminate={handleTouchEnd}
          >
            {grid.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} pointerEvents="none" style={styles.gridRow}>
                {row.map((char, colIndex) => {
                  const isSelectedActive = activeSelection.some(c => c.row === rowIndex && c.col === colIndex);
                  const isAlreadyFound = foundCellCoordinates.some(c => c.row === rowIndex && c.col === colIndex);

                  return (
                    <View
                      key={`cell-${rowIndex}-${colIndex}`}
                      style={[
                        styles.gridCell,
                        { width: dynamicCellSize, height: dynamicCellSize },
                        isSelectedActive && styles.selectedActiveCell,
                        isAlreadyFound && styles.foundGridCell
                      ]}
                    >
                      <AppText style={[
                        styles.gridCellText,
                        { fontSize: Math.max(9, dynamicCellSize * 0.42) },
                        isSelectedActive && styles.selectedActiveCellText,
                        isAlreadyFound && styles.foundGridCellText
                      ]}>
                        {char}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>

          {/* 2. Words to Find List at the BOTTOM */}
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.wordListCard}>
              <View style={styles.wordListAccent} />
              <AppText style={styles.wordListTitle}>WORDS TO FIND ({wordsToFind.filter(w => w.found).length}/{wordsToFind.length})</AppText>
              {currentActiveWordString.length > 0 && (
                <View style={styles.activeBuildingContainer}>
                  <AppText style={styles.activeBuildingLabel}>Selecting: </AppText>
                  <AppText style={styles.activeBuildingText}>{currentActiveWordString}</AppText>
                </View>
              )}
              <View style={styles.wordChipsContainer}>
                {wordsToFind.map((item, index) => (
                  <View key={index} style={[styles.wordChip, item.found && styles.foundWordChip]}>
                    <AppText style={[styles.wordChipText, item.found && styles.foundWordChipText]}>
                      {item.word}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Stage Completion Modal Overlay */}
        {isStageCompleteModalVisible && (
          <View style={styles.stageCompleteOverlay}>
            <View style={styles.stageCompleteCard}>
              <View style={styles.stageCompleteIconContainer}>
                <Ionicons name="trophy" size={42} color="#e11d48" />
              </View>
              <AppText style={styles.stageCompleteTitle}>Stage Completed!</AppText>
              <AppText style={styles.stageCompleteSubtitle}>
                Glory! You successfully found all words in Stage {stageNumber} with {moveCount} total moves.
              </AppText>
              
              <View style={styles.stageCompleteScoreBadge}>
                <AppText style={styles.stageCompleteScoreLabel}>Final Efficiency Score</AppText>
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  rootWrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: '#fdf7f5' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fdf7f5' },
  loaderText: { marginTop: 12, fontSize: 13, color: '#e11d48', fontWeight: '700', letterSpacing: 1.5 },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#f6e4c8' },
  headerRightActions: { flexDirection: 'row', gap: 8 },
  headerTitleContainer: { alignItems: 'center' },
  headerCategory: { fontSize: 13, fontWeight: '700', color: '#1e293b', letterSpacing: 2.5, marginBottom: 2 },
  headerSubRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  scoreHeader: { fontSize: 12, fontWeight: '700', color: '#e11d48', letterSpacing: 0.5 },
  timerHeader: { fontSize: 12, fontWeight: '700', color: '#64748b', letterSpacing: 0.5 },
  iconButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  
  contentContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 16, alignItems: 'center' },
  scrollContent: { width: '100%', alignItems: 'center', paddingBottom: 20 },

  wordListCard: { width: '100%', backgroundColor: '#fefaf6', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#f6e4c8', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  wordListAccent: { width: 24, height: 3, backgroundColor: '#e11d48', borderRadius: 2, marginBottom: 10 },
  wordListTitle: { fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 1.2, marginBottom: 8 },
  activeBuildingContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef6e3', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#f7dfa0' },
  activeBuildingLabel: { fontSize: 12, fontWeight: '600', color: '#b8790f' },
  activeBuildingText: { fontSize: 14, fontWeight: '800', color: '#b8790f', letterSpacing: 1 },
  wordChipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  wordChip: { backgroundColor: '#fdf5ee', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#f0ddc8' },
  foundWordChip: { backgroundColor: '#e3f9ef', borderColor: '#a7ecce' },
  wordChipText: { fontSize: 12, fontWeight: '700', color: '#334155', letterSpacing: 0.5 },
  foundWordChipText: { color: '#0f9d6c', textDecorationLine: 'line-through' },

  gridContainer: { backgroundColor: '#fef6f7', borderRadius: 16, padding: 8, marginBottom: 12, borderWidth: 1, borderColor: '#fbd8dc', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2 },
  gridRow: { flexDirection: 'row' },
  gridCell: { margin: 1, borderRadius: 6, backgroundColor: '#fffbf9', borderWidth: 1, borderColor: '#fbe4e7', alignItems: 'center', justifyContent: 'center' },
  
  selectedActiveCell: { backgroundColor: '#e8a930', borderColor: '#b8790f' },
  selectedActiveCellText: { color: '#FFFFFF' },
  
  foundGridCell: { backgroundColor: '#d9f5e6', borderColor: '#8fe0bb' },
  foundGridCellText: { color: '#0f9d6c', fontWeight: '800' },

  gridCellText: { fontWeight: '700', color: '#1e293b' },

  stageCompleteOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 100 },
  stageCompleteCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, width: '100%', maxWidth: 340, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  stageCompleteIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff1f2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  stageCompleteTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B', marginBottom: 6, textAlign: 'center' },
  stageCompleteSubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  stageCompleteScoreBadge: { backgroundColor: '#eafaf3', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center', width: '100%', marginBottom: 24, borderWidth: 1, borderColor: '#bdead6' },
  stageCompleteScoreLabel: { fontSize: 12, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  stageCompleteScoreValue: { fontSize: 24, fontWeight: '800', color: '#e11d48' },
  stageCompleteButton: { flexDirection: 'row', backgroundColor: '#e11d48', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, alignItems: 'center', justifyContent: 'center', width: '100%', shadowColor: '#e11d48', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  stageCompleteButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
