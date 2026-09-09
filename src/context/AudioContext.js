import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { supabase } from '../config/supabaseClient';

const AudioContext = createContext(null);

const STREAK_LISTEN_SECONDS_THRESHOLD = 30;
const STREAK_LISTEN_PERCENT_THRESHOLD = 0.8;

export const AudioProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMiniPlayerVisible, setIsMiniPlayerVisible] = useState(false);
  const [focusedRouteName, setFocusedRouteName] = useState(null);

  const [player, setPlayer] = useState(null);
  const playerRef = useRef(null);
  const statusListenerRef = useRef(null);
  const isMountedRef = useRef(true);
  const hasCountedAudioStreakRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      releaseCurrentPlayer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const releaseCurrentPlayer = () => {
    if (statusListenerRef.current) {
      statusListenerRef.current.remove();
      statusListenerRef.current = null;
    }
    if (playerRef.current) {
      try {
        playerRef.current.release();
      } catch (releaseError) {
        console.error('Player release error (likely already released):', releaseError);
      }
      playerRef.current = null;
    }
    setPlayer(null);
  };

  const recordGlobalAudioStreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('last_devotional_date')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profileData?.last_devotional_date === today) {
        return;
      }

      await supabase.rpc('update_user_streak', { user_id: user.id });
    } catch (streakErr) {
      console.error('Error updating global audio streak:', streakErr);
    }
  };

  useEffect(() => {
    if (hasCountedAudioStreakRef.current || !currentTrack) return;

    const metThresholdBySeconds = currentTime >= STREAK_LISTEN_SECONDS_THRESHOLD;
    const metThresholdByPercent = duration > 0 && (currentTime / duration) >= STREAK_LISTEN_PERCENT_THRESHOLD;

    if (metThresholdBySeconds || metThresholdByPercent) {
      hasCountedAudioStreakRef.current = true;
      recordGlobalAudioStreak();
    }
  }, [currentTime, duration, currentTrack]);

  const attachStatusListener = (player) => {
    const listener = player.addListener('playbackStatusUpdate', (status) => {
      if (!isMountedRef.current) return;

      if (status.error) {
        console.error('Playback error:', status.error);
        setError('Playback was interrupted. Please try again.');
        setIsLoading(false);
        return;
      }

      if (status.isLoaded) {
        setIsLoading(false);
        setIsPlaying(status.playing);
        setCurrentTime(status.currentTime ?? 0);
        setDuration(status.duration ?? 0);

        if (status.didJustFinish) {
          setIsPlaying(false);
          setCurrentTime(0);
        }
      }
    });
    statusListenerRef.current = listener;
  };

  const playAudio = useCallback(async (episode, audioUrl) => {
    if (!audioUrl) {
      console.error('playAudio called without an audioUrl.');
      setError('No audio available for this episode.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      hasCountedAudioStreakRef.current = false;
      releaseCurrentPlayer();

      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        allowsRecording: false,
        interruptionMode: 'doNotMix',
      });

      const newPlayer = createAudioPlayer({ uri: audioUrl });
      playerRef.current = newPlayer;
      setPlayer(newPlayer);
      attachStatusListener(newPlayer);

      setCurrentTrack(episode);
      setCurrentTime(0);
      setDuration(0);
      setIsMiniPlayerVisible(true);

      newPlayer.play();
    } catch (playError) {
      console.error('Error playing audio:', playError);
      setError('Unable to load this audio. Check your connection and try again.');
      setIsLoading(false);
    }
  }, []);

  const pauseAudio = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause();
    }
  }, []);

  const resumeAudio = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.play();
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      pauseAudio();
    } else {
      resumeAudio();
    }
  }, [isPlaying, pauseAudio, resumeAudio]);

  const seekTo = useCallback((seconds) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds);
    }
  }, []);

  const skipBy = useCallback((deltaSeconds) => {
    if (!playerRef.current) return;
    const target = Math.max(currentTime + deltaSeconds, 0);
    playerRef.current.seekTo(duration ? Math.min(target, duration) : target);
  }, [currentTime, duration]);

  const stopAudio = useCallback(() => {
    releaseCurrentPlayer();
    setCurrentTrack(null);
    setIsPlaying(false);
    setIsLoading(false);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    setIsMiniPlayerVisible(false);
    hasCountedAudioStreakRef.current = false;
  }, []);

  const value = {
    player, currentTrack, isPlaying, isLoading, error, currentTime, duration,
    isMiniPlayerVisible, focusedRouteName, setFocusedRouteName,
    playAudio, pauseAudio, resumeAudio, togglePlayPause, seekTo, skipBy, stopAudio,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};