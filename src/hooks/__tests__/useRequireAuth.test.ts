import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { useRequireAuth } from '../useRequireAuth';
import { useAuthModalStore } from '../../store/useAuthModalStore';
import { useScheduleStore } from '../../store/useScheduleStore';

function resetStores() {
  useAuthModalStore.setState({
    isOpen: false,
    pendingAction: null,
    returnMessage: null,
  });
  useScheduleStore.setState({ userId: null });
}

describe('useRequireAuth', () => {
  beforeEach(() => {
    resetStores();
  });

  it('opens auth modal and stores pending action when unauthenticated', () => {
    const action = vi.fn();
    const { result } = renderHook(() => useRequireAuth());

    act(() => {
      result.current.requireAuth(action, 'Sign in required');
    });

    expect(action).not.toHaveBeenCalled();
    expect(result.current.isAuthenticated).toBe(false);
    expect(useAuthModalStore.getState().isOpen).toBe(true);
    expect(useAuthModalStore.getState().returnMessage).toBe('Sign in required');
    expect(typeof useAuthModalStore.getState().pendingAction).toBe('function');
  });

  it('executes action immediately when authenticated', () => {
    useScheduleStore.setState({ userId: 'user-123' });
    const action = vi.fn();
    const { result } = renderHook(() => useRequireAuth());

    act(() => {
      result.current.requireAuth(action, 'unused');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(action).toHaveBeenCalledTimes(1);
    expect(useAuthModalStore.getState().isOpen).toBe(false);
    expect(useAuthModalStore.getState().pendingAction).toBeNull();
  });
});

