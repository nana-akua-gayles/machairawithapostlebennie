import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Pressable, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { X, Image as ImageIcon, Check, EyeOff, Eye } from 'lucide-react-native';

import { AppText } from '../../components/AppText';
import { pickAndProcessImage, uploadTestimonyImage } from './uploadService';
import { supabase } from '../../config/supabaseClient';
import { useTheme } from '../../context/ThemeContext';

const PRESET_CATEGORIES = ['Divine Provision', 'Healing', 'Breakthrough', 'Strange Miracle'];
const MAX_LENGTH = 2000;
const RED_ACCENT = '#dc2626';

export const CreateTestimonyForm = ({ currentUserId, onCancelForm, onSuccess }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark: isDarkMode } = useTheme();

  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Breakthrough');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);

  const resetForm = () => { setContent(''); setCategory('Breakthrough'); setIsAnonymous(false); setImageUri(null); };

  const handlePickImage = async () => {
    try {
      setLoadingImage(true);
      const selectedUri = await pickAndProcessImage();
      if (selectedUri) setImageUri(selectedUri);
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Photo Error', 'Could not select photo. Please check app photo permissions.');
    } finally {
      setLoadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) return Alert.alert('Missing Content', 'Please share a few words about your testimony.');
    if (!currentUserId) return Alert.alert('Authentication Error', 'You must be logged in to share a testimony.');

    setSubmitting(true);
    try {
      let publicImageUrl = null;
      if (imageUri) {
        publicImageUrl = await uploadTestimonyImage(imageUri, currentUserId);
        if (!publicImageUrl) {
          Alert.alert('Upload Failed', 'Failed to upload the attached image. Please try again or post without an image.');
          setSubmitting(false);
          return;
        }
      }

      const { error } = await supabase.from('writtentestimonies').insert({
        user_id: currentUserId, content: content.trim(), category, is_anonymous: isAnonymous, attached_image_url: publicImageUrl
      });
      if (error) throw error;

      resetForm();
      onSuccess();
    } catch (err) {
      console.error('Failed to submit testimony:', err);
      Alert.alert('Error', 'Unable to post testimony. Please check your network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => { resetForm(); onCancelForm(); };
  const nearLimit = content.length > MAX_LENGTH * 0.9;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <View style={[styles.header, { borderBottomColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
        <Pressable onPress={handleCancel} disabled={submitting}><X color={isDarkMode ? '#ffffff' : '#09090b'} size={22} /></Pressable>
        <AppText type="bold" style={[styles.headerTitle, { color: isDarkMode ? '#ffffff' : '#09090b' }]}>Share Testimony</AppText>
        <Pressable style={[styles.postButton, (!content.trim() || submitting) && styles.postButtonDisabled]} onPress={handleSubmit} disabled={!content.trim() || submitting}>
          {submitting ? <ActivityIndicator size="small" color="#ffffff" /> : <AppText type="bold" style={styles.postButtonText}>Post</AppText>}
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
        <View style={styles.sectionContainer}>
          <AppText type="semiBold" style={[styles.sectionLabel, { color: isDarkMode ? '#a1a1aa' : '#71717a' }]}>Category</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChipRow}>
            {PRESET_CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <Pressable key={cat} style={[styles.chip, { backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5', borderColor: isDarkMode ? '#3f3f46' : '#e4e4e7' }, isSelected && styles.chipSelected]} onPress={() => setCategory(cat)}>
                  <AppText type={isSelected ? 'bold' : 'medium'} style={[styles.chipText, { color: isDarkMode ? '#d4d4d8' : '#3f3f46' }, isSelected && styles.chipTextSelected]}>{cat}</AppText>
                  {isSelected && <Check color="#ffffff" size={13} style={{ marginLeft: 4 }} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <TextInput
          style={[styles.textInput, { color: isDarkMode ? '#f4f4f5' : '#09090b' }]}
          placeholder="Give God the glory! Write your testimony here..."
          placeholderTextColor="#a1a1aa"
          multiline
          value={content}
          onChangeText={(t) => setContent(t.slice(0, MAX_LENGTH))}
          textAlignVertical="top"
          maxLength={MAX_LENGTH}
        />
        <AppText type="medium" style={[styles.charCounter, nearLimit && styles.charCounterWarn]}>{content.length}/{MAX_LENGTH}</AppText>

        {imageUri && (
          <View style={styles.imagePreviewFrame}>
            <Image source={{ uri: imageUri }} style={styles.imagePreviewContent} contentFit="cover" />
            <Pressable style={styles.removeImageButton} onPress={() => setImageUri(null)}><X color="#ffffff" size={14} /></Pressable>
          </View>
        )}
      </ScrollView>

      <View style={[styles.toolbar, { borderTopColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
        <Pressable style={styles.mediaAttachButton} onPress={handlePickImage} disabled={loadingImage}>
          {loadingImage ? <ActivityIndicator size="small" color={RED_ACCENT} /> : (
            <>
              <ImageIcon color={RED_ACCENT} size={20} />
              <AppText type="semiBold" style={styles.mediaAttachText}>{imageUri ? 'Change Photo' : 'Add Photo'}</AppText>
            </>
          )}
        </Pressable>

        <Pressable style={[styles.anonymousToggle, { backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5' }, isAnonymous && styles.anonymousToggleActive]} onPress={() => setIsAnonymous(!isAnonymous)}>
          {isAnonymous ? <EyeOff color={RED_ACCENT} size={16} /> : <Eye color={isDarkMode ? '#a1a1aa' : '#71717a'} size={16} />}
          <AppText type="semiBold" style={[styles.anonymousToggleText, { color: isDarkMode ? '#a1a1aa' : '#71717a' }, isAnonymous && styles.anonymousToggleTextActive]}>{isAnonymous ? 'Post Anonymously' : 'Public Post'}</AppText>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16 },
  postButton: { backgroundColor: RED_ACCENT, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 12 },
  postButtonDisabled: { opacity: 0.5 },
  postButtonText: { color: '#ffffff', fontSize: 13 },
  formScroll: { padding: 20 },
  sectionContainer: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, marginBottom: 10 },
  categoryChipRow: { gap: 8, paddingRight: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1 },
  chipSelected: { backgroundColor: RED_ACCENT, borderColor: RED_ACCENT },
  chipText: { fontSize: 12 },
  chipTextSelected: { color: '#ffffff' },
  textInput: { fontSize: 15, minHeight: 180, lineHeight: 22 },
  charCounter: { fontSize: 10, color: '#a1a1aa', textAlign: 'right', marginTop: 4 },
  charCounterWarn: { color: RED_ACCENT },
  imagePreviewFrame: { width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', marginTop: 16, position: 'relative' },
  imagePreviewContent: { width: '100%', height: '100%' },
  removeImageButton: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(9, 9, 11, 0.7)', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  mediaAttachButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mediaAttachText: { fontSize: 13, color: RED_ACCENT },
  anonymousToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  anonymousToggleActive: { backgroundColor: '#fef2f2' },
  anonymousToggleText: { fontSize: 12 },
  anonymousToggleTextActive: { color: RED_ACCENT }
});
