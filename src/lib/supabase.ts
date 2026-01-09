import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

// Client-side Supabase - disable session persistence since we use server-side cookies
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

export interface CityMapEntry {
  id: number;
  tag: string;
  state: string;
  city: string;
  is_retired: boolean;
  is_service: boolean;
  is_internal: boolean;
  lat: number | null;
  lon: number | null;
}
