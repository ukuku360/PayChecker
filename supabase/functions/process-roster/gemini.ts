/**
 * Gemini API integration for roster image processing
 * 3-Phase Architecture:
 * - Phase 1: Pure OCR (extract raw content without normalization)
 * - Phase 2: Analysis + Question Generation (when clarification needed)
 * - Phase 3: Normalization + Extraction (final shift output)
 *
 * Simple cases (single-person): Phase 1 → Phase 3 (2 calls)
 * Complex cases (multi-person): Phase 1 → Phase 2 → Phase 3 (3 calls)
 */

import {
  validateAndNormalizeDate,
  validateAndNormalizeTime,
  validateShifts,
  parseTimeRange,
  type AIExtractedShift,
  type ValidatedShift
} from './validators.ts';

// ============================================
// Types
// ============================================

interface JobConfig {
  id: string;
  name: string;
}

interface JobAlias {
  alias: string;
  job_config_id: string;
}

interface RosterIdentifier {
  name?: string;
  color?: string;
  position?: string;
  customNote?: string;
}

interface ParsedShift {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  totalHours: number | null;
  rosterJobName: string;
  mappedJobId?: string;
  confidence: number;
  selected: boolean;
}

interface IdentifiedPerson {
  nameFound: string;
  location: string;
  matchType: 'exact' | 'firstName' | 'lastName' | 'initials' | 'substring' | 'color' | 'position';
  confidence: number;
}

interface ProcessResult {
  success: boolean;
  shifts: ParsedShift[];
  identifiedPerson?: IdentifiedPerson | null;
  error?: string;
  errorType?: string;
  ocrData?: ExtractedContent;
}

// Phase 1 result: Raw OCR extraction
interface ExtractedContent {
  success: boolean;
  contentType: 'table' | 'calendar' | 'list' | 'email' | 'text' | 'mixed';

  // For table format
  tableType?: 'column-based' | 'row-based';
  headers?: string[];
  rows?: string[][];

  // Raw text transcription
  rawText?: string;

  // Pre-extracted shifts (when format is clear)
  extractedShifts?: Array<{
    date: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    jobName?: string;
    note?: string;
  }>;

  // Questions (only from Phase 2)
  questions?: SmartQuestion[];

  metadata?: {
    title?: string;
    dateRange?: string;
    personName?: string;
    rowCount?: number;
    columnCount?: number;
    hasMultiplePeople?: boolean;
    potentialNames?: string[];
    language?: string;
  };

  error?: string;
  errorType?: string;
}

// Backward compatible alias
type OcrResult = ExtractedContent;

// Smart Question Types
interface QuestionOption {
  label: string;
  value: string;
  description?: string;
}

interface SmartQuestion {
  id: string;
  type: 'single_select' | 'text';
  question: string;
  options?: QuestionOption[];
  required: boolean;
}

interface PreAnalysis {
  detectedPerson: string | null;
  dateFormat: string;
  timeFormat: string;
  shiftPatterns: string[];
}

interface QuestionGenerationResult {
  success: boolean;
  questions: SmartQuestion[];
  ocrData: ExtractedContent;
  skipToExtraction?: boolean;
  preAnalysis?: PreAnalysis;
  error?: string;
  errorType?: string;
}

interface QuestionAnswer {
  questionId: string;
  value: string;
}

interface FilterResult {
  success: boolean;
  identifiedPerson: {
    nameFound: string;
    location: string;
    columnIndex?: number;
    rowIndex?: number;
    confidence: number;
  } | null;
  shifts: Array<{
    date: string;
    rosterJobName: string;
    startTime?: string | null;
    endTime?: string | null;
  }>;
  error?: string;
  errorType?: string;
}

// ============================================
// Constants & Utilities
// ============================================

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash';

export class GeminiApiError extends Error {
  status: number;
  model: string;
  details?: string;

  constructor(status: number, message: string, model: string, details?: string) {
    super(message);
    this.name = 'GeminiApiError';
    this.status = status;
    this.model = model;
    this.details = details;
  }
}

