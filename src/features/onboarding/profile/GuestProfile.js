import React, { useMemo, useCallback, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Platform, Image, Modal, Dimensions, Alert, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Notebook, MicVocal, Heart, MessageSquareWarning, Share2, ChevronRight, LogIn, X } from 'lucide-react-native';
import { AppText } from '../../../components/AppText';

const { height, width } = Dimensions.get('window');

// Self-contained static schema structure for utilities
const UTILITIES_ITEMS = [
  { id: 'notes', label: 'My Notes', icon: Notebook, color: '#52525b', bgColor: 'rgba(244, 244, 245, 0.8)' },
  { id: 'testimony', label: 'Testimony', icon: MicVocal, color: '#52525b', bgColor: 'rgba(244, 244, 245, 0.8)' },
  { id: 'books', label: 'Favourite Books', icon: Heart, color: '#52525b', bgColor: 'rgba(244, 244, 245, 0.8)' },
  { id: 'support', label: 'FAQ', icon: MessageSquareWarning, color: '#52525b', bgColor: 'rgba(244, 244, 245, 0.8)' },
  { id: 'share', label: 'Share App', icon: Share2, color: '#52525b', bgColor: 'rgba(244, 244, 245, 0.8)' },
];

const ProfileCard = ({ onTriggerLogin }) => (
  <Pressable style={styles.resumeCardWrapper} onPress={onTriggerLogin}>
    <View style={styles.resumeAvatarFrame}>
      <View style={styles.fallbackCircleAuth}><User color="#71717a" size={22} /></View>
    </View>
    <View style={{ flex: 1 }}>
      <AppText type="bold" style={styles.resumeProfileName}>Guest Explorer</AppText>
      <AppText type="regular" style={styles.resumeEmailText}>Tap to set up or sign into your account</AppText>
    </View>
    <View style={[styles.loggedOutPillBadge, { backgroundColor: '#f4f4f5' }]}>
      <AppText type="bold" style={[styles.loggedOutPillText, { color: '#71717a' }]}>Guest</AppText>
    </View>
  </Pressable>
);

const QuickResumeScreen = ({ onSelectAccount, onBack }) => (
  <View style={styles.quickResumeContainer}>
    <View style={styles.quickResumeHeaderRow}>
      <Pressable style={styles.quickResumeCloseBtn} onPress={onBack}>
        <X color="#71717a" size={16} strokeWidth={2.5} />
      </Pressable>
    </View>
    <View style={styles.quickResumeHeroTextSection}>
      <AppText type="bold" style={styles.quickResumeWelcomeTitle}>Create Account</AppText>
      <AppText type="regular" style={styles.quickResumeSubtext}>Sign in to unlock streaks, rewards, and study notes.</AppText>
    </View>
    <View style={styles.quickResumeCardWrapper}>
      <Pressable style={({ pressed }) => [styles.quickResumeProfileCard, pressed && styles.quickResumeCardActive]} onPress={onSelectAccount}>
        <View style={styles.quickResumeAvatarWrapper}>
          <View style={styles.quickResumeAvatarFallback}><User color="#71717a" size={24} /></View>
        </View>
        <View style={styles.quickResumeMetaInfo}>
          <AppText type="bold" style={styles.quickResumeProfileName}>Get Started Now</AppText>
          <AppText type="regular" style={styles.quickResumeProfileEmail}>Tap to verify your identity</AppText>
        </View>
        <View style={styles.quickResumeArrowBadge}>
          <ChevronRight color="#71717a" size={16} strokeWidth={2.5} />
        </View>
      </Pressable>
    </View>
  </View>
);

const NavMenuOption = ({ icon: Icon, color, bgColor, label, description, onPress, style }) => (
  <Pressable style={({ pressed }) => [styles.menuItemRow, style, pressed && styles.rowPressedStyle]} onPress={onPress}>
    <View style={[styles.menuItemIconWrapper, { backgroundColor: bgColor }]}>
      <Icon color={color} size={18} strokeWidth={2.2} />
    </View>
    <View style={styles.menuItemTextStack}>
      <AppText type="semiBold" style={styles.menuItemTitleText}>{label}</AppText>
      {description && <AppText type="regular" style={styles.menuItemDescText}>{description}</AppText>}
    </View>
    <ChevronRight color={color === '#ff3b30' || color === '#ef4444' || color === '#22c55e' ? '#ff817b' : '#d4d4d8'} size={15} strokeWidth={2.2} />
  </Pressable>
);

