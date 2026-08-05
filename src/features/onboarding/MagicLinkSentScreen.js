import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  Easing,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react-native';
import { AppText } from '../../components/AppText';
import { resendMagicLink } from './Emailauth';

// ---------------------------------------------------------------------------
// Resend cooldown in seconds — prevents spam tapping
// ---------------------------------------------------------------------------
const RESEND_COOLDOWN = 30;

// ---------------------------------------------------------------------------
// MagicLinkSentScreen
//
// Props:
//   email         — the address the link was sent to
//   onBack()      — goes back to EmailAuthScreen so user can change email
//   onResendSuccess() — optional, called after a successful resend (e.g. show toast)
// ---------------------------------------------------------------------------
export const MagicLinkSentScreen = ({ email, onBack, onResendSuccess }) => {
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0); // seconds remaining

  // Spin animation for the resend icon
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinRef = useRef(null);

  // Entrance scale for the check icon
  const checkScale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.spring(checkScale, {
      toValue: 1,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, []);

  // Cooldown tick
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const startSpin = () => {
    spinAnim.setValue(0);
    spinRef.current = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinRef.current.start();
  };

  const stopSpin = () => {
    spinRef.current?.stop();
    spinAnim.setValue(0);
  };

  const handleResend = async () => {
    if (resendLoading || cooldown > 0) return;

    setResendLoading(true);
    setResendError(null);
    setResendSuccess(false);
    startSpin();

    try {
      const result = await resendMagicLink(email);
      if (result.success) {
        setResendSuccess(true);
        setCooldown(RESEND_COOLDOWN);
        onResendSuccess?.();
        // Clear success message after 4 s
        setTimeout(() => setResendSuccess(false), 4000);
      } else {
        setResendError(result.error || 'Could not resend. Try again in a moment.');
      }
    } catch {
      setResendError('Could not resend. Try again in a moment.');
    } finally {
      stopSpin();
      setResendLoading(false);
    }
  };

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const resendLabel = cooldown > 0
    ? `Resend in ${cooldown}s`
    : resendLoading
    ? 'Sending...'
    : 'Resend link';

  const resendDisabled = resendLoading || cooldown > 0;

  // Mask email: you@example.com → yo*@example.com
  const maskedEmail = (() => {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    const visible = local.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(local.length - 2, 1))}@${domain}`;
  })();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaView style={styles.safe}>
        {/* Back / change email */}
        <View style={styles.topRow}>
          <Pressable
            onPress={onBack}
            style={styles.backButton}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Change email address"
          >
            <ArrowLeft color="#09090b" size={22} strokeWidth={2} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {/* Animated check icon */}
          <Animated.View style={[styles.iconCircle, { transform: [{ scale: checkScale }] }]}>
            <CheckCircle color="#352a48" size={30} strokeWidth={1.8} />
          </Animated.View>

          <AppText type="black" style={styles.heading}>
            Check your inbox
          </AppText>

          <AppText type="regular" style={styles.subheading}>
            We sent a sign-in link to{' '}
            <AppText type="semiBold" style={styles.emailHighlight}>
              {maskedEmail}
            </AppText>
            .{'\n'}Tap the link in the email to sign in.
          </AppText>

          {/* Hint */}
          <View style={styles.hintBox}>
            <AppText type="regular" style={styles.hintText}>
              Can't find it? Check your spam folder, or tap below to resend.
            </AppText>
          </View>

          {/* Resend */}
          <Pressable
            style={[styles.resendButton, resendDisabled && styles.resendButtonDisabled]}
            onPress={handleResend}
            disabled={resendDisabled}
            accessibilityRole="button"
            accessibilityLabel={resendLabel}
            accessibilityState={{ busy: resendLoading, disabled: resendDisabled }}
          >
            {resendLoading ? (
              <ActivityIndicator size="small" color="#352a48" style={styles.resendIcon} />
            ) : (
              <Animated.View style={[styles.resendIcon, { transform: [{ rotate: spinInterpolate }] }]}>
                <RefreshCw color={resendDisabled ? '#a1a1aa' : '#352a48'} size={15} strokeWidth={2.2} />
              </Animated.View>
            )}
            <AppText
              type="semiBold"
              style={[styles.resendText, resendDisabled && styles.resendTextDisabled]}
            >
              {resendLabel}
            </AppText>
          </Pressable>

          {/* Feedback messages */}
          {resendSuccess && (
            <AppText type="regular" style={styles.successText}>
              Link sent — check your inbox again.
            </AppText>
          )}
          {resendError && (
            <AppText type="regular" style={styles.errorText}>
              {resendError}
            </AppText>
          )}

          {/* Change email */}
          <Pressable
            onPress={onBack}
            hitSlop={8}
            style={styles.changeEmailButton}
            accessibilityRole="button"
            accessibilityLabel="Use a different email address"
          >
            <AppText type="regular" style={styles.changeEmailText}>
              Use a different email
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  safe: { flex: 1, paddingHorizontal: 32 },
  topRow: { height: 50, justifyContent: 'center' },
  backButton: { width: 36, height: 36, justifyContent: 'center' },
  body: { flex: 1, justifyContent: 'center', paddingBottom: 40 },

  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(53, 42, 72, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  heading: {
    fontSize: 30,
    color: '#09090b',
    lineHeight: 38,
    letterSpacing: -1,
    marginBottom: 10,
  },
  subheading: {
    fontSize: 15,
    color: '#71717a',
    lineHeight: 24,
    marginBottom: 24,
  },
  emailHighlight: {
    color: '#09090b',
    fontSize: 15,
  },

  hintBox: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  hintText: {
    fontSize: 13,
    color: '#71717a',
    lineHeight: 20,
  },

  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(53, 42, 72, 0.25)',
    backgroundColor: '#ffffff',
  },
  resendButtonDisabled: {
    borderColor: '#e4e4e7',
    backgroundColor: '#fafafa',
  },
  resendIcon: { marginRight: 8 },
  resendText: { fontSize: 14, color: '#352a48' },
  resendTextDisabled: { color: '#a1a1aa' },

  successText: {
    marginTop: 12,
    fontSize: 13,
    color: '#16a34a',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    color: '#ef4444',
    textAlign: 'center',
    lineHeight: 20,
  },

  changeEmailButton: {
    marginTop: 28,
    alignItems: 'center',
  },
  changeEmailText: {
    fontSize: 14,
    color: '#a1a1aa',
    textDecorationLine: 'underline',
  },
});