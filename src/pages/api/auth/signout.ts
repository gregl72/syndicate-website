// POST /api/auth/signout
// Signs out the current user and clears session cookies

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase-server';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createSupabaseServerClient(cookies);

    // Sign out from Supabase
    await supabase.auth.signOut();

    // Find all Supabase auth cookies from the request and expire them
    const cookieHeader = request.headers.get('cookie') || '';
    const cookieNames = cookieHeader
      .split(';')
      .map(c => c.trim().split('=')[0])
      .filter(name => name.startsWith('sb-'));

    // Build Set-Cookie headers to expire all Supabase cookies
    const expireCookies = cookieNames.map(name =>
      `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`
    );

    // If no cookies found, still try the default name
    if (expireCookies.length === 0) {
      expireCookies.push('sb-njdfevfwljuyzipguqfp-auth-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax');
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    expireCookies.forEach(cookie => headers.append('Set-Cookie', cookie));

    return new Response(JSON.stringify({
      success: true,
      debug: {
        foundCookies: cookieNames,
        expiring: expireCookies
      }
    }), {
      status: 200,
      headers
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
