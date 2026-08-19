import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Pressable, TextInput, ScrollView, Linking, Platform, Alert, KeyboardAvoidingView, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Phone, Mail, FileText, Clock, Send, CheckCircle2, Lock, LogIn } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { AppText } from '../../components/AppText';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../config/supabaseClient';

const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_PHONE_LENGTH = 20;
const MAX_DURATION_LENGTH = 100;
const PHONE_REGEX = /^[+\d][\d\s\-().]{5,19}$/;

const InputField = ({ label, icon: Icon, placeholder, value, onChangeText, multiline, isFocused, onFocus, onBlur, colors, keyboardType, maxLength, error, accessibilityLabel }) => (
  <View style={styles.inputContainer}>
    <AppText style={[styles.inputLabel, { color: colors.inputLabel }]}>{label}</AppText>
    <View
      style={[
        styles.formInputFieldWrapper,
        { backgroundColor: colors.cardBg, borderColor: error ? colors.errorBorder : isFocused ? colors.accent : colors.border },
        multiline && styles.multilineWrapper
      ]}
    >
      <Icon color={error ? colors.errorBorder : isFocused ? colors.accent : colors.subText} size={20} style={{ marginTop: multiline ? 4 : 0, marginRight: 12 }} />
      <TextInput
        style={[styles.primitiveInputComponent, { color: colors.textMain }, multiline && { height: 120, paddingTop: 9 }]}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        blurOnSubmit={!multiline}
        keyboardType={keyboardType}
        maxLength={maxLength}
        accessibilityLabel={accessibilityLabel || label}
        accessible
      />
    </View>
    {error ? (
      <AppText style={[styles.fieldErrorText, { color: colors.errorBorder }]} accessibilityLiveRegion="polite">
        {error}
      </AppText>
    ) : null}
    {multiline && maxLength ? (
      <AppText style={[styles.charCountText, { color: colors.subText }]}>
        {value.length}/{maxLength}
      </AppText>
    ) : null}
  </View>
);

