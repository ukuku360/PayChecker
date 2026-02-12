import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useAuthSession } from '../useAuthSession';

const getSessionMock = vi.fn();
const getUserMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const signOutMock = vi.fn();

vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
      getUser: (...args: unknown[]) => getUserMock(...args),
      onAuthStateChange: (...args: unknown[]) => onAuthStateChangeMock(...args),
      signOut: (...args: unknown[]) => signOutMock(...args),
    },
  },
}));

describe('useAuthSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useScheduleStore.setState({
      userId: 'stale-user-id',
      isAdmin: true,
      shifts: [{ id: 'shift-1', date: '2026-02-01', type: 'A', hours: 8 }],
      jobConfigs: [{
        id: 'A',
        name: 'Job A',
        color: 'blue',
        defaultHours: { weekday: 8, weekend: 8 },
        hourlyRates: { weekday: 20, saturday: 25, sunday: 30, holiday: 40 },
        rateHistory: [],
      }],
    } as Partial<ReturnType<typeof useScheduleStore.getState>>);

    getSessionMock.mockResolvedValue({ data: { session: null } });
    onAuthStateChangeMock.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('clears stale persisted user state when no auth session exists', async () => {
    const { result } = renderHook(() => useAuthSession());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const state = useScheduleStore.getState();
    expect(state.userId).toBeNull();
    expect(state.shifts).toHaveLength(0);
    expect(state.isAdmin).toBe(false);
  });
});

