import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';

const getSessionMock = vi.fn();
const getUserMock = vi.fn();
const refreshSessionMock = vi.fn();
const invokeMock = vi.fn();

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
      getUser: (...args: unknown[]) => getUserMock(...args),
      refreshSession: (...args: unknown[]) => refreshSessionMock(...args),
    },
    functions: {
      invoke: (...args: unknown[]) => invokeMock(...args),
    },
  },
}));

/**
 * Helper: build a FunctionsHttpError with a mock Response as context
 */
function buildHttpError(status: number, body: Record<string, unknown>) {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
  return new FunctionsHttpError(response);
}

async function callProcessRoster(status: number, body: Record<string, unknown>) {
  invokeMock.mockResolvedValue({
    data: null,
    error: buildHttpError(status, body),
  });

  const { processRoster } = await import('../rosterApi');

  return processRoster(
    'image-data',
    [{ id: 'job-1', name: 'Bar' }],
    [{ alias: 'BAR', job_config_id: 'job-1' }],
  );
}

describe('rosterApi error mapping', () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(import.meta.env, {
      DEV: false,
    });

    getSessionMock.mockResolvedValue({
      data: {
        session: {
          access_token: 'token',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      error: null,
    });
    refreshSessionMock.mockResolvedValue({
      data: { session: null },
      error: new Error('refresh failed'),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('maps 400 to invalid_input', async () => {
    const result = await callProcessRoster(400, { error: 'Bad request', errorType: 'invalid_input' });
    expect(result.success).toBe(false);
    expect(result.errorType).toBe('invalid_input');
  });

  it('maps 401 token errors to auth with session-expired message', async () => {
    const result = await callProcessRoster(401, { error: 'invalid jwt token' });
    expect(result.success).toBe(false);
    expect(result.errorType).toBe('auth');
    expect(result.error).toContain('Session expired');
  });

  it('preserves 413 invalid_input from API response body', async () => {
    const result = await callProcessRoster(413, { error: 'Image payload too large', errorType: 'invalid_input' });
    expect(result.success).toBe(false);
    expect(result.errorType).toBe('invalid_input');
  });

  it('maps 429 to limit_exceeded', async () => {
    const result = await callProcessRoster(429, { error: 'limit', errorType: 'limit_exceeded' });
    expect(result.success).toBe(false);
    expect(result.errorType).toBe('limit_exceeded');
  });

  it('maps 5xx to network when errorType is not provided', async () => {
    const result = await callProcessRoster(503, { error: 'upstream unavailable' });
    expect(result.success).toBe(false);
    expect(result.errorType).toBe('network');
  });

  it('returns auth error when no session exists', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const { processRoster } = await import('../rosterApi');
    const result = await processRoster('image', [{ id: '1', name: 'Job' }], []);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe('auth');
    expect(result.error).toContain('Authentication required');
  });

  it('handles relay errors as network errors', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: new FunctionsRelayError({ message: 'relay failed' }),
    });

    const { processRoster } = await import('../rosterApi');
    const result = await processRoster('image', [{ id: '1', name: 'Job' }], []);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe('network');
  });

  it('handles fetch errors as network errors', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: new FunctionsFetchError(new TypeError('Failed to fetch')),
    });

    const { processRoster } = await import('../rosterApi');
    const result = await processRoster('image', [{ id: '1', name: 'Job' }], []);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe('network');
  });

  it('returns data on successful invoke', async () => {
    invokeMock.mockResolvedValue({
      data: {
        success: true,
        shifts: [{ id: '1', date: '2026-01-15', rosterJobName: 'Bar' }],
        processingTimeMs: 1200,
      },
      error: null,
    });

    const { processRoster } = await import('../rosterApi');
    const result = await processRoster('image', [{ id: '1', name: 'Job' }], []);
    expect(result.success).toBe(true);
    expect(result.shifts).toHaveLength(1);
  });

  it('retries on 401 with session refresh', async () => {
    // First call returns 401, second succeeds
    invokeMock
      .mockResolvedValueOnce({
        data: null,
        error: buildHttpError(401, { error: 'jwt expired' }),
      })
      .mockResolvedValueOnce({
        data: { success: true, shifts: [], processingTimeMs: 100 },
        error: null,
      });

    refreshSessionMock.mockResolvedValue({
      data: { session: { access_token: 'new-token' } },
      error: null,
    });

    const { processRoster } = await import('../rosterApi');
    const result = await processRoster('image', [{ id: '1', name: 'Job' }], []);

    expect(result.success).toBe(true);
    expect(refreshSessionMock).toHaveBeenCalledOnce();
    expect(invokeMock).toHaveBeenCalledTimes(2);
  });
});
