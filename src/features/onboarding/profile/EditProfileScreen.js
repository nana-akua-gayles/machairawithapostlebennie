import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  Pressable, 
  Image, 
  Alert, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Lock, ChevronLeft } from 'lucide-react-native';
import { AppText } from '../../../components/AppText';
import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../config/supabaseClient'; 

const BRAND_RED = '#dc2626';

export const EditProfileScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = route.params || {};

  const [phone, setPhone] = useState(user?.phone ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [church, setChurch] = useState(user?.church ?? '');
  const [branch, setBranch] = useState(user?.branch ?? '');
  const [loading, setLoading] = useState(false);

  const handleSaveChanges = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          phone: phone.trim() || null,
          location: location.trim() || null,
          church: church.trim() || null,
          branch: branch.trim() || null,
          updated_at: new Date(),
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Your profile has been updated successfully.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header Bar */}
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <Pressable 
          style={({ pressed }) => [styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.rowPressed]}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft color={colors.text} size={22} strokeWidth={2.5} />
        </Pressable>
        <AppText type="bold" style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={[
            styles.scrollContent, 
            { paddingBottom: Math.max(insets.bottom + 24, 40) }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Locked Identity Header */}
          <View style={styles.headerBlock}>
            <View style={[styles.avatarRingLocked, { borderColor: isDark ? '#404040' : '#cbd5e1' }]}>
              {user?.photo ? (
                <Image source={{ uri: user.photo }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.fallbackAvatar, { backgroundColor: isDark ? '#262626' : '#fee2e2' }]}>
                  <User color={BRAND_RED} size={32} strokeWidth={2.5} />
                </View>
              )}
              <View style={styles.lockBadge}>
                <Lock color="#ffffff" size={10} strokeWidth={3} />
              </View>
            </View>
            <AppText type="bold" style={[styles.userName, { color: colors.text }]}>{user?.name ?? 'User'}</AppText>
            <AppText type="regular" style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email ?? ''}</AppText>
            <AppText type="regular" style={styles.lockedNotice}>Profile picture, name and email cannot be changed here.</AppText>
          </View>

          {/* Editable Form Inputs */}
          <View style={[styles.formSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <AppText type="bold" style={[styles.inputLabel, { color: colors.textSecondary }]}>Phone Number</AppText>
            <TextInput 
              style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: isDark ? '#1a1a1a' : '#f8fafc' }]} 
              value={phone} 
              onChangeText={setPhone} 
              placeholder="Enter phone number" 
              placeholderTextColor="#9ca3af" 
              keyboardType="phone-pad" 
              returnKeyType="next"
            />

            <AppText type="bold" style={[styles.inputLabel, { color: colors.textSecondary }]}>Location</AppText>
            <TextInput 
              style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: isDark ? '#1a1a1a' : '#f8fafc' }]} 
              value={location} 
              onChangeText={setLocation} 
              placeholder="Enter location (e.g. City, Country)" 
              placeholderTextColor="#9ca3af" 
              returnKeyType="next"
            />

            <AppText type="bold" style={[styles.inputLabel, { color: colors.textSecondary }]}>Church</AppText>
            <TextInput 
              style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: isDark ? '#1a1a1a' : '#f8fafc' }]} 
              value={church} 
              onChangeText={setChurch} 
              placeholder="Enter church name" 
              placeholderTextColor="#9ca3af" 
              returnKeyType="next"
            />

            <AppText type="bold" style={[styles.inputLabel, { color: colors.textSecondary }]}>Branch</AppText>
            <TextInput 
              style={[styles.textInput, { borderColor: colors.border, color: colors.text, backgroundColor: isDark ? '#1a1a1a' : '#f8fafc' }]} 
              value={branch} 
              onChangeText={setBranch} 
              placeholder="Enter branch name" 
              placeholderTextColor="#9ca3af" 
              returnKeyType="done"
            />
          </View>

          {/* Save Action Button */}
          <Pressable 
            style={({ pressed }) => [styles.saveButton, (pressed || loading) && styles.rowPressed]}
            onPress={handleSaveChanges}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <AppText type="bold" style={styles.saveButtonText}>Save Changes</AppText>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backButton: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, letterSpacing: -0.2 },
  headerSpacer: { width: 38 },
  scrollContent: { padding: 20 },
  rowPressed: { opacity: 0.8 },
  headerBlock: { alignItems: 'center', marginBottom: 24, paddingVertical: 10 },
  avatarRingLocked: { width: 84, height: 84, padding: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 12, position: 'relative' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 38 },
  fallbackAvatar: { width: '100%', height: '100%', borderRadius: 38, justifyContent: 'center', alignItems: 'center' },
  lockBadge: { position: 'absolute', bottom: 2, right: 2, backgroundColor: '#64748b', padding: 4, borderRadius: 10 },
  userName: { fontSize: 20, letterSpacing: -0.3 },
  userEmail: { fontSize: 13.5, marginTop: 2 },
  lockedNotice: { fontSize: 11.5, color: '#94a3b8', marginTop: 6, textAlign: 'center' },
  formSection: { borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 24, gap: 14 },
  inputLabel: { fontSize: 12.5, marginBottom: -4 },
  textInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14.5 },
  saveButton: { backgroundColor: BRAND_RED, paddingVertical: 16, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#dc2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  saveButtonText: { color: '#ffffff', fontSize: 15 },
});