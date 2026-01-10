// GET /api/auth/session
// Returns the current user and their subscription status

import type { APIRoute } from 'astro';
import { getCurrentUser, createSupabaseServerClient } from '../../../lib/supabase-server';

export const prerender = false;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true'
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const user = await getCurrentUser(cookies);

    if (!user) {
      return new Response(JSON.stringify({
        user: null,
        subscription: null
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Fetch subscription status
    const supabase = createSupabaseServerClient(cookies);
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('is_paid, subscription_status, expires_at')
      .eq('user_id', user.id)
      .single();

    return new Response(JSON.stringify({
      user: {
        id: user.id,
        email: user.email
      },
      subscription: subscription || null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Session error:', error);
    return new Response(JSON.stringify({
      error: 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
