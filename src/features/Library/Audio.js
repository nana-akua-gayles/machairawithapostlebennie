import React from 'react';
import { View, StyleSheet, FlatList, Image, Pressable, TouchableOpacity } from 'react-native';
import { AppText } from '../../components/AppText';
import { Play, ChevronLeft, Download } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';


const AUDIO_DATA = [
  { id: '1', title: 'The Power of Grace', duration: '45:20', flyer: 'https://images.unsplash.com/photo-1543682729-e263611352e4?w=400' },
  { id: '2', title: 'Understanding Faith', duration: '32:15', flyer: 'https://images.unsplash.com/photo-1504052434569-70007797760e?w=400' },
  { id: '3', title: 'Walking in Authority', duration: '28:40', flyer: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400' },
];

export const AudioScreen = () => {
  const navigation = useNavigation();

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.flyer }} style={styles.flyer} />
      <View style={styles.cardContent}>
        <AppText type="bold" style={styles.title} numberOfLines={1}>{item.title}</AppText>
        <AppText style={styles.duration}>{item.duration}</AppText>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.playBtn}>
            <Play size={18} color="#fff" fill="#fff" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Download size={20} color="#8b5cf6" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <AppText type="bold" style={styles.headerTitle}>Library</AppText>
      </View>

      <FlatList
        data={AUDIO_DATA}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, marginTop: 10 },
  backButton: { padding: 10 },
  headerTitle: { fontSize: 24, color: '#0f172a', marginLeft: 10 },
  list: { padding: 10 },
  card: { 
    flex: 1, margin: 8, backgroundColor: '#fff', borderRadius: 24, 
    borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 3
  },
  flyer: { width: '100%', height: 140, borderRadius: 20 },
  cardContent: { padding: 12 },
  title: { fontSize: 14, color: '#0f172a', marginBottom: 4 },
  duration: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' }
});