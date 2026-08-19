import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Image, Modal, Dimensions, FlatList, Animated, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import { Flame, Notebook, User, MessageSquareWarning, ChevronRight, LogOut, Trophy, Share2, UserCheck, BookmarkCheck, X, UserX, AlertCircle } from 'lucide-react-native';
import { AppText } from '../../../components/AppText';

const { height } = Dimensions.get('window');

const ModalOverlay = Platform.OS === 'ios' ? FullWindowOverlay : React.Fragment;

const BRAND_RED = '#dc2626';

const ENGAGEMENT_ITEMS = [
  { id: 'streaks', label: 'Daily Streaks', icon: Flame, color: BRAND_RED, bgColor: 'rgba(220, 38, 38, 0.06)' },
  { id: 'nerds', label: 'Global Machaira Nerds', icon: Trophy, color: BRAND_RED, bgColor: 'rgba(220, 38, 38, 0.06)' },
];

const UTILITIES_ITEMS = [
  { id: 'notes', label: 'My Notes', icon: Notebook, color: '#4b5563', bgColor: '#f3f4f6' },
  { id: 'support', label: 'FAQ', icon: MessageSquareWarning, color: '#4b5563', bgColor: '#f3f4f6' },
  { id: 'share', label: 'Share App', icon: Share2, color: '#4b5563', bgColor: '#f3f4f6' },
];

const CustomActionSheet = ({ visible, title, description, options = [], onClose, avatarUri, busy = false }) => {
  if (!visible) return null;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={busy ? undefined : onClose} statusBarTranslucent>
      <ModalOverlay>
        <View style={styles.actionSheetOverlayScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={busy ? undefined : onClose} />
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
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.actionSheetButtonRow,
                    opt.style === 'destructive' && styles.actionSheetDestructiveRow,
                    opt.style === 'cancel' && styles.actionSheetCancelRow,
                    pressed && !busy && styles.rowPressedStyle,
                    busy && styles.actionSheetButtonDisabled,
                  ]}
                  onPress={() => { if (!busy) opt.onPress?.(); }}
                >
                  {busy && opt.style === 'destructive' ? (
                    <ActivityIndicator size="small" color={BRAND_RED} />
                  ) : (
                    <AppText type="bold" style={[styles.actionSheetButtonLabel, opt.style === 'destructive' && styles.textDestructiveColor, opt.style === 'cancel' && styles.textCancelColor]}>
                      {opt.text}
                    </AppText>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ModalOverlay>
    </Modal>
  );
};

export const EphemeralToastBanner = ({ message, visible, onDismiss, tone = 'default' }) => {
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
      <View style={[styles.toastInnerContent, tone === 'error' && styles.toastInnerContentError]}>
        {tone === 'error' && <AlertCircle color="#dc2626" size={16} style={{ marginBottom: 4 }} />}
        <AppText type="bold" style={styles.toastTextMessage}>{message}</AppText>
      </View>
    </Animated.View>
  );
};

const ProfileCard = ({ user }) => (
  <View style={styles.mainIdentityCard}>
    <View style={styles.avatarRingOuterEdge}>
      {user?.photo ? (
        <Image source={{ uri: user.photo }} style={styles.largeProfileAvatar} />
      ) : (
        <View style={styles.largeFallbackAvatarCircle}>
          <User color={BRAND_RED} size={24} strokeWidth={2.5} />
        </View>
      )}
    </View>
    <View style={styles.identityTextDetails}>
      <View style={styles.nameBadgeInlineContainer}>
        <AppText type="bold" style={styles.textLight}>{user?.name ?? 'Your Account'}</AppText>
        <View style={styles.activeIndicatorPill}>
          <View style={styles.livePulseDot} />
          <AppText type="bold" style={styles.activePillText}>ACTIVE</AppText>
        </View>
      </View>
      <AppText type="regular" numberOfLines={1} style={styles.subLight}>{user?.email}</AppText>
    </View>
  </View>
);

const MetricMatrix = () => (
  <View style={styles.engagementStatsMatrixRow}>
    <View style={styles.statItemSquare}>
      <Flame color={BRAND_RED} size={18} strokeWidth={2.2} />
      <AppText type="bold" style={styles.statPrimaryValue}>12 Days</AppText>
      <AppText type="semiBold" style={styles.statSecondaryLabel}>Study Streak</AppText>
    </View>
    <View style={styles.verticalBorderDividerLine} />
    <View style={styles.statItemSquare}>
      <BookmarkCheck color={BRAND_RED} size={18} strokeWidth={2.2} />
      <AppText type="bold" style={styles.statPrimaryValue}>47 items</AppText>
      <AppText type="semiBold" style={styles.statSecondaryLabel}>Saved Episodes</AppText>
    </View>
  </View>
);

