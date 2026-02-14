import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { processWithGemini, processRosterPhase1, processRosterPhase2, GeminiApiError } from './gemini.ts';
import { logger } from './logger.ts';

const BASE_CORS_HEADERS = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
} as const;

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://paychecker.app',
  'https://www.paychecker.app',
];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

interface RosterIdentifier {
  name?: string;
  color?: string;
  position?: string;
  customNote?: string;
}

interface OcrData {
  contentType?: 'table' | 'calendar' | 'list' | 'email' | 'text' | 'mixed';
  tableType?: 'column-based' | 'row-based' | 'unknown';
  headers?: string[];
  rows?: string[][];
  extractedShifts?: Array<{
    date: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    jobName?: string;
    note?: string;
  }>;
  rawText?: string;
  layoutDescription?: string;
  uncertainCells?: Array<{
    location: string;
    readValue: string;
    alternativeValue?: string;
    reason: string;
  }>;
  metadata?: {
    title?: string;
    rowCount?: number;
    columnCount?: number;
    personName?: string;
    hasMultiplePeople?: boolean;
    potentialNames?: string[];
    language?: string;
  };
}

interface QuestionAnswer {
  questionId: string;
  value: string;
}

// Phase 1: Image → OCR + Questions
interface Phase1RequestBody {
  phase: 'questions';
  imageBase64: string;
}

// Phase 2: OCR + Answers → Filtered Shifts
interface Phase2RequestBody {
  phase: 'filter';
  ocrData: OcrData;
  answers: QuestionAnswer[];
  jobConfigs: Array<{ id: string; name: string }>;
  jobAliases: Array<{ alias: string; job_config_id: string }>;
}

// Legacy: Single-phase processing (backward compatible)
interface LegacyRequestBody {
  imageBase64: string;
  jobConfigs: Array<{ id: string; name: string }>;
  jobAliases: Array<{ alias: string; job_config_id: string }>;
  identifier?: RosterIdentifier;
}

type RequestBody = Phase1RequestBody | Phase2RequestBody | LegacyRequestBody;

type JsonRecord = Record<string, unknown>;

function getAllowedOrigins(): string[] {
  const envValue = Deno.env.get('ALLOWED_ORIGINS');
  if (!envValue) return DEFAULT_ALLOWED_ORIGINS;

  const parsed = envValue
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : DEFAULT_ALLOWED_ORIGINS;
}

function isAllowedOrigin(origin: string): boolean {
  if (getAllowedOrigins().includes(origin)) return true;
  // Allow Vercel preview deployments
  try {
    const url = new URL(origin);
    if (url.hostname.endsWith('.vercel.app') && url.hostname.includes('paychecker')) return true;
  } catch { /* ignore invalid URLs */ }
  return false;
}

function getCorsHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = { ...BASE_CORS_HEADERS };
  const origin = req.headers.get('Origin');

  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

function isOriginAllowed(req: Request): boolean {
  const origin = req.headers.get('Origin');
  if (!origin) return true;
  return isAllowedOrigin(origin);
}

function decodeBase64Length(base64Value: string): number {
  const normalized = (base64Value.includes(',') ? base64Value.split(',').pop() || '' : base64Value)
    .replace(/\s/g, '');

  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  return Math.floor((normalized.length * 3) / 4) - padding;
}

