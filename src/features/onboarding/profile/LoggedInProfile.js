import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Image, Modal, Dimensions, FlatList, Animated, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import { Flame, Notebook, User, MessageSquareWarning, ChevronRight, LogOut, Share2, UserCheck, BookmarkCheck, X, UserX, AlertCircle, Lock } from 'lucide-react-native';
import { AppText } from '../../../components/AppText';
import { useTheme } from '../../../context/ThemeContext';

const { height } = Dimensions.get('window');
const ModalOverlay = Platform.OS === 'ios' ? FullWindowOverlay : React.Fragment;

const UTILITIES_ITEMS = [
  { id: 'notes', label: 'My Notes', icon: Notebook, useNeutral: true },
  { id: 'support', label: 'FAQ', icon: MessageSquareWarning, useNeutral: true },
  { id: 'share', label: 'Share App', icon: Share2, useNeutral: true },
];

const CustomActionSheet = ({ visible, title, description, options = [], onClose, avatarUri, busy = false }) => {
  const { colors, isDark } = useTheme();
  if (!visible) return null;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={busy ? undefined : onClose} statusBarTranslucent>
      <ModalOverlay>
        <View style={styles.actionSheetOverlayScrim}>
          <Pressable style={StyleSheet.absoluteFill} onPress={busy ? undefined : onClose} />
          <View style={[styles.actionSheetSurfaceContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {(avatarUri || title || description) && (
              <View style={styles.actionSheetHeaderBlock}>
                {avatarUri && (
                  <View style={[styles.actionSheetAvatarRing, { borderColor: colors.primary }]}>
                    <Image source={{ uri: avatarUri }} style={styles.actionSheetAvatarImage} />
                  </View>
                )}
                {title && <AppText type="black" style={[styles.actionSheetTitleText, { color: colors.text }]}>{title}</AppText>}
                {description && <AppText type="regular" style={[styles.actionSheetDescText, { color: colors.textSecondary }]}>{description}</AppText>}
              </View>
            )}

            <View style={styles.actionSheetOptionsGroupStack}>
              {options.map((opt, idx) => (
                <Pressable
                  key={idx}
                  disabled={busy}
                  style={({ pressed }) => [
                    styles.actionSheetButtonRow,
                    { backgroundColor: colors.surfaceMuted },
                    opt.isDangerous && { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
                    opt.style === 'cancel' && { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
                    pressed && !busy && styles.rowPressedStyle,
                    busy && styles.actionSheetButtonDisabled,
                  ]}
                  onPress={() => { if (!busy) opt.onPress?.(); }}
                >
                  {busy && opt.isDangerous ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <AppText type="bold" style={[styles.actionSheetButtonLabel, { color: colors.text }, opt.isDangerous && { color: colors.primary }, opt.style === 'cancel' && { color: colors.textSecondary }]}>
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

const ProfileCard = ({ user }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.mainIdentityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.avatarRingOuterEdge}>
        {user?.photo ? (
          <Image source={{ uri: user.photo }} style={styles.largeProfileAvatar} />
        ) : (
          <View style={[styles.largeFallbackAvatarCircle, { backgroundColor: colors.surfaceActive }]}>
            <User color={colors.primary} size={24} strokeWidth={2.5} />
          </View>
        )}
      </View>
      <View style={styles.identityTextDetails}>
        <View style={styles.nameBadgeInlineContainer}>
          <AppText type="bold" style={[styles.textLight, { color: colors.text }]}>{user?.name ?? 'Your Account'}</AppText>
          <View style={[styles.activeIndicatorPill, { backgroundColor: '#e6f4ea', borderColor: '#34a853' }]}>
            <View style={styles.livePulseDot} />
            <AppText type="bold" style={[styles.activePillText, { color: '#137333' }]}>ACTIVE</AppText>
          </View>
        </View>
        <AppText type="regular" numberOfLines={1} style={[styles.subLight, { color: colors.textSecondary }]}>{user?.email}</AppText>
      </View>
    </View>
  );
};

const MetricMatrix = ({ onNavigate, stats }) => {
  const { colors } = useTheme();
  const streak = stats?.current_streak ?? stats?.streakCount ?? 0;
  const saved = stats?.saved_count ?? stats?.savedCount ?? 0;

  return (
    <View style={[styles.engagementStatsMatrixRow, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
      <Pressable style={({ pressed }) => [styles.statItemSquare, pressed && styles.rowPressedStyle]} onPress={() => onNavigate?.('streaks')}>
        <Flame color={colors.text} size={18} strokeWidth={2.2} />
        <AppText type="bold" style={[styles.statPrimaryValue, { color: colors.text }]}>
          {streak} {streak === 1 ? 'Day' : 'Days'}
        </AppText>
        <AppText type="semiBold" style={[styles.statSecondaryLabel, { color: colors.textSecondary }]}>Study Streak</AppText>
      </Pressable>
      <View style={[styles.verticalBorderDividerLine, { backgroundColor: colors.border }]} />
      <Pressable style={({ pressed }) => [styles.statItemSquare, pressed && styles.rowPressedStyle]} onPress={() => onNavigate?.('saved')}>
        <BookmarkCheck color={colors.text} size={18} strokeWidth={2.2} />
        <AppText type="bold" style={[styles.statPrimaryValue, { color: colors.text }]}>
          {saved} {saved === 1 ? 'Episode' : 'Episodes'}
        </AppText>
        <AppText type="semiBold" style={[styles.statSecondaryLabel, { color: colors.textSecondary }]}>Saved</AppText>
      </Pressable>
    </View>
  );
};

const NavMenuOption = ({ icon: Icon, useNeutral, isDestructive, label, description, onPress, style, isLockedGroup, rightElement }) => {
  const { colors } = useTheme();
  const iconColor = isLockedGroup ? colors.textSecondary : (isDestructive ? colors.primary : colors.textSecondary);
  const iconBg = isLockedGroup ? colors.surfaceMuted : (isDestructive ? colors.card : colors.surfaceMuted);
  return (
    <Pressable style={({ pressed }) => [styles.menuItemRow, { borderBottomColor: colors.border }, style, pressed && !rightElement && styles.rowPressedStyle]} onPress={onPress} disabled={!!rightElement}>
      <View style={[styles.menuItemIconWrapper, { backgroundColor: iconBg }]}>
        <Icon color={iconColor} size={17} strokeWidth={2.2} />
      </View>
      <View style={styles.menuItemTextStack}>
        <AppText type="semiBold" style={[styles.menuItemTitleText, { color: colors.text }, isLockedGroup && { color: colors.textSecondary }]}>{label}</AppText>
        {description && <AppText type="regular" style={[styles.menuItemDescText, { color: colors.textSecondary }]}>{description}</AppText>}
      </View>
      {rightElement ? rightElement : isLockedGroup ? <Lock color={colors.textSecondary} size={14} /> : <ChevronRight color={colors.textSecondary} size={16} strokeWidth={2.2} />}
    </Pressable>
  );
};

export const LoggedInProfileModalSheet = ({
  visible,
  onClose,
  user,
  stats,
  onLogout,
  onChangeAccount,
  onDeleteAccount,
  onNavigateToSupport,
  onNavigateToMenuOption,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
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
          { text: 'Delete Permanently', style: 'destructive', isDangerous: true, onPress: handleDeleteConfirmed },
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
    const list = [...UTILITIES_ITEMS];
    list.push({ id: 'logout', label: 'Logout', icon: LogOut });
    list.push({ id: 'delete_account', label: 'Delete Account', icon: UserX, isDestructive: true });
    return list;
  }, []);

  return (
    <>
      <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose} statusBarTranslucent>
        <ModalOverlay>
          <View style={styles.modalOverlayScrim}>
            <Pressable style={styles.dismissalAbsoluteBackdrop} onPress={onClose} />
            <View style={[styles.bottomSheetCardContainer, { backgroundColor: colors.card, paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={[styles.sheetIndicatorBar, { backgroundColor: colors.border }]} />
              <View style={styles.sheetHeaderControls}>
                <AppText type="black" style={[styles.sheetTitleLabel, { color: colors.text }]}>Account Settings</AppText>
                <Pressable style={[styles.closeCircleWrapper, { backgroundColor: colors.surfaceMuted }]} onPress={onClose}><X color={colors.textSecondary} size={14} strokeWidth={2.5} /></Pressable>
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
                    <Pressable style={({ pressed }) => [styles.inlineProfileButton, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }, pressed && styles.rowPressedStyle]} onPress={() => { onClose?.(); onNavigateToMenuOption?.('profile_details'); }}>
                      <UserCheck color={colors.text} size={16} strokeWidth={2.5} />
                      <AppText type="bold" style={[styles.inlineProfileButtonText, { color: colors.text }]}>View Profile</AppText>
                    </Pressable>
                    <MetricMatrix onNavigate={handleItemPress} stats={stats} />
                    <View style={styles.groupHeaderLabelWrapper}><AppText type="bold" style={[styles.groupSectionHeaderText, { color: colors.textSecondary }]}>Account</AppText></View>
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
  mainIdentityCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 22, borderRadius: 26, borderWidth: 1 },
  avatarRingOuterEdge: { width: 62, height: 62, padding: 3, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  largeProfileAvatar: { width: '100%', height: '100%', borderRadius: 31 },
  largeFallbackAvatarCircle: { width: '100%', height: '100%', borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  identityTextDetails: { flex: 1, justifyContent: 'center' },
  nameBadgeInlineContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  textLight: { fontSize: 19, letterSpacing: -0.3 },
  activeIndicatorPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1 },
  livePulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34a853', marginRight: 4 },
  activePillText: { fontSize: 8.5, letterSpacing: 0.6, fontWeight: '800' },
  subLight: { fontSize: 13, marginTop: 4 },
  inlineProfileButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 24, marginHorizontal: 20, marginBottom: 20, borderWidth: 1 },
  inlineProfileButtonText: { marginLeft: 6, fontSize: 13.5 },
  engagementStatsMatrixRow: { flexDirection: 'row', borderWidth: 1, borderRadius: 16, marginHorizontal: 20, paddingVertical: 14, marginBottom: 24 },
  statItemSquare: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statPrimaryValue: { fontSize: 15, marginTop: 4 },
  statSecondaryLabel: { fontSize: 11, marginTop: 1 },
  verticalBorderDividerLine: { width: 1 },
  groupHeaderLabelWrapper: { marginBottom: 10, paddingHorizontal: 20 },
  groupSectionHeaderText: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  menuItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
  menuItemIconWrapper: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuItemTextStack: { flex: 1, marginRight: 8 },
  menuItemTitleText: { fontSize: 14.5 },
  menuItemDescText: { fontSize: 12, marginTop: 2 },
  actionSheetOverlayScrim: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center' },
  actionSheetSurfaceContainer: { width: '85%', maxWidth: 380, borderRadius: 24, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24, borderWidth: 1 },
  actionSheetHeaderBlock: { marginBottom: 20, alignItems: 'center' },
  actionSheetAvatarRing: { width: 76, height: 76, borderRadius: 38, borderWidth: 3, padding: 3, marginBottom: 16, justifyContent: 'center', alignItems: 'center' },
  actionSheetAvatarImage: { width: '100%', height: '100%', borderRadius: 34 },
  actionSheetTitleText: { fontSize: 18, textAlign: 'center', marginBottom: 6 },
  actionSheetDescText: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 10 },
  actionSheetOptionsGroupStack: { gap: 10 },
  actionSheetButtonRow: { width: '100%', paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionSheetButtonDisabled: { opacity: 0.7 },
  actionSheetButtonLabel: { fontSize: 14 },
  modalOverlayScrim: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  dismissalAbsoluteBackdrop: { ...StyleSheet.absoluteFillObject },
  bottomSheetCardContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.85 },
  sheetIndicatorBar: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 14 },
  sheetHeaderControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  sheetTitleLabel: { fontSize: 19, flex: 1, fontWeight: '800' },
  closeCircleWrapper: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  flatListInnerScrollContentStyle: { paddingBottom: 40 },
  headerContainerBlockStack: { paddingBottom: 4 },
  modalInnerHeaderWrapper: { paddingHorizontal: 20, marginBottom: 14 },
  modalRowVerticalSpacer: { paddingHorizontal: 20 },
});
