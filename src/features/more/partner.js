import React, { useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, StatusBar, Dimensions, Animated, TouchableOpacity } from 'react-native';
import { AppText } from '../../components/AppText';
import { Handshake, Sparkles, Wheat, Star, ChevronLeft } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

const DARK_BG = '#f8fafc';
const WHITE = '#ffffff';
const RED_ACCENT = '#B91C1C';
const TEXT_MAIN = '#000000';
const TEXT_SUB = '#64748b';

export const PartnerScreen = ({ navigation }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft color={WHITE} size={32} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.heroSection}>
        <View style={styles.iconOuterRing}>
          <Handshake color={RED_ACCENT} size={48} strokeWidth={1.5} />
        </View>
        <AppText type="bold" style={styles.mainTitle}>Partner with us</AppText>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.devotionalBox}>
          <AppText type="bold" style={styles.devotionalTitle}>The Kingdom Advances Through our Faithfulness</AppText>
          <AppText style={styles.devotionalText}>
            Partnership is not merely a transaction, but a joining of faith. 
            As the Apostle Paul wrote to the Philippians, you become partakers of the grace given to this house. 
            When you support the proclamation of the uncompromised Word, you share in the spiritual reward of every life transformed, every yoke broken, and every soul anchored in Truth.
          </AppText>
          <Sparkles color={RED_ACCENT} size={24} style={styles.devotionalIcon} />
        </View>

        <View style={styles.ctaSection}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable 
              style={styles.altarButton}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              onPress={() => navigation.navigate('PartnershipScreen')}
            >
              <AppText type="bold" style={styles.altarButtonText}>Partner Today</AppText>
            </Pressable>
          </Animated.View>
          <AppText style={styles.disclaimer}>Your generous givings support the ongoing work of the Machaira with Apostle Bennie worldwide.</AppText>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: DARK_BG },
  navBar: { position: 'absolute', top: 40, left: 20, zIndex: 10, padding: 5,},
  backButton: { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 20, padding: 5,},
  wave: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 0 },
  heroSection: { alignItems: 'center', paddingTop: 80, paddingBottom: 20, zIndex: 2 },
  iconOuterRing: { width: 100, height: 100, borderRadius: 50, backgroundColor: WHITE, justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    borderWidth: 2, borderColor: RED_ACCENT, shadowColor: RED_ACCENT, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 5
  },
  mainTitle: { fontSize: 30, color: RED_ACCENT, letterSpacing: 1, marginBottom: 8 },
  scrollContent: { paddingTop: 10, paddingBottom: 40 },
  devotionalBox: { 
    backgroundColor: WHITE, marginHorizontal: 20, padding: 30, borderRadius: 16, marginBottom: 50,
    borderWidth: 1, borderColor: RED_ACCENT,
    shadowColor: RED_ACCENT, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 15, elevation: 5
  },
  devotionalTitle: { fontSize: 19, color: RED_ACCENT, marginBottom: 16, textAlign: 'center' },
  devotionalText: { fontSize: 16, color: TEXT_MAIN, lineHeight: 28, textAlign: 'center', fontStyle: 'italic', marginBottom: 20 },
  devotionalIcon: { alignSelf: 'center', color: RED_ACCENT },
  ctaSection: { alignItems: 'center', paddingHorizontal: 30, marginBottom: 50 },
  altarButton: { 
    flexDirection: 'row', backgroundColor: RED_ACCENT, paddingVertical: 20, paddingHorizontal: 40, borderRadius: 40, 
    alignItems: 'center', justifyContent: 'center',
    shadowColor: RED_ACCENT, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8, marginBottom: 20
  },
  altarButtonText: { color: WHITE, fontSize: 18, marginLeft: 12, letterSpacing: 0.5 },
  disclaimer: { color: TEXT_SUB, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});