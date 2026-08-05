import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Image, Modal, Dimensions, FlatList, Animated, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import * as SecureStore from 'expo-secure-store';
import { Flame, Gift, Globe, Notebook, User, Heart, MessageSquareWarning, ChevronRight, LogOut, Trophy, Share2, Bell, UserCheck, BookmarkCheck, X, UserX, Lock } from 'lucide-react-native';
import { AppText } from '../../../components/AppText';

const { height, width } = Dimensions.get('window');

const ModalOverlay = Platform.OS === 'ios' ? FullWindowOverlay : React.Fragment;

const ENGAGEMENT_ITEMS = [
  { id: 'readers', label: 'Top Readers', icon: Trophy, color: '#dc2626', bgColor: 'rgba(220, 38, 38, 0.06)' },
  { id: 'streaks', label: 'Daily Streaks', icon: Flame, color: '#dc2626', bgColor: 'rgba(220, 38, 38, 0.06)' },
  { id: 'rewards', label: 'Rewards', icon: Gift, color: '#dc2626', bgColor: 'rgba(220, 38, 38, 0.06)' },
  { id: 'nerds', label: 'Global Machaira Nerds', icon: Globe, color: '#dc2626', bgColor: 'rgba(220, 38, 38, 0.06)' },
];

const UTILITIES_ITEMS = [
  { id: 'notes', label: 'My Notes', icon: Notebook, color: '#4b5563', bgColor: '#f3f4f6' },
  { id: 'support', label: 'FAQ', icon: MessageSquareWarning, color: '#4b5563', bgColor: '#f3f4f6' },
  { id: 'share', label: 'Share App', icon: Share2, color: '#4b5563', bgColor: '#f3f4f6' },
];

// ==========================================
// CUSTOM ACTION SHEET MODAL (REPLACES SYSTEM ALERT)
// ==========================================
const CustomActionSheet = ({ visible, title, description, options = [], onClose, avatarUri }) => {
  if (!visible) return null;

  return (
    <Modal 
      animationType="fade" 
      transparent 
      visible={visible} 
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <ModalOverlay>
        <View style={styles.actionSheetOverlayScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={styles.actionSheetSurfaceContainer}>
            
            {(avatarUri || title || description) && (
              <View style={styles.actionSheetHeaderBlock}>
                {avatarUri && (
                  <View style={styles.actionSheetAvatarRing}>
                    <Image source={{ uri: avatarUri }} style={styles.actionSheetAvatarImage} />
                  </View>
                )}
                {title && <AppText type="black" style={styles.actionSheetTitleText}>{title}</AppText>}
                {description && <AppText type="regular" style={styles.actionSheetDescText}>{description}</AppText>}
              </View>
            )}

            <View style={styles.actionSheetOptionsGroupStack}>
    {options.map((opt, idx) => (
      <Pressable 
        key={idx} 
        style={({ pressed }) => [
          styles.actionSheetButtonRow, 
          opt.style === 'destructive' && styles.actionSheetDestructiveRow,
          opt.style === 'cancel' && styles.actionSheetCancelRow,
          pressed && styles.rowPressedStyle
        ]} 
        onPress={() => {
          onClose();
          opt.onPress?.();
        }}
      >
        <AppText 
          type="bold" 
          style={[
            styles.actionSheetButtonLabel, 
            opt.style === 'destructive' && styles.textDestructiveColor,
            opt.style === 'cancel' && styles.textCancelColor
          ]}
        >
          {opt.text}
        </AppText>
      </Pressable>
    ))}
  </View>
          </View>
        </View>
      </ModalOverlay>
    </Modal>
  );
};

// ==========================================
// TOAST BANNER SUB-COMPONENT
// ==========================================
export const EphemeralToastBanner = ({ message, visible, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const slideValue = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(slideValue, { toValue: insets.top + 10, duration: 350, useNativeDriver: true }),
        Animated.delay(2600),
        Animated.timing(slideValue, { toValue: -100, duration: 250, useNativeDriver: true }),
      ]).start(() => { if (onDismiss) onDismiss(); });
    }
  }, [visible, slideValue, onDismiss, insets.top]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.toastWrapper, { transform: [{ translateY: slideValue }] }]}>
      <View style={styles.toastInnerContent}>
        <AppText type="bold" style={styles.toastTextMessage}>{message}</AppText>
      </View>
    </Animated.View>
  );
};

