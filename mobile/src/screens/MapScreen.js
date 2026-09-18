/**
 * src/screens/MapScreen.js
 * Phase 1: Map screen placeholder.
 * Phase 4 will add: offline map with local SOS pins and resource tags.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🗺️</Text>
      <Text style={styles.title}>Local Coordinator Map</Text>
      <Text style={styles.subtitle}>
        Offline map with local SOS pins and resource tags.{'\n'}
        Coming in <Text style={styles.accent}>Phase 4</Text>.
      </Text>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          Phase 4 will use an offline-friendly map library to show all locally
          stored SOS and resource-tag pins — visible with zero connectivity.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1e', alignItems: 'center', justifyContent: 'center', padding: 24 },
  emoji:     { fontSize: 64, marginBottom: 16 },
  title:     { fontSize: 20, fontWeight: 'bold', color: '#f9fafb', marginBottom: 8, textAlign: 'center' },
  subtitle:  { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  accent:    { color: '#3b82f6', fontWeight: '600' },
  badge:     { backgroundColor: '#111827', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1f2937' },
  badgeText: { color: '#9ca3af', fontSize: 13, lineHeight: 20 },
});
