// Supabase Server Client
// Creates Supabase client with cookie-based session management for SSR

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables (SUPABASE_URL or SUPABASE_ANON_KEY)');
}

/**
 * Creates a Supabase client that uses Astro cookies for session storage
 */
export function createSupabaseServerClient(cookies: AstroCookies): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: {
        getItem: (key: string) => {
          const cookie = cookies.get(key);
          return cookie?.value || null;
        },
        setItem: (key: string, value: string) => {
          cookies.set(key, value, {
            httpOnly: true,
            secure: import.meta.env.PROD,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7 // 7 days
          });
        },
        removeItem: (key: string) => {
          cookies.delete(key, {
            path: '/'
          });
        }
      }
    }
  });
}

/**
 * Gets the current authenticated user from cookies
 */
export async function getCurrentUser(cookies: AstroCookies) {
  const supabase = createSupabaseServerClient(cookies);

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Refreshes the session if the access token is expired
 */
export async function refreshSessionIfNeeded(cookies: AstroCookies) {
  const supabase = createSupabaseServerClient(cookies);

  const { data: { session }, error } = await supabase.auth.refreshSession();

  if (error || !session) {
    return null;
  }

  return session;
}
