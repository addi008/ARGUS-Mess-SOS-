/**
 * src/utils/deviceId.js
 * Generates and persists a unique device ID for this installation.
 * Uses AsyncStorage so the ID survives app restarts.
 * Falls back to a timestamp-based ID if storage is unavailable.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@meshsos_device_id';

/**
 * Returns the stored device ID, or generates and stores a new one.
 * @returns {Promise<string>} UUID-like string unique to this device installation.
 */
export async function getOrCreateDeviceId() {
  try {
    let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      // Generate a simple UUID v4-like string without the uuid package dependency
      id = 'dev-' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
      await AsyncStorage.setItem(DEVICE_ID_KEY, id);
      console.log('[deviceId] Generated new device ID:', id);
    }
    return id;
  } catch (err) {
    // Fallback if AsyncStorage fails (shouldn't happen on real device)
    const fallback = `dev-fallback-${Date.now()}`;
    console.warn('[deviceId] AsyncStorage error, using fallback:', fallback);
    return fallback;
  }
}
