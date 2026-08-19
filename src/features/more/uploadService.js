import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../config/supabaseClient';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const pickAndProcessImage = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Media library permission denied');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7
    });

    if (result.canceled || !result.assets || result.assets.length === 0) return null;
    return result.assets[0].uri;
  } catch (err) {
    console.error('Image picker error:', err);
    return null;
  }
};

export const uploadTestimonyImage = async (fileUri, userId) => {
  try {
    if (!fileUri || !userId) return null;

    const file = new File(fileUri);
    if (!file.exists) throw new Error('File does not exist');
    if (file.size > MAX_UPLOAD_BYTES) {
      console.warn('Image too large:', file.size);
      return null;
    }

    const bytes = await file.bytes();

    const cleanUri = fileUri.split('?')[0];
    const fileExt = cleanUri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg';
    const filePath = `${userId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('testimonies-media')
      .upload(filePath, bytes.buffer, { contentType: mimeType });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage.from('testimonies-media').getPublicUrl(data.path);
    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.error('Upload processing error:', err);
    return null;
  }
};
