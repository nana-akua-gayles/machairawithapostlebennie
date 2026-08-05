import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Pressable, Platform } from 'react-native';
import { ChevronRight, ChevronLeft, LogOut, Trash2, Bell, Moon, ShieldCheck, Mail, Info } from 'lucide-react-native';
import { AppText } from '../../components/AppText';
import { useTheme } from '../../context/ThemeContext';
import * as Application from 'expo-application';
import { SafeAreaView } from 'react-native-safe-area-context';


const SettingRow = ({ icon: Icon, title, onPress, type = 'action', value, onValueChange, destructive, colors = {}, isDark = false }) => (
  <TouchableOpacity 
    style={styles.row} 
    onPress={onPress} 
    disabled={type === 'action' ? !onPress : false}
  >
    <View style={styles.rowLeft}>
      <View style={[
        styles.iconContainer, 
        { backgroundColor: destructive 
            ? (isDark ? '#450a0a' : '#fef2f2') 
            : colors.cardBg 
        }
      ]}>
        <Icon color={destructive ? '#ef4444' : colors.iconColor} size={20} />
      </View>
      <AppText style={[styles.rowText, { color: destructive ? '#ef4444' : colors.bodyText }]}>{title}</AppText>
    </View>
    
    {type === 'toggle' ? (
      <Switch 
        value={value} 
        onValueChange={onValueChange} 
        trackColor={{ true: colors.switchTrack, false: isDark ? '#334155' : '#cbd5e1' }}
        thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
      />
    ) : (
      <ChevronRight color={isDark ? '#475569' : '#cbd5e1'} size={20} />
    )}
  </TouchableOpacity>
);

export default function SettingsScreen({ navigation }) {
  const { isDark, toggleTheme } = useTheme();  
  const [isNotificationsEnabled, setIsNotificationsEnabled] = React.useState(true);

  const colors = {
    background: isDark ? '#0f172a' : '#ffffff',
    cardBg: isDark ? '#1e293b' : '#f8fafc',
    titleText: isDark ? '#f8fafc' : '#0f172a',
    bodyText: isDark ? '#cbd5e1' : '#334155',
    subText: isDark ? '#94a3b8' : '#64748b',
    iconColor: isDark ? '#cbd5e1' : '#352a48',
    backBtnBg: isDark ? '#1e293b' : '#ffffff',
    backBtnIcon: isDark ? '#f8fafc' : '#1e293b',
    switchTrack: isDark ? '#ef4444' : '#352a48',
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable 
          onPress={() => navigation.goBack()} 
          style={[styles.backButtonContainer]}
          android_ripple={{ color: isDark ? '#ffffff10' : '#00000010', borderless: true }}
        >
          <ChevronLeft size={24} color={colors.backBtnIcon} />
        </Pressable>
        <AppText type="bold" style={[styles.title, { color: colors.titleText }]}>Settings</AppText>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        <AppText style={[styles.groupLabel, { color: colors.subText }]}>Preferences</AppText>
        
        <SettingRow 
          colors={colors} isDark={isDark} icon={Bell} title="Push Notifications" 
          type="toggle" value={isNotificationsEnabled} onValueChange={setIsNotificationsEnabled} 
        />
        <SettingRow 
          colors={colors} isDark={isDark} icon={Moon} title="Dark Mode" 
          type="toggle" value={isDark} onValueChange={toggleTheme} 
        />


        <AppText style={[styles.groupLabel, { color: colors.subText }]}>About</AppText>
        <SettingRow colors={colors} isDark={isDark} icon={ShieldCheck} title="Privacy Policy" onPress={() => navigation.navigate('PrivacyPolicy')} />
        <SettingRow colors={colors} isDark={isDark} icon={Info} title={`Version ${Application.nativeApplicationVersion}`} onPress={() => navigation.navigate('Version')} />
        <SettingRow colors={colors} isDark={isDark} icon={Mail} title="Contact Support" onPress={() => navigation.navigate('ContactSupport')} />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backButtonContainer: { width: 44, height: 44, borderRadius: 22,  backgroundColor: '#f1f5f9',  alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  title: { fontSize: 22 },
  scroll: { padding: 20 },
  groupLabel: { fontSize: 13, marginTop: 24, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  rowText: { fontSize: 16, fontWeight: '600' },
});