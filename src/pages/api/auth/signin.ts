// POST /api/auth/signin
// Authenticates existing user with email/password

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase-server';

export const prerender = false;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true'
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { email, password } = await request.json();

    // Validate required fields
    if (!email || !password) {
      return new Response(JSON.stringify({
        error: 'Email and password are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Authenticate with Supabase
    const supabase = createSupabaseServerClient(cookies);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return new Response(JSON.stringify({
        error: error.message
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!data.user) {
      return new Response(JSON.stringify({
        error: 'Authentication failed'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Session cookies are automatically set by supabase-server storage adapter
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Signin error:', error);
    return new Response(JSON.stringify({
      error: 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