function getModelCandidates(): string[] {
  const envModel = Deno.env.get('GEMINI_MODEL');
  const candidates = [
    envModel,
    DEFAULT_GEMINI_MODEL,
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash-latest'
  ].filter(Boolean) as string[];

  return Array.from(new Set(candidates));
}

function extractErrorMessage(errorText: string): string | null {
  try {
    const parsed = JSON.parse(errorText);
    if (typeof parsed?.error?.message === 'string') {
      return parsed.error.message;
    }
  } catch {
    // Ignore JSON parse errors.
  }
  return null;
}

function generateShiftId(): string {
  return `shift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function parseJsonFromResponse(textContent: string): any {
  let jsonStr = textContent;
  const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }
  return JSON.parse(jsonStr);
}

function getCurrentYear(): number {
  return new Date().getFullYear();
}

function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

// ============================================
// Phase 1: Pure OCR Prompt
// ============================================

const PHASE1_OCR_PROMPT = `You are an OCR assistant. Extract ALL visible text from this image.

The image could be ANY format containing work schedule info:
- Table/roster with names and shifts
- **CALENDAR VIEW** (monthly grid with weekday headers like 일요일~토요일 or Sun~Sat)
- Email or message with shift assignments
- Bulleted list of dates and times
- Screenshot from a scheduling app
- Handwritten notes

YOUR TASK:
1. Transcribe ALL visible text exactly as shown
2. Identify the content structure (table, calendar, or freeform)
3. Detect if multiple people are mentioned
4. **For CALENDAR views: Extract names from CELL CONTENTS, not just headers**
5. DO NOT normalize dates or times - preserve exact format

CRITICAL FOR CALENDAR FORMAT:
- Calendar views have weekday headers (일요일, 월요일, ... 토요일 or Sun, Mon, ... Sat)
- Names appear INSIDE cells in patterns like:
  - Korean: "오픈 8 - 21 수연(13)" → name is "수연"
  - Korean: "마감 21 - 24 태현(3)" → name is "태현"
  - English: "Open 8-5 John(9)" → name is "John"
- Parse format: "[shift type] [start] - [end] [NAME](hours)"
- Extract ALL unique names from cell contents into potentialNames

OUTPUT FORMAT (JSON only):
{
  "contentType": "table" | "calendar" | "email" | "list" | "text" | "mixed",

  "rawText": "Complete word-for-word transcription of all visible text",

  "structure": {
    "type": "table" | "calendar" | "freeform",
    "headers": ["일요일", "월요일", ...] or ["Date", "Name1", ...],
    "rows": [["cell1", "cell2", ...], ...]
  },

  "metadata": {
    "title": "Document title if visible (e.g., '2026년 1월')",
    "hasMultiplePeople": true | false,
    "potentialNames": ["수연", "태현", "현승", ...],
    "visibleDateRange": "raw date range as shown",
    "language": "en" | "ko" | "other"
  }
}

CRITICAL RULES:
1. Preserve dates EXACTLY as shown (e.g., "Thursday 15th January", not "2026-01-15")
2. Preserve times EXACTLY as shown (e.g., "9am", "5:00pm", not "09:00")
3. For tables/calendars, keep exact cell values without modification
4. hasMultiplePeople should be true if you see multiple distinct names
5. Include ALL names you see in potentialNames array
6. **For CALENDAR: Scan ALL cell contents to find names in shift patterns like "오픈 8-21 수연(13)"**`;

// ============================================
// Phase 2: Analysis + Question Generation Prompt
// ============================================

function buildPhase2AnalysisPrompt(ocrData: ExtractedContent): string {
  const currentDate = getCurrentDate();
  const currentYear = getCurrentYear();

  return `Analyze this extracted roster content and determine if clarification is needed.

CURRENT DATE: ${currentDate}
CURRENT YEAR: ${currentYear}

EXTRACTED CONTENT:
${JSON.stringify(ocrData, null, 2)}

TASK:
1. Determine if this is a valid work schedule/roster
2. Analyze if user clarification is needed
3. Generate questions ONLY when truly necessary

WHEN TO ASK QUESTIONS:
- Multiple people visible in table AND shifts are interleaved → Ask who
- **CALENDAR VIEW with multiple names in cell contents** → Ask who
- Date format genuinely ambiguous (01/02 could be Jan 2 or Feb 1 in Australian context) → Ask format
- Critical information missing that cannot be inferred → Ask

WHEN NOT TO ASK:
- Single person's schedule (email addressed to one person, text mentioning one person)
- Only one name/column visible in table data
- Only one name found in calendar cells
- Dates are unambiguous (full month names, clear context)
- Context makes meaning obvious (e.g., "Hi John, here are your shifts")

**CALENDAR VIEW HANDLING:**
When contentType is "calendar":
1. Names are embedded in cell contents, NOT in headers
2. Cell format examples:
   - Korean: "오픈 8 - 21 수연(13)" → name is "수연"
   - Korean: "마감 21 - 24 태현(3)" → name is "태현"
   - English: "Open 8-5 John(9)" → name is "John"
3. Check metadata.potentialNames for all names found in cells
4. If potentialNames has MORE than 1 name → Ask person_select question
5. Use the names directly as option values (not col_0, col_1)

QUESTION FORMAT FOR CALENDAR:
{
  "id": "person_select",
  "type": "single_select",
  "question": "이 로스터에서 누구의 시프트를 추출할까요?" (Korean) or "Whose shifts should I extract?" (English),
  "options": [
    {"label": "수연", "value": "수연"},
    {"label": "태현", "value": "태현"},
    {"label": "현승", "value": "현승"}
  ],
  "required": true
}

OUTPUT FORMAT (JSON only):
{
  "isRoster": true | false,
  "confidence": 0.0-1.0,
  "analysisNotes": "Brief explanation",

  "needsClarification": true | false,
  "questions": [
    {
      "id": "person_select" | "date_format" | "custom_...",
      "type": "single_select" | "text",
      "question": "Question in content's language",
      "options": [{"label": "...", "value": "..."}],
      "required": true | false
    }
  ],

  "preAnalysis": {
    "detectedPerson": "Name if single person detected" | null,
    "dateFormat": "detected format description",
    "timeFormat": "24h" | "12h" | "mixed",
    "shiftPatterns": ["pattern1", "pattern2", ...]
  }
}

LANGUAGE: Match questions to the content's language. Korean content → Korean questions.

CRITICAL:
- For TABLE columns, use "col_0", "col_1", etc. as values
- For CALENDAR views, use actual names as values (e.g., "수연", "태현")
- For row-based tables, use "row_0", "row_1", etc.`;
}

// ============================================
// Phase 3: Extraction + Normalization Prompt
// ============================================

function buildPhase3ExtractionPrompt(
  ocrData: ExtractedContent,
  answers: QuestionAnswer[],
  preAnalysis?: PreAnalysis
): string {
  const currentYear = getCurrentYear();
  const currentDate = getCurrentDate();

  // Build user clarifications section
  let clarificationSection = '';
  if (answers.length > 0) {
    const clarifications = answers.map(a => `- ${a.questionId}: ${a.value}`).join('\n');
    clarificationSection = `\nUSER CLARIFICATIONS:\n${clarifications}\n`;
  }

  // Build pre-analysis section
  let analysisSection = '';
  if (preAnalysis) {
    analysisSection = `\nPRE-ANALYSIS:\n- Detected person: ${preAnalysis.detectedPerson || 'Unknown'}
- Date format: ${preAnalysis.dateFormat}
- Time format: ${preAnalysis.timeFormat}\n`;
  }

  // Extract target person from answers
  const personAnswer = answers.find(a => a.questionId === 'person_select');
  const targetPerson = personAnswer?.value || preAnalysis?.detectedPerson || null;
  const targetPersonSection = targetPerson ? `\n**TARGET PERSON: ${targetPerson}**\nONLY extract shifts where this person's name appears.\n` : '';

  return `Extract work shifts from this roster content.

CURRENT DATE: ${currentDate}
CURRENT YEAR: ${currentYear}

EXTRACTED CONTENT:
${JSON.stringify(ocrData, null, 2)}
${clarificationSection}${analysisSection}${targetPersonSection}

**CALENDAR VIEW PARSING:**
When contentType is "calendar":
1. The document title often contains the month/year (e.g., "2026년 1월" = January 2026)
2. Headers are weekday names (일요일~토요일 or Sun~Sat)
3. Each cell may contain multiple shifts in format:
   - Korean: "오픈 8 - 21 수연(13)" means:
     * shiftType: "오픈" (Open shift)
     * startTime: 8 → "08:00"
     * endTime: 21 → "21:00"
     * assignedPerson: "수연"
     * hours: 13 (can be calculated or ignored)
   - English: "Open 8-5 John(9)" means:
     * shiftType: "Open"
     * startTime: 8 → "08:00"
     * endTime: 17 → "17:00" (5pm)
     * assignedPerson: "John"
4. **CRITICAL: Only extract shifts where the assigned person matches TARGET PERSON**
5. Calculate date from:
   - Month/Year from document title (e.g., "2026년 1월")
   - Day number visible in cell (e.g., "2일", "15", etc.)
   - Or infer from calendar grid position + weekday header

DATE CALCULATION FOR CALENDAR:
- If title says "2026년 1월" (January 2026) and cell shows "2일" → "2026-01-02"
- If title says "January 2026" and cell shows day "15" → "2026-01-15"
- Use calendar grid position if day numbers aren't explicit

CRITICAL DATE NORMALIZATION (MUST output YYYY-MM-DD):
- "Thursday 15th January 2026" → "2026-01-15"
- "15th January" (no year visible) → "${currentYear}-01-15"
- "January 15" → "${currentYear}-01-15"
- "15/1" or "15/01" (assume DD/MM for AU) → "${currentYear}-01-15"
- "1/15" or "01/15" (if US format indicated) → "${currentYear}-01-15"
- Day names like "Mon", "Tuesday" → Calculate date from ${currentDate}

CRITICAL TIME NORMALIZATION (MUST output HH:MM 24-hour):
- "9am" → "09:00"
- "9:30am" → "09:30"
- "12pm" or "noon" → "12:00"
- "5pm" or "5:00pm" → "17:00"
- "3:00pm" → "15:00"
- "9-5" → startTime: "09:00", endTime: "17:00"
- "12:00pm to 5:00pm" → startTime: "12:00", endTime: "17:00"
- **Calendar format "8 - 21" → startTime: "08:00", endTime: "21:00"**

JOB/LOCATION EXTRACTION:
- Extract location text (e.g., "746 Swanston", "Main Office")
- Extract job type/shift name (e.g., "AM", "Night", "RL", "오픈", "마감")
- If only a code like "AM" or "PM" visible, use it as jobName
- **For calendar: use shift type ("오픈", "마감", "Open", "Close") as jobName**

OUTPUT FORMAT (JSON only):
{
  "success": true,
  "shifts": [
    {
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM" | null,
      "endTime": "HH:MM" | null,
      "location": "location text" | null,
      "jobName": "job/shift type" | null,
      "rawDateText": "original date as shown",
      "rawTimeText": "original time as shown"
    }
  ],
  "identifiedPerson": {
    "nameFound": "Name as shown",
    "location": "column 2" | "row 3" | "email recipient" | "calendar cells",
    "confidence": 0.0-1.0
  } | null
}

If extraction fails:
{
  "success": false,
  "shifts": [],
  "error": "Reason for failure"
}`;
}

