// Paywall Access Control Logic
// Determines whether a user can access paid content

import type { GhostPost } from './ghost';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Check if a post requires a paid subscription
 * Looks for #paid tag in post's tags array
 */
export function isPostPaid(post: GhostPost): boolean {
  if (!post.tags || post.tags.length === 0) {
    return false;
  }

  // Check if any tag has slug 'paid' or name contains 'paid'
  return post.tags.some(tag =>
    tag.slug.toLowerCase() === 'paid' ||
    tag.name.toLowerCase().includes('paid')
  );
}

/**
 * Check if a user can access a specific post
 * Returns access decision with reason
 */
export async function canAccessPost(
  userId: string | null,
  post: GhostPost,
  supabase: SupabaseClient
): Promise<{
  granted: boolean;
  reason: string;
}> {
  // 1. If post is not marked as paid, grant access (public post)
  if (!isPostPaid(post)) {
    return { granted: true, reason: 'public_post' };
  }

  // 2. If user is not authenticated, deny access
  if (!userId) {
    return { granted: false, reason: 'not_authenticated' };
  }

  // 3. Check user's subscription status
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('is_paid, subscription_status, expires_at')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error('Failed to fetch subscription:', error);
    return { granted: false, reason: 'no_subscription' };
  }

  // 4. Check if subscription is active
  // Active if: is_paid=true AND status='paid' AND (expires_at is null OR expires_at > now)
  const now = new Date();
  const expiresAt = data.expires_at ? new Date(data.expires_at) : null;

  const isActive =
    data.is_paid === true &&
    data.subscription_status === 'paid' &&
    (!expiresAt || expiresAt > now);

  if (isActive) {
    return { granted: true, reason: 'is_paid' };
  } else {
    return { granted: false, reason: 'no_subscription' };
  }
}

/**
 * Log an access attempt to the database for analytics
 */
export async function logAccessAttempt(
  userId: string | null,
  postSlug: string,
  accessGranted: boolean,
  reason: string,
  supabase: SupabaseClient
): Promise<void> {
  try {
    const { error } = await supabase
      .from('access_logs')
      .insert({
        user_id: userId,
        post_slug: postSlug,
        access_granted: accessGranted,
        reason: reason
      });

    if (error) {
      console.error('Failed to log access attempt:', error);
    }
  } catch (error) {
    console.error('Error logging access:', error);
  }
}