export const GuestProfileDashboardContent = ({ onTriggerLogin, onNavigateToSupport, onNavigateToMenuOption }) => {
  const insets = useSafeAreaInsets();
  const [showQuickResumeUi, setShowQuickResumeUi] = useState(false);

  const handlePress = useCallback((id) => {
    if (id === 'register_guest') {
      if (onTriggerLogin) onTriggerLogin();
      else setShowQuickResumeUi(true);
    } else if (id === 'support') {
      onNavigateToSupport ? onNavigateToSupport() : onNavigateToMenuOption?.('support');
    } else onNavigateToMenuOption?.(id);
  }, [onTriggerLogin, onNavigateToSupport, onNavigateToMenuOption]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container} contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 60 }}>
        <ProfileCard onTriggerLogin={() => handlePress('register_guest')} />
        
        <View style={styles.groupSectionContainer}>
          <View style={styles.groupHeaderLabelWrapper}>
            <AppText type="bold" style={styles.groupSectionHeaderText}>Account Utilities</AppText>
          </View>
          <View style={styles.groupContentBoxStack}>
            <NavMenuOption id="register_guest" label="Create Account / Sign In" icon={LogIn} color="#22c55e" bgColor="rgba(34, 197, 94, 0.08)" onPress={() => handlePress('register_guest')} />
            {UTILITIES_ITEMS.map((item) => (
              <NavMenuOption key={item.id} icon={item.icon} color={item.color} bgColor={item.bgColor} label={item.label} onPress={() => handlePress(item.id)} />
            ))}
          </View>
        </View>
      </ScrollView>

      {showQuickResumeUi && (
        <View style={StyleSheet.absoluteFillObject}>
          <QuickResumeScreen onSelectAccount={() => { setShowQuickResumeUi(false); onTriggerLogin?.(); }} onBack={() => setShowQuickResumeUi(false)} />
        </View>
      )}
    </View>
  );
};

