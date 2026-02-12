import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();
const getUserMock = vi.fn();
const refreshSessionMock = vi.fn();

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
      getUser: (...args: unknown[]) => getUserMock(...args),
      refreshSession: (...args: unknown[]) => refreshSessionMock(...args),
    },
  },
}));

function buildResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function callProcessRoster(status: number, body: Record<string, unknown>) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(buildResponse(status, body)));

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
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'anon-key',
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
    vi.unstubAllGlobals();
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
});
