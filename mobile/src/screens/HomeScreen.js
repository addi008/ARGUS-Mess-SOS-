/**
 * src/screens/HomeScreen.js
 * Phase 1: Home screen shell — shows device ID and mesh connection status.
 * Full content (mesh stats, sync status) added in Phase 2+.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import * as meshTransport from '../mesh/meshTransport';
import { getOrCreateDeviceId } from '../utils/deviceId';

export default function HomeScreen() {
  const [deviceId, setDeviceId]     = useState('');
  const [nearbyCount, setNearbyCount] = useState(0);
  const [status, setStatus]         = useState('Initializing...');
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    async function setupMesh() {
      try {
        const id = await getOrCreateDeviceId();
        setDeviceId(id);
        setStatus('Connecting to mesh relay...');

        // Initialize the mesh transport
        meshTransport.init(id);

        // Listen for any incoming packet to update peer count
        meshTransport.onMessage((packet) => {
          console.log('[Home] Received mesh packet:', packet.type, packet.id);
        });

        // Poll nearby nodes every 5 seconds
        const interval = setInterval(async () => {
          const nodes = await meshTransport.getNearbyNodes();
          setNearbyCount(nodes.length);
        }, 5000);

        setStatus('Connected to mesh relay ✓');
        setLoading(false);
        return () => clearInterval(interval);
      } catch (err) {
        setStatus(`Error: ${err.message}`);
        setLoading(false);
      }
    }
    setupMesh();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <Text style={styles.emoji}>📡</Text>
        <Text style={styles.title}>MeshSOS — A Saviour</Text>
        <Text style={styles.subtitle}>Disaster Response Mesh Network</Text>
      </View>

      {/* Mesh Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mesh Status</Text>
        {loading
          ? <ActivityIndicator color="#ef4444" />
          : <>
              <StatusRow label="Status"     value={status}           color="#22c55e" />
              <StatusRow label="Device ID"  value={deviceId.slice(0,16)+'...'} color="#f9fafb" />
              <StatusRow label="Nearby Nodes" value={`${nearbyCount}`} color="#3b82f6" />
              <StatusRow label="Transport"  value="Simulated (WiFi)" color="#f59e0b" />
            </>
        }
      </View>

      {/* Phase note */}
      <View style={[styles.card, styles.phaseCard]}>
        <Text style={styles.phaseTitle}>Phase 1 — Scaffold Complete</Text>
        <Text style={styles.phaseText}>
          Mesh transport is initialized. Navigate to the{' '}
          <Text style={styles.accent}>SOS tab</Text> to send your first
          test packet (Phase 2 will wire this to GPS + offline storage).
        </Text>
      </View>
    </ScrollView>
  );
}

function StatusRow({ label, value, color }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0a0f1e' },
  content:     { padding: 20, gap: 16 },
  headerCard:  { alignItems: 'center', paddingVertical: 32 },
  emoji:       { fontSize: 48, marginBottom: 8 },
  title:       { fontSize: 22, fontWeight: 'bold', color: '#f9fafb', marginBottom: 4 },
  subtitle:    { fontSize: 13, color: '#6b7280' },
  card:        { backgroundColor: '#111827', borderRadius: 16, padding: 20,
                 borderWidth: 1, borderColor: '#1f2937' },
  cardTitle:   { fontSize: 14, fontWeight: '600', color: '#9ca3af',
                 marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.8 },
  row:         { flexDirection: 'row', justifyContent: 'space-between',
                 alignItems: 'center', paddingVertical: 8,
                 borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  rowLabel:    { fontSize: 14, color: '#6b7280' },
  rowValue:    { fontSize: 14, fontWeight: '500' },
  phaseCard:   { borderColor: '#1d4ed8', backgroundColor: '#1e3a5f22' },
  phaseTitle:  { fontSize: 15, fontWeight: 'bold', color: '#3b82f6', marginBottom: 8 },
  phaseText:   { fontSize: 13, color: '#93c5fd', lineHeight: 20 },
  accent:      { color: '#ef4444', fontWeight: '600' },
});
