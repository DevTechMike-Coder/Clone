import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const memoryStorage = new Map<string, string>();

// Android's EncryptedSharedPreferences-backed SecureStore caps individual
// values at ~2048 bytes. A Supabase session (access + refresh JWT + user
// object, larger still with Google Sign-In `identities` metadata attached)
// regularly exceeds that. setItemAsync doesn't throw in that case on all
// Android/Keystore versions — it can silently fail to persist — so
// persistSession looks fine at runtime but the stored session is missing or
// corrupt on next launch/refresh, surfacing later as "session expired or
// invalid" even though the user never signed out.
//
// Fix: split values above a safe threshold across multiple SecureStore keys
// and reassemble on read. Keeps everything under OS-level encryption (no
// fallback to plaintext AsyncStorage needed).
const CHUNK_SIZE = 1800;
const chunkCountKey = (key: string) => `${key}_chunks`;
const chunkKey = (key: string, i: number) => `${key}_${i}`;

const ChunkedSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const countRaw = await SecureStore.getItemAsync(chunkCountKey(key));

    if (!countRaw) {
      // Not chunked (small value, or written before this adapter existed).
      return SecureStore.getItemAsync(key);
    }

    const count = parseInt(countRaw, 10);
    if (!Number.isFinite(count) || count <= 0) {
      return SecureStore.getItemAsync(key);
    }

    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(chunkKey(key, i));
      if (part === null) {
        // Missing chunk — treat as corrupt/unavailable rather than
        // returning a truncated session.
        return null;
      }
      parts.push(part);
    }

    return parts.join('');
  },

  setItem: async (key: string, value: string): Promise<void> => {
    // Clear out any previous chunk set for this key first so a shrinking
    // value doesn't leave stale trailing chunks behind.
    await ChunkedSecureStoreAdapter.removeItem(key);

    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }

    await Promise.all(
      chunks.map((chunk, i) => SecureStore.setItemAsync(chunkKey(key, i), chunk))
    );
    await SecureStore.setItemAsync(chunkCountKey(key), String(chunks.length));
  },

  removeItem: async (key: string): Promise<void> => {
    const countRaw = await SecureStore.getItemAsync(chunkCountKey(key));
    const count = countRaw ? parseInt(countRaw, 10) : 0;

    const removals: Promise<void>[] = [SecureStore.deleteItemAsync(key)];
    if (Number.isFinite(count) && count > 0) {
      for (let i = 0; i < count; i++) {
        removals.push(SecureStore.deleteItemAsync(chunkKey(key, i)));
      }
      removals.push(SecureStore.deleteItemAsync(chunkCountKey(key)));
    }

    await Promise.all(removals);
  },
};

const WebStorageAdapter = {
  getItem: async (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }

    return memoryStorage.get(key) ?? null;
  },
  setItem: async (key: string, value: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }

    memoryStorage.set(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }

    memoryStorage.delete(key);
  },
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: Platform.OS === 'web' ? WebStorageAdapter : ChunkedSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
