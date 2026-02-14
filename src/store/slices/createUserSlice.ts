import type { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabaseClient';
import i18n from '../../i18n';
import type { VacationPeriod, Expense, AustraliaVisaType } from '../../types';
import type { CountryCode } from '../../data/countries';
import { ensureUserId } from '../utils/ensureUserId';
import { handleDbError } from '../utils/handleDbError';

export interface UserSlice {
  userId: string | null;
  isAdmin: boolean;
  holidays: string[];
  isStudentVisaHolder: boolean; // Legacy: kept for backward compatibility
  visaType: AustraliaVisaType; // New: visa type for tax calculation
  vacationPeriods: VacationPeriod[];
  savingsGoal: number;
  expenses: Expense[];
  country: CountryCode | null;
  isLoaded: boolean;
  hasSeenHelp: boolean;
  supportsVisaType: boolean;
  supportsHasSeenHelp: boolean;
  supportsCountry: boolean;

  markHelpSeen: () => Promise<void>;
  addHoliday: (date: string) => void;
  removeHoliday: (date: string) => void;
  updateProfile: (visaType: AustraliaVisaType, vacationPeriods?: VacationPeriod[]) => Promise<void>;
  updateSavingsGoal: (goal: number) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
  setCountry: (country: CountryCode) => Promise<void>;
  setLoaded: (loaded: boolean) => void;
  setUserId: (id: string | null) => void;
}

export const createUserSlice: StateCreator<UserSlice> = (set, get) => ({
  userId: null,
  isAdmin: false,
  holidays: [],
  isStudentVisaHolder: false, // Legacy: kept for backward compatibility
  visaType: 'domestic' as AustraliaVisaType, // New: default to domestic
  vacationPeriods: [],
  savingsGoal: 0,
  expenses: [],
  country: null,
  isLoaded: false,
  hasSeenHelp: false,
  supportsVisaType: false,
  supportsHasSeenHelp: false,
  supportsCountry: false,

  setLoaded: (loaded) => set({ isLoaded: loaded }),
  setUserId: (id) => set({ userId: id }),

  markHelpSeen: async () => {
    set({ hasSeenHelp: true });
    const userId = await ensureUserId(get().userId);

    if (userId && get().supportsHasSeenHelp) {
      const { error } = await supabase.from('profiles').update({ has_seen_help: true }).eq('id', userId);
      handleDbError(error, { context: 'markHelpSeen' });
    }
  },

  addHoliday: async (date) => {
    const newHolidays = [...get().holidays, date];
    set({ holidays: newHolidays });
    const userId = await ensureUserId(get().userId);

    if (userId) {
      const { error } = await supabase.from('profiles').update({ holidays: newHolidays }).eq('id', userId);
      handleDbError(error, { context: 'addHoliday' });
    }
  },

  removeHoliday: async (date) => {
    const newHolidays = get().holidays.filter((d) => d !== date);
    set({ holidays: newHolidays });
    const userId = await ensureUserId(get().userId);

    if (userId) {
      const { error } = await supabase.from('profiles').update({ holidays: newHolidays }).eq('id', userId);
      handleDbError(error, { context: 'removeHoliday' });
    }
  },

  updateProfile: async (visaType, vacationPeriods) => {
    // Store previous state for rollback
    const previousVisaType = get().visaType;
    const previousVacationPeriods = get().vacationPeriods;
    const previousIsStudentVisaHolder = get().isStudentVisaHolder;

    const periodsToSave = vacationPeriods || [];
    // Keep legacy field in sync
    const isStudentVisaHolder = visaType === 'student_visa';

    set({
      visaType,
      isStudentVisaHolder, // Legacy: kept for backward compatibility
      vacationPeriods: periodsToSave,
    });

    const userId = await ensureUserId(get().userId);

    if (userId) {
      const payload: Record<string, unknown> = {
        id: userId,
        is_student_visa_holder: isStudentVisaHolder, // Legacy: kept for backward compatibility
        vacation_periods: periodsToSave,
      };

      if (get().supportsVisaType) {
        payload.visa_type = visaType;
      }

      const { error } = await supabase.from('profiles').upsert({
        ...payload,
      });

      handleDbError(error, {
        context: 'updateProfile',
        userMessage: i18n.t('profile.saveFailed'),
        rollback: () => set({
          visaType: previousVisaType,
          isStudentVisaHolder: previousIsStudentVisaHolder,
          vacationPeriods: previousVacationPeriods,
        }),
      });
    }
  },

  updateSavingsGoal: async (goal) => {
    set({ savingsGoal: goal });
    const userId = await ensureUserId(get().userId);

    if (userId) {
      const { error } = await supabase.from('profiles').update({ savings_goal: goal }).eq('id', userId);
      handleDbError(error, { context: 'updateSavingsGoal' });
    }
  },

  addExpense: async (expense) => {
    const previousExpenses = get().expenses;
    const newExpenses = [...previousExpenses, expense];
    set({ expenses: newExpenses });

    const userId = await ensureUserId(get().userId);

    if (userId) {
      const { error } = await supabase.from('profiles').update({ expenses: newExpenses }).eq('id', userId);
      handleDbError(error, {
        context: 'addExpense',
        userMessage: 'Failed to save expense. Please try again.',
        rollback: () => set({ expenses: previousExpenses }),
      });
    }
  },

  updateExpense: async (id, updatedExpense) => {
    const previousExpenses = get().expenses;
    const newExpenses = previousExpenses.map((e) => (e.id === id ? { ...e, ...updatedExpense } : e));
    set({ expenses: newExpenses });

    const userId = await ensureUserId(get().userId);

    if (userId) {
      const { error } = await supabase.from('profiles').update({ expenses: newExpenses }).eq('id', userId);
      handleDbError(error, {
        context: 'updateExpense',
        userMessage: 'Failed to update expense. Please try again.',
        rollback: () => set({ expenses: previousExpenses }),
      });
    }
  },

  removeExpense: async (id) => {
    const previousExpenses = get().expenses;
    const newExpenses = previousExpenses.filter((e) => e.id !== id);
    set({ expenses: newExpenses });

    const userId = await ensureUserId(get().userId);

    if (userId) {
      const { error } = await supabase.from('profiles').update({ expenses: newExpenses }).eq('id', userId);
      handleDbError(error, {
        context: 'removeExpense',
        userMessage: 'Failed to delete expense. Please try again.',
        rollback: () => set({ expenses: previousExpenses }),
      });
    }
  },

  setCountry: async (country: CountryCode) => {
    set({ country });
    // Simplified: Always use English for AU-exclusive app
    i18n.changeLanguage('en');

    const userId = await ensureUserId(get().userId);

    if (userId && get().supportsCountry) {
      const { error } = await supabase.from('profiles').update({ country }).eq('id', userId);
      handleDbError(error, { context: 'setCountry' });
    }
  },
});
