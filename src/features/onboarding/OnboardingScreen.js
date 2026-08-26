import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Pressable, StatusBar, Image, Easing, Alert, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, UserPlus } from 'lucide-react-native';
import { AppText } from '../../components/AppText';
import MachairaLogo from '../../../assets/images/MLogo.png';
import { executeGoogleSignIn } from './googleAuth';
import { executeAppleSignIn } from './appleAuth';
import GoogleIcon from '../../../assets/images/google.png';
import AppleIcon from '../../../assets/images/apple.png';


const ONBOARDING_STEPS = [
  {
    title: 'Sharper Than\nAny Two-Edged Sword',
    subtitle: 'Dive deep into the scriptures with an ultra-modern study experience designed for your daily rhythm.',
  },
  {
    title: 'Capture Insights\nIn Real-Time',
    subtitle: 'Highlight verses instantly, add personal journal reflections, and keep your history safely stored offline.',
  },
  {
    title: 'Take The Word\nWherever You Go',
    subtitle: 'Switch seamlessly between translations and track your spiritual growth streaks over time.',
  },
  {
    title: 'Your Spiritual\nArchive Awaits',
    subtitle: 'Secure your notes and synchronize your study history instantly with your preferred account.',
  },
];

export const OnboardingScreen = ({ onExploreAsGuest, onAuthSuccess, isReturningFromGuest }) => {
  const [showSplash, setShowSplash] = useState(!isReturningFromGuest);
  const [currentStep, setCurrentStep] = useState(isReturningFromGuest ? ONBOARDING_STEPS.length - 1 : 0);
  const [authLoading, setAuthLoading] = useState(null);

  const { width } = useWindowDimensions();

  const splashOpacity = useRef(new Animated.Value(isReturningFromGuest ? 0 : 1)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const contentFade = useRef(new Animated.Value(isReturningFromGuest ? 1 : 0)).current;

  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  useEffect(() => {
    if (isReturningFromGuest) return;

    contentFade.setValue(0);

    const breathingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, { toValue: 1.05, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 0.92, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    breathingAnimation.start();

    const splashTimer = setTimeout(() => {
      Animated.timing(splashOpacity, { toValue: 0, duration: 400, easing: Easing.ease, useNativeDriver: true }).start(() => {
        breathingAnimation.stop();
        setShowSplash(false);
        Animated.timing(contentFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
    }, 2200);

    return () => {
      clearTimeout(splashTimer);
      breathingAnimation.stop();
    };
  }, [isReturningFromGuest]);

  const handleNextStep = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      Animated.timing(contentFade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
        setCurrentStep((prev) => prev + 1);
        Animated.timing(contentFade, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      });
    }
  };

  const handleGuestPress = () => {
    if (authLoading) return;
    try {
      onExploreAsGuest?.();
    } catch (err) {
      Alert.alert('Guest Mode Error', err.message || 'Unable to enter guest mode');
    }
  };

  const handleGoogleAuthPress = async () => {
    if (authLoading) return;
    setAuthLoading('google');

    try {
      const result = await executeGoogleSignIn();
      if (result?.success) {
        onAuthSuccess?.(result.data);
      } else if (result?.error && result.error !== 'Sign-in window dismissed by user.') {
        Alert.alert('Authentication Failure', result.error);
      }
    } catch (err) {
      Alert.alert('Google Auth Error', err.message || 'Google sign-in failed');
    } finally {
      setAuthLoading(null);
    }
  };

  const handleAppleAuthPress = async () => {
    if (authLoading) return;
    setAuthLoading('apple');

    try {
      const result = await executeAppleSignIn();
      if (result?.success) {
        onAuthSuccess?.(result.data);
      } else if (result?.error && result.error !== 'Sign-in window dismissed by user.') {
        Alert.alert('Authentication Failure', result.error);
      }
    } catch (err) {
      Alert.alert('Apple Auth Error', err.message || 'Apple sign-in failed');
    } finally {
      setAuthLoading(null);
    }
  };

  return (
    <View style={styles.masterContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {showSplash ? (
        <Animated.View style={[styles.splashAbsolutePane, { opacity: splashOpacity }]}>
          <Animated.View style={{ transform: [{ scale: logoScale }] }}>
            <Image source={MachairaLogo} style={styles.importedLogoAsset} resizeMode="contain" />
          </Animated.View>
        </Animated.View>
      ) : (
        <SafeAreaView style={styles.safeWorkspaceContainer}>
          <View style={styles.skipRowHeader}>
            {!isLastStep && (
              <Pressable onPress={handleGuestPress} style={styles.skipButtonPress} hitSlop={12}>
                <AppText type="semiBold" style={styles.skipButtonText}>Skip</AppText>
              </Pressable>
            )}
          </View>

          <Animated.View style={[styles.contentDynamicBody, { opacity: contentFade }]}>
            <View style={styles.textGroupingArea}>
              <AppText type="black" style={styles.slideMainHeading}>
                {ONBOARDING_STEPS[currentStep]?.title}
              </AppText>
              <AppText type="regular" style={[styles.slideParagraphSub, { maxWidth: width * 0.85 }]}>
                {ONBOARDING_STEPS[currentStep]?.subtitle}
              </AppText>
            </View>

            {isLastStep && (
              <View style={styles.authActionBlock}>
                <Pressable
                  style={[styles.providerAuthBtn, styles.googleLightBtn, authLoading && styles.disabledBtn]}
                  onPress={handleGoogleAuthPress}
                  disabled={!!authLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Continue with Google"
                  accessibilityState={{ disabled: !!authLoading, busy: authLoading === 'google' }}
                >
                  <Image source={GoogleIcon} style={styles.brandLogoIcon} resizeMode="contain" />
                  {authLoading === 'google' ? (
                    <>
                      <ActivityIndicator size="small" color="#09090b" style={styles.spinnerSpace} />
                      <AppText type="bold" style={styles.googleButtonText}>Connecting...</AppText>
                    </>
                  ) : (
                    <AppText type="bold" style={styles.googleButtonText}>Continue with Google</AppText>
                  )}
                </Pressable>

                {Platform.OS === 'ios' && (
                  <Pressable
                    style={[styles.providerAuthBtn, styles.appleDarkBtn, authLoading && styles.disabledBtn]}
                    onPress={handleAppleAuthPress}
                    disabled={!!authLoading}
                    accessibilityRole="button"
                    accessibilityLabel="Continue with Apple"
                    accessibilityState={{ disabled: !!authLoading, busy: authLoading === 'apple' }}
                  >
                    <Image source={AppleIcon} style={styles.brandLogoIcon} resizeMode="contain" />
                    {authLoading === 'apple' ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <AppText type="bold" style={styles.appleButtonText}>Continue with Apple</AppText>
                    )}
                  </Pressable>
                )}

                <View style={styles.horizontalDividerRow}>
                  <View style={styles.dividerLine} />
                  <AppText type="regular" style={styles.dividerText}>or</AppText>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.providerAuthBtn,
                    styles.guestModernButton,
                    pressed && styles.buttonPressedEffect,
                    authLoading && styles.disabledBtn,
                  ]}
                  onPress={handleGuestPress}
                  disabled={!!authLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Explore as Guest First"
                  accessibilityState={{ disabled: !!authLoading }}
                >
                  <UserPlus color="#ef4444" size={19} strokeWidth={2.5} style={styles.iconMarginSpace} />
                  <AppText type="bold" style={styles.guestButtonText}>Explore as Guest First</AppText>
                </Pressable>
              </View>
            )}
          </Animated.View>

          <View style={styles.footerControlRow}>
            <View
              style={styles.paginationDotRow}
              accessibilityRole="tablist"
              accessibilityLabel={`Step ${currentStep + 1} of ${ONBOARDING_STEPS.length}`}
            >
              {ONBOARDING_STEPS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === currentStep ? styles.paginationDotActive : styles.paginationDotInactive,
                  ]}
                  accessibilityRole="tab"
                  accessibilityLabel={`Step ${index + 1} of ${ONBOARDING_STEPS.length}`}
                  accessibilityState={{ selected: index === currentStep }}
                />
              ))}
            </View>

            {!isLastStep && (
              <Pressable
                onPress={handleNextStep}
                style={styles.circleActionButton}
                accessibilityRole="button"
                accessibilityLabel="Next"
              >
                <ChevronRight color="#ffffff" size={24} strokeWidth={2.5} />
              </Pressable>
            )}
          </View>
        </SafeAreaView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  masterContainer: { flex: 1, backgroundColor: '#ffffff' },
  splashAbsolutePane: { ...StyleSheet.absoluteFillObject, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  importedLogoAsset: { width: 400, height: 400 },
  safeWorkspaceContainer: { flex: 1, paddingHorizontal: 32 },
  skipRowHeader: { height: 50, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  skipButtonPress: { paddingVertical: 6, paddingHorizontal: 12 },
  skipButtonText: { fontSize: 14, color: '#a1a1aa' },
  contentDynamicBody: { flex: 1, justifyContent: 'center' },
  textGroupingArea: { marginBottom: 4 },
  slideMainHeading: { fontSize: 36, color: '#09090b', lineHeight: 44, letterSpacing: -1.5, marginBottom: 12 },
  slideParagraphSub: { fontSize: 15, color: '#352a48', lineHeight: 24 },
  authActionBlock: { marginTop: 16, width: '100%', gap: 12 },
  providerAuthBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, width: '100%', height: 54 },
  googleLightBtn: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e4e4e7', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  appleDarkBtn: { backgroundColor: '#09090b' },
  guestModernButton: { backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: 'rgba(239, 68, 68, 0.25)' },
  brandLogoIcon: { width: 18, height: 18, marginRight: 12 },
  iconMarginSpace: { marginRight: 12 },
  spinnerSpace: { marginRight: 12 },
  googleButtonText: { color: '#27272a', fontSize: 15 },
  appleButtonText: { color: '#ffffff', fontSize: 15 },
  guestButtonText: { color: '#ef4444', fontSize: 15 },
  horizontalDividerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 2, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#f4f4f5' },
  dividerText: { fontSize: 13, color: '#a1a1aa' },
  disabledBtn: { opacity: 0.5 },
  buttonPressedEffect: { opacity: 0.75, backgroundColor: '#fafafa' },
  footerControlRow: { height: 80, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 },
  paginationDotRow: { flexDirection: 'row', gap: 8 },
  paginationDot: { height: 8, borderRadius: 4 },
  paginationDotActive: { width: 24, backgroundColor: '#ef4444' },
  paginationDotInactive: { width: 8, backgroundColor: 'rgba(53, 42, 72, 0.15)' },
  circleActionButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#352a48', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#352a48', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6 },
});
