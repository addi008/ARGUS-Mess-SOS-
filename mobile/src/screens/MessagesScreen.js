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
    const time = new Date(item.deviceTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={[
        styles.bubbleRow,
        isMe ? styles.bubbleRowRight : styles.bubbleRowLeft,
      ]}>
        {/* Avatar for peer messages */}
        {!isMe && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>📡</Text>
          </View>
        )}

        <View style={[
          styles.bubble,
          isMe ? styles.myBubble : styles.peerBubble,
        ]}>
          {/* Sender label for peer */}
          {!isMe && (
            <Text style={styles.senderLabel}>
              Node: {item.senderId?.slice(0, 10)}...
            </Text>
          )}

          {/* Message content */}
          <Text style={[styles.bubbleContent, isMe && styles.myBubbleContent]}>
            {item.content}
          </Text>

          {/* Footer: time + hop count + sync status */}
          <View style={styles.bubbleFooter}>
            <Text style={styles.hopText}>
              {item.hopCount === 0 ? '0-hop' : `${item.hopCount} hops`}
            </Text>
            <Text style={styles.bubbleTime}>{time}</Text>
            <Text style={styles.syncStatus}>{item.synced ? '✓✓' : '⏳'}</Text>
          </View>
        </View>

        {/* Spacer for peer messages */}
        {isMe && <View style={{ width: 32 }} />}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      {/* Header count */}
      {messages.length > 0 && (
        <View style={styles.chatHeader}>
          <Text style={styles.chatHeaderText}>
            📡 Peer Mesh Chat — {messages.length} message{messages.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

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
          <Text style={styles.sendBtnText}>➞</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1e' },
  chatHeader: {
    padding: '10px 16px',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  chatHeaderText: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  listContent: { padding: 16, gap: 8, paddingBottom: 20 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#f9fafb', marginBottom: 6 },
  emptyText: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 },

  // Chat bubble styles
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2 },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  avatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#1f2937',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 6, marginBottom: 4,
  },
  avatarText: { fontSize: 14 },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 10,
    paddingHorizontal: 12,
  },
  myBubble: {
    backgroundColor: '#1d4ed8',
    borderBottomRightRadius: 4,
  },
  peerBubble: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderBottomLeftRadius: 4,
  },
  senderLabel: {
    fontSize: 10,
    color: '#60a5fa',
    fontWeight: '700',
    marginBottom: 3,
  },
  bubbleContent: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 20,
  },
  myBubbleContent: { color: '#ffffff' },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  hopText: { fontSize: 9, color: '#6b7280', fontFamily: 'monospace' },
  bubbleTime: { fontSize: 9, color: '#6b7280', flex: 1, textAlign: 'right' },
  syncStatus: { fontSize: 10, color: '#22c55e' },

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
    borderWidth: 1,
    borderColor: '#1f2937',
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