const NavMenuOption = ({ icon: Icon, color, bgColor, label, description, onPress, style, isLockedGroup, rightElement }) => (
  <Pressable style={({ pressed }) => [styles.menuItemRow, style, pressed && !rightElement && styles.rowPressedStyle]} onPress={onPress} disabled={!!rightElement}>
    <View style={[styles.menuItemIconWrapper, { backgroundColor: isLockedGroup ? '#f1f5f9' : bgColor }]}>
      <Icon color={isLockedGroup ? '#cbd5e1' : color} size={17} strokeWidth={2.2} />
    </View>
    <View style={styles.menuItemTextStack}>
      <AppText type="semiBold" style={[styles.menuItemTitleText, isLockedGroup && styles.loggedOutMenuLabel]}>{label}</AppText>
      {description && <AppText type="regular" style={styles.menuItemDescText}>{description}</AppText>}
    </View>
    {rightElement ? rightElement : isLockedGroup ? <Lock color="#cbd5e1" size={14} /> : <ChevronRight color="#9ca3af" size={16} strokeWidth={2.2} />}
  </Pressable>
);

// Bottom sheet used by MachairaHome. Props match what MachairaHome
// actually passes: onLogin (resume/re-auth), onLogout, onChangeAccount
// (switch to a different account), onDeleteAccount, onNavigateToSupport,
// and onNavigateToMenuOption (everything else — notes, share, streaks,
// nerds, profile details, notifications).
export const LoggedInProfileModalSheet = ({
  visible,
  onClose,
  user,
  onLogout,
  onChangeAccount,
  onDeleteAccount,
  onNavigateToSupport,
  onNavigateToMenuOption,
}) => {
  const insets = useSafeAreaInsets();
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', description: '', options: [], avatarUri: undefined });
  const [deleting, setDeleting] = useState(false);
  const pendingAlertTimeoutRef = useRef(null);

  const closeAlert = useCallback(() => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  }, []);

  const openAlertAfterClose = useCallback((config) => {
    onClose?.();
    if (pendingAlertTimeoutRef.current) clearTimeout(pendingAlertTimeoutRef.current);
    pendingAlertTimeoutRef.current = setTimeout(() => {
      setAlertConfig(config);
      pendingAlertTimeoutRef.current = null;
    }, 350);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (pendingAlertTimeoutRef.current) clearTimeout(pendingAlertTimeoutRef.current);
    };
  }, []);

  const handleDeleteConfirmed = useCallback(async () => {
    setDeleting(true);
    try {
      await onDeleteAccount?.();
      closeAlert();
    } finally {
      setDeleting(false);
    }
  }, [onDeleteAccount, closeAlert]);

  const handleItemPress = useCallback((id) => {
    if (id === 'logout') {
      openAlertAfterClose({
        visible: true,
        title: 'Logout of Machaira?',
        description: 'Your notes and favourite episodes will no longer be synced.',
        options: [
          { text: 'Logout', style: 'destructive', onPress: () => { closeAlert(); onLogout?.(); } },
          { text: 'Keep Me Logged In', style: 'cancel', onPress: closeAlert },
        ],
      });
    } else if (id === 'delete_account') {
      openAlertAfterClose({
        visible: true,
        title: 'Permanently Delete Account?',
        description: 'Are you sure you want to permanently erase your account and all associated data?',
        options: [
          { text: 'Delete Permanently', style: 'destructive', onPress: handleDeleteConfirmed },
          { text: 'Cancel', style: 'cancel', onPress: closeAlert },
        ],
      });
    } else if (id === 'support') {
      onClose?.();
      onNavigateToSupport ? onNavigateToSupport() : onNavigateToMenuOption?.('support');
    } else {
      onClose?.();
      onNavigateToMenuOption?.(id);
    }
  }, [closeAlert, onLogout, onNavigateToSupport, onNavigateToMenuOption, onClose, openAlertAfterClose, handleDeleteConfirmed]);

  const modalListItems = useMemo(() => {
    const list = [...ENGAGEMENT_ITEMS, ...UTILITIES_ITEMS];
    list.push({ id: 'logout', label: 'Logout', icon: LogOut, color: BRAND_RED, bgColor: 'rgba(220, 38, 38, 0.06)' });
    list.push({ id: 'delete_account', label: 'Delete Account', icon: UserX, color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.04)' });
    return list;
  }, []);

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
                    <View style={styles.modalInnerHeaderWrapper}>
                      <ProfileCard user={user} />
                    </View>
                    <Pressable style={({ pressed }) => [styles.inlineProfileButton, pressed && styles.rowPressedStyle]} onPress={() => { onClose?.(); onNavigateToMenuOption?.('profile_details'); }}>
                      <UserCheck color={BRAND_RED} size={16} strokeWidth={2.5} />
                      <AppText type="bold" style={styles.inlineProfileButtonText}>View Profile</AppText>
                    </Pressable>
                    <MetricMatrix />
                    <View style={styles.groupHeaderLabelWrapper}><AppText type="bold" style={styles.groupSectionHeaderText}>Account</AppText></View>
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
        busy={deleting}
        onClose={closeAlert}
      />
    </>
  );
};

