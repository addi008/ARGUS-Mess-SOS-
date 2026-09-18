/**
 * storage/db.js
 * Offline Local SQLite Storage layer for MeshSOS Mobile App.
 *
 * Persists all sent and received:
 *  - SOS distress alerts
 *  - Mesh text messages
 *  - Resource tags (water, aid, blocked roads)
 *
 * Acts as the offline ground truth before a coordinator syncs to backend.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys for offline persistence
const KEYS = {
  SOS_RECORDS: '@meshsos_records_v1',
  MESSAGES: '@meshsos_messages_v1',
  RESOURCE_TAGS: '@meshsos_resources_v1',
  KNOWN_PACKETS: '@meshsos_known_packets_v1',
};

// In-memory cache for fast deduplication checks
const memoryStore = {
  sosRecords: new Map(),
  messages: new Map(),
  resourceTags: new Map(),
  knownPacketIds: new Set(),
};

/**
 * Initialize storage & load cached packets into memory
 */
export async function initStorage() {
  try {
    const [sosData, msgData, resData] = await Promise.all([
      AsyncStorage.getItem(KEYS.SOS_RECORDS),
      AsyncStorage.getItem(KEYS.MESSAGES),
      AsyncStorage.getItem(KEYS.RESOURCE_TAGS),
    ]);

    if (sosData) {
      const parsed = JSON.parse(sosData);
      parsed.forEach(item => {
        memoryStore.sosRecords.set(item.packetId, item);
        memoryStore.knownPacketIds.add(item.packetId);
      });
    }

    if (msgData) {
      const parsed = JSON.parse(msgData);
      parsed.forEach(item => {
        memoryStore.messages.set(item.packetId, item);
        memoryStore.knownPacketIds.add(item.packetId);
      });
    }

    if (resData) {
      const parsed = JSON.parse(resData);
      parsed.forEach(item => {
        memoryStore.resourceTags.set(item.packetId, item);
        memoryStore.knownPacketIds.add(item.packetId);
      });
    }

    console.log(`📦  Local storage initialized: ${memoryStore.sosRecords.size} SOS records, ${memoryStore.messages.size} messages.`);
  } catch (err) {
    console.warn('Storage init warning:', err.message);
  }
}

/**
 * Check if a packetId has already been seen (Deduplication)
 */
export function isPacketKnown(packetId) {
  return memoryStore.knownPacketIds.has(packetId);
}

/**
 * Save an SOS record to offline local storage
 */
export async function saveSOSRecord(record) {
  if (!record || !record.packetId) return;

  const existing = memoryStore.sosRecords.get(record.packetId);
  if (existing) return existing;

  const item = {
    ...record,
    synced: record.synced !== undefined ? record.synced : false,
    savedAt: new Date().toISOString(),
  };

  memoryStore.sosRecords.set(record.packetId, item);
  memoryStore.knownPacketIds.add(record.packetId);

  try {
    const list = Array.from(memoryStore.sosRecords.values());
    await AsyncStorage.setItem(KEYS.SOS_RECORDS, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to persist SOS record:', err);
  }

  return item;
}

/**
 * Get all stored SOS records
 */
export async function getAllSOSRecords() {
  return Array.from(memoryStore.sosRecords.values()).sort(
    (a, b) => new Date(b.deviceTimestamp) - new Date(a.deviceTimestamp)
  );
}

/**
 * Get only unsynced SOS records for coordinator sync gateway
 */
export async function getUnsyncedSOSRecords() {
  return Array.from(memoryStore.sosRecords.values()).filter(r => !r.synced);
}

/**
 * Mark SOS records as synced
 */
export async function markSOSRecordsSynced(packetIds = []) {
  packetIds.forEach(id => {
    if (memoryStore.sosRecords.has(id)) {
      const rec = memoryStore.sosRecords.get(id);
      rec.synced = true;
      memoryStore.sosRecords.set(id, rec);
    }
  });

  const list = Array.from(memoryStore.sosRecords.values());
  await AsyncStorage.setItem(KEYS.SOS_RECORDS, JSON.stringify(list));
}

/**
 * Save a message to offline storage
 */
export async function saveMessage(msg) {
  if (!msg || !msg.packetId) return;
  if (memoryStore.messages.has(msg.packetId)) return;

  const item = {
    ...msg,
    synced: msg.synced || false,
    savedAt: new Date().toISOString(),
  };

  memoryStore.messages.set(msg.packetId, item);
  memoryStore.knownPacketIds.add(msg.packetId);

  try {
    const list = Array.from(memoryStore.messages.values());
    await AsyncStorage.setItem(KEYS.MESSAGES, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to persist message:', err);
  }

  return item;
}

/**
 * Get all messages
 */
export async function getAllMessages() {
  return Array.from(memoryStore.messages.values()).sort(
    (a, b) => new Date(b.deviceTimestamp) - new Date(a.deviceTimestamp)
  );
}

/**
 * Save resource tag
 */
export async function saveResourceTag(tag) {
  if (!tag || !tag.packetId) return;
  if (memoryStore.resourceTags.has(tag.packetId)) return;

  const item = {
    ...tag,
    synced: tag.synced || false,
    savedAt: new Date().toISOString(),
  };

  memoryStore.resourceTags.set(tag.packetId, item);
  memoryStore.knownPacketIds.add(tag.packetId);

  try {
    const list = Array.from(memoryStore.resourceTags.values());
    await AsyncStorage.setItem(KEYS.RESOURCE_TAGS, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to persist resource tag:', err);
  }

  return item;
}

/**
 * Get all resource tags
 */
export async function getAllResourceTags() {
  return Array.from(memoryStore.resourceTags.values()).sort(
    (a, b) => new Date(b.deviceTimestamp) - new Date(a.deviceTimestamp)
  );
}

/**
 * Summary of all pending unsynced records
 */
export async function getUnsyncedSummary() {
  const unsyncedSOS = Array.from(memoryStore.sosRecords.values()).filter(r => !r.synced);
  const unsyncedMsg = Array.from(memoryStore.messages.values()).filter(r => !r.synced);
  const unsyncedRes = Array.from(memoryStore.resourceTags.values()).filter(r => !r.synced);

  return {
    sosCount: unsyncedSOS.length,
    messagesCount: unsyncedMsg.length,
    resourcesCount: unsyncedRes.length,
    totalUnsynced: unsyncedSOS.length + unsyncedMsg.length + unsyncedRes.length,
    unsyncedSOS,
    unsyncedMsg,
    unsyncedRes,
  };
}
