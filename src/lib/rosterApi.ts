/**
 * API wrapper for roster scanning Edge Function
 * Supports two-phase AI-first flow:
 *   Phase 1: Image → OCR + Smart Questions
 *   Phase 2: Answers → Filtered Shifts
 *
 * Uses supabase.functions.invoke() which automatically handles:
 * - Correct apikey header from the client instance
 * - Session Bearer token from auth state
 * - URL construction from the client's base URL
 */

import { supabase } from './supabaseClient';
import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';
import type { RosterScanResult, JobAlias, RosterIdentifier, QuestionGenerationResult, QuestionAnswer, OcrResult } from '../types';

interface JobConfigSimple {
  id: string;
  name: string;
}

interface JobAliasInput {
  alias: string;
  job_config_id: string;
}

const MAX_AUTH_RETRIES = 1;

// ============================================
// Error Handling
// ============================================

interface InvokeErrorResult {
  errorMessage: string;
  errorType: string;
  status?: number;
  responseData?: Record<string, unknown> | null;
}

/**
 * Maps supabase.functions.invoke() errors to our error type system.
 * FunctionsHttpError = non-2xx from Edge Function (or gateway)
 * FunctionsRelayError = Supabase relay/gateway could not reach the function
 * FunctionsFetchError = network-level failure (offline, DNS, etc.)
 */
async function mapInvokeError(error: unknown): Promise<InvokeErrorResult> {
  if (error instanceof FunctionsHttpError) {
    // error.context is the raw Response object
    const response = error.context as Response;
    const status = response.status;
    let responseData: Record<string, unknown> | null = null;

    try {
      responseData = await response.json();
    } catch {
      // Response body may already be consumed or not JSON
    }

    let errorMessage = 'An error occurred';
    let errorType = 'unknown';

    if (responseData) {
      if (typeof responseData.error === 'string' && responseData.error.trim()) {
        errorMessage = responseData.error;
      } else if (typeof responseData.message === 'string' && responseData.message.trim()) {
        errorMessage = responseData.message;
      }
      if (typeof responseData.errorType === 'string') {
        errorType = responseData.errorType;
      }
    }

    // If we still don't have a good error message, provide status-specific ones
    if (errorMessage === 'An error occurred') {
      if (status === 401 || status === 403) {
        errorMessage = 'Session expired. Please sign in again.';
      } else if (status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (status >= 500) {
        errorMessage = 'Server error. Please try again.';
      } else {
        errorMessage = `Request failed (${status})`;
      }
    }

    // Infer errorType from status if not set by the response body
    if (errorType === 'unknown') {
      if (status === 401 || status === 403) errorType = 'auth';
      else if (status === 429) errorType = 'limit_exceeded';
      else if (status === 400 || status === 413) errorType = 'invalid_input';
      else if (status >= 500) errorType = 'network';
    }

    // Friendlier auth messages
    if (errorType === 'auth' && /jwt|token|expired|invalid/i.test(errorMessage)) {
      errorMessage = 'Session expired. Please sign in again.';
    }

    if (import.meta.env.DEV) {
      console.error('[RosterAPI] HTTP error:', { status, errorType, errorMessage, responseData });
    }

    return { errorMessage, errorType, status, responseData };
  }

  if (error instanceof FunctionsRelayError) {
    if (import.meta.env.DEV) {
      console.error('[RosterAPI] Relay error (gateway could not reach function):', error.message);
    }
    return {
      errorMessage: 'Service temporarily unavailable. Please try again.',
      errorType: 'network',
    };
  }

  if (error instanceof FunctionsFetchError) {
    if (import.meta.env.DEV) {
      console.error('[RosterAPI] Fetch error (network failure):', error.message);
    }
    return {
      errorMessage: 'Network error. Please check your connection.',
      errorType: 'network',
    };
  }

  // Unknown error type
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  if (import.meta.env.DEV) {
    console.error('[RosterAPI] Unknown error:', error);
  }
  return { errorMessage: message, errorType: 'unknown' };
}

/**
 * Invoke the process-roster Edge Function with automatic auth retry.
 * On 401, refreshes the session once and retries.
 */
async function invokeRoster<T>(
  body: Record<string, unknown>
): Promise<{ data: T | null; invokeError: InvokeErrorResult | null; responseData?: Record<string, unknown> | null }> {
  for (let attempt = 0; attempt <= MAX_AUTH_RETRIES; attempt++) {
    const { data, error } = await supabase.functions.invoke('process-roster', { body });

    if (!error) {
      return { data: data as T, invokeError: null };
    }

    // Check if it's an auth error worth retrying
    const isAuthError =
      (error instanceof FunctionsHttpError &&
        (error.context as Response).status === 401) ||
      (error instanceof FunctionsHttpError &&
        (error.context as Response).status === 403);

    if (isAuthError && attempt < MAX_AUTH_RETRIES) {
      if (import.meta.env.DEV) {
        console.warn('[RosterAPI] Auth error, refreshing session and retrying...');
      }
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        if (import.meta.env.DEV) {
          console.error('[RosterAPI] Session refresh failed:', refreshError);
        }
        // Don't retry if refresh failed
        const mapped = await mapInvokeError(error);
        return { data: null, invokeError: mapped, responseData: mapped.responseData };
      }
      continue;
    }

    // Non-auth error or retries exhausted
    const mapped = await mapInvokeError(error);
    return { data: null, invokeError: mapped, responseData: mapped.responseData };
  }

  // Should not reach here, but just in case
  return { data: null, invokeError: { errorMessage: 'Unexpected error', errorType: 'unknown' } };
}

