import type { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabaseClient';
import { toast } from '../useToastStore';
import i18n from '../../i18n';
import type { VacationPeriod, Expense } from '../../types';
import type { CountryCode } from '../../data/countries';

export interface UserSlice {
  userId: string | null;
  holidays: string[];
  isStudentVisaHolder: boolean;
  vacationPeriods: VacationPeriod[];
  savingsGoal: number;
  expenses: Expense[];
  country: CountryCode | null;
  isLoaded: boolean;
  hasSeenHelp: boolean;

  markHelpSeen: () => Promise<void>;
  addHoliday: (date: string) => void;
  removeHoliday: (date: string) => void;
  updateProfile: (isStudentVisaHolder: boolean, vacationPeriods?: VacationPeriod[]) => Promise<void>;
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
  holidays: [],
  isStudentVisaHolder: false,
  vacationPeriods: [],
  savingsGoal: 0,
  expenses: [],
  country: null,
  isLoaded: false,
  hasSeenHelp: false,

  setLoaded: (loaded) => set({ isLoaded: loaded }),
  setUserId: (id) => set({ userId: id }),

  markHelpSeen: async () => {
    set({ hasSeenHelp: true });
    let userId = get().userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }
    
    if (userId) {
      const { error } = await supabase.from('profiles').update({ has_seen_help: true }).eq('id', userId);
      if (error) console.error('Error marking help as seen:', error);
    }
  },

  addHoliday: async (date) => {
    const newHolidays = [...get().holidays, date];
    set({ holidays: newHolidays });
    let userId = get().userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }
    
    if (userId) {
      const { error } = await supabase.from('profiles').update({ holidays: newHolidays }).eq('id', userId);
      if (error) console.error('Error adding holiday:', error);
    }
  },

  removeHoliday: async (date) => {
    const newHolidays = get().holidays.filter((d) => d !== date);
    set({ holidays: newHolidays });
    let userId = get().userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (userId) {
      const { error } = await supabase.from('profiles').update({ holidays: newHolidays }).eq('id', userId);
      if (error) console.error('Error removing holiday:', error);
    }
  },

  updateProfile: async (isStudentVisaHolder, vacationPeriods) => {
    const periodsToSave = vacationPeriods || [];
    set({
      isStudentVisaHolder: isStudentVisaHolder,
      vacationPeriods: periodsToSave,
    });

    let userId = get().userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (userId) {
      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        is_student_visa_holder: isStudentVisaHolder,
        vacation_periods: periodsToSave,
      });

      if (error) {
        console.error('Error updating profile:', error);
      }
    }
  },

  updateSavingsGoal: async (goal) => {
    set({ savingsGoal: goal });
    let userId = get().userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (userId) {
      const { error } = await supabase.from('profiles').update({ savings_goal: goal }).eq('id', userId);
      if (error) console.error('Failed to update savings goal:', error);
    }
  },

  addExpense: async (expense) => {
    const previousExpenses = get().expenses;
    const newExpenses = [...previousExpenses, expense];
    set({ expenses: newExpenses });

    let userId = get().userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (userId) {
      const { error } = await supabase.from('profiles').update({ expenses: newExpenses }).eq('id', userId);
      if (error) {
        console.error('Error adding expense:', error);
        set({ expenses: previousExpenses }); // Rollback
        toast.error('Failed to save expense. Please try again.');
      }
    }
  },

  updateExpense: async (id, updatedExpense) => {
    const previousExpenses = get().expenses;
    const newExpenses = previousExpenses.map((e) => (e.id === id ? { ...e, ...updatedExpense } : e));
    set({ expenses: newExpenses });

    let userId = get().userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (userId) {
      const { error } = await supabase.from('profiles').update({ expenses: newExpenses }).eq('id', userId);
      if (error) {
        console.error('Error updating expense:', error);
        set({ expenses: previousExpenses }); // Rollback
        toast.error('Failed to update expense. Please try again.');
      }
    }
  },

  removeExpense: async (id) => {
    const previousExpenses = get().expenses;
    const newExpenses = previousExpenses.filter((e) => e.id !== id);
    set({ expenses: newExpenses });

    let userId = get().userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (userId) {
      const { error } = await supabase.from('profiles').update({ expenses: newExpenses }).eq('id', userId);
      if (error) {
        console.error('Error removing expense:', error);
        set({ expenses: previousExpenses }); // Rollback
        toast.error('Failed to delete expense. Please try again.');
      }
    }
  },

  setCountry: async (country: CountryCode) => {
    set({ country });
    // Update i18n language based on country
    const language = country === 'KR' ? 'ko' : 'en';
    i18n.changeLanguage(language);

    let userId = get().userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (userId) {
      const { error } = await supabase.from('profiles').update({ country }).eq('id', userId);
      if (error) console.error('Error updating country:', error);
    }
  },
});