// ============================================
// API Call Function
// ============================================

async function callGeminiApi(
  apiKey: string,
  requestBody: any
): Promise<any> {
  const models = getModelCandidates();
  let lastNotFoundError: GeminiApiError | null = null;
  let data: any = null;

  for (const model of models) {
    const response = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      const message = extractErrorMessage(errorText) || `Gemini API error: ${response.status}`;
      const apiError = new GeminiApiError(response.status, message, model, errorText);

      console.error('Gemini API error:', { status: response.status, model, message });

      if (response.status === 404) {
        lastNotFoundError = apiError;
        continue;
      }
      throw apiError;
    }

    data = await response.json();
    break;
  }

  if (!data) {
    if (lastNotFoundError) throw lastNotFoundError;
    throw new GeminiApiError(500, 'Gemini API error: No response', models[0] || DEFAULT_GEMINI_MODEL);
  }

  return data;
}

// ============================================
// Phase 1: Pure OCR Extraction
// ============================================

async function extractContentPhase1(
  apiKey: string,
  imageBase64: string
): Promise<ExtractedContent> {
  console.log('[Phase 1] Starting pure OCR extraction...');

  const requestBody = {
    contents: [{
      parts: [
        { text: PHASE1_OCR_PROMPT },
        { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 8192,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
    ]
  };

  try {
    const data = await callGeminiApi(apiKey, requestBody);
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return {
        success: false,
        contentType: 'text',
        error: 'No content in OCR response',
        errorType: 'ocr_failed'
      };
    }

    const parsed = parseJsonFromResponse(textContent);

    console.log(`[Phase 1] OCR complete: contentType=${parsed.contentType}, hasMultiplePeople=${parsed.metadata?.hasMultiplePeople}`);

    // Normalize structure
    const structure = parsed.structure || {};
    const headers = Array.isArray(structure.headers) ? structure.headers : [];
    const rows = Array.isArray(structure.rows) ? structure.rows : [];

    return {
      success: true,
      contentType: parsed.contentType || 'text',
      tableType: structure.type === 'table' ? 'column-based' : undefined,
      headers,
      rows,
      rawText: parsed.rawText || '',
      metadata: {
        title: parsed.metadata?.title,
        hasMultiplePeople: parsed.metadata?.hasMultiplePeople || false,
        potentialNames: Array.isArray(parsed.metadata?.potentialNames) ? parsed.metadata.potentialNames : [],
        dateRange: parsed.metadata?.visibleDateRange,
        language: parsed.metadata?.language || 'en'
      }
    };

  } catch (error) {
    console.error('[Phase 1] OCR error:', error);

    if (error instanceof SyntaxError) {
      return {
        success: false,
        contentType: 'text',
        error: 'Failed to parse OCR result',
        errorType: 'parse_error'
      };
    }

    throw error;
  }
}

// ============================================
// Phase 2: Analysis + Question Generation
// ============================================

async function analyzeContentPhase2(
  apiKey: string,
  ocrData: ExtractedContent
): Promise<{ questions: SmartQuestion[]; preAnalysis: PreAnalysis; needsClarification: boolean }> {
  console.log('[Phase 2] Analyzing content for questions...');

  const prompt = buildPhase2AnalysisPrompt(ocrData);

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 4096,
    }
  };

  try {
    const data = await callGeminiApi(apiKey, requestBody);
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return {
        questions: [],
        preAnalysis: { detectedPerson: null, dateFormat: 'unknown', timeFormat: 'unknown', shiftPatterns: [] },
        needsClarification: false
      };
    }

    const parsed = parseJsonFromResponse(textContent);

    const questions: SmartQuestion[] = (Array.isArray(parsed.questions) ? parsed.questions : [])
      .filter((q: any) => q && q.question)
      .map((q: any) => ({
        id: q.id || `q_${Math.random().toString(36).substr(2, 6)}`,
        type: q.type || 'single_select',
        question: q.question,
        options: Array.isArray(q.options) ? q.options.filter((o: any) => o && o.label && o.value) : undefined,
        required: q.required !== false
      }));

    const preAnalysis: PreAnalysis = {
      detectedPerson: parsed.preAnalysis?.detectedPerson || null,
      dateFormat: parsed.preAnalysis?.dateFormat || 'unknown',
      timeFormat: parsed.preAnalysis?.timeFormat || 'unknown',
      shiftPatterns: Array.isArray(parsed.preAnalysis?.shiftPatterns) ? parsed.preAnalysis.shiftPatterns : []
    };

    console.log(`[Phase 2] Analysis complete: needsClarification=${parsed.needsClarification}, questions=${questions.length}`);

    return {
      questions,
      preAnalysis,
      needsClarification: parsed.needsClarification === true
    };

  } catch (error) {
    console.error('[Phase 2] Analysis error:', error);
    return {
      questions: [],
      preAnalysis: { detectedPerson: null, dateFormat: 'unknown', timeFormat: 'unknown', shiftPatterns: [] },
      needsClarification: false
    };
  }
}

