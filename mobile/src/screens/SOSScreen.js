/**
 * src/screens/SOSScreen.js
 * Full-featured Emergency Distress Broadcaster for MeshSOS Mobile App.
 *
 * Capabilities:
 *  - GPS location capture (via expo-location or fallback simulation)
 *  - Categorized Emergency Selector (Medical, Trapped, Fire, Flood, Other)
 *  - Cryptographic HMAC-SHA256 packet signing (Cybersecurity defense against spoofing)
 *  - Instant Local SQLite persistence before network broadcast
 *  - "I'm Safe" check-in quick broadcast
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import * as meshTransport from '../mesh/meshTransport';
import { getOrCreateDeviceId } from '../utils/deviceId';
import { DEFAULT_TTL } from '../config';
import { saveSOSRecord, getAllSOSRecords } from '../storage/db';
import { signPacket } from '../utils/crypto';

const EMERGENCY_TYPES = [
  { id: 'medical', label: 'Medical Aid', icon: '🩺', color: '#ef4444' },
  { id: 'trapped', label: 'Trapped / Rubble', icon: '🧱', color: '#f97316' },
  { id: 'fire',    label: 'Fire Hazard', icon: '🔥', color: '#dc2626' },
  { id: 'flood',   label: 'Rising Flood', icon: '🌊', color: '#2563eb' },
  { id: 'other',   label: 'Other Danger', icon: '⚠️', color: '#8b5cf6' },
];

export default function SOSScreen() {
  const [selectedType, setSelectedType] = useState('medical');
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(null);
  const [recentSOSList, setRecentSOSList] = useState([]);

  useEffect(() => {
    fetchGPSLocation();
    refreshLocalRecords();
  }, []);

  async function refreshLocalRecords() {
    const list = await getAllSOSRecords();
    setRecentSOSList(list.slice(0, 5));
  }

  async function fetchGPSLocation() {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
        });
      } else {
        // Fallback demo location (Central Delhi Disaster Grid)
        setLocation({
          lat: 28.6139 + (Math.random() - 0.5) * 0.02,
          lng: 77.2090 + (Math.random() - 0.5) * 0.02,
          simulated: true,
        });
      }
    } catch (err) {
      console.warn('GPS fetch warning, using simulated coordinates:', err.message);
      setLocation({
        lat: 28.6139 + (Math.random() - 0.5) * 0.02,
        lng: 77.2090 + (Math.random() - 0.5) * 0.02,
        simulated: true,
      });
    } finally {
      setLocLoading(false);
    }
  }

  async function handleBroadcastSOS(isSafeCheckin = false) {
    setSending(true);
    try {
      const deviceId = await getOrCreateDeviceId();
      const type = isSafeCheckin ? 'safe_checkin' : selectedType;
      const note = isSafeCheckin ? "I am safe and uninjured." : (message.trim() || `Urgent ${type.toUpperCase()} assistance requested`);
      const now = new Date().toISOString();

      const gpsCoords = location || {
        lat: 28.6139 + (Math.random() - 0.5) * 0.02,
        lng: 77.2090 + (Math.random() - 0.5) * 0.02,
      };

      const rawPacket = {
        packetId: `sos_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: 'SOS',
        senderId: deviceId,
        gps: {
          lat: gpsCoords.lat,
          lng: gpsCoords.lng,
        },
        emergencyType: type,
        message: note,
        deviceTimestamp: now,
        ttl: DEFAULT_TTL,
        hopCount: 0,
      };

      // Generate HMAC packet signature
      const signature = signPacket(rawPacket);
      const signedPacket = { ...rawPacket, signature };

      // 1. Offline First: Save to local SQLite storage
      await saveSOSRecord(signedPacket);

      // 2. Mesh Broadcast: Relay to nearby mesh nodes
      meshTransport.broadcast(signedPacket);

      setLastSent(signedPacket);
      if (!isSafeCheckin) setMessage('');
      await refreshLocalRecords();

      Alert.alert(
        isSafeCheckin ? '✅ "I\'m Safe" Broadcasted' : '🚨 SOS BROADCASTED',
        `Packet [${signedPacket.packetId.slice(-6)}] is propagating across the offline peer mesh.\n\nLocal DB: Stored\nGPS: ${signedPacket.gps.lat.toFixed(4)}, ${signedPacket.gps.lng.toFixed(4)}`
      );
    } catch (err) {
      Alert.alert('Broadcast Error', err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>Distress Broadcaster</Text>
      <Text style={styles.screenSubtitle}>Transmits over peer-to-peer mesh when cellular is down</Text>

      {/* GPS Status Card */}
      <View style={styles.locationCard}>
        <View style={styles.locRow}>
          <Text style={styles.locIcon}>📍</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.locTitle}>Current GPS Coordinates</Text>
            {locLoading ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : location ? (
              <>
                <Text style={styles.locText}>
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </Text>
                {/* GPS accuracy indicator */}
                <View style={styles.gpsAccuracyRow}>
                  <View style={[
                    styles.gpsAccuracyDot,
                    { backgroundColor: location.simulated ? '#f59e0b' : location.accuracy < 20 ? '#22c55e' : '#f97316' }
                  ]} />
                  <Text style={styles.gpsAccuracyText}>
                    {location.simulated ? 'Simulated GPS (demo)' : `±${location.accuracy?.toFixed(0) || '?'}m accuracy`}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.locTextMuted}>Location unavailable</Text>
            )}
          </View>
          <TouchableOpacity onPress={fetchGPSLocation} style={styles.refreshBtn}>
            <Text style={styles.refreshBtnText}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Emergency Category Selector — Colored Cards */}
      <Text style={styles.sectionHeader}>Select Emergency Type</Text>
      <View style={styles.typeGrid}>
        {EMERGENCY_TYPES.map((t) => {
          const isSelected = selectedType === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.typeCard,
                isSelected && { borderColor: t.color, backgroundColor: `${t.color}22` },
              ]}
              onPress={() => setSelectedType(t.id)}
              activeOpacity={0.75}
            >
              <View style={[styles.typeIconCircle, isSelected && { backgroundColor: `${t.color}33` }]}>
                <Text style={styles.typeIcon}>{t.icon}</Text>
              </View>
              <Text style={[styles.typeLabel, isSelected && { color: t.color, fontWeight: '800' }]}>
                {t.label}
              </Text>
              {isSelected && (
                <View style={[styles.typeSelectedDot, { backgroundColor: t.color }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Note / Message input */}
      <Text style={styles.sectionHeader}>Optional Details / Survivor Count</Text>
      <TextInput
        style={styles.textInput}
        placeholder="e.g. 2 people trapped on 2nd floor, bleeding, water rising..."
        placeholderTextColor="#6b7280"
        value={message}
        onChangeText={setMessage}
        multiline
        numberOfLines={3}
      />

      {/* Triage Score Estimation Preview */}
      {(() => {
        const typeScores = { medical: 8, trapped: 8, fire: 9, flood: 7, other: 5 };
        const base = typeScores[selectedType] || 5;
        const bonus = message.length > 30 ? 1 : message.length > 10 ? 0.5 : 0;
        const estimated = Math.min(10, (base + bonus)).toFixed(1);
        const color = estimated >= 8 ? '#ef4444' : estimated >= 6 ? '#f97316' : '#22c55e';
        return (
          <View style={[styles.triagePreview, { borderColor: `${color}44` }]}>
            <Text style={styles.triageLabel}>Estimated AI Triage Score</Text>
            <Text style={[styles.triageScore, { color }]}>{estimated}/10</Text>
            <Text style={styles.triageHint}>
              {estimated >= 8 ? '🔴 Critical Priority' : estimated >= 6 ? '🟠 High Priority' : '🟡 Standard Priority'} — NLP scoring on backend
            </Text>
          </View>
        );
      })()}

      {/* Giant SOS Trigger Button */}
      <TouchableOpacity
        style={[styles.sosButton, sending && styles.btnDisabled]}
        onPress={() => handleBroadcastSOS(false)}
        disabled={sending}
        activeOpacity={0.8}
      >
        <Text style={styles.sosButtonIcon}>🆘</Text>
        <Text style={styles.sosButtonText}>{sending ? 'BROADCASTING...' : 'BROADCAST SOS'}</Text>
        <Text style={styles.sosSubtext}>Tap to alert all nearby mesh nodes</Text>
      </TouchableOpacity>

      {/* Quick "I'm Safe" check-in button */}
      <TouchableOpacity
        style={styles.safeButton}
        onPress={() => handleBroadcastSOS(true)}
        disabled={sending}
      >
        <Text style={styles.safeButtonText}>💚 Send "I'm Safe" Check-In</Text>
      </TouchableOpacity>

      {/* Sent Status */}
      {lastSent && (
        <View style={styles.lastSentCard}>
          <Text style={styles.lastSentHeader}>Latest Outgoing Broadcast</Text>
          <Text style={styles.lastSentInfo}>Packet: {lastSent.packetId}</Text>
          <Text style={styles.lastSentInfo}>Type: {lastSent.emergencyType.toUpperCase()}</Text>
          <Text style={styles.lastSentInfo}>Time: {new Date(lastSent.deviceTimestamp).toLocaleTimeString()}</Text>
          <Text style={styles.lastSentSig}>HMAC: {lastSent.signature ? lastSent.signature.slice(0, 16) + '...' : 'Unsigned'}</Text>
        </View>
      )}

      {/* Local SQLite Stored alerts */}
      <Text style={styles.sectionHeader}>Offline Records in Local Storage ({recentSOSList.length})</Text>
      {recentSOSList.map((item, idx) => (
        <View key={item.packetId || idx} style={styles.recordItem}>
          <View style={styles.recordRow}>
            <Text style={styles.recordType}>
              {item.emergencyType === 'safe_checkin' ? '💚 SAFE' : `🚨 ${item.emergencyType.toUpperCase()}`}
            </Text>
            <Text style={styles.recordHops}>{item.hopCount || 0} Hops</Text>
            <Text style={[styles.recordSync, item.synced ? styles.syncedBadge : styles.unsyncedBadge]}>
              {item.synced ? 'Synced' : 'Pending Sync'}
            </Text>
          </View>
          <Text style={styles.recordMessage} numberOfLines={2}>
            {item.message || 'No description provided'}
          </Text>
          <Text style={styles.recordTime}>
            {new Date(item.deviceTimestamp).toLocaleTimeString()} • Sender: {(item.senderId || '').slice(-6)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f9fafb',
    marginTop: 8,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 20,
  },
  locationCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 20,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  locTitle: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  locText: {
    fontSize: 14,
    color: '#f9fafb',
    fontWeight: '600',
    marginTop: 2,
  },
  locTextMuted: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  gpsAccuracyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  gpsAccuracyDot: { width: 7, height: 7, borderRadius: 4 },
  gpsAccuracyText: { fontSize: 11, color: '#9ca3af' },
  refreshBtn: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 10,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  typeCard: {
    flexBasis: '31%',
    flexGrow: 1,
    backgroundColor: '#111827',
    borderWidth: 1.5,
    borderColor: '#1f2937',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f2937',
    marginBottom: 6,
  },
  typeSelectedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },
  typeLabel: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
  },
  triagePreview: {
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  triageLabel: { fontSize: 12, color: '#9ca3af', flex: 1 },
  triageScore: { fontSize: 26, fontWeight: '900', minWidth: 52, textAlign: 'center' },
  triageHint: { fontSize: 11, color: '#6b7280', flex: 2 },
  textInput: {
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 12,
    color: '#f9fafb',
    fontSize: 14,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  sosButton: {
    backgroundColor: '#dc2626',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc2626',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  sosButtonIcon: {
    fontSize: 32,
    marginBottom: 2,
  },
  sosButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
  sosSubtext: {
    fontSize: 11,
    color: '#fca5a5',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  safeButton: {
    backgroundColor: '#064e3b',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#059669',
  },
  safeButtonText: {
    color: '#34d399',
    fontSize: 15,
    fontWeight: '700',
  },
  lastSentCard: {
    marginTop: 20,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#059669',
  },
  lastSentHeader: {
    color: '#10b981',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 6,
  },
  lastSentInfo: {
    color: '#d1d5db',
    fontSize: 12,
    marginBottom: 2,
  },
  lastSentSig: {
    color: '#6b7280',
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  recordItem: {
    backgroundColor: '#111827',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 10,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recordType: {
    color: '#f9fafb',
    fontWeight: '700',
    fontSize: 13,
  },
  recordHops: {
    color: '#60a5fa',
    fontSize: 11,
    backgroundColor: '#1e3a8a33',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recordSync: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  syncedBadge: {
    color: '#34d399',
    backgroundColor: '#064e3b44',
  },
  unsyncedBadge: {
    color: '#f59e0b',
    backgroundColor: '#78350f44',
  },
  recordMessage: {
    color: '#d1d5db',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
  recordTime: {
    color: '#6b7280',
    fontSize: 11,
  },
});
