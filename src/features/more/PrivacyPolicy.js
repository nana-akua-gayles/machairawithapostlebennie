import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText'; 
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons'; 

export default function PrivacyPolicyScreen({ navigation }) {
  const { isDark } = useTheme();
  
  const colors = {
    bg: isDark ? '#09090b' : '#FFFFFF',
    textMain: isDark ? '#ffffff' : '#0F172A',
    textMuted: isDark ? '#a1a1aa' : '#64748B',
    accent: '#dc2626',
    card: isDark ? '#18181b' : '#F1F5F9',
    btnBg: isDark ? '#27272a' : '#F1F5F9',
    border: isDark ? '#27272a' : '#e2e8f0',
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

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AppText style={[styles.date, { color: colors.textMuted }]}>Effective Date: July 14, 2026</AppText>

        <Section title="1. Introduction">
          <AppText style={[styles.bodyText, { color: colors.textMuted }]}>
            Christ Commonwealth Global is committed to protecting your personal information and your right to privacy. This Privacy Policy outlines how we collect, use, disclose, and safeguard your information when you use our mobile application and related services.
          </AppText>
        </Section>

        <Section title="2. Information We Collect">
          <AppText style={[styles.bodyText, { color: colors.textMuted, marginBottom: 12 }]}>
            We collect information that you voluntarily provide to us when registering for an account, expressing an interest in obtaining information about us or our services, or otherwise contacting us.
          </AppText>
          
          <AppText style={[styles.listItem, { color: colors.textMuted }]}>
            <AppText type="bold" style={{ color: colors.textMain }}>Account Data:</AppText> Email address, display name, and authentication credentials required to provision your account and secure access.
          </AppText>
          
          <AppText style={[styles.listItem, { color: colors.textMuted }]}>
            <AppText type="bold" style={{ color: colors.textMain }}>User Content:</AppText> Testimonies, comments, feedback, and associated media uploads you choose to share publicly or within the application ecosystem.
          </AppText>

          <AppText style={[styles.listItem, { color: colors.textMuted }]}>
            <AppText type="bold" style={{ color: colors.textMain }}>Usage Data:</AppText> Diagnostic logs, device metrics, crash reports, and interaction statistics collected automatically to ensure platform stability and optimize performance.
          </AppText>
        </Section>

        <Section title="3. How We Use Your Information">
          <AppText style={[styles.bodyText, { color: colors.textMuted, marginBottom: 12 }]}>
            We process your information for purposes based on legitimate business interests, the fulfillment of our services, compliance with legal obligations, and your consent. Specifically, we use collected data to:
          </AppText>
          <AppText style={[styles.listItem, { color: colors.textMuted }]}>• Create and manage user accounts and authenticate access.</AppText>
          <AppText style={[styles.listItem, { color: colors.textMuted }]}>• Publish and moderate user-generated testimonies and community interactions.</AppText>
          <AppText style={[styles.listItem, { color: colors.textMuted }]}>• Send administrative notifications, updates, and security alerts.</AppText>
          <AppText style={[styles.listItem, { color: colors.textMuted }]}>• Monitor application analytics to fix bugs and improve user experience.</AppText>
        </Section>

        <Section title="4. Data Sharing and Disclosure">
          <AppText style={[styles.bodyText, { color: colors.textMuted }]}>
            We do not sell, trade, or rent your personal identification information to third parties. We may share information only with trusted cloud infrastructure and authentication providers (such as Supabase and AWS) strictly necessary to host and operate application databases, secure user sessions, and store designated media assets under strict confidentiality standards.
          </AppText>
        </Section>

        <Section title="5. Data Security and Retention">
          <AppText style={[styles.bodyText, { color: colors.textMuted }]}>
            We implement industry-standard technical and organizational security measures designed to protect the security of any personal information we process. We retain your personal data only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
          </AppText>
        </Section>

        <Section title="6. Your Data Rights">
          <AppText style={[styles.bodyText, { color: colors.textMuted }]}>
            Depending on your jurisdiction, you may have the right to request access to the personal data we hold about you, request rectification of inaccurate data, or request the complete deletion of your account and associated records directly through your application settings or by contacting support.
          </AppText>
        </Section>

        <Section title="7. Contact Us">
          <AppText style={[styles.bodyText, { color: colors.textMuted }]}>
            If you have questions, comments, or concerns about this Privacy Policy or our data practices, please reach out to our administrative team:
          </AppText>
        </Section>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <AppText style={[styles.footerText, { color: colors.textMuted }]}>Official Support Channel:</AppText>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:machairawithapostlebennie@gmail.com')}>
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
  backButtonContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { fontSize: 20, marginLeft: 15 },
  scroll: { paddingHorizontal: 24, paddingBottom: 60 },
  date: { fontSize: 14, marginBottom: 24, fontStyle: 'italic' },
  sectionContainer: { marginBottom: 28 },
  sectionHeader: { fontSize: 18, marginBottom: 10, letterSpacing: -0.2 },
  bodyText: { fontSize: 15, lineHeight: 24 },
  listItem: { fontSize: 15, lineHeight: 24, marginBottom: 8 }, 
  footer: { marginTop: 12, borderTopWidth: 1, paddingTop: 24, alignItems: 'center' },
  footerText: { marginBottom: 6, fontSize: 14 }
});