// ============================================
// Phase 3: Extraction + Normalization
// ============================================

async function extractShiftsPhase3(
  apiKey: string,
  ocrData: ExtractedContent,
  answers: QuestionAnswer[],
  preAnalysis?: PreAnalysis
): Promise<{ shifts: AIExtractedShift[]; identifiedPerson: IdentifiedPerson | null; error?: string }> {
  console.log('[Phase 3] Extracting and normalizing shifts...');

  const prompt = buildPhase3ExtractionPrompt(ocrData, answers, preAnalysis);

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 8192,
    }
  };

  try {
    const data = await callGeminiApi(apiKey, requestBody);
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return { shifts: [], identifiedPerson: null, error: 'No content in extraction response' };
    }

    const parsed = parseJsonFromResponse(textContent);

    if (!parsed.success) {
      return { shifts: [], identifiedPerson: null, error: parsed.error || 'Extraction failed' };
    }

    const shifts: AIExtractedShift[] = Array.isArray(parsed.shifts) ? parsed.shifts : [];

    const identifiedPerson: IdentifiedPerson | null = parsed.identifiedPerson ? {
      nameFound: parsed.identifiedPerson.nameFound || 'Unknown',
      location: parsed.identifiedPerson.location || 'unknown',
      matchType: 'exact',
      confidence: parsed.identifiedPerson.confidence || 0.9
    } : null;

    console.log(`[Phase 3] Extraction complete: ${shifts.length} shifts found`);

    return { shifts, identifiedPerson };

  } catch (error) {
    console.error('[Phase 3] Extraction error:', error);

    if (error instanceof SyntaxError) {
      return { shifts: [], identifiedPerson: null, error: 'Failed to parse extraction result' };
    }

    throw error;
  }
}

