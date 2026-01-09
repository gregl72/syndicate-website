// POST /api/auth/signout
// Signs out the current user and clears session cookies

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase-server';

export const prerender = false;

// Supabase auth cookie name based on project ref
const AUTH_COOKIE_NAME = 'sb-njdfevfwljuyzipguqfp-auth-token';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const supabase = createSupabaseServerClient(cookies);

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Explicitly delete the auth cookie to ensure it's cleared
    cookies.delete(AUTH_COOKIE_NAME, { path: '/' });

    return new Response(JSON.stringify({
      success: true
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Signout error:', error);
    return new Response(JSON.stringify({
      error: 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
