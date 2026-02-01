/**
 * API wrapper for roster scanning Edge Function
 * Supports two-phase AI-first flow:
 *   Phase 1: Image → OCR + Smart Questions
 *   Phase 2: Answers → Filtered Shifts
 */

import { supabase } from './supabaseClient';
import type { RosterScanResult, JobAlias, RosterIdentifier, QuestionGenerationResult, QuestionAnswer, OcrResult } from '../types';

interface JobConfigSimple {
  id: string;
  name: string;
}

interface JobAliasInput {
  alias: string;
  job_config_id: string;
}

const TOKEN_REFRESH_THRESHOLD_MS = 60_000;
const MAX_AUTH_RETRIES = 2;
const RETRY_DELAY_MS = 500;

// Mutex for token refresh to prevent race conditions when multiple API calls trigger refresh simultaneously
let tokenRefreshPromise: Promise<string | null> | null = null;

/** Validate token by checking with Supabase auth */
async function validateToken(token: string): Promise<boolean> {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  return !error && !!user;
}

/** Refresh the session and return new access token (with mutex to prevent concurrent refreshes) */
async function refreshAndGetToken(): Promise<string | null> {
  // If a refresh is already in progress, wait for it instead of starting another
  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }

  tokenRefreshPromise = (async () => {
    try {
      const { data: refreshed, error } = await supabase.auth.refreshSession();
      if (error || !refreshed.session?.access_token) {
        if (import.meta.env.DEV) console.warn('Session refresh failed:', error);
        return null;
      }
      return refreshed.session.access_token;
    } finally {
      // Clear the mutex after a short delay to allow subsequent calls to benefit from the fresh token
      setTimeout(() => {
        tokenRefreshPromise = null;
      }, 100);
    }
  })();

  return tokenRefreshPromise;
}

/** Get a valid access token, refreshing if necessary */
async function getValidAccessToken(options: { forceRefresh?: boolean } = {}): Promise<string | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  const { forceRefresh = false } = options;

  if (error && import.meta.env.DEV) {
    console.error('Failed to get session:', error);
  }

  if (!session?.access_token) return null;

  const expiresAtMs = session.expires_at ? session.expires_at * 1000 : 0;
  const isExpiringSoon = expiresAtMs && (expiresAtMs - Date.now() < TOKEN_REFRESH_THRESHOLD_MS);

  // If not forcing refresh and token isn't expiring soon, validate current token
  if (!forceRefresh && !isExpiringSoon) {
    if (await validateToken(session.access_token)) {
      return session.access_token;
    }
    // Token invalid, try to refresh
    const refreshedToken = await refreshAndGetToken();
    if (refreshedToken && await validateToken(refreshedToken)) {
      return refreshedToken;
    }
    return null;
  }

  // Token expiring soon or force refresh requested
  const refreshedToken = await refreshAndGetToken();
  if (refreshedToken && await validateToken(refreshedToken)) {
    return refreshedToken;
  }

  return null;
}

function getResponseErrorMessage(responseBody: unknown, status: number): string {
  if (responseBody && typeof responseBody === 'object') {
    const body = responseBody as { error?: unknown; message?: unknown; error_description?: unknown };
    if (typeof body.error === 'string' && body.error.trim()) return body.error;
    if (typeof body.message === 'string' && body.message.trim()) return body.message;
    if (typeof body.error_description === 'string' && body.error_description.trim()) return body.error_description;
  }

  return `Request failed (${status})`;
}

/**
 * Processes a roster image through the Edge Function
 */