// ============================================
// Utility: Detect Simple Content (skip Phase 2)
// ============================================

function detectSimpleContent(ocrData: ExtractedContent): boolean {
  // Email or text message → usually single person
  if (ocrData.contentType === 'email' || ocrData.contentType === 'text') {
    return true;
  }

  // Metadata indicates single person
  if (ocrData.metadata?.hasMultiplePeople === false) {
    return true;
  }

  // Single potential name
  if (ocrData.metadata?.potentialNames && ocrData.metadata.potentialNames.length === 1) {
    return true;
  }

  // Calendar view with single person
  if (ocrData.contentType === 'calendar') {
    // Calendar always has multiple people in cells, so check potentialNames
    const nameCount = ocrData.metadata?.potentialNames?.length || 0;
    if (nameCount <= 1) {
      return true;
    }
    // Multiple names in calendar → need to ask who
    return false;
  }

  // Table with only one data column (excluding date/day columns)
  if (ocrData.contentType === 'table' && ocrData.headers) {
    const dataColumns = ocrData.headers.filter(h => !isMetadataColumn(h));
    if (dataColumns.length <= 1) {
      return true;
    }
  }

  return false;
}

function isMetadataColumn(header: string): boolean {
  const metadataKeywords = ['date', 'day', 'roster', 'notes', 'events', 'memo', '날짜', '요일', '메모', 'week'];
  const h = header.toLowerCase();
  return metadataKeywords.some(k => h.includes(k));
}

