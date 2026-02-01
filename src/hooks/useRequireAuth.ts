import { useCallback } from 'react';
import { useAuthSession } from './useAuthSession';
import { useAuthModalStore } from '../store/useAuthModalStore';

/**
 * Hook to gate actions behind authentication.
 *
 * Usage:
 * const { requireAuth, isAuthenticated } = useRequireAuth();
 *
 * // Gate an action:
 * requireAuth(() => doSomething(), "Sign in to do something");
 *
 * // Check auth status:
 * if (isAuthenticated) { ... }
 */
export function useRequireAuth() {
  const { session } = useAuthSession();
  const { openAuthModal, setPendingAction } = useAuthModalStore();

  const requireAuth = useCallback(
    (action: () => void, message?: string) => {
      if (session) {
        // User is authenticated, execute action immediately
        action();
      } else {
        // User is guest, store pending action and show auth modal
        setPendingAction(action);
        openAuthModal(message);
      }
    },
    [session, openAuthModal, setPendingAction]
  );

  const isAuthenticated = !!session;

  return { requireAuth, isAuthenticated, session };
}
