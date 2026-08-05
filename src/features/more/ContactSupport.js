import React, { useState } from 'react';
import { View, StyleSheet, Pressable, TextInput, ScrollView, Linking, Platform, Alert, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; 
import { ChevronLeft, Phone, Mail, FileText, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { AppText } from '../../components/AppText';

const InputField = ({ label, icon: Icon, placeholder, value, onChangeText, multiline, isFocused, onFocus, onBlur }) => (
  <View style={styles.inputContainer}>
    <AppText style={styles.inputLabel}>{label}</AppText>
    <View style={[
      styles.formInputFieldWrapper, 
      isFocused && styles.inputFocused,
      multiline && styles.multilineWrapper 
    ]}>
      <Icon color={isFocused ? '#ef4444' : '#94a3b8'} size={20} style={{ marginTop: multiline ? 4 : 0, marginRight: 12 }} />
      <TextInput 
        style={[styles.primitiveInputComponent, multiline && { height: 120, paddingTop: 9 }]} 
        placeholder={placeholder} 
        placeholderTextColor="#cbd5e1"
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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const handleSupportSubmit = async () => {
    if (!description.trim()) return Alert.alert('Missing Information', 'Please provide a detailed description.');
    setIsSubmitting(true);
    await new Promise(res => setTimeout(res, 1500));
    setIsSubmitting(false);
    Alert.alert('Ticket Submitted', 'Thank you! Our support team will reach out shortly.');
    setPhoneNumber(''); setDuration(''); setDescription('');
  };

  return (
    <View style={styles.safeContainer}>
      <View style={[styles.screenHeader, { paddingTop: insets.top }]}>
        <PressableScale onPress={() => navigation?.goBack()} style={styles.backButtonContainer}>
          <ChevronLeft color="#0f172a" size={28} />
        </PressableScale>
        <AppText type="bold" style={styles.headerTitleText}>Contact Us</AppText>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.flexOne}
      >
        <ScrollView 
          contentContainerStyle={[styles.scrollContainer, { paddingBottom: 20 }]} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="always"
        >
          <AppText style={styles.sectionTitleLabel}>Direct Contact</AppText>
          <View style={styles.directContactCardFrame}>
            <PressableScale style={styles.contactRowItem} onPress={() => Linking.openURL('tel:+233509938700')}>
              <View style={styles.contactIconWrapper}><Phone color="#ef4444" size={20} /></View>
              <View><AppText style={styles.methodLabel}>Call Us</AppText><AppText style={styles.valueText}>+233 509 938 700</AppText></View>
            </PressableScale>
            <View style={styles.divider} />
            <PressableScale style={styles.contactRowItem} onPress={() => Linking.openURL('mailto:machairahelpline@machairawithapostlebennie.org')}>
              <View style={styles.contactIconWrapper}><Mail color="#ef4444" size={20} /></View>
              <View style={{ flex: 1 }}><AppText style={styles.methodLabel}>Email Us</AppText><AppText style={styles.valueText}>with just a tap</AppText></View>
            </PressableScale>
          </View>

          <AppText style={styles.sectionTitleLabel}>Create Support Ticket</AppText>
          <InputField label="Phone Number" icon={Phone} placeholder="e.g., +233..." value={phoneNumber} onChangeText={setPhoneNumber} isFocused={focusedInput === 'phone'} onFocus={() => setFocusedInput('phone')} onBlur={() => setFocusedInput(null)} />
          <InputField label="Issue Duration" icon={Clock} placeholder="e.g., Since yesterday" value={duration} onChangeText={setDuration} isFocused={focusedInput === 'duration'} onFocus={() => setFocusedInput('duration')} onBlur={() => setFocusedInput(null)} />
          <InputField label="Issue Details" icon={FileText} placeholder="Describe what happened..." value={description} onChangeText={setDescription} multiline isFocused={focusedInput === 'desc'} onFocus={() => setFocusedInput('desc')} onBlur={() => setFocusedInput(null)} />
        </ScrollView>

        {/* Floating Button Footer that respects Android Insets */}
        <View style={[styles.footerContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <PressableScale style={styles.submitButton} onPress={handleSupportSubmit} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <AppText type="bold" style={styles.submitText}>Send Request</AppText>}
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: '#f8fafc' },
  flexOne: { flex: 1 },
  screenHeader: { height: 100, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, backgroundColor: '#fff' },
  backButtonContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitleText: { fontSize: 20, color: '#0f172a' },
  scrollContainer: { padding: 20 },
  sectionTitleLabel: { fontSize: 13, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 24, marginBottom: 16 },
  directContactCardFrame: { backgroundColor: '#fff', borderRadius: 24, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12, elevation: 5 },
  contactRowItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 16 },
  contactIconWrapper: { width: 50, height: 50, borderRadius: 18, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
  methodLabel: { fontSize: 12, color: '#94a3b8' },
  valueText: { fontSize: 15, color: '#1e293b', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 12 },
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 13, color: '#475569', marginBottom: 8, fontWeight: '600' },
  formInputFieldWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 16, height: 60, borderWidth: 1.5, borderColor: '#e2e8f0' },
  multilineWrapper: { height: 160, alignItems: 'flex-start', paddingTop: 16, paddingBottom: 16 }, 
  inputFocused: { borderColor: '#ef4444' },
  primitiveInputComponent: { flex: 1, fontSize: 15, color: '#1e293b', paddingVertical: 10, minHeight: 40 },
  footerContainer: { paddingHorizontal: 20, backgroundColor: '#f8fafc', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  submitButton: { backgroundColor: '#ef4444', height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 8 },
  submitText: { color: '#fff', fontSize: 16 }
});