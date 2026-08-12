import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView, LayoutAnimation, Platform, UIManager, Alert, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { AppText } from '../../components/AppText'; 
import { supabase } from "../../config/supabaseClient";
import { useTheme } from '../../context/ThemeContext';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const PRIMARY_RED = '#B91C1C';
const LIGHT_RED = '#fef2f2';
const BORDER_RED = '#f87171';

export const PartnershipScreen = ({ navigation }) => {
  const { colors, isDark: isDarkMode } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState('MONTHLY');
  const [quantity, setQuantity] = useState(1);
  const [existingSubscription, setExistingSubscription] = useState(null);
  const total = 25 * quantity;

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('partnerships')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setExistingSubscription(data);
        setSelectedPlan(data.frequency);
        setQuantity(data.quantity);
      }
    }
  };

  const handleUpdate = (action, val) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    action === 'plan' ? setSelectedPlan(val) : setQuantity(Math.max(1, quantity + val));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const cancelSubscription = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('partnerships').delete().eq('user_id', user.id);
    
    if (error) {
      Alert.alert("Error", "Could not remove your pledge. Please try again.");
    } else {
      Alert.alert("Cancelled", "Your pledge has been removed.");
      setExistingSubscription(null);
      navigation.goBack();
    }
  };

  const confirmPartnership = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("Error", "Please sign in to manage your partnership.");
      return;
    }

    const { error } = await supabase.from('partnerships').upsert({
      user_id: user.id,
      frequency: selectedPlan,
      quantity: quantity,
      total_amount: total,
      status: 'active',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (error) {
      Alert.alert("Database Error", error.message);
      return;
    }

    await fetchSubscription();
    Alert.alert("Heaven Rejoices over You", "Glory! Your pledge has been received!");
  };

  const handleRedeem = () => {
    Alert.alert("Redeem Pledge", "Payment gateway coming soon. Please contact office for manual redemption.");
  };

  const handleCtaPress = () => {
    if (existingSubscription) {
      Alert.alert("Manage Subscription", "You are already a partner. How would you like to proceed?", [
        { text: "Cancel", style: "cancel" },
        { text: "Remove Subscription", style: "destructive", onPress: cancelSubscription },
        { text: "Update Subscription", onPress: confirmPartnership }
      ]);
    } else {
      confirmPartnership();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header} pointerEvents="box-none">
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)' }]} 
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color={isDarkMode ? '#ffffff' : PRIMARY_RED} size={32} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
          <AppText type="bold" style={[styles.title, { color: isDarkMode ? '#ffffff' : PRIMARY_RED }]}>Pledge Form</AppText>
          
          <View style={[styles.purposeCard, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : LIGHT_RED, borderColor: isDarkMode ? '#334155' : BORDER_RED }]}>
            <AppText style={[styles.purposeText, { color: colors.textSecondary }]}>
              Your partnership fuels the distribution of <AppText type="bold" style={{ color: isDarkMode ? '#ffffff' : PRIMARY_RED }}>Machaira hard copies</AppText> for vital missions work across the nations.
            </AppText>
          </View>
        </View>

        <View style={styles.section}>
          <AppText style={[styles.label, { color: colors.textSecondary }]}>PARTNERSHIP TYPE</AppText>
          <View style={styles.toggleRow}>
            {['WEEKLY', 'MONTHLY'].map((p) => (
              <Pressable key={p} onPress={() => handleUpdate('plan', p)} 
                style={[
                  styles.toggleBtn, 
                  { borderColor: isDarkMode ? '#475569' : BORDER_RED },
                  selectedPlan === p && styles.toggleActive
                ]}>
                <AppText type="bold" style={selectedPlan === p ? styles.textActive : [styles.textInactive, { color: isDarkMode ? '#f87171' : PRIMARY_RED }]}>{p}</AppText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <AppText style={[styles.label, { color: colors.textSecondary }]}>Number of copies</AppText>
          <View style={[styles.stepper, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : LIGHT_RED }]}>
            <Pressable onPress={() => handleUpdate('qty', -1)} style={styles.stepBtn}>
              <AppText style={[styles.stepIcon, { color: isDarkMode ? '#f87171' : PRIMARY_RED }]}>-</AppText>
            </Pressable>
            <AppText type="bold" style={[styles.qty, { color: colors.text }]}>{quantity}</AppText>
            <Pressable onPress={() => handleUpdate('qty', 1)} style={styles.stepBtn}>
              <AppText style={[styles.stepIcon, { color: isDarkMode ? '#f87171' : PRIMARY_RED }]}>+</AppText>
            </Pressable>
          </View>
        </View>

        <View style={[styles.footer, { borderTopColor: isDarkMode ? '#334155' : '#f3f4f6' }]}>
          <AppText style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Due</AppText>
          <AppText type="bold" style={[styles.totalPrice, { color: colors.text }]}>GH₵ {total.toLocaleString()}</AppText>
          
          <Pressable style={styles.cta} onPress={handleCtaPress}>
            <AppText type="bold" style={styles.ctaText}>
              {existingSubscription ? 'Update Subscription' : 'Confirm Partnership'}
            </AppText>
          </Pressable>

          {existingSubscription && (
            <Pressable style={[styles.cta, { marginTop: 15, backgroundColor: isDarkMode ? '#334155' : '#1f2937' }]} onPress={handleRedeem}>
              <AppText type="bold" style={styles.ctaText}>Redeem Pledge</AppText>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { position: 'absolute', top: 60, left: 11, zIndex: 10, padding: 5 },
  backButton: { borderRadius: 20, padding: 5 },
  content: { padding: 30 },
  heroSection: { marginBottom: 40, marginTop: 60 },
  title: { fontSize: 32 },
  subtitle: { fontSize: 16, marginTop: 23 },
  purposeCard: { marginTop: 16, padding: 16, borderRadius: 8, borderWidth: 1 },
  purposeText: { fontSize: 13, lineHeight: 20 },
  section: { marginBottom: 30 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, padding: 16, borderRadius: 8, borderWidth: 1.5, alignItems: 'center' },
  toggleActive: { backgroundColor: PRIMARY_RED, borderColor: PRIMARY_RED },
  textActive: { color: '#FFFFFF' },
  textInactive: {},
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, padding: 4 },
  stepBtn: { padding: 20 },
  stepIcon: { fontSize: 20 },
  qty: { flex: 1, textAlign: 'center', fontSize: 24 },
  footer: { marginTop: 20, paddingTop: 30, borderTopWidth: 1 },
  totalLabel: { fontSize: 14 },
  totalPrice: { fontSize: 40, marginVertical: 10, marginBottom: 40 },
  cta: { backgroundColor: PRIMARY_RED, padding: 20, borderRadius: 8, alignItems: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 16 }
});