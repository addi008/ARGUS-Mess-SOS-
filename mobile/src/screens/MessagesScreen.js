/**
 * src/screens/MessagesScreen.js
 * Mesh Network Chat & Relay Feed.
 *
 * Allows survivors and field coordinators to broadcast short text messages
 * over the peer mesh without internet, and view all local relayed packets.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as meshTransport from '../mesh/meshTransport';
import { getOrCreateDeviceId } from '../utils/deviceId';
import { getAllMessages, saveMessage } from '../storage/db';
import { DEFAULT_TTL } from '../config';

export default function MessagesScreen() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [myId, setMyId] = useState('');

  useEffect(() => {
    async function load() {
      const id = await getOrCreateDeviceId();
      setMyId(id);
      const list = await getAllMessages();
      setMessages(list);

      // Listen for new mesh packets in real time
      meshTransport.onMessage(async (packet) => {
        if (packet.type === 'MESSAGE') {
          const fresh = await getAllMessages();
          setMessages(fresh);
        }
      });
    }
    load();
  }, []);

  async function handleSendMessage() {
    if (!inputText.trim()) return;

    try {
      const deviceId = await getOrCreateDeviceId();
      const packet = {
        packetId: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'MESSAGE',
        senderId: deviceId,
        recipientId: 'ALL',
        content: inputText.trim(),
        deviceTimestamp: new Date().toISOString(),
        ttl: DEFAULT_TTL,
        hopCount: 0,
      };

      // Save locally
      await saveMessage(packet);

      // Broadcast over mesh
      meshTransport.broadcast(packet);

      setInputText('');
      const updated = await getAllMessages();
      setMessages(updated);
    } catch (err) {
      Alert.alert('Send Error', err.message);
    }
  }

  function renderItem({ item }) {
    const isMe = item.senderId === myId;

    return (
      <View style={[styles.messageCard, isMe ? styles.myCard : styles.peerCard]}>
        <View style={styles.msgHeader}>
          <Text style={[styles.senderId, isMe && { color: '#93c5fd' }]}>
            {isMe ? '👤 You (Local)' : `📡 Node: ${item.senderId?.slice(0, 10)}...`}
          </Text>
          <Text style={styles.timeText}>
            {new Date(item.deviceTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <Text style={styles.content}>{item.content}</Text>

        <View style={styles.footerRow}>
          <Text style={styles.hopBadge}>
            {item.hopCount === 0 ? 'Direct 0-Hop' : `${item.hopCount} Mesh Hops`}
          </Text>
          <Text style={styles.statusText}>{item.synced ? '✓ Cloud Synced' : '⏳ Mesh Only'}</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>Peer-to-Peer Mesh Chat</Text>
          <Text style={styles.emptyText}>
            Broadcast short text updates to all devices within local mesh range without cellular connection.
          </Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.packetId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          inverted={false}
        />
      )}

      {/* Message Composer */}
      <View style={styles.composerContainer}>
        <TextInput
          style={styles.input}
          placeholder="Broadcast text over mesh..."
          placeholderTextColor="#6b7280"
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSendMessage}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendBtnText}>➔</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1e' },
  listContent: { padding: 16, gap: 10, paddingBottom: 20 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#f9fafb', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  messageCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  myCard: {
    backgroundColor: '#1e3a8a33',
    borderColor: '#2563eb',
    alignSelf: 'flex-end',
    width: '90%',
  },
  peerCard: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    alignSelf: 'flex-start',
    width: '90%',
  },
  msgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  senderId: { fontSize: 11, fontWeight: 'bold', color: '#60a5fa' },
  timeText: { fontSize: 10, color: '#6b7280' },
  content: { color: '#f9fafb', fontSize: 14, lineHeight: 20, marginBottom: 8 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1f293744',
    paddingTop: 4,
  },
  hopBadge: {
    color: '#9ca3af',
    fontSize: 10,
    backgroundColor: '#030712',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: { fontSize: 10, color: '#4b5563' },
  composerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#0a0f1e',
    color: '#f9fafb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 90,
  },
  sendBtn: {
    backgroundColor: '#2563eb',
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#374151',
    opacity: 0.5,
  },
  sendBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
