import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
