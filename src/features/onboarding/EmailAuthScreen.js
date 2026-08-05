import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  StatusBar,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail } from 'lucide-react-native';
import { AppText } from '../../components/AppText';
import { sendMagicLink } from './Emailauth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
  if (!email.trim()) return 'Enter your email address.';
  if (!EMAIL_REGEX.test(email.trim())) return 'That doesn\'t look like a valid email.';
  return null;
}

export const EmailAuthScreen = ({ visible, onBack, onMagicLinkSent }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const isMounted = useRef(true);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleSend = async () => {
    const validationError = validateEmail(email);
    if (validationError) {
      setError(validationError);
      shake();
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await sendMagicLink(email.trim().toLowerCase());
      if (!isMounted.current) return;

      if (result.success) {
        onMagicLinkSent?.(email.trim().toLowerCase());
      } else {
        setError(result.error || 'Something went wrong. Please try again.');
        shake();
      }
    } catch (err) {
      if (isMounted.current) {
        setError('Something went wrong. Please try again.');
        shake();
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleChangeEmail = (text) => {
    setEmail(text);
    if (error) setError(null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <SafeAreaView style={styles.safe}>
          
          <View style={styles.topRow}>
            <Pressable onPress={onBack} style={styles.backButton} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
              <ArrowLeft color="#09090b" size={22} strokeWidth={2} />
            </Pressable>
          </View>

          <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
            <View style={styles.body}>
              
              <View style={styles.iconCircle}>
                <Mail color="#352a48" size={26} strokeWidth={1.8} />
              </View>

              <AppText type="black" style={styles.heading}>What's your email?</AppText>
              <AppText type="regular" style={styles.subheading}>We'll send a sign-in link — no password needed.</AppText>

              <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                <TextInput
                  style={[styles.input, { borderColor: error ? '#ef4444' : '#e4e4e7' }]}
                  placeholder="you@example.com"
                  placeholderTextColor="#a1a1aa"
                  value={email}
                  onChangeText={handleChangeEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="send"
                  onSubmitEditing={handleSend}
                  editable={!loading}
                  autoFocus={true}
                  accessibilityLabel="Email address"
                />
                {error && <AppText type="regular" style={styles.errorText}>{error}</AppText>}
              </Animated.View>

              <Pressable style={[styles.sendButton, loading && styles.sendButtonDisabled]} onPress={handleSend} disabled={loading} accessibilityRole="button" accessibilityLabel="Send sign-in link" accessibilityState={{ busy: loading, disabled: loading }}>
                {loading ? <ActivityIndicator size="small" color="#ffffff" /> : <AppText type="bold" style={styles.sendButtonText}>Send sign-in link</AppText>}
              </Pressable>

              <AppText type="regular" style={styles.disclaimer}>By continuing, you agree to our Terms of Service and Privacy Policy.</AppText>
            </View>
          </KeyboardAvoidingView>

        </SafeAreaView>
      </View>
    </Modal>
  );
};

// Horizontal layout style map
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  safe: { flex: 1, paddingHorizontal: 32 },
  topRow: { height: 50, justifyContent: 'center' },
  backButton: { width: 36, height: 36, justifyContent: 'center' },
  keyboardArea: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', paddingBottom: 40 },
  iconCircle: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(53, 42, 72, 0.07)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  heading: { fontSize: 30, color: '#09090b', lineHeight: 38, letterSpacing: -1, marginBottom: 8 },
  subheading: { fontSize: 15, color: '#71717a', lineHeight: 23, marginBottom: 32 },
  input: { height: 54, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, fontSize: 16, color: '#09090b', backgroundColor: '#fafafa', fontFamily: 'System' },
  errorText: { marginTop: 6, fontSize: 13, color: '#ef4444', lineHeight: 18 },
  sendButton: { height: 54, borderRadius: 16, backgroundColor: '#352a48', alignItems: 'center', justifyContent: 'center', marginTop: 16, shadowColor: '#352a48', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 4 },
  sendButtonDisabled: { opacity: 0.6 },
  sendButtonText: { color: '#ffffff', fontSize: 15 },
  disclaimer: { marginTop: 20, fontSize: 12, color: '#a1a1aa', lineHeight: 18, textAlign: 'center' },
});