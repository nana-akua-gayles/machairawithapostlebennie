import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { ChevronLeft, Info, FileText } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/AppText';
import { useTheme } from '../../context/ThemeContext';
import * as Application from 'expo-application';
import * as Updates from 'expo-updates';

export default function VersionScreen({ navigation }) {
  const { isDark } = useTheme();
  
  const colors = {
    background: isDark ? '#09090b' : '#ffffff',
    cardBg: isDark ? '#18181b' : '#f8fafc',
    titleText: isDark ? '#ffffff' : '#0f172a',
    bodyText: isDark ? '#d4d4d8' : '#334155',
    subText: isDark ? '#a1a1aa' : '#64748b',
    backBtnBg: isDark ? '#27272a' : '#f1f5f9',
    backBtnIcon: isDark ? '#ffffff' : '#1e293b',
    border: isDark ? '#27272a' : '#f1f5f9',
  };

  const appVersion = Application.nativeApplicationVersion || '1.0.0';
  const buildNumber = Application.nativeBuildVersion || '1';

  const formattedReleaseDate = Updates.createdAt 
    ? new Date(Updates.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Development Build';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable 
          onPress={() => navigation.goBack()} 
          style={[styles.backButtonContainer, { backgroundColor: colors.backBtnBg }]}
          android_ripple={{ color: isDark ? '#ffffff10' : '#00000010', borderless: true }}
        >
          <ChevronLeft size={24} color={colors.backBtnIcon} />
        </Pressable>
        <AppText type="bold" style={[styles.title, { color: colors.titleText }]}>App Version</AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <AppText type="bold" style={[styles.appName, { color: colors.titleText }]}>Machaira with Apostle Bennie</AppText>
          <AppText style={{ color: colors.subText }}>Version {appVersion}</AppText>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <InfoRow label="Build Number" value={buildNumber} colors={colors} />
          <InfoRow label="Platform" value={Platform.OS === 'ios' ? 'iOS' : 'Android'} colors={colors} />
          <InfoRow label="Release Date" value={formattedReleaseDate} colors={colors} />
        </View>

        <View style={styles.actions}>
          <ActionRow 
            icon={FileText} 
            title="Privacy Policy" 
            onPress={() => navigation.navigate('PrivacyPolicy')} 
            colors={colors} 
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoRow = ({ label, value, colors }) => (
  <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
    <AppText style={{ color: colors.subText }}>{label}</AppText>
    <AppText type="bold" style={{ color: colors.titleText }}>{value}</AppText>
  </View>
);

const ActionRow = ({ icon: Icon, title, onPress, colors }) => (
  <Pressable 
    style={[styles.actionRow, { borderBottomColor: colors.border }]} 
    onPress={onPress}
  >
    <Icon size={20} color={colors.bodyText} />
    <AppText style={[styles.actionText, { color: colors.bodyText }]}>{title}</AppText>
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backButtonContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  title: { fontSize: 22 },
  scroll: { padding: 20 },
  hero: { alignItems: 'center', marginVertical: 40 },
  appName: { fontSize: 21, marginBottom: 8, textAlign: 'center' },
  card: { padding: 20, borderRadius: 16, marginBottom: 25, borderWidth: 1 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  actionText: { fontSize: 16, marginLeft: 16, fontWeight: '500' }
});