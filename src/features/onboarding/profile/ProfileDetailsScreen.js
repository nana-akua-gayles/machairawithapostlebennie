import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from "@react-navigation/native";
import { ChevronLeft, User, Phone, MapPin, Landmark, GitBranch, Edit3 } from 'lucide-react-native';
import { AppText } from '../../../components/AppText';
import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../config/supabaseClient';

const BRAND_RED = '#dc2626';

const ProfileFieldRow = ({ icon: Icon, label, value }) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.fieldRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.fieldIconWrapper, { backgroundColor: isDark ? '#262626' : '#fef2f2' }]}>
        <Icon color={BRAND_RED} size={17} strokeWidth={2.2} />
      </View>
      <View style={styles.fieldTextStack}>
        <AppText type="regular" style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</AppText>
        <AppText type="bold" style={[styles.fieldValue, { color: colors.text }, !value && styles.nullValueText]}>
          {value ?? 'Not provided'}
        </AppText>
      </View>
    </View>
  );
};

export const ProfileDetailsScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  
  const initialUser = route.params?.user || {};
  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(false);

  const fetchLatestProfile = async () => {
    const userId = initialUser?.id || user?.id;
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data) {
        setUser(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Error fetching live profile:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLatestProfile();
    }, [])
  );

  const handleBackPress = () => {
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Header with Back Chevron */}
      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, 12), borderBottomColor: colors.border }]}>
        <Pressable 
          style={({ pressed }) => [styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.rowPressed]}
          onPress={handleBackPress}
          accessibilityRole="button"
          accessibilityLabel="Go back to profile menu"
        >
          <ChevronLeft color={colors.text} size={22} strokeWidth={2.5} />
        </Pressable>
        <AppText type="bold" style={[styles.headerTitle, { color: colors.text }]}>My Profile Card</AppText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={[
          styles.scrollContent, 
          { paddingBottom: Math.max(insets.bottom, 28) }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Modern Minimalist Hero Identity Panel */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.avatarGlowWrapper}>
            {user?.photo ? (
              <Image source={{ uri: user.photo }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.fallbackAvatar, { backgroundColor: isDark ? '#262626' : '#fee2e2' }]}>
                <User color={BRAND_RED} size={30} strokeWidth={2.5} />
              </View>
            )}
          </View>
          <AppText type="bold" style={[styles.userName, { color: colors.text }]}>{user?.name ?? 'Anonymous User'}</AppText>
          <AppText type="regular" style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email ?? 'No email linked'}</AppText>
        </View>

        {loading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color={BRAND_RED} />
          </View>
        )}

        {/* Contact & Location Group */}
        <View style={styles.sectionContainer}>
          <AppText type="bold" style={[styles.sectionTitle, { color: colors.textSecondary }]}>Contact & Location</AppText>
          <View style={[styles.cardSurface, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ProfileFieldRow icon={Phone} label="Phone Number" value={user?.phone} />
            <ProfileFieldRow icon={MapPin} label="Location" value={user?.location} />
          </View>
        </View>

        {/* Ministry Details Group */}
        <View style={styles.sectionContainer}>
          <AppText type="bold" style={[styles.sectionTitle, { color: colors.textSecondary }]}>Ministry Profile</AppText>
          <View style={[styles.cardSurface, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ProfileFieldRow icon={Landmark} label="Church" value={user?.church} />
            <ProfileFieldRow icon={GitBranch} label="Branch" value={user?.branch} />
          </View>
        </View>

        {/* Edit Profile Action Button */}
        <Pressable 
          style={({ pressed }) => [styles.editButton, pressed && styles.rowPressed]}
          onPress={() => navigation.navigate('EditProfile', { user })}
        >
          <Edit3 color="#ffffff" size={18} strokeWidth={2.2} style={{ marginRight: 8 }} />
          <AppText type="bold" style={styles.editButtonText}>Edit Profile Details</AppText>
        </Pressable>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backButton: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, letterSpacing: -0.2 },
  headerSpacer: { width: 38 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  rowPressed: { opacity: 0.8 },
  heroCard: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1, marginBottom: 24 },
  avatarGlowWrapper: { width: 78, height: 78, borderColor: BRAND_RED, padding: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarImage: { width: '100%', height: '100%', borderRadius: 39 },
  fallbackAvatar: { width: '100%', height: '100%', borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 18, letterSpacing: -0.3, textAlign: 'center' },
  userEmail: { fontSize: 13, marginTop: 2, textAlign: 'center' },
  loaderContainer: { marginBottom: 16, alignItems: 'center' },
  sectionContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 11.5, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingHorizontal: 4 },
  cardSurface: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  fieldIconWrapper: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  fieldTextStack: { flex: 1 },
  fieldLabel: { fontSize: 11 },
  fieldValue: { fontSize: 14, marginTop: 1 },
  nullValueText: { color: '#94a3b8', fontStyle: 'italic' },
  editButton: { flexDirection: 'row', backgroundColor: BRAND_RED, paddingVertical: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: '#dc2626', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
  editButtonText: { color: '#ffffff', fontSize: 14.5 },
});