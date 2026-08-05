import * as FileSystem from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../../config/supabaseClient';

export const pickAndProcessImage = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Media library permission denied');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7, // Compress to avoid memory overload
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    return result.assets[0].uri;
  } catch (err) {
    console.error('Image picker error:', err);
    return null;
  }
};

/**
 * 2. Testimony Image Upload Action
 * Reads, decodes, and uploads selected local image to Supabase Storage.
 */
export const uploadTestimonyImage = async (fileUri, userId) => {
  try {
    if (!fileUri || !userId) return null;

    // Fixed: variable name changed from imageUri to fileUri
    const file = new File(fileUri);

    if (!file.exists) {
      throw new Error('File does not exist');
    }

    console.log('File size:', file.size);

    // Read local file as base64 string
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!base64) {
      console.error('Failed to encode image to base64');
      return null;
    }

    // Clean path and prepare metadata
    const cleanUri = fileUri.split('?')[0];
    const fileExt = cleanUri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // Upload to Supabase Storage using ArrayBuffer
    const { data, error } = await supabase.storage
      .from('testimonies-media')
      .upload(filePath, decode(base64), {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return null;
    }

    // Retrieve Public URL
    const { data: publicUrlData } = supabase.storage
      .from('testimonies-media')
      .getPublicUrl(data.path);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.error('Upload processing error:', err);
    return null;
  }
};