import { useCallback } from 'react';
import { useAuthModalStore } from '../store/useAuthModalStore';
import { useScheduleStore } from '../store/useScheduleStore';

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
  const userId = useScheduleStore((state) => state.userId);
  const { openAuthModal, setPendingAction } = useAuthModalStore();
  const isAuthenticated = Boolean(userId);

  const requireAuth = useCallback(
    (action: () => void, message?: string) => {
      if (isAuthenticated) {
        // User is authenticated, execute action immediately
        action();
      } else {
        // User is guest, store pending action and show auth modal
        setPendingAction(action);
        openAuthModal(message);
      }
    },
    [isAuthenticated, openAuthModal, setPendingAction]
  );

  return { requireAuth, isAuthenticated };
}
