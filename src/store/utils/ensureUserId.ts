import { supabase } from '../../lib/supabaseClient';

/**
 * Helper to get userId from store with fallback to supabase.auth.getUser()
 * Note: In normal operation, userId should always be set by useAuthSession.
 * The fallback is for edge cases during auth state transitions.
 */
export async function ensureUserId(storeUserId: string | null): Promise<string | null> {
  if (storeUserId) return storeUserId;

  // Fallback: fetch from auth (should rarely happen if useAuthSession is working correctly)
  if (import.meta.env.DEV) {
    console.warn('[ensureUserId] userId not in store, fetching from auth');
  }
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}
