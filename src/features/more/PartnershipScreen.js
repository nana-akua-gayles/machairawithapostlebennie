import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView, LayoutAnimation, Platform, UIManager, Alert, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { AppText } from '../../components/AppText'; 
import { supabase } from "../../config/supabaseClient";

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const PRIMARY_RED = '#B91C1C';
const LIGHT_RED = '#fef2f2';
const BORDER_RED = '#f87171';
const DARK_SLATE = '#1f2937';
const NEUTRAL = '#6b7280';
const WHITE = '#FFFFFF';

export const PartnershipScreen = ({ navigation }) => {
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header} pointerEvents="box-none">
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft color={PRIMARY_RED} size={32} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroSection}>
          <AppText type="bold" style={styles.title}>Pledge Form</AppText>
          <AppText style={styles.subtitle}>Dearest Esteemed Partner, what partnership type are you opting for?</AppText>
        </View>

        <View style={styles.section}>
          <AppText style={styles.label}>Basis</AppText>
          <View style={styles.toggleRow}>
            {['WEEKLY', 'MONTHLY'].map((p) => (
              <Pressable key={p} onPress={() => handleUpdate('plan', p)} 
                style={[styles.toggleBtn, selectedPlan === p && styles.toggleActive]}>
                <AppText type="bold" style={selectedPlan === p ? styles.textActive : styles.textInactive}>{p}</AppText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <AppText style={styles.label}>Number of copies</AppText>
          <View style={styles.stepper}>
            <Pressable onPress={() => handleUpdate('qty', -1)} style={styles.stepBtn}><AppText style={styles.stepIcon}>-</AppText></Pressable>
            <AppText type="bold" style={styles.qty}>{quantity}</AppText>
            <Pressable onPress={() => handleUpdate('qty', 1)} style={styles.stepBtn}><AppText style={styles.stepIcon}>+</AppText></Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <AppText style={styles.totalLabel}>Total Due</AppText>
          <AppText type="bold" style={styles.totalPrice}>GH₵ {total.toLocaleString()}</AppText>
          
          <Pressable style={styles.cta} onPress={handleCtaPress}>
            <AppText type="bold" style={styles.ctaText}>
              {existingSubscription ? 'Update Subscription' : 'Confirm Partnership'}
            </AppText>
          </Pressable>

          {existingSubscription && (
            <Pressable style={[styles.cta, { marginTop: 15, backgroundColor: DARK_SLATE }]} onPress={handleRedeem}>
              <AppText type="bold" style={styles.ctaText}>Redeem Pledge</AppText>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: WHITE },
  header: { position: 'absolute', top: 60, left: 11, zIndex: 10, padding: 5 },
  backButton: { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 20, padding: 5 },
  content: { padding: 30 },
  heroSection: { marginBottom: 40, marginTop: 60 },
  title: { fontSize: 32, color: PRIMARY_RED },
  subtitle: { fontSize: 16, color: DARK_SLATE, marginTop: 23 },
  section: { marginBottom: 30 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: NEUTRAL, marginBottom: 12 },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: { flex: 1, padding: 16, borderRadius: 8, borderWidth: 1.5, borderColor: BORDER_RED, alignItems: 'center' },
  toggleActive: { backgroundColor: PRIMARY_RED, borderColor: PRIMARY_RED },
  textActive: { color: WHITE },
  textInactive: { color: PRIMARY_RED },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: LIGHT_RED, borderRadius: 8, padding: 4 },
  stepBtn: { padding: 20 },
  stepIcon: { fontSize: 20, color: PRIMARY_RED },
  qty: { flex: 1, textAlign: 'center', fontSize: 24, color: DARK_SLATE },
  footer: { marginTop: 20, paddingTop: 30, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  totalLabel: { fontSize: 14, color: NEUTRAL },
  totalPrice: { fontSize: 40, color: DARK_SLATE, marginVertical: 10, marginBottom: 40 },
  cta: { backgroundColor: PRIMARY_RED, padding: 20, borderRadius: 8, alignItems: 'center' },
  ctaText: { color: WHITE, fontSize: 16 }
});