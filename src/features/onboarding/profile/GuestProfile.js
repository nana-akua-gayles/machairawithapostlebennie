import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Modal, Dimensions, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Notebook, MessageSquareWarning, Share2, ChevronRight, LogIn, X } from 'lucide-react-native';
import { AppText } from '../../../components/AppText';
import { useTheme } from '../../../context/ThemeContext';

const { height } = Dimensions.get('window');


const UTILITIES_ITEMS = [
  { id: 'support', label: 'FAQ', icon: MessageSquareWarning },
  { id: 'share', label: 'Share App', icon: Share2 },
];

const ProfileCard = ({ colors }) => (
  <View style={[styles.resumeCardWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <View style={styles.resumeAvatarFrame}>
      <View style={[styles.fallbackCircleAuth, { backgroundColor: colors.border }]}>
        <User color={colors.textSecondary} size={22} />
      </View>
    </View>
    <View style={{ flex: 1 }}>
      <AppText type="bold" style={[styles.resumeProfileName, { color: colors.text }]}>Guest</AppText>
      <AppText type="regular" style={[styles.resumeEmailText, { color: colors.textSecondary }]}>In the Kingdom, there are no guests, kindly establish thy dwelling.</AppText>
    </View>
  </View>
);

const NavMenuOption = ({ icon: Icon, label, onPress, style, colors }) => (
  <Pressable
    style={({ pressed }) => [styles.menuItemRow, { borderColor: colors.border }, style, pressed && styles.rowPressedStyle]}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
  >
    <View style={[styles.menuItemIconWrapper, { backgroundColor: colors.border }]}>
      <Icon color={colors.textSecondary} size={18} strokeWidth={2.2} />
    </View>
    <View style={styles.menuItemTextStack}>
      <AppText type="semiBold" style={[styles.menuItemTitleText, { color: colors.text }]}>{label}</AppText>
    </View>
    <ChevronRight color={colors.textSecondary} size={15} strokeWidth={2.2} />
  </Pressable>
);

export const GuestProfileDashboardContent = ({ onTriggerLogin, onNavigateToSupport, onNavigateToMenuOption }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const handlePress = useCallback((id) => {
    if (id === 'register_guest') {
      onTriggerLogin?.();
    } else if (id === 'support') {
      onNavigateToSupport ? onNavigateToSupport() : onNavigateToMenuOption?.('support');
    } else {
      onNavigateToMenuOption?.(id);
    }
  }, [onTriggerLogin, onNavigateToSupport, onNavigateToMenuOption]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 60 }}
      >
        <ProfileCard colors={colors} />

        <View style={styles.groupSectionContainer}>
          <View style={styles.groupHeaderLabelWrapper}>
            <AppText type="bold" style={[styles.groupSectionHeaderText, { color: colors.textSecondary }]}>Account</AppText>
          </View>
          <View style={[styles.groupContentBoxStack, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <NavMenuOption label="Create Account / Sign In" icon={LogIn} onPress={() => handlePress('register_guest')} colors={colors} />
            {UTILITIES_ITEMS.map((item) => (
              <NavMenuOption key={item.id} icon={item.icon} label={item.label} onPress={() => handlePress(item.id)} colors={colors} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export const GuestProfileModalSheet = ({ visible, onClose, onTriggerLogin, onNavigateToSupport, onNavigateToMenuOption }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const handleItemPress = useCallback((id) => {
    if (id === 'register_guest') {
      onClose?.();
      requestAnimationFrame(() => { onTriggerLogin?.(); });
    } else {
      onClose?.();
      requestAnimationFrame(() => {
        if (id === 'support') onNavigateToSupport ? onNavigateToSupport() : onNavigateToMenuOption?.('support');
        else onNavigateToMenuOption?.(id);
      });
    }
  }, [onClose, onTriggerLogin, onNavigateToSupport, onNavigateToMenuOption]);

  const modalListItems = useMemo(() => (
    [{ id: 'register_guest', label: 'Sign In', icon: LogIn }, ...UTILITIES_ITEMS]
  ), []);

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalOverlayScrim}>
        <Pressable style={styles.dismissalAbsoluteBackdrop} onPress={onClose} />
        <View style={[styles.bottomSheetCardContainer, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={[styles.sheetIndicatorBar, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeaderControls}>
            <AppText type="black" style={[styles.sheetTitleLabel, { color: colors.text }]}>Account Settings</AppText>
            <Pressable style={[styles.closeCircleWrapper, { backgroundColor: colors.border }]} onPress={onClose} hitSlop={6}>
              <X color={colors.textSecondary} size={14} strokeWidth={2.5} />
            </Pressable>
          </View>
          <FlatList
            data={modalListItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NavMenuOption icon={item.icon} label={item.label} onPress={() => handleItemPress(item.id)} style={styles.modalRowVerticalSpacer} colors={colors} />
            )}
            ListHeaderComponent={() => (
              <View style={styles.headerContainerBlockStack}>
                <ProfileCard colors={colors} />
                <View style={styles.groupHeaderLabelWrapper}>
                  <AppText type="bold" style={[styles.groupSectionHeaderText, { color: colors.textSecondary }]}>Account</AppText>
                </View>
              </View>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.flatListInnerScrollContentStyle}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  resumeCardWrapper: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginHorizontal: 16, marginBottom: 16 },
  resumeAvatarFrame: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', marginRight: 12 },
  fallbackCircleAuth: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  resumeProfileName: { fontSize: 16 },
  resumeEmailText: { fontSize: 13, marginTop: 2 },
  rowPressedStyle: { opacity: 0.7 },
  groupSectionContainer: { marginHorizontal: 16, marginBottom: 20 },
  groupHeaderLabelWrapper: { marginBottom: 8, paddingLeft: 4 },
  groupSectionHeaderText: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  groupContentBoxStack: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  menuItemRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1 },
  menuItemIconWrapper: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuItemTextStack: { flex: 1 },
  menuItemTitleText: { fontSize: 15 },
  modalOverlayScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  dismissalAbsoluteBackdrop: { ...StyleSheet.absoluteFillObject },
  bottomSheetCardContainer: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: height * 0.85 },
  sheetIndicatorBar: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 10, marginBottom: 14 },
  sheetHeaderControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 16 },
  sheetTitleLabel: { fontSize: 20, flex: 1 },
  closeCircleWrapper: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  flatListInnerScrollContentStyle: { paddingBottom: 40 },
  headerContainerBlockStack: { paddingBottom: 8, paddingHorizontal: 16 },
  modalRowVerticalSpacer: { paddingHorizontal: 20 },
});
