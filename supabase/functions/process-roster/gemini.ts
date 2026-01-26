/**
 * Gemini API integration for roster image processing
 */

interface JobConfig {
  id: string;
  name: string;
}

interface JobAlias {
  alias: string;
  job_config_id: string;
}

interface ParsedShift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  rosterJobName: string;
  mappedJobId?: string;
  confidence: number;
  selected: boolean;
}

interface ProcessResult {
  success: boolean;
  shifts: ParsedShift[];
  error?: string;
  errorType?: string;
}

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
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash'
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

/**
 * Builds the prompt for Gemini to extract shift data
 */
function buildPrompt(jobConfigs: JobConfig[], jobAliases: JobAlias[]): string {
  const jobNames = jobConfigs.map(j => j.name).join(', ');

  const aliasMapping = jobAliases.length > 0
    ? `\n\nKnown job name mappings (alias → job name):\n${jobAliases.map(a => {
        const job = jobConfigs.find(j => j.id === a.job_config_id);
        return `- "${a.alias}" → "${job?.name || a.job_config_id}"`;
      }).join('\n')}`
    : '';

  return `You are analyzing a work roster/schedule image. Extract all shift information.

User's registered job names: ${jobNames || 'None registered yet'}${aliasMapping}

For each shift found, extract:
1. Date (convert to YYYY-MM-DD format)
2. Start time (HH:MM in 24-hour format)
3. End time (HH:MM in 24-hour format)
4. Total hours (calculate from start/end if not shown)
5. Job/position name (exactly as written on the roster)
6. Confidence score (0.0-1.0) for the accuracy of extraction

Date interpretation rules:
- If year is not shown, assume the current or upcoming occurrence
- Handle formats: DD/MM, MM/DD, "Mon 15", "15th Jan", etc.
- For recurring schedules, extract each day separately

Output ONLY valid JSON in this exact format:
{
  "shifts": [
    {
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "totalHours": 7.5,
      "rosterJobName": "Job name from roster",
      "confidence": 0.95
    }
  ],
  "notes": "Any important observations about the roster"
}

If the image is blurry, unclear, or doesn't appear to be a roster:
{
  "shifts": [],
  "error": "Description of the issue",
  "errorType": "blurry" | "no_shifts" | "not_roster"
}

Important:
- Extract ALL shifts visible in the image
- Be precise with times - don't guess if unclear
- Lower confidence score for any values you're uncertain about
- Job names should match roster exactly (don't modify/clean them)`;
}

/**
 * Generates a unique ID for each shift
 */
function generateShiftId(): string {
  return `shift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Processes roster image with Gemini 1.5 Flash
 */
export async function processWithGemini(
  apiKey: string,
  imageBase64: string,
  jobConfigs: JobConfig[],
  jobAliases: JobAlias[]
): Promise<ProcessResult> {
  const prompt = buildPrompt(jobConfigs, jobAliases);
  const models = getModelCandidates();

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt
          },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: imageBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1, // Low temperature for more consistent extraction
      topP: 0.8,
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

        console.error('Gemini API error:', {
          status: response.status,
          model,
          message
        });

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
      if (lastNotFoundError) {
        throw lastNotFoundError;
      }
      throw new GeminiApiError(500, 'Gemini API error: No response', models[0] || DEFAULT_GEMINI_MODEL);
    }

    // Extract text from response
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      throw new Error('No content in Gemini response');
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = textContent;
    const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    // Handle error responses from Gemini
    if (parsed.error) {
      return {
        success: false,
        shifts: [],
        error: parsed.error,
        errorType: parsed.errorType || 'unknown'
      };
    }

    // Process shifts and add IDs + attempt job mapping
    const shifts: ParsedShift[] = (parsed.shifts || []).map((shift: any) => {
      const rosterJobName = typeof shift.rosterJobName === 'string' ? shift.rosterJobName : '';
      const rosterJobNameLower = rosterJobName.toLowerCase();
      // Try to find matching job
      let mappedJobId: string | undefined;

      if (rosterJobNameLower.length > 0) {
        // First check aliases
        const aliasMatch = jobAliases.find(
          a => a.alias.toLowerCase() === rosterJobNameLower
        );
        if (aliasMatch) {
          mappedJobId = aliasMatch.job_config_id;
        } else {
          // Try exact or fuzzy match with job configs
          const exactMatch = jobConfigs.find(
            j => j.name.toLowerCase() === rosterJobNameLower
          );
          if (exactMatch) {
            mappedJobId = exactMatch.id;
          } else {
            // Try partial match
            const partialMatch = jobConfigs.find(
              j => j.name.toLowerCase().includes(rosterJobNameLower) ||
                   rosterJobNameLower.includes(j.name.toLowerCase())
            );
            if (partialMatch) {
              mappedJobId = partialMatch.id;
            }
          }
        }
      }

      return {
        id: generateShiftId(),
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        totalHours: shift.totalHours,
        rosterJobName,
        mappedJobId,
        confidence: shift.confidence || 0.8,
        selected: true // Default to selected
      };
    });

    if (shifts.length === 0) {
      return {
        success: false,
        shifts: [],
        error: 'No shifts found in the image. Make sure this is a work roster.',
        errorType: 'no_shifts'
      };
    }

    return {
      success: true,
      shifts
    };

  } catch (error) {
    console.error('Gemini processing error:', error);

    // Check for JSON parse errors
    if (error instanceof SyntaxError) {
      return {
        success: false,
        shifts: [],
        error: 'Failed to parse roster data. Please try with a clearer image.',
        errorType: 'parse_error'
      };
    }

    throw error;
  }
}
