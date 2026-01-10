// POST /api/auth/signup
// Creates a new user account with email/password

import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../../lib/supabase-server';
import { supabaseAdmin } from '../../../lib/supabase-admin';

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
    const { email, password, name } = await request.json();

    // Validate required fields
    if (!email || !password || !name) {
      return new Response(JSON.stringify({
        error: 'Email, password, and name are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create auth user with Supabase Auth (auto-confirm email)
    // Using admin client to bypass email confirmation since subscriptions are manually granted
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Auto-confirm email
    });

    if (authError) {
      return new Response(JSON.stringify({
        error: authError.message
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!authData.user) {
      return new Response(JSON.stringify({
        error: 'Failed to create user'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = authData.user.id;

    // Create user profile (use supabaseAdmin to bypass RLS)
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        full_name: name
      });

    if (profileError) {
      console.error('Failed to create user profile:', profileError);
      // Don't fail the whole signup, just log it
    }

    // Create subscription record (default: free)
    const { error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        is_paid: false,
        subscription_status: 'free'
      });

    if (subError) {
      console.error('Failed to create subscription:', subError);
      // Don't fail the whole signup, just log it
    }

    // Sign the user in immediately after account creation
    const supabase = createSupabaseServerClient(cookies);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      console.error('Failed to sign in after signup:', signInError);
      // Account created but signin failed - user can still manually sign in
    }

    // Session cookies are automatically set by supabase-server storage adapter
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Signup error:', error);
    return new Response(JSON.stringify({
      error: 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