export async function processRoster(
  imageBase64: string,
  jobConfigs: JobConfigSimple[],
  jobAliases: JobAliasInput[],
  identifier?: RosterIdentifier | null
): Promise<RosterScanResult & { scansUsed?: number; scanLimit?: number }> {
  try {
    let accessToken = await getValidAccessToken({ forceRefresh: false });

    if (!accessToken) {
      return {
        success: false,
        shifts: [],
        processingTimeMs: 0,
        error: 'Authentication required',
        errorType: 'auth'
      };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        success: false,
        shifts: [],
        processingTimeMs: 0,
        error: 'Supabase configuration missing',
        errorType: 'config'
      };
    }

    const callFunction = async (token: string) => {
      const response = await fetch(`${supabaseUrl}/functions/v1/process-roster`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: supabaseAnonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64,
          jobConfigs,
          jobAliases,
          ...(identifier ? { identifier } : {})
        })
      });

      let responseBody: unknown = null;
      try {
        responseBody = await response.json();
      } catch {
        responseBody = null;
      }

      return { response, responseBody };
    };

    let response: Response;
    let responseBody: unknown;

    for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
      ({ response, responseBody } = await callFunction(accessToken));

      // If not an auth error, break out of retry loop
      if (response.status !== 401 && response.status !== 403) {
        break;
      }

      if (attempt < MAX_AUTH_RETRIES) {
        // Small delay before refresh to allow server-side state propagation
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));

        // Use shared refresh function to prevent concurrent refreshes
        const refreshedToken = await refreshAndGetToken();

        if (!refreshedToken) {
          break;
        }

        accessToken = refreshedToken;
      }
    }

    if (!response!.ok) {
      let errorMessage = getResponseErrorMessage(responseBody, response!.status);
      let errorType: RosterScanResult['errorType'] = 'unknown';

      const bodyErrorType = (responseBody as { errorType?: unknown } | null)?.errorType;
      if (typeof bodyErrorType === 'string') {
        errorType = bodyErrorType as RosterScanResult['errorType'];
      } else if (response!.status === 401 || response!.status === 403) {
        errorType = 'auth';
        if (/jwt|token|expired|invalid/i.test(errorMessage)) {
          errorMessage = 'Session expired. Please sign in again.';
        }
      } else if (response!.status === 429) {
        errorType = 'limit_exceeded';
      } else if (response!.status === 400) {
        errorType = 'invalid_input';
      } else if (response!.status >= 500) {
        errorType = 'network';
      }

      if (import.meta.env.DEV) console.error('Edge function error:', response!.status, responseBody);

      return {
        success: false,
        shifts: [],
        processingTimeMs: 0,
        error: errorMessage,
        errorType,
        ...(typeof (responseBody as { scansUsed?: unknown } | null)?.scansUsed === 'number'
          ? { scansUsed: (responseBody as { scansUsed: number }).scansUsed }
          : {}),
        ...(typeof (responseBody as { scanLimit?: unknown } | null)?.scanLimit === 'number'
          ? { scanLimit: (responseBody as { scanLimit: number }).scanLimit }
          : {})
      };
    }

    return responseBody as RosterScanResult & { scansUsed?: number; scanLimit?: number };
  } catch (error) {
    if (import.meta.env.DEV) console.error('Process roster error:', error);
    return {
      success: false,
      shifts: [],
      processingTimeMs: 0,
      error: error instanceof Error ? error.message : 'Network error',
      errorType: 'network'
    };
  }
}

/**
 * Phase 1: OCR + Smart Question Generation
 * Returns questions that help identify the user's shifts
 */
export async function processRosterPhase1(
  imageBase64: string
): Promise<QuestionGenerationResult> {
  try {
    let accessToken = await getValidAccessToken({ forceRefresh: false });

    if (!accessToken) {
      return {
        success: false,
        questions: [],
        ocrData: { success: false, tableType: 'unknown', headers: [], rows: [] },
        error: 'Authentication required',
        errorType: 'auth'
      };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        success: false,
        questions: [],
        ocrData: { success: false, tableType: 'unknown', headers: [], rows: [] },
        error: 'Supabase configuration missing',
        errorType: 'config'
      };
    }

    const callFunction = async (token: string) => {
      const response = await fetch(`${supabaseUrl}/functions/v1/process-roster`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: supabaseAnonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phase: 'questions',
          imageBase64
        })
      });

      let responseBody: QuestionGenerationResult | null = null;
      try {
        responseBody = await response.json();
      } catch {
        responseBody = null;
      }

      return { response, responseBody };
    };

    let response!: Response;
    let responseBody: QuestionGenerationResult | null = null;

    for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
      ({ response, responseBody } = await callFunction(accessToken));

      // If not an auth error, break out of retry loop
      if (response.status !== 401 && response.status !== 403) {
        break;
      }

      if (attempt < MAX_AUTH_RETRIES) {
        // Small delay before refresh to allow server-side state propagation
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));

        // Use shared refresh function to prevent concurrent refreshes
        const refreshedToken = await refreshAndGetToken();

        if (!refreshedToken) {
          break;
        }

        accessToken = refreshedToken;
      }
    }

    if (!response.ok) {
      let errorMessage = responseBody?.error || `Request failed (${response.status})`;
      let errorType = responseBody?.errorType || 'unknown';

      if (response.status === 401 || response.status === 403) {
        errorType = 'auth';
        if (/jwt|token|expired|invalid/i.test(errorMessage)) {
          errorMessage = 'Session expired. Please sign in again.';
        }
      }

      return {
        success: false,
        questions: [],
        ocrData: responseBody?.ocrData || { success: false, tableType: 'unknown', headers: [], rows: [] },
        error: errorMessage,
        errorType,
        scansUsed: responseBody?.scansUsed,
        scanLimit: responseBody?.scanLimit
      };
    }

    return responseBody as QuestionGenerationResult;
  } catch (error) {
    if (import.meta.env.DEV) console.error('Phase 1 error:', error);
    return {
      success: false,
      questions: [],
      ocrData: { success: false, tableType: 'unknown', headers: [], rows: [] },
      error: error instanceof Error ? error.message : 'Network error',
      errorType: 'network'
    };
  }
}

/**
 * Phase 2: Filter shifts using user's answers
 */