function isImagePayloadTooLarge(imageBase64: string): boolean {
  return decodeBase64Length(imageBase64) > MAX_IMAGE_BYTES;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const corsHeaders = getCorsHeaders(req);

  const json = (status: number, body: JsonRecord) =>
    new Response(JSON.stringify({ ...body, requestId }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (!isOriginAllowed(req)) {
    return json(403, {
      success: false,
      error: 'Origin not allowed',
      errorType: 'auth',
    });
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // 1. Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return json(401, {
        success: false,
        error: 'Missing or invalid authorization header',
        errorType: 'auth',
      });
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      return json(401, {
        success: false,
        error: 'Missing bearer token',
        errorType: 'auth',
      });
    }

    // Create Supabase client and validate token explicitly
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    // Some environments may have one key stale. Try both in a safe order.
    const serviceRoleKeys = Array.from(
      new Set(
        [
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
          Deno.env.get('SERVICE_ROLE_KEY'),
        ].filter((value): value is string => Boolean(value && value.trim()))
      )
    );

    if (!supabaseUrl || serviceRoleKeys.length === 0) {
      logger.error('Supabase environment is not configured', {
        requestId,
        hasUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: serviceRoleKeys.length > 0,
      });
      return json(500, {
        success: false,
        error: 'Server configuration error',
        errorType: 'config',
      });
    }

    // Validate token explicitly by passing it to getUser.
    // If one key is stale, fallback to the next key automatically.
    let supabase = createClient(supabaseUrl, serviceRoleKeys[0]);
    let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] = null;
    let userError: Awaited<ReturnType<typeof supabase.auth.getUser>>['error'] = null;

    for (const serviceRoleKey of serviceRoleKeys) {
      const candidate = createClient(supabaseUrl, serviceRoleKey);
      const result = await candidate.auth.getUser(token);

      if (result.data.user) {
        supabase = candidate;
        user = result.data.user;
        userError = null;
        break;
      }

      userError = result.error;
    }

    if (userError || !user) {
      logger.warn('Auth error', {
        requestId,
        message: userError?.message,
        status: userError?.status,
      });
      return json(401, {
        success: false,
        error: userError?.message || 'Unauthorized',
        errorType: 'auth',
      });
    }

    // 2. Parse request body
    let body: RequestBody;
    try {
      body = (await req.json()) as RequestBody;
    } catch {
      return json(400, {
        success: false,
        error: 'Invalid JSON request body',
        errorType: 'invalid_input',
      });
    }

    if (!body || typeof body !== 'object') {
      return json(400, {
        success: false,
        error: 'Invalid request body',
        errorType: 'invalid_input',
      });
    }

    // Get Gemini API key
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      logger.error('GEMINI_API_KEY not configured', { requestId });
      return json(500, {
        success: false,
        error: 'AI service not configured',
        errorType: 'config',
      });
    }

    // Determine which phase to execute
    const phase = 'phase' in body ? body.phase : 'legacy';

    // ============================================
    // PHASE 1: OCR + Question Generation
    // ============================================
    if (phase === 'questions') {
      const { imageBase64 } = body as Phase1RequestBody;

      if (!imageBase64) {
        return json(400, {
          success: false,
          error: 'Missing image data',
          errorType: 'invalid_input',
        });
      }

      if (isImagePayloadTooLarge(imageBase64)) {
        return json(413, {
          success: false,
          error: 'Image payload too large (max 10MB).',
          errorType: 'invalid_input',
        });
      }

      // Check usage limits (Phase 1 counts as a scan)
      const limitCheck = await checkUsageLimits(supabase, user.id, requestId);
      if (!limitCheck.allowed) {
        return json(429, {
          success: false,
          error: limitCheck.error,
          errorType: 'limit_exceeded',
          scansUsed: limitCheck.scansUsed,
          scanLimit: limitCheck.scanLimit,
        });
      }

      // Process Phase 1
      const result = await processRosterPhase1(geminiApiKey, imageBase64, requestId);
      const processingTime = Date.now() - startTime;

      // Increment usage count
      await supabase
        .from('profiles')
        .update({ roster_scans_this_month: limitCheck.scansUsed + 1 })
        .eq('id', user.id);

      return new Response(
        JSON.stringify({
          ...result,
          processingTimeMs: processingTime,
          scansUsed: limitCheck.scansUsed + 1,
          scanLimit: limitCheck.scanLimit,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ============================================
    // PHASE 2: Filter with Answers
    // ============================================
    if (phase === 'filter') {
      const { ocrData, answers, jobConfigs, jobAliases } = body as Phase2RequestBody;

      if (!ocrData || !answers) {
        return json(400, {
          success: false,
          error: 'Missing OCR data or answers',
          errorType: 'invalid_input',
        });
      }

      // Phase 2 does NOT count against scan limit (already counted in Phase 1)
      // Ensure ocrData has valid arrays to prevent .map() errors
      const safeOcrData = {
        success: true,
        contentType: ocrData.contentType || 'text',
        tableType: ocrData.tableType || 'unknown',
        headers: Array.isArray(ocrData.headers) ? ocrData.headers : [],
        rows: Array.isArray(ocrData.rows) ? ocrData.rows : [],
        extractedShifts: Array.isArray(ocrData.extractedShifts) ? ocrData.extractedShifts : [],
        rawText: ocrData.rawText || '',
        layoutDescription: ocrData.layoutDescription,
        uncertainCells: Array.isArray(ocrData.uncertainCells) ? ocrData.uncertainCells : undefined,
        metadata: ocrData.metadata,
      };

      const result = await processRosterPhase2(
        geminiApiKey,
        safeOcrData,
        Array.isArray(answers) ? answers : [],
        jobConfigs || [],
        jobAliases || [],
        requestId,
      );

      const processingTime = Date.now() - startTime;

      // Save scan record
      await supabase.from('roster_scans').insert({
        user_id: user.id,
        parsed_result: result,
        shifts_created: 0,
        processing_time_ms: processingTime,
      });

      return new Response(
        JSON.stringify({
          ...result,
          processingTimeMs: processingTime,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (phase !== 'legacy') {
      return json(400, {
        success: false,
        error: 'Unsupported phase',
        errorType: 'invalid_input',
      });
    }

    // ============================================
    // LEGACY: Single-phase processing (backward compatible)
    // ============================================
    const { imageBase64, jobConfigs, jobAliases, identifier } = body as LegacyRequestBody;

    if (!imageBase64) {
      return json(400, {
        success: false,
        error: 'Missing image data',
        errorType: 'invalid_input',
      });
    }

    if (isImagePayloadTooLarge(imageBase64)) {
      return json(413, {
        success: false,
        error: 'Image payload too large (max 10MB).',
        errorType: 'invalid_input',
      });
    }

    // Check usage limits
    const limitCheck = await checkUsageLimits(supabase, user.id, requestId);
    if (!limitCheck.allowed) {
      return json(429, {
        success: false,
        error: limitCheck.error,
        errorType: 'limit_exceeded',
        scansUsed: limitCheck.scansUsed,
        scanLimit: limitCheck.scanLimit,
      });
    }

    const result = await processWithGemini(geminiApiKey, imageBase64, jobConfigs, jobAliases, identifier, requestId);
    const processingTime = Date.now() - startTime;

    // Increment usage count and save scan record
    await Promise.all([
      supabase
        .from('profiles')
        .update({ roster_scans_this_month: limitCheck.scansUsed + 1 })
        .eq('id', user.id),
      supabase.from('roster_scans').insert({
        user_id: user.id,
        parsed_result: result,
        shifts_created: 0,
        processing_time_ms: processingTime,
      }),
    ]);

    return new Response(
      JSON.stringify({
        ...result,
        processingTimeMs: processingTime,
        scansUsed: limitCheck.scansUsed + 1,
        scanLimit: limitCheck.scanLimit,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    logger.error('Process roster error', {
      requestId,
      message: error instanceof Error ? error.message : String(error),
    });

    const processingTime = Date.now() - startTime;

    if (error instanceof GeminiApiError) {
      const errorType =
        error.status === 404
          ? 'config'
          : error.status === 401 || error.status === 403
            ? 'auth'
            : error.status >= 500
              ? 'network'
              : 'unknown';

      const errorMessage =
        error.status === 404
          ? `Gemini model not found (${error.model}). Check GEMINI_MODEL or API access.`
          : error.message || 'Gemini API error';

      return json(502, {
        success: false,
        error: errorMessage,
        errorType,
        processingTimeMs: processingTime,
      });
    }

    // Handle timeout
    if ((error instanceof Error && error.name === 'TimeoutError') || processingTime > 55000) {
      return json(504, {
        success: false,
        error: 'Request timed out. Please try again.',
        errorType: 'timeout',
        processingTimeMs: processingTime,
      });
    }

    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return json(500, {
      success: false,
      error: message,
      errorType: 'unknown',
      processingTimeMs: processingTime,
    });
  }
});

// Helper function to check usage limits
async function checkUsageLimits(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  requestId: string,
): Promise<{
  allowed: boolean;
  scansUsed: number;
  scanLimit: number;
  error?: string;
}> {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('roster_scans_this_month, roster_scan_limit, roster_scan_reset_month')
    .eq('id', userId)
    .single();

  if (profileError) {
    logger.warn('Profile fetch error', {
      requestId,
      message: profileError.message,
      code: profileError.code,
    });
  }

  let scansThisMonth = profile?.roster_scans_this_month || 0;
  const scanLimit = profile?.roster_scan_limit || 5;

  // Reset count if new month
  if (profile?.roster_scan_reset_month !== currentMonth) {
    scansThisMonth = 0;
    await supabase
      .from('profiles')
      .update({ roster_scans_this_month: 0, roster_scan_reset_month: currentMonth })
      .eq('id', userId);
  }

  if (scansThisMonth >= scanLimit) {
    return {
      allowed: false,
      scansUsed: scansThisMonth,
      scanLimit,
      error: `Monthly scan limit (${scanLimit}) reached. Resets next month.`,
    };
  }

  return {
    allowed: true,
    scansUsed: scansThisMonth,
    scanLimit,
  };
}