// ==========================================
// CORE LAYOUT SUB-COMPONENTS
// ==========================================
const ProfileCard = ({ user, isLoggedOut, onProfilePress }) => {
  if (isLoggedOut) {
    return (
      <Pressable 
        style={({ pressed }) => [styles.premiumLockScreenCard, pressed && styles.rowPressedStyle]} 
        onPress={onProfilePress}
      >
        <View style={styles.premiumLockBackdropGlow} />
        <View style={styles.premiumLockLayoutContent}>
          <View style={styles.premiumLockAvatarFrame}>
            <View style={styles.premiumavatarRingOuterEdge}>
            {user.photo ? (
              <Image source={{ uri: user.photo }} style={styles.premiumLockAvatarImage} />
            ) : (
              <View style={styles.welcomeBackAvatarFallback}>
                <User color="red" size={20} />
              </View>
            )}
          </View></View>
          
          <View style={styles.premiumLockIdentityDetails}>
            <AppText type="bold" style={styles.premiumLockNameText}>{user.name}</AppText>
            <AppText type="regular" style={styles.premiumLockSecondaryActionText}>
              You are logged-out. Click here to log back in!
            </AppText>
          </View>
          
          <View style={styles.premiumLockChevronCircle}>
            <ChevronRight color="#ffffff" size={16} strokeWidth={2.5} />
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={styles.mainIdentityCard}>
      <View style={styles.avatarRingOuterEdge}>
        {user.photo ? (
          <Image source={{ uri: user.photo }} style={styles.largeProfileAvatar} />
        ) : (
          <View style={styles.largeFallbackAvatarCircle}>
            <User color="#dc2626" size={24} strokeWidth={2.5} />
          </View>
        )}
      </View>
      <View style={styles.identityTextDetails}>
        <View style={styles.nameBadgeInlineContainer}>
          <AppText type="bold" style={styles.textLight}>{user.name}</AppText>
          <View style={styles.activeIndicatorPill}>
            <View style={styles.livePulseDot} />
            <AppText type="bold" style={styles.activePillText}>ACTIVE</AppText>
          </View>
        </View>
        <AppText type="regular" numberOfLines={1} style={styles.subLight}>{user.email}</AppText>
      </View>
    </View>
  );
};

const MetricMatrix = () => (
  <View style={styles.engagementStatsMatrixRow}>
    <View style={styles.statItemSquare}>
      <Flame color="#dc2626" size={18} strokeWidth={2.2} />
      <AppText type="bold" style={styles.statPrimaryValue}>12 Days</AppText>
      <AppText type="semiBold" style={styles.statSecondaryLabel}>Study Streak</AppText>
    </View>
    <View style={styles.verticalBorderDividerLine} />
    <View style={styles.statItemSquare}>
      <BookmarkCheck color="#dc2626" size={18} strokeWidth={2.2} />
      <AppText type="bold" style={styles.statPrimaryValue}>47 items</AppText>
      <AppText type="semiBold" style={styles.statSecondaryLabel}>Saved Episodes</AppText>
    </View>
  </View>
);

const NavMenuOption = ({ icon: Icon, color, bgColor, label, description, onPress, style, isLockedGroup, rightElement }) => {
  return (
    <Pressable style={({ pressed }) => [styles.menuItemRow, style, pressed && !rightElement && styles.rowPressedStyle]} onPress={onPress} disabled={!!rightElement}>
      <View style={[styles.menuItemIconWrapper, { backgroundColor: isLockedGroup ? '#f1f5f9' : bgColor }]}>
        <Icon color={isLockedGroup ? '#cbd5e1' : color} size={17} strokeWidth={2.2} />
      </View>
      <View style={styles.menuItemTextStack}>
        <AppText type="semiBold" style={[styles.menuItemTitleText, isLockedGroup && styles.loggedOutMenuLabel]}>{label}</AppText>
        {description && <AppText type="regular" style={styles.menuItemDescText}>{description}</AppText>}
      </View>
      {rightElement ? (
        rightElement
      ) : isLockedGroup ? (
        <Lock color="#cbd5e1" size={14} />
      ) : (
        <ChevronRight color="#9ca3af" size={16} strokeWidth={2.2} />
      )}
    </Pressable>
  );
};

// ==========================================
// SCROLLABLE SCREEN CONTENT COMPONENT
// ==========================================
export const LoggedInProfileDashboardContent = ({ user, isLoggedOut = false, onLogin, onLogout, onChangeAccount, onDeleteAccount, onNavigateToSupport, onNavigateToMenuOption, onClose }) => {
  const insets = useSafeAreaInsets();
  
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', description: '', options: [], avatarUri: undefined });

  const handleProfilePress = useCallback(() => {
    if (!isLoggedOut) return;

    setAlertConfig({
      visible: true,
      avatarUri: user.photo,
      description: `Choose how you would like to proceed with the ${user.name} account.`,
      options: [
        { 
          text: `Continue as ${user.name.split(' ')[0]}`, 
          onPress: () => onLogin?.()
        },
        { text: 'Use Different Account', style: 'destructive', onPress: () => onChangeAccount?.() },
        { text: 'Cancel', style: 'cancel' }
      ]
    });
  }, [isLoggedOut, user, onLogin, onChangeAccount]);

  const handlePress = useCallback((id) => {
    if (id === 'logout') {
      if (isLoggedOut) {
        onLogin?.();
      } else {
        setAlertConfig({
          visible: true,
          title: 'Logout of Machaira?',
          description: 'Your locally cached profile context will be locked safely until your next sign-in.',
          options: [
            { text: 'Log Out Session', style: 'destructive', onPress: () => onLogout?.() },
            { text: 'Keep Me Logged In', style: 'cancel' }
          ]
        });
      }
    } else if (id === 'delete_account') {
      setAlertConfig({
        visible: true,
        title: 'Permanently Delete Account?',
        description: 'Warning: This action cannot be undone. All offline logs, streaks, and custom saved preferences will be completely destroyed.',
        options: [
          { text: 'Delete Permanently', style: 'destructive', onPress: () => onDeleteAccount?.() },
          { text: 'Cancel', style: 'cancel' }
        ]
      });
    } else if (id === 'support') {
      onNavigateToSupport ? onNavigateToSupport() : onNavigateToMenuOption?.('support');
    } else onNavigateToMenuOption?.(id);
  }, [isLoggedOut, user, onLogin, onLogout, onDeleteAccount, onNavigateToSupport, onNavigateToMenuOption]);

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container} contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 60 }}>
        
        <View style={styles.profileHeaderCardWrapper}>
          <ProfileCard user={user} isLoggedOut={isLoggedOut} onProfilePress={handleProfilePress} />
        </View>
        
        {!isLoggedOut && (
          <View style={styles.centeredActionsWrapperRow}>
            <Pressable style={({ pressed }) => [styles.inlineProfileButton, pressed && styles.rowPressedStyle]} onPress={() => onNavigateToMenuOption?.('profile_details')}>
              <UserCheck color="#dc2626" size={16} strokeWidth={2.5} />
              <AppText type="bold" style={styles.inlineProfileButtonText}>View Profile</AppText>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.bellIconButton, pressed && styles.rowPressedStyle]} onPress={() => onNavigateToMenuOption?.('notifications')}>
              <Bell color="#4b5563" size={18} strokeWidth={2.2} />
            </Pressable>
          </View>
        )}

        {!isLoggedOut && <MetricMatrix />}
        
        {!isLoggedOut && (
          <View style={styles.groupSectionContainer}>
            <View style={styles.groupHeaderLabelWrapper}>
              <AppText type="bold" style={styles.groupSectionHeaderText}>Engagement & Rewards</AppText>
            </View>
            <View style={styles.groupContentBoxStack}>
              {ENGAGEMENT_ITEMS.map((item) => (
                <NavMenuOption key={item.id} icon={item.icon} color={item.color} bgColor={item.bgColor} label={item.label} isLockedGroup={false} onPress={() => handlePress(item.id)} />
              ))}
            </View>
          </View>
        )}

        <View style={styles.groupSectionContainer}>
          <View style={styles.groupHeaderLabelWrapper}>
            <AppText type="bold" style={styles.groupSectionHeaderText}>Account Utilities</AppText>
          </View>
          <View style={styles.groupContentBoxStack}>
            {UTILITIES_ITEMS.map((item) => (
              <NavMenuOption key={item.id} icon={item.icon} color={item.color} bgColor={item.bgColor} label={item.label} isLockedGroup={false} onPress={() => handlePress(item.id)} />
            ))}
            
            {!isLoggedOut && (
              <NavMenuOption id="logout" label="Logout" icon={LogOut} color="#dc2626" bgColor="rgba(220, 38, 38, 0.06)" isLockedGroup={false} onPress={() => handlePress('logout')} />
            )}
            <NavMenuOption id="delete_account" label="Delete Account" icon={UserX} color="#ef4444" bgColor="rgba(239, 68, 68, 0.04)" isLockedGroup={false} onPress={() => handlePress('delete_account')} />
          </View>
        </View>
      </ScrollView>

      <CustomActionSheet 
        visible={alertConfig.visible}
        title={alertConfig.title}
        description={alertConfig.description}
        options={alertConfig.options}
        avatarUri={alertConfig.avatarUri}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </>
  );
};

