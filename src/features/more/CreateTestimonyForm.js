import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Pressable, ActivityIndicator, Image, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Image as ImageIcon, Check, EyeOff, Eye } from 'lucide-react-native';

import { AppText } from '../../components/AppText';
import { pickAndProcessImage, uploadTestimonyImage } from './uploadService';
import { supabase } from '../../config/supabaseClient';

const PRESET_CATEGORIES = ['Divine Provision', 'Healing', 'Breakthrough', 'Strange Miracle'];

export const CreateTestimonyForm = ({ currentUserId, onCancelForm, onSuccess }) => {
  const insets = useSafeAreaInsets();
  
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Breakthrough'); 
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [imageUri, setImageUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);

  const handlePickImage = async () => {
    try {
      setLoadingImage(true);
      const selectedUri = await pickAndProcessImage();
      
      if (selectedUri) {
        setImageUri(selectedUri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Photo Error', 'Could not select photo. Please check app photo permissions.');
    } finally {
      setLoadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Missing Content', 'Please share a few words about your testimony.');
      return;
    }

    if (!currentUserId) {
      Alert.alert('Authentication Error', 'You must be logged in to share a testimony.');
      return;
    }

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
        user_id: currentUserId,
        content: content.trim(),
        category,
        is_anonymous: isAnonymous,
        attached_image_url: publicImageUrl,
      });

      if (error) throw error;

      onSuccess();
    } catch (err) {
      console.error('Failed to submit testimony:', err);
      Alert.alert('Error', 'Unable to post testimony. Please check your network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={onCancelForm} disabled={submitting}>
          <X color="#09090b" size={22} />
        </Pressable>
        <AppText type="bold" style={styles.headerTitle}>Share Testimony</AppText>
        <Pressable 
          style={[styles.postButton, (!content.trim() || submitting) && styles.postButtonDisabled]} 
          onPress={handleSubmit}
          disabled={!content.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <AppText type="bold" style={styles.postButtonText}>Post</AppText>
          )}
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
        
        {/* Category Selector Chips */}
        <View style={styles.sectionContainer}>
          <AppText type="semiBold" style={styles.sectionLabel}>Category</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChipRow}>
            {PRESET_CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <Pressable
                  key={cat}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                  onPress={() => setCategory(cat)}
                >
                  <AppText type={isSelected ? 'bold' : 'medium'} style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                    {cat}
                  </AppText>
                  {isSelected && <Check color="#ffffff" size={13} style={{ marginLeft: 4 }} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Main Written Content Input */}
        <TextInput
          style={styles.textInput}
          placeholder="Give God the glory! Write your testimony here..."
          placeholderTextColor="#a1a1aa"
          multiline
          value={content}
          onChangeText={setContent}
          textAlignVertical="top"
        />

        {/* Image Attachment Preview */}
        {imageUri && (
          <View style={styles.imagePreviewFrame}>
            <Image source={{ uri: imageUri }} style={styles.imagePreviewContent} resizeMode="cover" />
            <Pressable style={styles.removeImageButton} onPress={() => setImageUri(null)}>
              <X color="#ffffff" size={14} />
            </Pressable>
          </View>
        )}

      </ScrollView>

      {/* Bottom Tool Bar Controls */}
      <View style={styles.toolbar}>
        <Pressable style={styles.mediaAttachButton} onPress={handlePickImage} disabled={loadingImage}>
          {loadingImage ? (
            <ActivityIndicator size="small" color="#dc2626" />
          ) : (
            <>
              <ImageIcon color="#dc2626" size={20} />
              <AppText type="semiBold" style={styles.mediaAttachText}>
                {imageUri ? 'Change Photo' : 'Add Photo'}
              </AppText>
            </>
          )}
        </Pressable>

        <Pressable 
          style={[styles.anonymousToggle, isAnonymous && styles.anonymousToggleActive]} 
          onPress={() => setIsAnonymous(!isAnonymous)}
        >
          {isAnonymous ? <EyeOff color="#dc2626" size={16} /> : <Eye color="#71717a" size={16} />}
          <AppText type="semiBold" style={[styles.anonymousToggleText, isAnonymous && styles.anonymousToggleTextActive]}>
            {isAnonymous ? 'Post Anonymously' : 'Public Post'}
          </AppText>
        </Pressable>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  headerTitle: { fontSize: 16, color: '#09090b' },
  postButton: { backgroundColor: '#dc2626', paddingVertical: 8, paddingHorizontal: 18, borderRadius: 12 },
  postButtonDisabled: { opacity: 0.5 },
  postButtonText: { color: '#ffffff', fontSize: 13 },
  
  formScroll: { padding: 20 },
  sectionContainer: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, color: '#71717a', marginBottom: 10 },
  categoryChipRow: { gap: 8, paddingRight: 20 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f4f4f5',
    borderWidth: 1,
    borderColor: '#e4e4e7'
  },
  chipSelected: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626'
  },
  chipText: { fontSize: 12, color: '#3f3f46' },
  chipTextSelected: { color: '#ffffff' },

  textInput: {
    fontSize: 15,
    color: '#09090b',
    minHeight: 180,
    lineHeight: 22,
  },
  imagePreviewFrame: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    position: 'relative'
  },
  imagePreviewContent: { width: '100%', height: '100%' },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(9, 9, 11, 0.7)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  mediaAttachButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mediaAttachText: { fontSize: 13, color: '#dc2626' },
  anonymousToggle: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: '#f4f4f5', 
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    borderRadius: 12 
  },
  anonymousToggleActive: { backgroundColor: '#fef2f2' },
  anonymousToggleText: { fontSize: 12, color: '#71717a' },
  anonymousToggleTextActive: { color: '#dc2626' }
});