import React from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { AppText } from '../../components/AppText';

export const WhispersGallery = ({ shorts }) => (
  <FlatList
    horizontal
    data={shorts}
    renderItem={({ item }) => (
      <View style={styles.card}>
        <AppText style={{ color: 'white' }}>Video {item.id}</AppText>
      </View>
    )}
    keyExtractor={(item) => item.id.toString()}
  />
);

const styles = StyleSheet.create({ card: { width: 120, height: 180, backgroundColor: '#352a48', borderRadius: 20, margin: 10, justifyContent: 'center', alignItems: 'center' } });