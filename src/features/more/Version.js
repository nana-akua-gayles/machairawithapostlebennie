import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform, Linking } from 'react-native';
import { ChevronLeft, Info, FileText, Globe, Star } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { useTheme } from '../../context/ThemeContext';
import * as Application from 'expo-application';

export default function VersionScreen({ navigation }) {
  const { isDark } = useTheme();
  
  const colors = {
    background: isDark ? '#0f172a' : '#ffffff',
    cardBg: isDark ? '#1e293b' : '#f8fafc',
    titleText: isDark ? '#f8fafc' : '#0f172a',
    bodyText: isDark ? '#cbd5e1' : '#334155',
    subText: isDark ? '#94a3b8' : '#64748b',
    backBtnBg: isDark ? '#1e293b' : '#ffffff',
    backBtnIcon: isDark ? '#f8fafc' : '#1e293b',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable 
          onPress={() => navigation.goBack()} 
          style={[styles.backButtonContainer]}
        >
          <ChevronLeft size={24} color={colors.backBtnIcon} />
        </Pressable>
        <AppText type="bold" style={[styles.title, { color: colors.titleText }]}>App Version</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <AppText type="bold" style={[styles.appName, { color: colors.titleText }]}>Machaira with Apostle Bennie</AppText>
          <AppText style={{ color: colors.subText }}>Version {Application.nativeApplicationVersion}</AppText>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
          <InfoRow label="Build Number" value={Application.nativeBuildVersion} colors={colors} />
          <InfoRow label="Platform" value={Platform.OS === 'ios' ? 'iOS' : 'Android'} colors={colors} />
          <InfoRow label="Release Date" value="July 14, 2026" colors={colors} />
        </View>

        <View style={styles.actions}>
          <ActionRow icon={FileText} title="Privacy Policy" onPress={() => navigation.navigate('PrivacyPolicy')} colors={colors} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoRow = ({ label, value, colors }) => (
  <View style={styles.infoRow}>
    <AppText style={{ color: colors.subText }}>{label}</AppText>
    <AppText type="bold" style={{ color: colors.titleText }}>{value}</AppText>
  </View>
);

const ActionRow = ({ icon: Icon, title, onPress, colors }) => (
  <Pressable style={styles.actionRow} onPress={onPress}>
    <Icon size={20} color={colors.bodyText} />
    <AppText style={[styles.actionText, { color: colors.bodyText }]}>{title}</AppText>
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backButtonContainer: { width: 44, height: 44, borderRadius: 22,  backgroundColor: '#f1f5f9',  alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  title: { fontSize: 22 },
  scroll: { padding: 20 },
  hero: { alignItems: 'center', marginVertical: 40 },
  appName: { fontSize: 21, marginBottom: 18 },
  card: { padding: 20, borderRadius: 16, marginBottom: 25 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f1f1' + '20' },
  actionText: { fontSize: 16, marginLeft: 16, fontWeight: '500' }
});