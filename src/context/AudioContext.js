import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const AudioContext = createContext(null);

export const AudioProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  // Drives whether the mini player is visible: true once something has been
  // loaded, false only once the user explicitly stops playback entirely.
  const [isMiniPlayerVisible, setIsMiniPlayerVisible] = useState(false);
  // Tracks the currently focused top-level route name, fed by
  // NavigationContainer's onReady/onStateChange in App.jsx. MiniAudioPlayer
  // lives outside any Navigator (it's a sibling of the root Stack.Navigator,
  // both inside NavigationContainer), so it can't use useNavigationState —
  // that hook requires an actual Navigator ancestor, not just
  // NavigationContainer. This is the workaround: track focus centrally and
  // read it from context instead.
  const [focusedRouteName, setFocusedRouteName] = useState(null);

  // Live player instance, exposed via state (not just a ref) so consumers
  // that read `player` are guaranteed a re-render when it changes — a ref
  // alone doesn't trigger renders, which risks a consumer holding a stale/
  // released instance if it doesn't also happen to depend on other state
  // that changes at the same time.
  const [player, setPlayer] = useState(null);
  const playerRef = useRef(null);
  const statusListenerRef = useRef(null);
  const isMountedRef = useRef(true);

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
        // Player may already be released (e.g. double-invocation from a
        // fast track switch) — safe to ignore.
        console.error('Player release error (likely already released):', releaseError);
      }
      playerRef.current = null;
    }
    setPlayer(null);
  };

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

      // Release the previous player (and its listener) before creating the
      // next one — avoids leaking listeners/instances on track switches.
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
      // isPlaying/isLoading are driven by the status listener above, not
      // set optimistically here, so they reflect what actually happened.
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

  // Fully stops playback and tears down the player — used when the user
  // explicitly dismisses the mini player, not when they navigate away from
  // the full screen (that case should keep playing).
  const stopAudio = useCallback(() => {
    releaseCurrentPlayer();
    setCurrentTrack(null);
    setIsPlaying(false);
    setIsLoading(false);
    setError(null);
    setCurrentTime(0);
    setDuration(0);
    setIsMiniPlayerVisible(false);
  }, []);

  const value = {
    // Read-only from the consumer's perspective — control it via the
    // methods below, not by calling player methods directly (keeps status
    // state and actual playback state from drifting apart).
    player,
    currentTrack,
    isPlaying,
    isLoading,
    error,
    currentTime,
    duration,
    isMiniPlayerVisible,
    focusedRouteName,
    setFocusedRouteName,
    playAudio,
    pauseAudio,
    resumeAudio,
    togglePlayPause,
    seekTo,
    skipBy,
    stopAudio,
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
