/**
 * src/screens/MessagesScreen.js
 * Phase 1: Messages screen placeholder.
 * Phase 2 will add: display of locally received mesh messages.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import * as meshTransport from '../mesh/meshTransport';

export default function MessagesScreen() {
  const [packets, setPackets] = useState([]);

  // Register a mesh listener to display incoming packets in real-time
  useEffect(() => {
    meshTransport.onMessage((packet) => {
      setPackets(prev => [packet, ...prev].slice(0, 50)); // keep last 50
    });
  }, []);

  function renderPacket({ item }) {
    return (
      <View style={styles.packetCard}>
        <View style={styles.packetHeader}>
          <Text style={[styles.type, { color: item.type === 'SOS' ? '#ef4444' : '#3b82f6' }]}>
            {item.type === 'SOS' ? '🆘' : '📩'} {item.type}
          </Text>
          <Text style={styles.time}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
        </View>
        <Text style={styles.sender}>From: {item.senderId?.slice(0, 12)}…</Text>
        <Text style={styles.meta}>Hop {item.hopCount} · TTL left: {item.ttl}</Text>
        {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {packets.length === 0
        ? (
          <View style={styles.empty}>
            <Text style={styles.emoji}>💬</Text>
            <Text style={styles.emptyTitle}>No Messages Yet</Text>
            <Text style={styles.emptyText}>
              Packets received over the mesh will appear here in real-time.{'\n'}
              Try sending an SOS from another device on the same WiFi.
            </Text>
          </View>
        )
        : (
          <FlatList
            data={packets}
            keyExtractor={item => item.id}
            renderItem={renderPacket}
            contentContainerStyle={{ padding: 16, gap: 12 }}
          />
        )
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0a0f1e' },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji:       { fontSize: 56, marginBottom: 16 },
  emptyTitle:  { fontSize: 18, fontWeight: 'bold', color: '#f9fafb', marginBottom: 8 },
  emptyText:   { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  packetCard:  { backgroundColor: '#111827', borderRadius: 14, padding: 16,
                 borderWidth: 1, borderColor: '#1f2937' },
  packetHeader:{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  type:        { fontWeight: 'bold', fontSize: 14 },
  time:        { color: '#6b7280', fontSize: 12 },
  sender:      { color: '#9ca3af', fontSize: 12, marginBottom: 2 },
  meta:        { color: '#4b5563', fontSize: 11, marginBottom: 4 },
  note:        { color: '#d1d5db', fontSize: 13, fontStyle: 'italic' },
});
