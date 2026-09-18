/**
 * App.js — MeshSOS Mobile App Root
 *
 * Initializes local SQLite/storage, starts mesh transport,
 * registers background packet listener for multi-hop offline storage,
 * and renders the navigation shell.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { initStorage, saveSOSRecord, saveMessage, saveResourceTag } from './src/storage/db';
import * as meshTransport from './src/mesh/meshTransport';
import { getOrCreateDeviceId } from './src/utils/deviceId';

export default function App() {
  const [ready, setReady] = useState(false);
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    async function bootstrap() {
      try {
        // 1. Init offline SQLite/AsyncStorage
        await initStorage();

        // 2. Get or create persistent device UUID
        const id = await getOrCreateDeviceId();
        setDeviceId(id);

        // 3. Init mesh transport
        meshTransport.init(id);

        // 4. Register universal incoming packet listener to persist to local offline DB
        meshTransport.onMessage(async (packet) => {
          if (!packet) return;

          if (packet.type === 'SOS' || packet.emergencyType) {
            await saveSOSRecord({
              packetId: packet.packetId || packet.id,
              senderId: packet.senderId,
              gps: packet.gps,
              emergencyType: packet.emergencyType || packet.emergency || 'other',
              message: packet.message || packet.note || '',
              deviceTimestamp: packet.deviceTimestamp || packet.timestamp || new Date().toISOString(),
              hopCount: packet.hopCount || 0,
              signature: packet.signature || '',
              synced: false,
            });
          } else if (packet.type === 'MESSAGE') {
            await saveMessage({
              packetId: packet.packetId || packet.id,
              senderId: packet.senderId,
              recipientId: packet.recipientId || 'ALL',
              content: packet.content || packet.message || '',
              gps: packet.gps,
              deviceTimestamp: packet.deviceTimestamp || packet.timestamp || new Date().toISOString(),
              hopCount: packet.hopCount || 0,
              signature: packet.signature || '',
              synced: false,
            });
          } else if (packet.type === 'RESOURCE_TAG') {
            await saveResourceTag({
              packetId: packet.packetId || packet.id,
              senderId: packet.senderId,
              tagType: packet.tagType,
              description: packet.description || '',
              gps: packet.gps,
              quantityOrStatus: packet.quantityOrStatus || 'Available',
              deviceTimestamp: packet.deviceTimestamp || packet.timestamp || new Date().toISOString(),
              hopCount: packet.hopCount || 0,
              signature: packet.signature || '',
              synced: false,
            });
          }
        });

        setReady(true);
      } catch (err) {
        console.error('App bootstrap error:', err);
        setReady(true);
      }
    }

    bootstrap();

    return () => {
      meshTransport.disconnect();
    };
  }, []);

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ef4444" />
        <Text style={styles.loadingText}>Initializing MeshSOS Node...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#0a0f1e" />
      <AppNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0f1e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
  },
});