export const GuestProfileModalSheet = ({ visible, onClose, onTriggerLogin, onNavigateToSupport, onNavigateToMenuOption }) => {
  const insets = useSafeAreaInsets();
  const [showQuickResumeUi, setShowQuickResumeUi] = useState(false);

  const handleItemPress = useCallback((id) => {
    if (id === 'register_guest') {
      setShowQuickResumeUi(true);
    } else {
      onClose();
      requestAnimationFrame(() => {
        if (id === 'support') onNavigateToSupport ? onNavigateToSupport() : onNavigateToMenuOption?.('support');
        else onNavigateToMenuOption?.(id);
      });
    }
  }, [onClose, onNavigateToSupport, onNavigateToMenuOption]);

  const modalListItems = useMemo(() => {
    return [{ id: 'register_guest', label: 'Create Account / Sign In', icon: LogIn, color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.08)' }, ...UTILITIES_ITEMS];
  }, []);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalOverlayScrim}>
        <Pressable style={styles.dismissalAbsoluteBackdrop} onPress={onClose} />
        <View style={[styles.bottomSheetCardContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {showQuickResumeUi ? (
            <QuickResumeScreen onSelectAccount={() => { setShowQuickResumeUi(false); onClose(); setTimeout(() => { onTriggerLogin?.(); }, 100); }} onBack={() => setShowQuickResumeUi(false)} />
          ) : (
            <>
              <View style={styles.sheetIndicatorBar} />
              <View style={styles.sheetHeaderControls}>
                <AppText type="black" style={styles.sheetTitleLabel}>Profile</AppText>
                <Pressable style={styles.closeCircleWrapper} onPress={onClose} hitSlop={6}>
                  <X color="#ff3b30" size={14} strokeWidth={2.5} />
                </Pressable>
              </View>
              <FlatList 
                data={modalListItems} 
                keyExtractor={(item) => item.id} 
                renderItem={({ item }) => (
                  <NavMenuOption icon={item.icon} color={item.color} bgColor={item.bgColor} label={item.label} description={item.description} onPress={() => handleItemPress(item.id)} style={styles.modalRowVerticalSpacer} />
                )} 
                ListHeaderComponent={() => (
                  <View style={styles.headerContainerBlockStack}>
                    <ProfileCard onTriggerLogin={() => handleItemPress('register_guest')} />
                    <View style={styles.groupHeaderLabelWrapper}>
                      <AppText type="bold" style={styles.groupSectionHeaderText}>Account Utilities</AppText>
                    </View>
                  </View>
                )} 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.flatListInnerScrollContentStyle} 
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  resumeCardWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f4f5', padding: 16, borderRadius: 12, marginHorizontal: 16, marginBottom: 16 },
  resumeAvatarFrame: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', marginRight: 12 },
  fallbackCircleAuth: { width: '100%', height: '100%', backgroundColor: '#e4e4e7', justifyContent: 'center', alignItems: 'center' },
  resumeProfileName: { fontSize: 16, color: '#18181b' },
  resumeEmailText: { fontSize: 13, color: '#71717a', marginTop: 2 },
  loggedOutPillBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  loggedOutPillText: { fontSize: 11, color: '#ef4444' },
  rowPressedStyle: { opacity: 0.7 },
  groupSectionContainer: { marginHorizontal: 16, marginBottom: 20 },
  groupHeaderLabelWrapper: { marginBottom: 8, paddingLeft: 4 },
  groupSectionHeaderText: { fontSize: 13, color: '#71717a', textTransform: 'uppercase', letterSpacing: 0.5 },
  groupContentBoxStack: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#f4f4f5', overflow: 'hidden' },
  menuItemRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderColor: '#f8f8f8' },
  menuItemIconWrapper: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuItemTextStack: { flex: 1 },
  menuItemTitleText: { fontSize: 15, color: '#18181b' },
  menuItemDescText: { fontSize: 12, color: '#a1a1aa', marginTop: 2 },
  modalOverlayScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  dismissalAbsoluteBackdrop: { ...StyleSheet.absoluteFillObject },
  bottomSheetCardContainer: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: height * 0.85 },
  sheetIndicatorBar: { width: 40, height: 5, backgroundColor: '#e4e4e7', borderRadius: 3, alignSelf: 'center', marginTop: 10, marginBottom: 14 },
  sheetHeaderControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  sheetTitleLabel: { fontSize: 20, color: '#18181b', flex: 1 },
  closeCircleWrapper: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff0f0', justifyContent: 'center', alignItems: 'center' },
  flatListInnerScrollContentStyle: { paddingBottom: 40 },
  headerContainerBlockStack: { paddingBottom: 8, paddingHorizontal: 16 },
  modalRowVerticalSpacer: { paddingHorizontal: 20 },
  quickResumeContainer: { padding: 24, backgroundColor: '#ffffff', borderRadius: 20 },
  quickResumeHeaderRow: { alignItems: 'flex-end', marginBottom: 16 },
  quickResumeCloseBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f4f4f5', justifyContent: 'center', alignItems: 'center' },
  quickResumeHeroTextSection: { marginBottom: 24 },
  quickResumeWelcomeTitle: { fontSize: 28, color: '#18181b' },
  quickResumeSubtext: { fontSize: 15, color: '#71717a', marginTop: 6, lineHeight: 20 },
  quickResumeCardWrapper: { marginBottom: 16 },
  quickResumeProfileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fafafa', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e4e4e7' },
  quickResumeCardActive: { borderColor: '#ff3b30', backgroundColor: '#fff0f0' },
  quickResumeAvatarWrapper: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', marginRight: 14 },
  quickResumeAvatarFallback: { width: '100%', height: '100%', backgroundColor: '#e4e4e7', justifyContent: 'center', alignItems: 'center' },
  quickResumeMetaInfo: { flex: 1 },
  quickResumeProfileName: { fontSize: 16, color: '#18181b' },
  quickResumeProfileEmail: { fontSize: 13, color: '#71717a', marginTop: 2 },
  quickResumeArrowBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e4e4e7' }
});