// ============================================
// Edge Function Callers
// ============================================

/**
 * Legacy: Processes a roster image through the Edge Function (single-phase)
 */
export async function processRoster(
  imageBase64: string,
  jobConfigs: JobConfigSimple[],
  jobAliases: JobAliasInput[],
  identifier?: RosterIdentifier | null
): Promise<RosterScanResult & { scansUsed?: number; scanLimit?: number }> {
  try {
    // Ensure we have a session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        shifts: [],
        processingTimeMs: 0,
        error: 'Authentication required. Please sign in.',
        errorType: 'auth'
      };
    }

    const { data, invokeError, responseData } = await invokeRoster<RosterScanResult & { scansUsed?: number; scanLimit?: number }>({
      imageBase64,
      jobConfigs,
      jobAliases,
      ...(identifier ? { identifier } : {})
    });

    if (invokeError) {
      return {
        success: false,
        shifts: [],
        processingTimeMs: 0,
        error: invokeError.errorMessage,
        errorType: invokeError.errorType as RosterScanResult['errorType'],
        ...(typeof responseData?.scansUsed === 'number' ? { scansUsed: responseData.scansUsed as number } : {}),
        ...(typeof responseData?.scanLimit === 'number' ? { scanLimit: responseData.scanLimit as number } : {}),
      };
    }

    return data!;
  } catch (error) {
    if (import.meta.env.DEV) console.error('[RosterAPI] processRoster error:', error);
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
  const emptyOcr = { success: false as const, tableType: 'unknown' as const, headers: [] as string[], rows: [] as string[][] };

  try {
    // Ensure we have a session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        questions: [],
        ocrData: emptyOcr,
        error: 'Authentication required. Please sign in.',
        errorType: 'auth'
      };
    }

    const { data, invokeError, responseData } = await invokeRoster<QuestionGenerationResult>({
      phase: 'questions',
      imageBase64,
    });

    if (invokeError) {
      return {
        success: false,
        questions: [],
        ocrData: emptyOcr,
        error: invokeError.errorMessage,
        errorType: invokeError.errorType,
        ...(typeof responseData?.scansUsed === 'number' ? { scansUsed: responseData.scansUsed as number } : {}),
        ...(typeof responseData?.scanLimit === 'number' ? { scanLimit: responseData.scanLimit as number } : {}),
      };
    }

    return data!;
  } catch (error) {
    if (import.meta.env.DEV) console.error('[RosterAPI] Phase 1 error:', error);
    return {
      success: false,
      questions: [],
      ocrData: emptyOcr,
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
    // Ensure we have a session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return {
        success: false,
        shifts: [],
        processingTimeMs: 0,
        error: 'Authentication required. Please sign in.',
        errorType: 'auth'
      };
    }

    const { data, invokeError } = await invokeRoster<RosterScanResult>({
      phase: 'filter',
      ocrData: {
        contentType: ocrData.contentType,
        tableType: ocrData.tableType,
        headers: ocrData.headers,
        rows: ocrData.rows,
        extractedShifts: ocrData.extractedShifts,
        rawText: ocrData.rawText,
        layoutDescription: ocrData.layoutDescription,
        uncertainCells: ocrData.uncertainCells,
        metadata: ocrData.metadata,
      },
      answers,
      jobConfigs,
      jobAliases,
    });

    if (invokeError) {
      return {
        success: false,
        shifts: [],
        processingTimeMs: 0,
        error: invokeError.errorMessage,
        errorType: invokeError.errorType as RosterScanResult['errorType'],
        ocrData,
      };
    }

    return data!;
  } catch (error) {
    if (import.meta.env.DEV) console.error('[RosterAPI] Phase 2 error:', error);
    return {
      success: false,
      shifts: [],
      processingTimeMs: 0,
      error: error instanceof Error ? error.message : 'Network error',
      errorType: 'network'
    };
  }
}

// ============================================
// Diagnostic & Utility Functions
// ============================================

/**
 * Health check — tests if the Edge Function is reachable through the Supabase gateway.
 * Useful for diagnosing gateway vs function 401 issues.
 */
export async function checkRosterHealth(): Promise<{
  reachable: boolean;
  status: number;
  gatewayBlocked: boolean;
  details: Record<string, unknown>;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('process-roster', {
      method: 'GET',
    });

    if (error) {
      const mapped = await mapInvokeError(error);
      return {
        reachable: false,
        status: mapped.status || 0,
        gatewayBlocked: error instanceof FunctionsRelayError || (mapped.status === 401 && !mapped.responseData?.requestId),
        details: { error: mapped.errorMessage, errorType: mapped.errorType },
      };
    }

    return {
      reachable: true,
      status: 200,
      gatewayBlocked: false,
      details: data as Record<string, unknown>,
    };
  } catch (err) {
    return {
      reachable: false,
      status: 0,
      gatewayBlocked: false,
      details: { error: err instanceof Error ? err.message : 'Unknown error' },
    };
  }
}

// ============================================
// Data Access Functions (unchanged)
// ============================================

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
  if (!user) return { used: 0, limit: 5 };

  const { data, error } = await supabase
    .from('profiles')
    .select('roster_scans_this_month, roster_scan_limit')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    return { used: 0, limit: 5 };
  }

  return {
    used: data.roster_scans_this_month || 0,
    limit: data.roster_scan_limit || 5
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
