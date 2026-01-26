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
}
