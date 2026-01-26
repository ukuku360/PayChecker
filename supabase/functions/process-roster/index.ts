import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { processWithGemini, GeminiApiError } from './gemini.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  imageBase64: string;
  jobConfigs: Array<{ id: string; name: string }>;
  jobAliases: Array<{ alias: string; job_config_id: string }>;
}

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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Extract token from Bearer header
    const token = authHeader.replace('Bearer ', '');

    // Create client without auth header - we'll validate token explicitly
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

    // 2. Check usage limits
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('roster_scans_this_month, roster_scan_limit, roster_scan_reset_month')
      .eq('id', user.id)
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
        .eq('id', user.id);
    }

    if (scansThisMonth >= scanLimit) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Monthly scan limit (${scanLimit}) reached. Resets next month.`,
          errorType: 'limit_exceeded',
          scansUsed: scansThisMonth,
          scanLimit
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse request body
    const body: RequestBody = await req.json();
    const { imageBase64, jobConfigs, jobAliases } = body;

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing image data', errorType: 'invalid_input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Process with Gemini API
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured', errorType: 'config' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await processWithGemini(geminiApiKey, imageBase64, jobConfigs, jobAliases);

    // 5. Increment usage count and save scan record
    const processingTime = Date.now() - startTime;

    await Promise.all([
      supabase
        .from('profiles')
        .update({ roster_scans_this_month: scansThisMonth + 1 })
        .eq('id', user.id),
      supabase
        .from('roster_scans')
        .insert({
          user_id: user.id,
          parsed_result: result,
          shifts_created: 0, // Updated later when user confirms
          processing_time_ms: processingTime
        })
    ]);

    // 6. Return result
    return new Response(
      JSON.stringify({
        ...result,
        processingTimeMs: processingTime,
        scansUsed: scansThisMonth + 1,
        scanLimit
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
