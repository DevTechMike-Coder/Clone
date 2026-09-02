import { File } from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { moderationService } from './moderationService';

export type ProfileSearchResult = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export type ProfileUpdates = {
  full_name?: string | null;
  username?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  website?: string | null;
  is_private?: boolean;
};

export const profileService = {
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateProfile(userId: string, updates: ProfileUpdates) {
    const allowedUpdates: ProfileUpdates = {};

    if (updates.full_name !== undefined) allowedUpdates.full_name = updates.full_name;
    if (updates.username !== undefined) allowedUpdates.username = updates.username;
    if (updates.bio !== undefined) allowedUpdates.bio = updates.bio;
    if (updates.avatar_url !== undefined) allowedUpdates.avatar_url = updates.avatar_url;
    if (updates.website !== undefined) allowedUpdates.website = updates.website;
    if (updates.is_private !== undefined) allowedUpdates.is_private = updates.is_private;

    const { data, error } = await supabase
      .from('profiles')
      .update(allowedUpdates)
      .eq('id', userId);

    if (error) throw error;
    return data;
  },

  async uploadAvatar(uri: string, userId: string) {
    const fileName = `${userId}/${Date.now()}.jpg`;
    
    // Modern Expo File API reads real binary directly into ArrayBuffer
    const file = new File(uri);
    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error("Supabase avatar upload error:", error);
      throw new Error(`Avatar upload failed: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
  },

  async getCurrentUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return this.getProfile(user.id);
  },

  async searchProfiles(query: string) {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return [] as ProfileSearchResult[];
    }

    const escapedQuery = trimmedQuery.replace(/[\%_]/g, (char) => `\${char}`);
    const request = supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, bio')
      .or(`username.ilike.%${escapedQuery}%,full_name.ilike.%${escapedQuery}%`)
      .limit(20);

    const { data, error } = await request;

    if (error) throw error;

    // Hide users in a block relationship (either direction) from results.
    const blocked = new Set(await moderationService.getBlockedUserIds());
    const rows = (data ?? []) as ProfileSearchResult[];
    return blocked.size ? rows.filter((r) => !blocked.has(r.id)) : rows;
  }
};
