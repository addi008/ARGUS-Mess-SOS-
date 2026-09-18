/**
 * src/screens/SOSScreen.js
 * Phase 1: SOS screen shell.
 * Phase 2 will add: GPS capture, emergency type picker, local SQLite storage,
 * and real meshTransport.broadcast() call.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as meshTransport from '../mesh/meshTransport';
import { getOrCreateDeviceId } from '../utils/deviceId';
import { DEFAULT_TTL } from '../config';

export default function SOSScreen() {
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(null);

  async function sendTestSOS() {
    setSending(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      // Build a minimal test SOS packet (GPS + full fields added in Phase 2)
      const packet = {
        id:        `sos_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
        type:      'SOS',
        senderId:  deviceId,
        gps:       { lat: 0, lng: 0 },         // Placeholder; real GPS in Phase 2
        emergency: 'test',
        note:      'Phase 1 test packet',
        timestamp: new Date().toISOString(),
        ttl:       DEFAULT_TTL,
        hopCount:  0,
        version:   '1',
      };

      meshTransport.broadcast(packet);
      setLastSent(packet);
      Alert.alert('✅ SOS Sent', `Packet [${packet.id.slice(-8)}] broadcast to mesh.`);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Emergency SOS</Text>

      {/* Phase 2 note */}
      <View style={styles.noteCard}>
        <Text style={styles.noteText}>
          📍 GPS capture, emergency type picker, and offline storage will be added in{' '}
          <Text style={styles.accent}>Phase 2</Text>.{'\n\n'}
          For now, tap below to broadcast a test SOS packet over the simulated mesh.
        </Text>
      </View>

      {/* SOS Button */}
      <TouchableOpacity
        style={[styles.sosBtn, sending && styles.sosBtnDisabled]}
        onPress={sendTestSOS}
        disabled={sending}
        activeOpacity={0.8}
      >
        <Text style={styles.sosBtnText}>{sending ? 'Sending…' : '🆘  SEND SOS'}</Text>
      </TouchableOpacity>

      {/* Last sent packet info */}
      {lastSent && (
        <View style={styles.sentCard}>
          <Text style={styles.sentTitle}>Last Sent Packet</Text>
          <Text style={styles.sentLine}>ID: {lastSent.id.slice(-12)}</Text>
          <Text style={styles.sentLine}>Time: {new Date(lastSent.timestamp).toLocaleTimeString()}</Text>
          <Text style={styles.sentLine}>TTL: {lastSent.ttl} hops remaining</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0a0f1e', padding: 24, alignItems: 'center' },
  label:          { fontSize: 20, fontWeight: 'bold', color: '#f9fafb', marginTop: 32, marginBottom: 24 },
  noteCard:       { backgroundColor: '#111827', borderRadius: 14, padding: 18,
                    borderWidth: 1, borderColor: '#1f2937', width: '100%', marginBottom: 40 },
  noteText:       { color: '#9ca3af', fontSize: 13, lineHeight: 20 },
  accent:         { color: '#ef4444', fontWeight: '600' },
  sosBtn:         { width: 180, height: 180, borderRadius: 90, backgroundColor: '#ef4444',
                    alignItems: 'center', justifyContent: 'center',
                    shadowColor: '#ef4444', shadowOpacity: 0.6, shadowRadius: 30, elevation: 12 },
  sosBtnDisabled: { opacity: 0.5 },
  sosBtnText:     { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  sentCard:       { marginTop: 32, backgroundColor: '#111827', borderRadius: 14, padding: 18,
                    borderWidth: 1, borderColor: '#22c55e', width: '100%' },
  sentTitle:      { fontSize: 13, color: '#22c55e', fontWeight: '600', marginBottom: 10 },
  sentLine:       { fontSize: 12, color: '#9ca3af', marginBottom: 4 },
});