// ============================================
// Public API: Phase 1
// ============================================

export async function processRosterPhase1(
  apiKey: string,
  imageBase64: string
): Promise<QuestionGenerationResult> {
  console.log('[processRosterPhase1] Starting...');

  // Phase 1: Pure OCR
  const ocrResult = await extractContentPhase1(apiKey, imageBase64);

  if (!ocrResult.success) {
    return {
      success: false,
      questions: [],
      ocrData: ocrResult,
      error: ocrResult.error,
      errorType: ocrResult.errorType
    };
  }

  // Check if simple content (can skip Phase 2)
  const isSimple = detectSimpleContent(ocrResult);
  console.log(`[processRosterPhase1] isSimple=${isSimple}`);

  if (isSimple) {
    // Skip Phase 2, tell frontend to go straight to extraction
    return {
      success: true,
      questions: [],
      ocrData: ocrResult,
      skipToExtraction: true,
      preAnalysis: {
        detectedPerson: ocrResult.metadata?.potentialNames?.[0] || null,
        dateFormat: 'auto',
        timeFormat: 'auto',
        shiftPatterns: []
      }
    };
  }

  // Phase 2: Analysis + Question Generation
  const analysisResult = await analyzeContentPhase2(apiKey, ocrResult);

  return {
    success: true,
    questions: analysisResult.questions,
    ocrData: ocrResult,
    skipToExtraction: !analysisResult.needsClarification,
    preAnalysis: analysisResult.preAnalysis
  };
}