const styles = StyleSheet.create({
  rowPressedStyle: { opacity: 0.85 },
  mainIdentityCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 22, borderRadius: 26, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: 'white' },
  avatarRingOuterEdge: { width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: BRAND_RED, padding: 3, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  largeProfileAvatar: { width: '100%', height: '100%', borderRadius: 26 },
  largeFallbackAvatarCircle: { width: '100%', height: '100%', borderRadius: 26, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center' },
  identityTextDetails: { flex: 1, justifyContent: 'center' },
  nameBadgeInlineContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  textLight: { fontSize: 19, color: '#111827', letterSpacing: -0.3 },
  activeIndicatorPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e6f4ea', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: '#34a853' },
  livePulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34a853', marginRight: 4 },
  activePillText: { fontSize: 8.5, color: '#137333', letterSpacing: 0.6, fontWeight: '800' },
  subLight: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  inlineProfileButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2', paddingVertical: 11, borderRadius: 24, marginHorizontal: 20, marginBottom: 20, borderWidth: 1, borderColor: '#fee2e2' },
  inlineProfileButtonText: { color: BRAND_RED, marginLeft: 6, fontSize: 13.5 },
  engagementStatsMatrixRow: { flexDirection: 'row', backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#f3f4f6', borderRadius: 16, marginHorizontal: 20, paddingVertical: 14, marginBottom: 24 },
  statItemSquare: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statPrimaryValue: { fontSize: 15, color: '#111827', marginTop: 4 },
  statSecondaryLabel: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  verticalBorderDividerLine: { width: 1, backgroundColor: '#e5e7eb' },
  groupHeaderLabelWrapper: { marginBottom: 10, paddingHorizontal: 20 },
  groupSectionHeaderText: { fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6 },
  menuItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#f9fafb' },
  menuItemIconWrapper: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuItemTextStack: { flex: 1, marginRight: 8 },
  menuItemTitleText: { fontSize: 14.5, color: '#1f2937' },
  loggedOutMenuLabel: { color: '#cbd5e1' },
  menuItemDescText: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  actionSheetOverlayScrim: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center' },
  actionSheetSurfaceContainer: { backgroundColor: '#ffffff', width: '85%', maxWidth: 380, borderRadius: 24, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24 },
  actionSheetHeaderBlock: { marginBottom: 20, alignItems: 'center' },
  actionSheetAvatarRing: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, borderColor: BRAND_RED, padding: 3, marginBottom: 16, justifyContent: 'center', alignItems: 'center' },
  actionSheetAvatarImage: { width: '100%', height: '100%', borderRadius: 34 },
  actionSheetTitleText: { fontSize: 18, color: '#0f172a', textAlign: 'center', marginBottom: 6 },
  actionSheetDescText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 10 },
  actionSheetOptionsGroupStack: { gap: 10 },
  actionSheetButtonRow: { width: '100%', backgroundColor: '#f1f5f9', paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionSheetButtonDisabled: { opacity: 0.7 },
  actionSheetDestructiveRow: { backgroundColor: '#fef2f2' },
  actionSheetCancelRow: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', marginTop: 4 },
  actionSheetButtonLabel: { fontSize: 14, color: '#334155' },
  textDestructiveColor: { color: BRAND_RED },
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
  toastInnerContent: { backgroundColor: '#ffffff', paddingVertical: 20, paddingHorizontal: 34, borderRadius: 25, width: '100%', alignItems: 'center', shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  toastInnerContentError: { borderWidth: 1, borderColor: '#fecaca' },
  toastTextMessage: { color: BRAND_RED, fontSize: 13.5, letterSpacing: 0.2, textAlign: 'center' },
});