const PressableScale = ({ children, onPress, style, disabled, accessibilityLabel, accessibilityHint, accessibilityRole = 'button' }) => (
  <Pressable
    pressRetentionOffset={20}
    onPress={() => {
      if (disabled) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }}
    disabled={disabled}
    accessible
    accessibilityRole={accessibilityRole}
    accessibilityLabel={accessibilityLabel}
    accessibilityHint={accessibilityHint}
    accessibilityState={{ disabled: !!disabled }}
    style={({ pressed }) => [style, { opacity: disabled ? 0.5 : pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
  >
    {children}
  </Pressable>
);

export const ContactSupportScreen = ({ navigation, user, onRequireAuth }) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const colors = {
    background: isDark ? '#09090b' : '#f8fafc',
    screenHeaderBg: isDark ? '#121214' : '#ffffff',
    cardBg: isDark ? '#18181b' : '#ffffff',
    textMain: isDark ? '#ffffff' : '#0f172a',
    subText: isDark ? '#a1a1aa' : '#64748b',
    inputLabel: isDark ? '#d4d4d8' : '#475569',
    placeholder: isDark ? '#71717a' : '#cbd5e1',
    border: isDark ? '#27272a' : '#e2e8f0',
    backBtnBg: isDark ? '#27272a' : '#f1f5f9',
    backBtnIcon: isDark ? '#ffffff' : '#0f172a',
    iconWrapperBg: isDark ? '#2a1215' : '#fef2f2',
    accent: '#ef4444',
    footerBg: isDark ? '#09090b' : '#f8fafc',
    errorBorder: '#dc2626',
    successBg: isDark ? '#052e1a' : '#f0fdf4',
    successText: '#16a34a',
    lockIconBg: isDark ? '#27272a' : '#f1f5f9',
  };

  const [phoneNumber, setPhoneNumber] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const submitLockRef = useRef(false);

  const validate = useCallback(() => {
    const nextErrors = {};

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      nextErrors.description = 'Please describe the issue.';
    } else if (trimmedDescription.length < MIN_DESCRIPTION_LENGTH) {
      nextErrors.description = `Please add a bit more detail (at least ${MIN_DESCRIPTION_LENGTH} characters).`;
    }

    const trimmedPhone = phoneNumber.trim();
    if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone)) {
      nextErrors.phone = 'That phone number doesn\u2019t look right.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [description, phoneNumber]);

  const handleSubmitTicket = async () => {
    if (submitLockRef.current || isSubmitting) return;

    if (!user) {
      onRequireAuth?.();
      return;
    }

    Keyboard.dismiss();

    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      const { error } = await supabase.from('support_tickets').insert({
        user_id: user.id,
        phone_number: phoneNumber.trim() || null,
        issue_duration: duration.trim() || null,
        description: description.trim(),
        status: 'open',
        platform: Platform.OS,
      });

      if (error) {
        console.error('[ContactSupportScreen] Supabase insert failed:', error);
        Alert.alert(
          'Submission Failed',
          'We couldn\u2019t send your ticket. Please check your connection and try again, or reach us directly using the options above.'
        );
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSubmitSuccess(true);
      setPhoneNumber('');
      setDuration('');
      setDescription('');
      setErrors({});

      Alert.alert('Ticket Submitted', 'Thanks \u2014 our support team will get back to you as soon as possible.');
    } catch (err) {
      console.error('[ContactSupportScreen] Unexpected error submitting ticket:', err);
      Alert.alert('Something Went Wrong', 'Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
      submitLockRef.current = false;
    }
  };

  const handleCall = async () => {
    const url = 'tel:+233509938700';
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Unable to Call', 'Your device can\u2019t place calls from this app.');
        return;
      }
      await Linking.openURL(url);
    } catch (err) {
      console.error('[ContactSupportScreen] Failed to open dialer:', err);
      Alert.alert('Unable to Call', 'Something went wrong trying to open the dialer.');
    }
  };

  const handleEmail = async () => {
    const url = 'mailto:machairahelpline@machairawithapostlebennie.org';
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('No Mail App Found', 'Please set up a mail account on your device, or email us directly at machairahelpline@machairawithapostlebennie.org.');
        return;
      }
      await Linking.openURL(url);
    } catch (err) {
      console.error('[ContactSupportScreen] Failed to open mail client:', err);
      Alert.alert('Unable to Email', 'Something went wrong trying to open your mail app.');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.safeContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.screenHeader, { paddingTop: insets.top, backgroundColor: colors.screenHeaderBg, borderBottomColor: colors.border, borderBottomWidth: isDark ? 1 : 0 }]}>
          <PressableScale
            onPress={() => navigation?.goBack()}
            style={[styles.backButtonContainer, { backgroundColor: colors.backBtnBg }]}
            accessibilityLabel="Go back"
          >
            <ChevronLeft color={colors.backBtnIcon} size={28} />
          </PressableScale>
          <AppText type="bold" style={[styles.headerTitleText, { color: colors.textMain }]}>Contact Us</AppText>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flexOne}>
          <ScrollView
            contentContainerStyle={[styles.scrollContainer, { paddingBottom: 20 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <AppText style={[styles.sectionTitleLabel, { color: colors.subText }]}>Direct Contact</AppText>
            <View style={[styles.directContactCardFrame, { backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
              <PressableScale style={styles.contactRowItem} onPress={handleCall} accessibilityLabel="Call support" accessibilityHint="Opens your phone dialer">
                <View style={[styles.contactIconWrapper, { backgroundColor: colors.iconWrapperBg }]}><Phone color={colors.accent} size={20} /></View>
                <View><AppText style={[styles.methodLabel, { color: colors.subText }]}>Call Us</AppText><AppText style={[styles.valueText, { color: colors.textMain }]}>+233 509 938 700</AppText></View>
              </PressableScale>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <PressableScale style={styles.contactRowItem} onPress={handleEmail} accessibilityLabel="Email support" accessibilityHint="Opens your mail app">
                <View style={[styles.contactIconWrapper, { backgroundColor: colors.iconWrapperBg }]}><Mail color={colors.accent} size={20} /></View>
                <View style={{ flex: 1 }}><AppText style={[styles.methodLabel, { color: colors.subText }]}>Email Us</AppText><AppText style={[styles.valueText, { color: colors.textMain }]}>with just a tap</AppText></View>
              </PressableScale>
            </View>

            <AppText style={[styles.sectionTitleLabel, { color: colors.subText }]}>Create Support Ticket</AppText>

            {!user ? (
              <View style={[styles.lockedCard, { backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
                <View style={[styles.lockIconWrapper, { backgroundColor: colors.lockIconBg }]}>
                  <Lock color={colors.subText} size={22} />
                </View>
                <AppText type="bold" style={[styles.lockedTitle, { color: colors.textMain }]}>Sign In Required</AppText>
                <AppText style={[styles.lockedSubtitle, { color: colors.subText }]}>
                  Please sign in to submit a support ticket. You can still reach us directly using the options above.
                </AppText>
                <PressableScale
                  style={[styles.signInButton, { backgroundColor: colors.accent }]}
                  onPress={() => onRequireAuth?.()}
                  accessibilityLabel="Sign in to submit a ticket"
                >
                  <View style={styles.buttonContentRow}>
                    <LogIn color="#fff" size={18} />
                    <AppText type="bold" style={styles.submitText}>Sign In to Continue</AppText>
                  </View>
                </PressableScale>
              </View>
            ) : (
              <>
                {submitSuccess ? (
                  <View style={[styles.successBanner, { backgroundColor: colors.successBg }]} accessibilityLiveRegion="polite">
                    <CheckCircle2 color={colors.successText} size={18} />
                    <AppText style={[styles.successBannerText, { color: colors.successText }]}>Ticket submitted successfully.</AppText>
                  </View>
                ) : null}

                <InputField
                  label="Phone Number"
                  icon={Phone}
                  placeholder="e.g., +233..."
                  value={phoneNumber}
                  onChangeText={(text) => { setPhoneNumber(text); if (errors.phone) setErrors((e) => ({ ...e, phone: undefined })); }}
                  isFocused={focusedInput === 'phone'}
                  onFocus={() => setFocusedInput('phone')}
                  onBlur={() => setFocusedInput(null)}
                  colors={colors}
                  keyboardType="phone-pad"
                  maxLength={MAX_PHONE_LENGTH}
                  error={errors.phone}
                  accessibilityLabel="Phone number (optional)"
                />
                <InputField
                  label="Issue Duration"
                  icon={Clock}
                  placeholder="e.g., Since yesterday"
                  value={duration}
                  onChangeText={setDuration}
                  isFocused={focusedInput === 'duration'}
                  onFocus={() => setFocusedInput('duration')}
                  onBlur={() => setFocusedInput(null)}
                  colors={colors}
                  maxLength={MAX_DURATION_LENGTH}
                  accessibilityLabel="Issue duration (optional)"
                />
                <InputField
                  label="Issue Details"
                  icon={FileText}
                  placeholder="Describe what happened..."
                  value={description}
                  onChangeText={(text) => { setDescription(text); if (errors.description) setErrors((e) => ({ ...e, description: undefined })); }}
                  multiline
                  isFocused={focusedInput === 'desc'}
                  onFocus={() => setFocusedInput('desc')}
                  onBlur={() => setFocusedInput(null)}
                  colors={colors}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  error={errors.description}
                  accessibilityLabel="Issue details, required"
                />
              </>
            )}
          </ScrollView>

          {user ? (
            <View style={[styles.footerContainer, { backgroundColor: colors.footerBg, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
              <PressableScale
                style={[styles.submitButton, { backgroundColor: colors.accent }]}
                onPress={handleSubmitTicket}
                disabled={isSubmitting}
                accessibilityLabel="Submit support ticket"
                accessibilityHint="Sends your issue details to our support team"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.buttonContentRow}>
                    <Send color="#fff" size={20} />
                    <AppText type="bold" style={styles.submitText}>Submit Ticket</AppText>
                  </View>
                )}
              </PressableScale>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  safeContainer: { flex: 1 },
  flexOne: { flex: 1 },
  screenHeader: { height: 100, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  backButtonContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitleText: { fontSize: 20 },
  scrollContainer: { padding: 20 },
  sectionTitleLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 24, marginBottom: 16 },
  directContactCardFrame: { borderRadius: 24, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 5 },
  contactRowItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 16 },
  contactIconWrapper: { width: 50, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { fontSize: 12 },
  valueText: { fontSize: 15, marginTop: 2 },
  divider: { height: 1, marginHorizontal: 12 },
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 13, marginBottom: 8, fontWeight: '600' },
  formInputFieldWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, paddingHorizontal: 16, height: 60, borderWidth: 1.5 },
  multilineWrapper: { height: 160, alignItems: 'flex-start', paddingTop: 16, paddingBottom: 16 },
  primitiveInputComponent: { flex: 1, fontSize: 15, paddingVertical: 10, minHeight: 40 },
  fieldErrorText: { fontSize: 12, marginTop: 6, marginLeft: 4 },
  charCountText: { fontSize: 11, marginTop: 6, marginLeft: 4, textAlign: 'right' },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 12, marginBottom: 16 },
  successBannerText: { fontSize: 13, fontWeight: '600' },
  lockedCard: { borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 20 },
  lockIconWrapper: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  lockedTitle: { fontSize: 16, marginBottom: 6 },
  lockedSubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 18 },
  signInButton: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  footerContainer: { paddingHorizontal: 20, borderTopWidth: 1, paddingTop: 16 },
  submitButton: { height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8 },
  buttonContentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  submitText: { color: '#fff', fontSize: 16 }
});