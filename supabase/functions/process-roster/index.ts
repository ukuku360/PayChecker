import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { processWithGemini, processRosterPhase1, processRosterPhase2, GeminiApiError } from './gemini.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

interface PreAnalysis {
  detectedPerson: string | null;
  dateFormat: string;
  timeFormat: string;
  shiftPatterns?: string[];
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // 1. Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header', errorType: 'auth' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client and validate token explicitly
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    // Use custom secret name (SUPABASE_ prefix is reserved)
    const supabaseServiceKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Extract token from Bearer header
    const token = authHeader.replace('Bearer ', '');

    // Create client with service role key to validate user tokens
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate token explicitly by passing it to getUser
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth error:', {
        message: userError?.message,
        status: userError?.status,
        tokenLength: token?.length,
        tokenPrefix: token?.substring(0, 20)
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: userError?.message || 'Unauthorized',
          errorType: 'auth'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse request body
    const body: RequestBody = await req.json();

    // Get Gemini API key
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured', errorType: 'config' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine which phase to execute
    const phase = 'phase' in body ? body.phase : 'legacy';

    // ============================================
    // PHASE 1: OCR + Question Generation
    // ============================================
    if (phase === 'questions') {
      const { imageBase64 } = body as Phase1RequestBody;

      if (!imageBase64) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing image data', errorType: 'invalid_input' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check usage limits (Phase 1 counts as a scan)
      const limitCheck = await checkUsageLimits(supabase, user.id);
      if (!limitCheck.allowed) {
        return new Response(
          JSON.stringify({
            success: false,
            error: limitCheck.error,
            errorType: 'limit_exceeded',
            scansUsed: limitCheck.scansUsed,
            scanLimit: limitCheck.scanLimit
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Process Phase 1
      const result = await processRosterPhase1(geminiApiKey, imageBase64);
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
          scanLimit: limitCheck.scanLimit
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // PHASE 2: Filter with Answers
    // ============================================
    if (phase === 'filter') {
      const { ocrData, answers, jobConfigs, jobAliases } = body as Phase2RequestBody;

      if (!ocrData || !answers) {
        return new Response(
          JSON.stringify({ success: false, error: 'Missing OCR data or answers', errorType: 'invalid_input' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
        metadata: ocrData.metadata
      };

      const result = await processRosterPhase2(
        geminiApiKey,
        safeOcrData,
        Array.isArray(answers) ? answers : [],
        jobConfigs || [],
        jobAliases || []
      );

      const processingTime = Date.now() - startTime;

      // Save scan record
      await supabase
        .from('roster_scans')
        .insert({
          user_id: user.id,
          parsed_result: result,
          shifts_created: 0,
          processing_time_ms: processingTime
        });

      return new Response(
        JSON.stringify({
          ...result,
          processingTimeMs: processingTime
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // LEGACY: Single-phase processing (backward compatible)
    // ============================================
    const { imageBase64, jobConfigs, jobAliases, identifier } = body as LegacyRequestBody;

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing image data', errorType: 'invalid_input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check usage limits
    const limitCheck = await checkUsageLimits(supabase, user.id);
    if (!limitCheck.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: limitCheck.error,
          errorType: 'limit_exceeded',
          scansUsed: limitCheck.scansUsed,
          scanLimit: limitCheck.scanLimit
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await processWithGemini(geminiApiKey, imageBase64, jobConfigs, jobAliases, identifier);
    const processingTime = Date.now() - startTime;

    // Increment usage count and save scan record
    await Promise.all([
      supabase
        .from('profiles')
        .update({ roster_scans_this_month: limitCheck.scansUsed + 1 })
        .eq('id', user.id),
      supabase
        .from('roster_scans')
        .insert({
          user_id: user.id,
          parsed_result: result,
          shifts_created: 0,
          processing_time_ms: processingTime
        })
    ]);

    return new Response(
      JSON.stringify({
        ...result,
        processingTimeMs: processingTime,
        scansUsed: limitCheck.scansUsed + 1,
        scanLimit: limitCheck.scanLimit
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Process roster error:', error);

    const processingTime = Date.now() - startTime;

    if (error instanceof GeminiApiError) {
      const errorType =
        error.status === 404
          ? 'config'
          : (error.status === 401 || error.status === 403)
          ? 'auth'
          : error.status >= 500
          ? 'network'
          : 'unknown';

      const errorMessage = error.status === 404
        ? `Gemini model not found (${error.model}). Check GEMINI_MODEL or API access.`
        : error.message || 'Gemini API error';

      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          errorType,
          processingTimeMs: processingTime
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle timeout
    if (error.name === 'TimeoutError' || processingTime > 55000) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Request timed out. Please try again.',
          errorType: 'timeout',
          processingTimeMs: processingTime
        }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
        errorType: 'unknown',
        processingTimeMs: processingTime
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to check usage limits
async function checkUsageLimits(supabase: any, userId: string): Promise<{
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
    console.error('Profile fetch error:', profileError);
  }

  let scansThisMonth = profile?.roster_scans_this_month || 0;
  const scanLimit = profile?.roster_scan_limit || 20;

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
      error: `Monthly scan limit (${scanLimit}) reached. Resets next month.`
    };
  }

  return {
    allowed: true,
    scansUsed: scansThisMonth,
    scanLimit
  };
}