// ============================================
// Public API: Phase 2 (Filter with Answers)
// ============================================

export async function processRosterPhase2(
  apiKey: string,
  ocrData: ExtractedContent,
  answers: QuestionAnswer[],
  jobConfigs: JobConfig[],
  jobAliases: JobAlias[]
): Promise<ProcessResult> {
  console.log('[processRosterPhase2] Processing with answers...');

  const currentYear = getCurrentYear();

  // Phase 3: Extract and normalize shifts
  const extractionResult = await extractShiftsPhase3(apiKey, ocrData, answers);

  if (extractionResult.error) {
    return {
      success: false,
      shifts: [],
      error: extractionResult.error,
      errorType: 'extraction_failed',
      ocrData
    };
  }

  // Validate and normalize with validators.ts
  const validationResult = validateShifts(extractionResult.shifts, currentYear);

  if (validationResult.errors.length > 0) {
    console.warn('[processRosterPhase2] Validation errors:', validationResult.errors);
  }
  if (validationResult.warnings.length > 0) {
    console.log('[processRosterPhase2] Validation warnings:', validationResult.warnings);
  }

  if (validationResult.validShifts.length === 0) {
    // Try fallback: parse from rawText
    if (ocrData.rawText && ocrData.rawText.length > 50) {
      console.log('[processRosterPhase2] Trying rawText fallback...');
      const fallbackResult = await parseShiftsFromText(apiKey, ocrData.rawText, jobConfigs, jobAliases);
      if (fallbackResult.success && fallbackResult.shifts.length > 0) {
        return { ...fallbackResult, ocrData };
      }
    }

    return {
      success: false,
      shifts: [],
      error: `No valid shifts extracted. ${validationResult.errors.join('; ')}`,
      errorType: 'no_shifts',
      ocrData
    };
  }

  // Convert validated shifts to ParsedShift format
  const shifts: ParsedShift[] = validationResult.validShifts.map(s => {
    const jobName = s.jobName || s.location || 'Work';
    const mappedJobId = findJobMapping(jobName, jobConfigs, jobAliases);

    return {
      id: generateShiftId(),
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      totalHours: null,
      rosterJobName: jobName,
      mappedJobId,
      confidence: 0.95,
      selected: true
    };
  });

  console.log(`[processRosterPhase2] Complete: ${shifts.length} valid shifts`);

  return {
    success: true,
    shifts,
    identifiedPerson: extractionResult.identifiedPerson,
    ocrData
  };
}

