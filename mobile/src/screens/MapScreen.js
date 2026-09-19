/**
 * src/screens/MapScreen.js
 * Offline Situation Map & Resource Tagging for MeshSOS Mobile App.
 *
 * Displays all locally known SOS pins, emergency alerts, and field resource tags
 * (water, medical aid, route hazards) stored in local offline SQLite.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { getAllSOSRecords, getAllResourceTags, saveResourceTag } from '../storage/db';
import { getOrCreateDeviceId } from '../utils/deviceId';
import * as meshTransport from '../mesh/meshTransport';
import { DEFAULT_TTL } from '../config';

const RESOURCE_TYPES = [
  { id: 'water', label: 'Drinking Water', icon: '💧' },
  { id: 'medical', label: 'Medical Camp', icon: '🏥' },
  { id: 'shelter', label: 'Dry Shelter', icon: '⛺' },
  { id: 'hazard_road', label: 'Road Blocked', icon: '🚧' },
  { id: 'hazard_flood', label: 'Flash Flood', icon: '🌊' },
];

// Type-based colored markers for SOS pins
const SOS_TYPE_CONFIG = {
  medical:      { icon: '🩺', color: '#ef4444', label: 'Medical' },
  trapped:      { icon: '🧱', color: '#f97316', label: 'Trapped' },
  fire:         { icon: '🔥', color: '#dc2626', label: 'Fire' },
  flood:        { icon: '🌊', color: '#3b82f6', label: 'Flood' },
  other:        { icon: '⚠️', color: '#8b5cf6', label: 'Other' },
  safe_checkin: { icon: '💚', color: '#22c55e', label: 'Safe' },
};

const LEGEND = Object.values(SOS_TYPE_CONFIG);

export default function MapScreen() {
  const [sosList, setSosList] = useState([]);
  const [resourceList, setResourceList] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'SOS' | 'RESOURCES'
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTagType, setSelectedTagType] = useState('water');
  const [tagDescription, setTagDescription] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, []);

  async function refreshData() {
    setRefreshing(true);
    const [sos, res] = await Promise.all([
      getAllSOSRecords(),
      getAllResourceTags(),
    ]);
    setSosList(sos);
    setResourceList(res);
    setRefreshing(false);
  }

  async function handleCreateResourceTag() {
    try {
      const deviceId = await getOrCreateDeviceId();
      const packet = {
        packetId: `res_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'RESOURCE_TAG',
        senderId: deviceId,
        tagType: selectedTagType,
        description: tagDescription.trim() || `Field resource: ${selectedTagType}`,
        gps: {
          lat: 28.6139 + (Math.random() - 0.5) * 0.03,
          lng: 77.2090 + (Math.random() - 0.5) * 0.03,
        },
        quantityOrStatus: 'Available',
        deviceTimestamp: new Date().toISOString(),
        ttl: DEFAULT_TTL,
        hopCount: 0,
      };

      await saveResourceTag(packet);
      meshTransport.broadcast(packet);

      setModalVisible(false);
      setTagDescription('');
      await refreshData();
      Alert.alert('Resource Broadcasted', `Resource tag [${packet.tagType}] saved and relayed across mesh.`);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  const combinedItems = [
    ...sosList.map(s => ({ ...s, itemCategory: 'SOS' })),
    ...resourceList.map(r => ({ ...r, itemCategory: 'RESOURCE' })),
  ].sort((a, b) => new Date(b.deviceTimestamp) - new Date(a.deviceTimestamp));

  const filteredItems = combinedItems.filter(item => {
    if (activeTab === 'SOS') return item.itemCategory === 'SOS';
    if (activeTab === 'RESOURCES') return item.itemCategory === 'RESOURCE';
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Top Banner */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.title}>Offline Situation Map</Text>
          <Text style={styles.subtitle}>
            {sosList.length} Distress Signals · {resourceList.length} Resource Pins
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addTagBtn}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addTagBtnText}>+ Drop Tag</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        {['ALL', 'SOS', 'RESOURCES'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Legend Overlay */}
      <View style={styles.legend}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {LEGEND.map(l => (
            <View key={l.label} style={[styles.legendItem, { borderColor: `${l.color}55` }]}>
              <Text style={styles.legendIcon}>{l.icon}</Text>
              <Text style={[styles.legendLabel, { color: l.color }]}>{l.label}</Text>
            </View>
          ))}
          <View style={[styles.legendItem, { borderColor: '#3b82f655' }]}>
            <Text style={styles.legendIcon}>📍</Text>
            <Text style={[styles.legendLabel, { color: '#60a5fa' }]}>Resource</Text>
          </View>
        </ScrollView>
      </View>

      {/* Interactive Item List / Pin Grid */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Refresh indicator */}
        {refreshing && (
          <View style={styles.refreshIndicator}>
            <View style={styles.refreshDot} />
            <Text style={styles.refreshText}>Syncing mesh pins...</Text>
          </View>
        )}
        {filteredItems.length === 0 && !refreshing ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🗺️</Text>
            <Text style={styles.emptyTitle}>No Pins Recorded</Text>
            <Text style={styles.emptyText}>
              SOS signals and tagged resources received via peer mesh will appear here.
            </Text>
          </View>
        ) : (
          filteredItems.map((item, idx) => {
            const isSOS = item.itemCategory === 'SOS';
            const sosConfig = SOS_TYPE_CONFIG[item.emergencyType] || SOS_TYPE_CONFIG.other;
            const markerIcon = isSOS ? sosConfig.icon : '📍';
            const markerColor = isSOS ? sosConfig.color : '#3b82f6';
            return (
              <View key={item.packetId || idx} style={[styles.card, { borderColor: `${markerColor}44` }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.markerBadge, { backgroundColor: `${markerColor}22`, borderColor: `${markerColor}55` }]}>
                      <Text style={styles.markerBadgeIcon}>{markerIcon}</Text>
                    </View>
                    <Text style={[styles.cardType, { color: markerColor }]}>
                      {isSOS
                        ? item.emergencyType === 'safe_checkin' ? 'Safe Check-In' : item.emergencyType?.toUpperCase()
                        : item.tagType?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={[styles.hopsBadge, { backgroundColor: `${markerColor}15` }]}>
                    <Text style={[styles.cardHops, { color: markerColor }]}>{item.hopCount || 0} Hops</Text>
                  </View>
                </View>

                <Text style={styles.cardDesc}>
                  {item.message || item.description || 'No additional note'}
                </Text>

                <View style={styles.cardFooter}>
                  <Text style={styles.gpsText}>
                    📍 {item.gps ? `${item.gps.lat.toFixed(4)}, ${item.gps.lng.toFixed(4)}` : 'GPS Unknown'}
                  </Text>
                  <Text style={styles.timeText}>
                    {new Date(item.deviceTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal for dropping resource tag */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tag Field Resource</Text>
            <Text style={styles.modalSub}>Broadcast vital resource pins across the offline mesh</Text>

            <Text style={styles.modalLabel}>Resource Type</Text>
            <View style={styles.resGrid}>
              {RESOURCE_TYPES.map(rt => (
                <TouchableOpacity
                  key={rt.id}
                  style={[
                    styles.resOption,
                    selectedTagType === rt.id && styles.resOptionActive,
                  ]}
                  onPress={() => setSelectedTagType(rt.id)}
                >
                  <Text style={styles.resIcon}>{rt.icon}</Text>
                  <Text style={[styles.resLabel, selectedTagType === rt.id && { color: '#60a5fa', fontWeight: 'bold' }]}>
                    {rt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Details / Quantity</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 50 water bottles at Community Hall entrance..."
              placeholderTextColor="#6b7280"
              value={tagDescription}
              onChangeText={setTagDescription}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleCreateResourceTag}
              >
                <Text style={styles.saveBtnText}>Broadcast Tag</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0f1e' },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#f9fafb' },
  subtitle: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  addTagBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addTagBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },
  tabRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#0d1322',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  tabBtnActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#3b82f6',
  },
  tabBtnText: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },
  tabBtnTextActive: { color: '#ffffff' },
  legend: {
    flexDirection: 'row',
    padding: 10,
    paddingHorizontal: 14,
    backgroundColor: '#0d1322',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#111827',
  },
  legendIcon: { fontSize: 12 },
  legendLabel: { fontSize: 10, fontWeight: '700' },
  refreshIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: '#1d4ed822',
    borderRadius: 8,
    marginBottom: 8,
  },
  refreshDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3b82f6' },
  refreshText: { fontSize: 11, color: '#60a5fa' },
  markerBadge: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  markerBadgeIcon: { fontSize: 14 },
  hopsBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10, paddingBottom: 30 },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  sosCard: { borderColor: '#ef444455' },
  resCard: { borderColor: '#3b82f655' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardType: { fontSize: 13, fontWeight: 'bold' },
  cardHops: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardDesc: { fontSize: 13, color: '#d1d5db', lineHeight: 18, marginBottom: 8 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1f293788',
    paddingTop: 6,
  },
  gpsText: { fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' },
  timeText: { fontSize: 10, color: '#6b7280' },
  empty: { padding: 40, alignItems: 'center' },
  emptyEmoji: { fontSize: 44, marginBottom: 8 },
  emptyTitle: { color: '#f9fafb', fontSize: 16, fontWeight: 'bold' },
  emptyText: { color: '#6b7280', fontSize: 12, textAlign: 'center', marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f9fafb' },
  modalSub: { fontSize: 12, color: '#9ca3af', marginBottom: 16 },
  modalLabel: { fontSize: 12, fontWeight: '600', color: '#9ca3af', marginBottom: 8 },
  resGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  resOption: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: '#1f2937',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  resOptionActive: { borderColor: '#3b82f6', backgroundColor: '#1e3a8a33' },
  resIcon: { fontSize: 20, marginBottom: 2 },
  resLabel: { fontSize: 10, color: '#9ca3af', textAlign: 'center' },
  modalInput: {
    backgroundColor: '#0a0f1e',
    color: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1f2937',
    alignItems: 'center',
  },
  cancelBtnText: { color: '#9ca3af', fontWeight: 'bold' },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  saveBtnText: { color: '#ffffff', fontWeight: 'bold' },
});
