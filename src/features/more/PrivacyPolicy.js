import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText'; 
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons'; 

export default function PrivacyPolicyScreen({ navigation }) {
  const { isDark } = useTheme();
  
  const colors = {
    bg: isDark ? '#020617' : '#FFFFFF',
    textMain: isDark ? '#F8FAFC' : '#0F172A',
    textMuted: isDark ? '#94A3B8' : '#64748B',
    accent: '#3B82F6',
    card: isDark ? '#0F172A' : '#F1F5F9',
    btnBg: isDark ? '#1E293B' : '#F1F5F9', // Added background color for button
  };

  const Section = ({ title, children }) => (
    <View style={styles.sectionContainer}>
      <AppText type="bold" style={[styles.sectionHeader, { color: colors.textMain }]}>{title}</AppText>
      <View>{children}</View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity 
          style={[styles.backButtonContainer, { backgroundColor: colors.btnBg }]} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textMain} />
        </TouchableOpacity>
        <AppText type="bold" style={[styles.headerTitle, { color: colors.textMain }]}>Privacy Policy</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText style={[styles.date, { color: colors.textMuted }]}>Last updated: July 14, 2026</AppText>

        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <AppText type="bold" style={[styles.summaryTitle, { color: colors.textMain }]}>Quick Summary</AppText>
          <AppText style={[styles.summaryItem, { color: colors.textMuted }]}>• We don't sell your data to third parties.</AppText>
          <AppText style={[styles.summaryItem, { color: colors.textMuted }]}>• We only collect data necessary to provide our service.</AppText>
          <AppText style={[styles.summaryItem, { color: colors.textMuted }]}>• You have full control to request data deletion.</AppText>
        </View>

        <Section title="Our Promise">
          <AppText style={[styles.bodyText, { color: colors.textMuted }]}>
            We care about your privacy. This page explains what information we collect and how we use it, without all the confusing legal jargon. We want you to feel safe using our app.
          </AppText>
        </Section>

        <Section title="Data We Collect">
          <AppText style={[styles.bodyText, { color: colors.textMuted, marginBottom: 10 }]}>We try to keep this as minimal as possible:</AppText>
          
          <AppText style={[styles.listItem, { color: colors.textMuted }]}>
            <AppText type="bold" style={{ color: colors.textMain }}>Account Information:</AppText> Just your email address so you can log in, reset your password, and hear from us if something breaks.
          </AppText>
          
          <AppText style={[styles.listItem, { color: colors.textMuted }]}>
            <AppText type="bold" style={{ color: colors.textMain }}>How you use the app:</AppText> We look at general, anonymous stats to figure out what's working and what's crashing. It helps us make the app faster.
          </AppText>
          
          <AppText style={[styles.listItem, { color: colors.textMuted }]}>
            <AppText type="bold" style={{ color: colors.textMain }}>No tracking:</AppText> We don't follow you around the internet or look at what you do in other apps.
          </AppText>
        </Section>

        <Section title="Your Rights">
          <AppText style={[styles.bodyText, { color: colors.textMuted }]}>
            It's your data, not ours. If you ever want to see what info we have, download it, or delete your account for good, you can do that right from your settings.
          </AppText>
        </Section>

        <View style={styles.footer}>
          <AppText style={[styles.footerText, { color: colors.textMuted }]}>Send all enquiries to:</AppText>
          <TouchableOpacity onPress={() => console.log('Open Mail')}>
            <AppText style={{ color: colors.accent, fontWeight: '600' }}>machairawithapostlebennie@gmail.com</AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  backButtonContainer: { width: 44, height: 44, borderRadius: 22,  backgroundColor: '#f1f5f9',  alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { fontSize: 20, marginLeft: 15 },
  scroll: { paddingHorizontal: 24, paddingBottom: 60 },
  date: { fontSize: 15, marginBottom: 32 },
  summaryCard: { padding: 20, borderRadius: 16, marginBottom: 40 },
  summaryTitle: { fontSize: 14, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryItem: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  sectionContainer: { marginBottom: 32 },
  sectionHeader: { fontSize: 20, marginBottom: 12 },
  bodyText: { fontSize: 16, lineHeight: 26 },
  listItem: { fontSize: 16, lineHeight: 26, marginBottom: 20 }, 
  footer: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 24, alignItems: 'center' },
  footerText: { marginBottom: 8 }
});