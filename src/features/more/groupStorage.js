import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { Alert } from 'react-native';
import { supabase } from '../../config/supabaseClient';

export const uploadGroupAvatar = async (groupId) => {
  try {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required to update the discussion picture.');
      return null;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
      return null;
    }

    const selectedAsset = pickerResult.assets[0];
    const fileExt = selectedAsset.uri.split('.').pop() || 'jpg';
    
    // Using a static file name per group so it overwrites the exact same file in storage
    const fileName = `group_${groupId}.${fileExt}`;
    const filePath = `group_avatars/${fileName}`;

    let fileData;
    if (selectedAsset.base64) {
      fileData = decode(selectedAsset.base64);
    } else {
      const base64String = await FileSystem.readAsStringAsync(selectedAsset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      fileData = decode(base64String);
    }

    const { error: uploadError } = await supabase.storage
      .from('group_avatars')
      .upload(filePath, fileData, { 
        contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
        upsert: true 
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('group_avatars')
      .getPublicUrl(filePath);

    // Append cache-buster so React Native displays the updated image instantly
    const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('groups')
      .update({ group_icon: publicUrl })
      .eq('id', groupId);

    if (updateError) throw updateError;

    return publicUrl;
  } catch (err) {
    console.error('Error updating group picture:', err);
    Alert.alert('Error', 'Could not update page icon. Please check your storage configurations.');
    return null;
  }
};