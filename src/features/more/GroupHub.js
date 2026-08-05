import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { AppText } from '../../components/AppText';

export const GroupHub = ({ groups }) => (
  <View style={styles.grid}>
    {groups.map((g) => (
      <Pressable key={g.id} style={styles.circle}>
        <AppText style={{ fontWeight: 'bold' }}>{g.name}</AppText>
      </Pressable>
    ))}
  </View>
);

const styles = StyleSheet.create({ 
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10 },
  circle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#fff0f7', justifyContent: 'center', alignItems: 'center', margin: 10 } 
});