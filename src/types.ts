export type JobType = string;

export interface RateHistoryItem {
  effectiveDate: string; // YYYY-MM-DD
  rates: {
    weekday: number;
    saturday: number;
    sunday: number;
    holiday: number;
  };
}

export interface JobConfig {
  id: string;
  name: string;
  color: string; // tailwind color name (e.g., 'blue', 'emerald')
  defaultHours: {
    weekday: number;
    weekend: number;
  };
  hourlyRates: {
    weekday: number;
    saturday: number;
    sunday: number;
    holiday: number;
  };
  rateHistory: RateHistoryItem[];
  defaultBreakMinutes?: number; // Unpaid break time in minutes (default: 0)
}

export interface WageConfig {
  [jobType: string]: {
    weekday: number;
    saturday: number;
    sunday: number;
    holiday: number;
  };
}

export interface Shift {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  type: JobType;
  hours: number;
  note?: string;
}

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
}

export interface VacationPeriod {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
}

export type ExpenseCategory = 
  | 'housing' 
  | 'utility' 
  | 'subscription' 
  | 'grocery' 
  | 'transport'
  | 'insurance'
  | 'investment' 
  | 'other';

export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  isRecurring: boolean; // true = 매달 고정, false = 일회성 (해당 월만)
  month?: string; // YYYY-MM (일회성일 경우만 사용)
}

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; emoji: string }[] = [
  { value: 'housing', label: 'Housing', emoji: '🏠' },
  { value: 'utility', label: 'Utilities', emoji: '💡' },
  { value: 'subscription', label: 'Subscriptions', emoji: '📱' },
  { value: 'grocery', label: 'Groceries', emoji: '🛒' },
  { value: 'transport', label: 'Transport', emoji: '🚗' },
  { value: 'insurance', label: 'Insurance', emoji: '🛡️' },
  { value: 'investment', label: 'Investment', emoji: '📈' },
  { value: 'other', label: 'Other', emoji: '📦' },
];

export interface Feedback {
  id: string;
  user_id: string;
  message: string;
  type: 'feedback' | 'feature_request' | 'bug';
  created_at: string;
  status: 'new' | 'read' | 'completed';
  user_email?: string;
  admin_reply?: string;
  reply_created_at?: string;
}

export interface FeedbackReply {
  id: string;
  feedback_id: string;
  sender_id: string;
  content: string;
  is_admin_reply: boolean;
  created_at: string;
}

// Roster Scanner Types
export interface ParsedShift {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  totalHours: number;
  rosterJobName: string; // Original name from roster
  mappedJobId?: string; // User's JobConfig id (after mapping)
  confidence: number; // 0-1 confidence score from AI
  selected: boolean; // Whether user wants to add this shift
  hasConflict?: boolean; // Conflicts with existing shift
  conflictShiftId?: string; // ID of conflicting shift
}

export interface RosterScanResult {
  success: boolean;
  shifts: ParsedShift[];
  processingTimeMs: number;
  error?: string;
  errorType?: 'blurry' | 'no_shifts' | 'timeout' | 'limit_exceeded' | 'unknown' | 'auth' | 'network' | 'parse_error' | 'not_roster' | 'config' | 'invalid_input';
}

export interface JobAlias {
  id: string;
  user_id: string;
  job_config_id: string;
  alias: string;
  created_at?: string;
}

export interface RosterScan {
  id: string;
  user_id: string;
  parsed_result: RosterScanResult;
  shifts_created: number;
  processing_time_ms: number;
  created_at: string;
}