export async function processRosterPhase2(
  ocrData: OcrResult,
  answers: QuestionAnswer[],
  jobConfigs: JobConfigSimple[],
  jobAliases: JobAliasInput[]
): Promise<RosterScanResult> {
  try {
    let accessToken = await getValidAccessToken({ forceRefresh: false });

    if (!accessToken) {
      return {
        success: false,
        shifts: [],
        processingTimeMs: 0,
        error: 'Authentication required',
        errorType: 'auth'
      };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        success: false,
        shifts: [],
        processingTimeMs: 0,
        error: 'Supabase configuration missing',
        errorType: 'config'
      };
    }

    const callFunction = async (token: string) => {
      const response = await fetch(`${supabaseUrl}/functions/v1/process-roster`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: supabaseAnonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phase: 'filter',
          ocrData: {
            contentType: ocrData.contentType,
            tableType: ocrData.tableType,
            headers: ocrData.headers,
            rows: ocrData.rows,
            extractedShifts: ocrData.extractedShifts,
            rawText: ocrData.rawText,
            metadata: ocrData.metadata
          },
          answers,
          jobConfigs,
          jobAliases
        })
      });

      let responseBody: RosterScanResult | null = null;
      try {
        responseBody = await response.json();
      } catch {
        responseBody = null;
      }

      return { response, responseBody };
    };

    let response!: Response;
    let responseBody: RosterScanResult | null = null;

    for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
      ({ response, responseBody } = await callFunction(accessToken));

      // If not an auth error, break out of retry loop
      if (response.status !== 401 && response.status !== 403) {
        break;
      }

      if (attempt < MAX_AUTH_RETRIES) {
        // Small delay before refresh to allow server-side state propagation
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));

        // Use shared refresh function to prevent concurrent refreshes
        const refreshedToken = await refreshAndGetToken();

        if (!refreshedToken) {
          break;
        }

        accessToken = refreshedToken;
      }
    }

    if (!response.ok) {
      let errorMessage = responseBody?.error || `Request failed (${response.status})`;
      let errorType = responseBody?.errorType || 'unknown';

      if (response.status === 401 || response.status === 403) {
        errorType = 'auth';
        if (/jwt|token|expired|invalid/i.test(errorMessage)) {
          errorMessage = 'Session expired. Please sign in again.';
        }
      }

      return {
        success: false,
        shifts: [],
        processingTimeMs: responseBody?.processingTimeMs || 0,
        error: errorMessage,
        errorType,
        ocrData
      };
    }

    return responseBody as RosterScanResult;
  } catch (error) {
    if (import.meta.env.DEV) console.error('Phase 2 error:', error);
    return {
      success: false,
      shifts: [],
      processingTimeMs: 0,
      error: error instanceof Error ? error.message : 'Network error',
      errorType: 'network'
    };
  }
}

/**
 * Gets all job aliases for the current user
 */
export async function getJobAliases(): Promise<JobAlias[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('job_aliases')
    .select('*')
    .eq('user_id', user.id);

  if (error) {
    if (import.meta.env.DEV) console.error('Failed to fetch job aliases:', error);
    return [];
  }

  return data || [];
}

/**
 * Saves job aliases (creates or updates)
 */
export async function saveJobAliases(aliases: JobAliasInput[]): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Upsert each alias
  for (const alias of aliases) {
    const { error } = await supabase
      .from('job_aliases')
      .upsert(
        {
          user_id: user.id,
          alias: alias.alias,
          job_config_id: alias.job_config_id
        },
        {
          onConflict: 'user_id,alias'
        }
      );

    if (error && import.meta.env.DEV) {
      console.error('Failed to save alias:', error);
    }
  }
}

/**
 * Deletes a job alias
 */
export async function deleteJobAlias(aliasId: string): Promise<void> {
  const { error } = await supabase
    .from('job_aliases')
    .delete()
    .eq('id', aliasId);

  if (error && import.meta.env.DEV) {
    console.error('Failed to delete alias:', error);
  }
}

/**
 * Gets roster scan usage for the current month
 */
export async function getRosterScanUsage(): Promise<{ used: number; limit: number }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { used: 0, limit: 20 };

  const { data, error } = await supabase
    .from('profiles')
    .select('roster_scans_this_month, roster_scan_limit')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    return { used: 0, limit: 20 };
  }

  return {
    used: data.roster_scans_this_month || 0,
    limit: data.roster_scan_limit || 20
  };
}

/**
 * Gets recent roster scan history
 */
export async function getRosterScanHistory(limit = 10): Promise<Array<{
  id: string;
  created_at: string;
  shifts_created: number;
  processing_time_ms: number;
}>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('roster_scans')
    .select('id, created_at, shifts_created, processing_time_ms')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (import.meta.env.DEV) console.error('Failed to fetch scan history:', error);
    return [];
  }

  return data || [];
}

/**
 * Gets saved roster identifier from user profile
 */
export async function getSavedRosterIdentifier(): Promise<RosterIdentifier | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('roster_identifier')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data.roster_identifier as RosterIdentifier | null;
}

/**
 * Saves roster identifier to user profile
 */
export async function saveRosterIdentifier(identifier: RosterIdentifier): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('profiles')
    .update({ roster_identifier: identifier })
    .eq('id', user.id);

  if (error) {
    if (import.meta.env.DEV) console.error('Failed to save roster identifier:', error);
    throw error;
  }
}
