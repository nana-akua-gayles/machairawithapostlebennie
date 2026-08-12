import React from 'react';
import { View, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, RefreshControl, Image, Modal, TouchableWithoutFeedback,
  Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { Users, Share2, Trash2, UserX, Lock, LogOut, Crown, Camera, Pin } from 'lucide-react-native';
import { AppText } from '../../../../components/AppText';

const RED = '#E11D48';
const DEEP_PURPLE = '#352a48';

export const GroupDropdownMenu = ({ isAdmin, onClose, onOpenAdmin, onShare, onDelete, onLeave }) => {
  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={panelStyles.dropdownOverlay}>
        <View style={panelStyles.dropdownContainer}>
          {isAdmin && (
            <TouchableOpacity style={panelStyles.dropdownItem} onPress={onOpenAdmin} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Admin dashboard">
              <AppText type="bold" style={[panelStyles.dropdownText, { color: RED }]}>Admin Dashboard</AppText>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={panelStyles.dropdownItem} onPress={onShare} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Share page">
            <Share2 color={DEEP_PURPLE} size={16} /><AppText type="bold" style={panelStyles.dropdownText}>Share Page</AppText>
          </TouchableOpacity>
          <View style={panelStyles.dropdownDivider} />
          {isAdmin ? (
            <TouchableOpacity style={panelStyles.dropdownItem} onPress={onDelete} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Delete page">
              <Trash2 color={RED} size={16} /><AppText type="bold" style={[panelStyles.dropdownText, { color: RED }]}>Delete Page</AppText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={panelStyles.dropdownItem} onPress={onLeave} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Leave page">
              <LogOut color={RED} size={16} /><AppText type="bold" style={[panelStyles.dropdownText, { color: RED }]}>Leave Page</AppText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export const AnnouncementModal = ({ visible, onClose, text, onChangeText, onPost, isPosting }) => {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={panelStyles.modalOverlay}>
        <View style={panelStyles.modalContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Pin color={RED} size={20} /><AppText type="bold" style={{ fontSize: 18, color: DEEP_PURPLE, marginLeft: 8 }}>New Announcement</AppText>
          </View>
          <TextInput
            style={panelStyles.announcementInput}
            placeholder="Write an announcement..."
            placeholderTextColor="#94A3B8"
            value={text}
            onChangeText={onChangeText}
            multiline
            maxLength={1000}
            accessibilityLabel="Announcement text"
          />
          <View style={panelStyles.modalActionRow}>
            <TouchableOpacity style={panelStyles.modalCancelButton} onPress={onClose} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Cancel">
              <AppText type="bold" style={{ color: '#64748B', fontSize: 14 }}>Cancel</AppText>
            </TouchableOpacity>
            <TouchableOpacity style={[panelStyles.modalPostButton, (!text.trim() || isPosting) && { opacity: 0.5 }]} onPress={onPost} disabled={!text.trim() || isPosting} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Post announcement">
              <AppText type="bold" style={{ color: '#FFFFFF', fontSize: 14 }}>Post</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export const MembersTab = ({ members, membersCount, group, isAdmin, refreshing, onRefresh, onBack, onRemoveMember, onLoadMore, hasMore, isLoadingMore }) => {
  return (
    <FlatList
      data={members}
      keyExtractor={(item) => item.user_id.toString()}
      contentContainerStyle={{ padding: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={RED} />}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <AppText type="bold" style={{ fontSize: 16, color: DEEP_PURPLE }}>Discussion Members ({membersCount})</AppText>
          <TouchableOpacity onPress={onBack} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Back to conversation">
            <AppText type="bold" style={{ fontSize: 13, color: RED }}>Back to Conversation</AppText>
          </TouchableOpacity>
        </View>
      }
      ListFooterComponent={
        isLoadingMore ? (
          <View style={{ paddingVertical: 16 }}>
            <ActivityIndicator color={RED} size="small" />
          </View>
        ) : !hasMore && members.length > 0 ? (
          <AppText style={{ textAlign: 'center', color: '#94A3B8', fontSize: 11, paddingVertical: 12 }}>That's everyone</AppText>
        ) : null
      }
      renderItem={({ item }) => {
        const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
        const memberName = profile?.name || 'Member';
        const memberAvatar = profile?.avatar_url;
        const isOwner = item.user_id === group?.created_by;

        return (
          <View style={panelStyles.memberCard}>
            {memberAvatar ? (
              <Image source={{ uri: memberAvatar }} style={panelStyles.memberAvatar} />
            ) : (
              <View style={panelStyles.messageAvatarFallback}><AppText type="bold" style={panelStyles.avatarFallbackText}>{memberName.charAt(0).toUpperCase()}</AppText></View>
            )}
            <View style={{ flex: 1, marginLeft: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <AppText type="bold" style={panelStyles.memberName} numberOfLines={1}>{memberName}</AppText>
                <AppText style={panelStyles.memberRole}>{isOwner ? 'Page Admin' : 'Member'}</AppText>
              </View>
              {isOwner && (
                <View style={[panelStyles.adminBadge, { paddingHorizontal: 8, paddingVertical: 3 }]}>
                  <Crown color="#FFFFFF" size={9} style={{ marginRight: 4 }} /><AppText type="bold" style={[panelStyles.adminBadgeText, { fontSize: 11 }]}>ADMIN</AppText>
                </View>
              )}
            </View>
            {isAdmin && !isOwner && (
              <TouchableOpacity
                style={[panelStyles.removeMemberButton, { marginLeft: 10 }]}
                onPress={() => onRemoveMember(item.user_id)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${memberName} from the group`}
              >
                <UserX color={RED} size={18} />
              </TouchableOpacity>
            )}
          </View>
        );
      }}
    />
  );
};

export const AdminTab = ({ onBack, onManageParticipants, onChangeAvatar, isUploadingAvatar }) => {
  return (
    <FlatList
      data={[{ id: 'admin-dashboard' }]}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 24 }}
      renderItem={() => (
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 }}>
            <TouchableOpacity onPress={onBack} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Back to conversation">
              <AppText type="bold" style={{ fontSize: 13, color: RED }}>Back to Conversation</AppText>
            </TouchableOpacity>
          </View>

          <View style={panelStyles.adminHeroCard}>
            <AppText type="bold" style={{ fontSize: 18, color: DEEP_PURPLE, marginBottom: 4 }}>ADMIN DASHBOARD</AppText>
            <AppText style={{ fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
              Manage community participants, moderation controls, and your group's display profile.
            </AppText>

            <TouchableOpacity
              style={[panelStyles.changeAvatarButton, isUploadingAvatar && { opacity: 0.6 }]}
              onPress={onChangeAvatar}
              disabled={isUploadingAvatar}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Change group icon"
            >
              <Camera color="#FFFFFF" size={18} style={{ marginRight: 8 }} />
              <AppText type="bold" style={{ color: '#FFFFFF', fontSize: 14 }}>
                {isUploadingAvatar ? 'Updating Picture...' : 'Change Page Icon'}
              </AppText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={panelStyles.adminActionButton} onPress={onManageParticipants} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Manage participants">
            <Users color="#FFFFFF" size={18} />
            <AppText type="bold" style={{ color: '#FFFFFF', marginLeft: 10, fontSize: 15 }}>Manage Participants</AppText>
          </TouchableOpacity>
        </View>
      )}
    />
  );
};

const panelStyles = StyleSheet.create({
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  memberAvatar: { width: 44, height: 44, borderRadius: 22 },
  messageAvatarFallback: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  avatarFallbackText: { fontSize: 12, color: DEEP_PURPLE },
  memberName: { fontSize: 15, color: DEEP_PURPLE },
  memberRole: { fontSize: 12, color: '#64748B', marginTop: 2 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: RED, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  adminBadgeText: { fontSize: 8, color: '#FFFFFF', letterSpacing: 0.5 },
  removeMemberButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF1F2', justifyContent: 'center', alignItems: 'center' },
  adminHeroCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 54, alignItems: 'center', marginBottom: 26, borderWidth: 1, borderColor: '#F1F5F9' },
  changeAvatarButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: RED, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 18, width: '100%' },
  adminActionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: DEEP_PURPLE, borderRadius: 20, paddingVertical: 26, paddingHorizontal: 20 },
  dropdownOverlay: { position: 'absolute', top: 50, left: 0, right: 0, bottom: 0, zIndex: 999 },
  dropdownContainer: { position: 'absolute', top: 76, right: 25, width: 210, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 25, paddingHorizontal: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  dropdownText: { fontSize: 14, color: DEEP_PURPLE, marginLeft: 10 },
  dropdownDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 4, marginHorizontal: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 400, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24 },
  announcementInput: { backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, fontSize: 15, color: DEEP_PURPLE, height: 120, textAlignVertical: 'top', marginBottom: 20 },
  modalActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancelButton: { paddingVertical: 10, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  modalPostButton: { backgroundColor: RED, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
});