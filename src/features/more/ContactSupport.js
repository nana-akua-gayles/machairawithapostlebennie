import React, { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, ScrollView, Linking, Platform, Alert, KeyboardAvoidingView, ActivityIndicator, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 
import { ChevronLeft, Phone, Mail, FileText, Clock, MessageSquare } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { AppText } from '../../components/AppText';
import { useTheme } from '../../context/ThemeContext';

const InputField = ({ label, icon: Icon, placeholder, value, onChangeText, multiline, isFocused, onFocus, onBlur, colors }) => (
  <View style={styles.inputContainer}>
    <AppText style={[styles.inputLabel, { color: colors.inputLabel }]}>{label}</AppText>
    <View style={[
      styles.formInputFieldWrapper, 
      { backgroundColor: colors.cardBg, borderColor: isFocused ? colors.accent : colors.border },
      multiline && styles.multilineWrapper 
    ]}>
      <Icon color={isFocused ? colors.accent : colors.subText} size={20} style={{ marginTop: multiline ? 4 : 0, marginRight: 12 }} />
      <TextInput 
        style={[styles.primitiveInputComponent, { color: colors.textMain }, multiline && { height: 120, paddingTop: 9 }]} 
        placeholder={placeholder} 
        placeholderTextColor={colors.placeholder}
        value={value} 
        onChangeText={onChangeText} 
        onFocus={onFocus}
        onBlur={onBlur}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        blurOnSubmit={!multiline}
      />
    </View>
  </View>
);

const PressableScale = ({ children, onPress, style, disabled }) => (
  <Pressable 
    pressRetentionOffset={20}
    onPress={() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }} 
    disabled={disabled}
    style={({ pressed }) => [style, { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
  >
    {children}
  </Pressable>
);

export const ContactSupportScreen = ({ navigation }) => {
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
  };

  const [phoneNumber, setPhoneNumber] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const handleWhatsAppSupport = async () => {
    if (!description.trim()) {
      return Alert.alert('Missing Information', 'Please provide a detailed description.');
    }

    setIsSubmitting(true);
    
    const phone = '+233509938700';
    const message = encodeURIComponent(
      `*New Support Ticket*\n\n` +
      `*Phone:* ${phoneNumber || 'N/A'}\n` +
      `*Duration:* ${duration || 'N/A'}\n` +
      `*Details:* ${description}`
    );

    const url = `whatsapp://send?phone=${phone}&text=${message}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Error', 'WhatsApp is not installed on this device.');
      } else {
        await Linking.openURL(url);
        setPhoneNumber(''); 
        setDuration(''); 
        setDescription('');
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to launch WhatsApp.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={[styles.safeContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.screenHeader, { paddingTop: insets.top, backgroundColor: colors.screenHeaderBg, borderBottomColor: colors.border, borderBottomWidth: isDark ? 1 : 0 }]}>
          <PressableScale onPress={() => navigation?.goBack()} style={[styles.backButtonContainer, { backgroundColor: colors.backBtnBg }]}>
            <ChevronLeft color={colors.backBtnIcon} size={28} />
          </PressableScale>
          <AppText type="bold" style={[styles.headerTitleText, { color: colors.textMain }]}>Contact Us</AppText>
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.flexOne}
        >
          <ScrollView 
            contentContainerStyle={[styles.scrollContainer, { paddingBottom: 20 }]} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <AppText style={[styles.sectionTitleLabel, { color: colors.subText }]}>Direct Contact</AppText>
            <View style={[styles.directContactCardFrame, { backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: isDark ? 1 : 0 }]}>
              <PressableScale style={styles.contactRowItem} onPress={() => Linking.openURL('tel:+233596355972')}>
                <View style={[styles.contactIconWrapper, { backgroundColor: colors.iconWrapperBg }]}><Phone color={colors.accent} size={20} /></View>
                <View><AppText style={[styles.methodLabel, { color: colors.subText }]}>Call Us</AppText><AppText style={[styles.valueText, { color: colors.textMain }]}>+233 509 938 700</AppText></View>
              </PressableScale>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <PressableScale style={styles.contactRowItem} onPress={() => Linking.openURL('mailto:machairahelpline@machairawithapostlebennie.org')}>
                <View style={[styles.contactIconWrapper, { backgroundColor: colors.iconWrapperBg }]}><Mail color={colors.accent} size={20} /></View>
                <View style={{ flex: 1 }}><AppText style={[styles.methodLabel, { color: colors.subText }]}>Email Us</AppText><AppText style={[styles.valueText, { color: colors.textMain }]}>with just a tap</AppText></View>
              </PressableScale>
            </View>

            <AppText style={[styles.sectionTitleLabel, { color: colors.subText }]}>Create Support Ticket</AppText>
            <InputField label="Phone Number" icon={Phone} placeholder="e.g., +233..." value={phoneNumber} onChangeText={setPhoneNumber} isFocused={focusedInput === 'phone'} onFocus={() => setFocusedInput('phone')} onBlur={() => setFocusedInput(null)} colors={colors} />
            <InputField label="Issue Duration" icon={Clock} placeholder="e.g., Since yesterday" value={duration} onChangeText={setDuration} isFocused={focusedInput === 'duration'} onFocus={() => setFocusedInput('duration')} onBlur={() => setFocusedInput(null)} colors={colors} />
            <InputField label="Issue Details" icon={FileText} placeholder="Describe what happened..." value={description} onChangeText={setDescription} multiline isFocused={focusedInput === 'desc'} onFocus={() => setFocusedInput('desc')} onBlur={() => setFocusedInput(null)} colors={colors} />
          </ScrollView>

          {/* Floating Button Footer that respects Android Insets */}
          <View style={[styles.footerContainer, { backgroundColor: colors.footerBg, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
            <PressableScale style={[styles.submitButton, { backgroundColor: colors.accent }]} onPress={handleWhatsAppSupport} disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.buttonContentRow}>
                  <MessageSquare color="#fff" size={20} />
                  <AppText type="bold" style={styles.submitText}>Send via WhatsApp</AppText>
                </View>
              )}
            </PressableScale>
          </View>
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
  footerContainer: { paddingHorizontal: 20, borderTopWidth: 1, paddingTop: 16 },
  submitButton: { height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8 },
  buttonContentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  submitText: { color: '#fff', fontSize: 16 }
});