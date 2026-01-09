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

    // Build Set-Cookie header to expire the auth cookie
    // Must match the original cookie's path and attributes
    const expiredCookie = `${AUTH_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`;

    return new Response(JSON.stringify({
      success: true
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': expiredCookie
      }
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
