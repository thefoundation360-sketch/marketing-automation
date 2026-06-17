import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: import('../types').Profile;
        Insert: Partial<import('../types').Profile>;
        Update: Partial<import('../types').Profile>;
      };
    };
  };
};

// Storage helpers
export const getAvatarUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
};

export const getGoalPhotoUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const { data } = supabase.storage.from('goal-photos').getPublicUrl(path);
  return data.publicUrl;
};

export const uploadAvatar = async (userId: string, file: File): Promise<string | null> => {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/avatar.${fileExt}`;
  const { error } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
  if (error) {
    console.error('Error uploading avatar:', error);
    return null;
  }
  return filePath;
};

export const uploadGoalPhoto = async (userId: string, goalId: string, file: File): Promise<string | null> => {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}/${goalId}.${fileExt}`;
  const { error } = await supabase.storage.from('goal-photos').upload(filePath, file, { upsert: true });
  if (error) {
    console.error('Error uploading goal photo:', error);
    return null;
  }
  return filePath;
};