// ==========================================
// BOTTOM SHEET MODAL LAYOUT COMPONENT
// ==========================================
export const LoggedInProfileModalSheet = ({ 
  visible, onClose, user, isLoggedOut = false, onLogin, onLogout, onChangeAccount, onDeleteAccount, onNavigateToSupport, onNavigateToMenuOption
}) => {
  const insets = useSafeAreaInsets();
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', description: '', options: [], avatarUri: undefined });
  const pendingAlertTimeoutRef = useRef(null);

  const openAlertAfterClose = useCallback((config) => {
    onClose?.();
    if (pendingAlertTimeoutRef.current) {
      clearTimeout(pendingAlertTimeoutRef.current);
    }
    pendingAlertTimeoutRef.current = setTimeout(() => {
      setAlertConfig(config);
      pendingAlertTimeoutRef.current = null;
    }, 350);
  }, [onClose]);

  // Clear any pending alert timeout if this component unmounts before it fires.
  useEffect(() => {
    return () => {
      if (pendingAlertTimeoutRef.current) {
        clearTimeout(pendingAlertTimeoutRef.current);
      }
    };
  }, []);

  const handleProfilePress = useCallback(() => {
    if (!isLoggedOut) return;

    openAlertAfterClose({
      visible: true,
      avatarUri: user.photo,
      description: `Choose how you would like to proceed with the ${user.name} account.`,
      options: [
        { 
          text: `Continue as ${user.name.split(' ')[0]}`, 
          onPress: () => onLogin?.() 
        },
        { text: 'Use Different Account', style: 'destructive', onPress: () => onChangeAccount?.() },
        { text: 'Cancel', style: 'cancel' }
      ]
    });
  }, [isLoggedOut, user, onLogin, onChangeAccount, openAlertAfterClose]);

  const handleItemPress = useCallback((id) => {
    if (id === 'logout') {
      openAlertAfterClose({
        visible: true,
        title: 'Logout of Machaira?',
        description: 'Your notes and favourite episodes will no longer be synced.',
        options: [{ text: 'Logout', style: 'destructive', onPress: () => onLogout?.() }, { text: 'Keep Me Logged In', style: 'cancel' }]
      });
    } else if (id === 'delete_account') {
      openAlertAfterClose({
        visible: true,
        title: 'Permanently Delete Account?',
        description: 'Are you sure you want to completely erase your footprint?',
        options: [{ text: 'Delete Permanently', style: 'destructive', onPress: () => onDeleteAccount?.() }, { text: 'Cancel', style: 'cancel' }]
      });
    } else {
      if (id === 'support') onNavigateToSupport ? onNavigateToSupport() : onNavigateToMenuOption?.('support');
      else onNavigateToMenuOption?.(id);
      onClose();
    }
  }, [isLoggedOut, user, onLogin, onLogout, onDeleteAccount, onNavigateToSupport, onNavigateToMenuOption, onClose, openAlertAfterClose]);

  const modalListItems = useMemo(() => {
    const list = [...UTILITIES_ITEMS];
    if (!isLoggedOut) list.push({ id: 'logout', label: 'Logout', icon: LogOut, color: '#dc2626', bgColor: 'rgba(220, 38, 38, 0.06)' });
    list.push({ id: 'delete_account', label: 'Delete Account', icon: UserX, color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.04)' });
    return list;
  }, [isLoggedOut]);

  return (
    <>
      <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose} statusBarTranslucent>
        <ModalOverlay>
          <View style={styles.modalOverlayScrim}>
            <Pressable style={styles.dismissalAbsoluteBackdrop} onPress={onClose} />
            <View style={[styles.bottomSheetCardContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.sheetIndicatorBar} />
              <View style={styles.sheetHeaderControls}>
                <AppText type="black" style={styles.sheetTitleLabel}>Account Settings</AppText>
                <Pressable style={styles.closeCircleWrapper} onPress={onClose}><X color="#9ca3af" size={14} strokeWidth={2.5} /></Pressable>
              </View>
              <FlatList 
                data={modalListItems} 
                keyExtractor={(item) => item.id} 
                renderItem={({ item }) => <NavMenuOption {...item} onPress={() => handleItemPress(item.id)} style={styles.modalRowVerticalSpacer} />}
                contentContainerStyle={styles.flatListInnerScrollContentStyle}
                ListHeaderComponent={() => (
                  <View style={styles.headerContainerBlockStack}>
                    <View style={styles.modalInnerHeaderWrapper}><ProfileCard user={user} isLoggedOut={isLoggedOut} onProfilePress={handleProfilePress} /></View>
                    {!isLoggedOut && <MetricMatrix />}
                    <View style={styles.groupHeaderLabelWrapper}><AppText type="bold" style={styles.groupSectionHeaderText}>Account Utilities</AppText></View>
                  </View>
                )}
              />
            </View>
          </View>
        </ModalOverlay>
      </Modal>

      <CustomActionSheet 
        visible={alertConfig.visible}
        title={alertConfig.title}
        description={alertConfig.description}
        options={alertConfig.options}
        avatarUri={alertConfig.avatarUri}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </>
  );
};

// ==========================================
// MAIN CONTROLLER SCREEN
// ==========================================
export default function ProfileTabScreen() {
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const initializeUser = async () => {
    try {
      const userDataString = await SecureStore.getItemAsync('user_auth');
      
      if (userDataString) {
        setUserData(JSON.parse(userDataString));
      } else {
        const defaultUser = {
          name: 'Bosslady Gayles',
          email: 'gayles@example.com',
          photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80'
        };
        await SecureStore.setItemAsync('user_auth', JSON.stringify(defaultUser));
        setUserData(defaultUser);
      }
    } catch (e) {
      console.error("Failed to load secure user data", e);
    } finally {
      setLoading(false);
    }
  };
  initializeUser();
}, []);

  const handleDeleteAccount = useCallback(() => {}, []);

  if (loading) {
    return (
      <View style={[styles.screenContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#dc2626" />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <LoggedInProfileDashboardContent
        user={userData}
        isLoggedOut={isLoggedOut}
        onClose={() => setModalVisible(false)} 
        onLogin={() => setIsLoggedOut(false)}
        onLogout={() => {
            setIsLoggedOut(true);
            setModalVisible(false);
            setToastVisible(true);
        }}
        onChangeAccount={() => {}}
        onDeleteAccount={handleDeleteAccount}
        onNavigateToMenuOption={(target) => { if (target === 'profile_details' || target === 'notifications') setModalVisible(true); }}
      />
      
      <LoggedInProfileModalSheet
              visible={modalVisible}
              onClose={() => setModalVisible(false)}
              user={userData}
              isLoggedOut={isLoggedOut}
              onLogin={() => setIsLoggedOut(false)}
              onLogout={() => {
                  setIsLoggedOut(true);
                  setModalVisible(false);
                  setToastVisible(true);
              }}
              onDeleteAccount={handleDeleteAccount}
            />

      <EphemeralToastBanner message="You have logged out of your account." visible={toastVisible} onDismiss={() => setToastVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, backgroundColor: '#ffffff' },
  profileHeaderCardWrapper: { paddingHorizontal: 20, marginBottom: 14 },
  mainIdentityCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 22, borderRadius: 26, borderWidth: 1, borderColor: '#352a48', backgroundColor: 'white' },
  avatarRingOuterEdge: { width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: '#34a853', padding: 3, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  largeProfileAvatar: { width: '100%', height: '100%', borderRadius: 26 },
  largeFallbackAvatarCircle: { width: '100%', height: '100%', borderRadius: 26, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center' },
  identityTextDetails: { flex: 1, justifyContent: 'center' },
  nameBadgeInlineContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  textLight: { fontSize: 19, color: '#352a48', letterSpacing: -0.3 },
  activeIndicatorPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e6f4ea', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: '#34a853' },
  livePulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34a853', marginRight: 4 },
  activePillText: { fontSize: 8.5, color: '#137333', letterSpacing: 0.6, fontWeight: '800' },
  subLight: { fontSize: 13, color: '#352a48', marginTop: 4 },
  
  premiumLockScreenCard: { backgroundColor: 'white', borderWidth: 1, borderColor: '#352a48', borderRadius: 26, padding: 18, overflow: 'hidden', shadowColor: '#352a48', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 4 },
  premiumLockBackdropGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.04)' },
  premiumLockLayoutContent: { flexDirection: 'row', alignItems: 'center' },
  premiumavatarRingOuterEdge: { width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: '#352a48', padding: 3, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  premiumLockAvatarFrame: { position: 'relative', width: 54, height: 54, marginRight: 16 },
  premiumLockAvatarImage: { width: '100%', height: '100%', borderRadius: 27, opacity: 0.85, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.4)' },
  premiumLockIdentityDetails: { flex: 1, justifyContent: 'center' },
  premiumLockNameText: { fontSize: 18, color: '#352a48', letterSpacing: -0.2 },
  premiumLockSecondaryActionText: { fontSize: 13, color: '#352a48', marginTop: 3 },
  premiumLockChevronCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#352a48', justifyContent: 'center', alignItems: 'center' },

  welcomeBackAvatarFallback: { width: '100%', height: '100%', borderRadius: 27, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center' },
  centeredActionsWrapperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', paddingHorizontal: 20, marginBottom: 20 },
  inlineProfileButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2', paddingVertical: 11, borderRadius: 24, marginRight: 10, borderWidth: 1, borderColor: '#fee2e2' },
  inlineProfileButtonText: { color: '#dc2626', marginLeft: 6, fontSize: 13.5 },
  bellIconButton: { width: 42, height: 42, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', borderRadius: 21, borderWidth: 1, borderColor: '#e2e8f0' },
  rowPressedStyle: { opacity: 0.85 },
  engagementStatsMatrixRow: { flexDirection: 'row', backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 16, marginHorizontal: 20, paddingVertical: 14, marginBottom: 24 },
  statItemSquare: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statPrimaryValue: { fontSize: 15, color: '#111827', marginTop: 4 },
  statSecondaryLabel: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  verticalBorderDividerLine: { width: 1, backgroundColor: '#e5e7eb' },
  groupSectionContainer: { marginBottom: 20 },
  groupHeaderLabelWrapper: { marginBottom: 10, paddingHorizontal: 20 },
  groupSectionHeaderText: { fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6 },
  groupContentBoxStack: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden', marginHorizontal: 20 },
  menuItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#f9fafb' },
  menuItemIconWrapper: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuItemTextStack: { flex: 1, marginRight: 8 },
  menuItemTitleText: { fontSize: 14.5, color: '#1f2937' },
  loggedOutMenuLabel: { color: '#cbd5e1' },
  menuItemDescText: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  
  // Custom Action Sheet Specific Styles
  actionSheetOverlayScrim: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center' },
  actionSheetSurfaceContainer: { backgroundColor: '#ffffff', width: '85%', maxWidth: 380, borderRadius: 24, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24 },
  actionSheetHeaderBlock: { marginBottom: 20, alignItems: 'center'},
  actionSheetAvatarRing: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: '#dc2626', padding: 3, marginBottom: 16, justifyContent: 'center', alignItems: 'center' },
  actionSheetAvatarImage: { width: '100%', height: '100%', borderRadius: 34 },
  actionSheetTitleText: { fontSize: 18, color: '#0f172a', textAlign: 'center', marginBottom: 6, },
  actionSheetDescText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 10, },
  actionSheetOptionsGroupStack: { gap: 10 },
  actionSheetButtonRow: { width: '100%', backgroundColor: '#f1f5f9', paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionSheetDestructiveRow: { backgroundColor: '#fef2f2' },
  actionSheetCancelRow: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', marginTop: 4 },
  actionSheetButtonLabel: { fontSize: 14, color: '#334155' },
  textDestructiveColor: { color: '#dc2626' },
  textCancelColor: { color: '#64748b' },

  modalOverlayScrim: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  dismissalAbsoluteBackdrop: { ...StyleSheet.absoluteFillObject },
  bottomSheetCardContainer: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.85 },
  sheetIndicatorBar: { width: 36, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 14 },
  sheetHeaderControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  sheetTitleLabel: { fontSize: 19, color: '#111827', flex: 1, fontWeight: '800' },
  closeCircleWrapper: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  flatListInnerScrollContentStyle: { paddingBottom: 40 },
  headerContainerBlockStack: { paddingBottom: 4 },
  modalInnerHeaderWrapper: { paddingHorizontal: 20, marginBottom: 14 },
  modalRowVerticalSpacer: { paddingHorizontal: 20 },
  toastWrapper: { position: 'absolute', top: 0, left: 20, right: 20, zIndex: 99999, alignItems: 'center' },
  toastInnerContent: { backgroundColor: '#ffffff', paddingVertical: 25, paddingHorizontal: 34, borderRadius: 25, width: '100%', alignItems: 'center', shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  toastTextMessage: { color: '#dc2626', fontSize: 13.5, letterSpacing: 0.2 }
});