// ============================================
// Fallback: Parse shifts from raw text
// ============================================

async function parseShiftsFromText(
  apiKey: string,
  rawText: string,
  jobConfigs: JobConfig[],
  jobAliases: JobAlias[]
): Promise<ProcessResult> {
  const currentYear = getCurrentYear();
  const currentDate = getCurrentDate();

  const prompt = `Extract work shifts from this text.

CURRENT DATE: ${currentDate}
CURRENT YEAR: ${currentYear}

TEXT CONTENT:
${rawText}

CRITICAL NORMALIZATION:
1. Dates MUST be YYYY-MM-DD format
2. Times MUST be HH:MM 24-hour format

OUTPUT JSON:
{
  "shifts": [
    {
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM" | null,
      "endTime": "HH:MM" | null,
      "location": "..." | null,
      "jobName": "..." | null,
      "rawDateText": "original",
      "rawTimeText": "original"
    }
  ]
}`;

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
  };

  try {
    const data = await callGeminiApi(apiKey, requestBody);
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) throw new Error('No content');

    const parsed = parseJsonFromResponse(textContent);
    const rawShifts: AIExtractedShift[] = Array.isArray(parsed.shifts) ? parsed.shifts : [];

    // Validate with validators.ts
    const validationResult = validateShifts(rawShifts, currentYear);

    const shifts: ParsedShift[] = validationResult.validShifts.map(s => {
      const jobName = s.jobName || s.location || 'Work';
      const mappedJobId = findJobMapping(jobName, jobConfigs, jobAliases);
      return {
        id: generateShiftId(),
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        totalHours: null,
        rosterJobName: jobName,
        mappedJobId,
        confidence: 0.8,
        selected: true
      };
    });

    return {
      success: shifts.length > 0,
      shifts,
      identifiedPerson: {
        nameFound: 'Extracted from text',
        location: 'text',
        matchType: 'substring',
        confidence: 0.8
      }
    };
  } catch (error) {
    console.error('[parseShiftsFromText] Error:', error);
    return { success: false, shifts: [] };
  }
}

// ============================================
// Job Mapping
// ============================================

function findJobMapping(
  rosterJobName: string,
  jobConfigs: JobConfig[],
  jobAliases: JobAlias[]
): string | undefined {
  const lower = rosterJobName.toLowerCase();

  // Check aliases first
  const aliasMatch = jobAliases.find(a => a.alias.toLowerCase() === lower);
  if (aliasMatch) return aliasMatch.job_config_id;

  // Check exact match
  const exactMatch = jobConfigs.find(j => j.name.toLowerCase() === lower);
  if (exactMatch) return exactMatch.id;

  // Check partial match
  const partialMatch = jobConfigs.find(
    j => j.name.toLowerCase().includes(lower) || lower.includes(j.name.toLowerCase())
  );
  if (partialMatch) return partialMatch.id;

  return undefined;
}

// ============================================
// Legacy Entry Point (backward compatible)
// ============================================

export async function processWithGemini(
  apiKey: string,
  imageBase64: string,
  jobConfigs: JobConfig[],
  jobAliases: JobAlias[],
  identifier?: RosterIdentifier
): Promise<ProcessResult> {
  console.log('[processWithGemini] Legacy entry point...');

  // Use new Phase 1
  const phase1Result = await processRosterPhase1(apiKey, imageBase64);

  if (!phase1Result.success) {
    return {
      success: false,
      shifts: [],
      error: phase1Result.error,
      errorType: phase1Result.errorType,
      ocrData: phase1Result.ocrData
    };
  }

  // Use new Phase 2 (with empty answers for legacy)
  const phase2Result = await processRosterPhase2(
    apiKey,
    phase1Result.ocrData,
    [],
    jobConfigs,
    jobAliases
  );

  return phase2Result;
}
