import type { PostgrestError } from '@supabase/supabase-js';
import { toast } from '../useToastStore';

interface HandleDbErrorOptions {
  /** User-facing error message (should be i18n key or translated string) */
  userMessage?: string;
  /** Context for dev logging (e.g., 'addShift', 'updateProfile') */
  context: string;
  /** Optional rollback function to call on error */
  rollback?: () => void;
}

/**
 * Centralized database error handler for store slices.
 * - Shows toast notification to user (if userMessage provided)
 * - Logs detailed error in development
 * - Executes rollback if provided
 */
export function handleDbError(
  error: PostgrestError | null,
  options: HandleDbErrorOptions
): boolean {
  if (!error) return false;

  const { userMessage, context, rollback } = options;

  // Log in development only
  if (import.meta.env.DEV) {
    console.error(`[${context}] Database error:`, error);
  }

  // Show user feedback if message provided
  if (userMessage) {
    toast.error(userMessage);
  }

  // Execute rollback if provided
  if (rollback) {
    rollback();
  }

  return true;
}
