import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Shift, JobConfig, VacationPeriod, Expense } from '../types';
import { supabase } from '../lib/supabaseClient';

interface CopiedShiftData {
  type: string;
  hours: number;
  note?: string;
}

interface ScheduleState {
  shifts: Shift[];
  jobConfigs: JobConfig[];
  holidays: string[]; // ['2024-01-01', ...]
  copiedShifts: CopiedShiftData[] | null;
  isStudentVisaHolder: boolean;
  vacationPeriods: VacationPeriod[];
  savingsGoal: number;
  expenses: Expense[];
  
  fetchData: () => Promise<void>;
  addShift: (shift: Shift) => Promise<void>;
  updateShift: (id: string, shift: Partial<Shift>) => Promise<void>;
  removeShift: (id: string) => Promise<void>;
  addHoliday: (date: string) => void;
  removeHoliday: (date: string) => void;
  updateJobConfig: (id: string, config: Partial<JobConfig>) => Promise<void>;
  addJobConfig: (config: JobConfig) => Promise<void>;
  removeJobConfig: (id: string) => Promise<void>;
  setCopiedShifts: (shifts: CopiedShiftData[] | null) => void;
  updateProfile: (isStudentVisaHolder: boolean, vacationPeriods?: VacationPeriod[]) => Promise<void>;
  updateSavingsGoal: (goal: number) => Promise<void>;
  addExpense: (expense: Expense) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  removeExpense: (id: string) => Promise<void>;
}

const DEFAULT_JOB_CONFIGS: JobConfig[] = [];

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set, get) => ({
      shifts: [],
      jobConfigs: DEFAULT_JOB_CONFIGS,
      holidays: [],
      copiedShifts: null,
      isStudentVisaHolder: false,
      vacationPeriods: [],
      savingsGoal: 0,
      expenses: [],

      setCopiedShifts: (shifts) => set({ copiedShifts: shifts }),
      
      updateSavingsGoal: async (goal) => {
        set({ savingsGoal: goal });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({ savings_goal: goal }).eq('id', user.id);
        }
      },

      fetchData: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch Job Configs
        const { data: jobData, error: jobError } = await supabase
          .from('job_configs')
          .select('*');
        
        if (jobData && !jobError) {
           const mappedJobs: JobConfig[] = jobData.map((j: any) => ({
             id: j.config_id,
             name: j.name,
             color: j.color,
             defaultHours: {
               weekday: Number(j.default_hours_weekday),
               weekend: Number(j.default_hours_weekend),
             },
             hourlyRates: {
               weekday: Number(j.hourly_rate_weekday),
               saturday: Number(j.hourly_rate_saturday),
               sunday: Number(j.hourly_rate_sunday),
               holiday: Number(j.hourly_rate_holiday),
             },
             rateHistory: j.rate_history || [], // Assuming rate_history is a JSONB column
           }));
           
           // Migration for existing data: if rateHistory is empty, seed it with current rates
           const migratedJobs = mappedJobs.map(job => {
             if (!job.rateHistory || job.rateHistory.length === 0) {
               return {
                 ...job,
                 rateHistory: [{
                   effectiveDate: '2000-01-01', // Apply from the beginning
                   rates: { ...job.hourlyRates }
                 }]
               };
             }
             return job;
           });

           if (migratedJobs.length > 0) {
             set({ jobConfigs: migratedJobs });
           }
        }

        // Fetch Profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('is_student_visa_holder, vacation_periods, savings_goal, holidays, expenses')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profileError) {
          console.error('Error fetching profile:', profileError);
        }
        
        if (profileData) {
          set({ 
            isStudentVisaHolder: profileData.is_student_visa_holder ?? false,
            vacationPeriods: profileData.vacation_periods || [],
            savingsGoal: Number(profileData.savings_goal) || 0,
            holidays: profileData.holidays || [],
            expenses: profileData.expenses || []
          });
        } else {
          // Profile doesn't exist - create one with defaults
          await supabase.from('profiles').insert({
            id: user.id,
            is_student_visa_holder: false,
            vacation_periods: [],
            savings_goal: 0,
            holidays: []
          });
          set({ 
            isStudentVisaHolder: false,
            vacationPeriods: [],
            savingsGoal: 0,
            holidays: [],
            expenses: []
          });
        }

        // Fetch Shifts
        const { data: shiftData, error: shiftError } = await supabase
          .from('shifts')
          .select('*');

        if (shiftData && !shiftError) {
          const mappedShifts: Shift[] = shiftData.map((s: any) => ({
            id: s.id,
            date: s.date,
            type: s.type,
            hours: Number(s.hours),
            note: s.note || undefined, // assuming note column exists or JSONB
          }));
          set({ shifts: mappedShifts });
        }
      },

      addShift: async (shift) => {
        // Optimistic update
        set((state) => ({ 
          shifts: [
            ...state.shifts.filter(s => !(s.date === shift.date && s.type === shift.type)), 
            shift
          ]
        }));

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('shifts').upsert({
             user_id: user.id,
             date: shift.date,
             type: shift.type,
             hours: shift.hours,
             note: shift.note
          }, { onConflict: 'user_id, date, type' });
        }
      },

      updateShift: async (id, updatedShift) => {
        set((state) => ({
          shifts: state.shifts.map((s) => (s.id === id ? { ...s, ...updatedShift } : s)),
        }));

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('shifts').update({
             ...(updatedShift.hours !== undefined && { hours: updatedShift.hours }),
             ...(updatedShift.note !== undefined && { note: updatedShift.note }),
          }).eq('id', id); 
        }
      },

      removeShift: async (id) => {
        set((state) => ({
          shifts: state.shifts.filter((s) => s.id !== id),
        }));
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('shifts').delete().eq('id', id);
        }
      },

      addHoliday: async (date) => {
        const newHolidays = [...get().holidays, date];
        set({ holidays: newHolidays });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({ holidays: newHolidays }).eq('id', user.id);
        }
      },
      
      removeHoliday: async (date) => {
        const newHolidays = get().holidays.filter((d) => d !== date);
        set({ holidays: newHolidays });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('profiles').update({ holidays: newHolidays }).eq('id', user.id);
        }
      },

      updateJobConfig: async (id, config) => {
        set((state) => ({
          jobConfigs: state.jobConfigs.map((j) => (j.id === id ? { ...j, ...config } : j)),
        }));

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
           const state = get();
           const fullConfig = state.jobConfigs.find(j => j.id === id);
           if (!fullConfig) return;

           await supabase.from('job_configs').update({
             name: fullConfig.name,
             color: fullConfig.color,
             default_hours_weekday: fullConfig.defaultHours.weekday,
             default_hours_weekend: fullConfig.defaultHours.weekend,
             hourly_rate_weekday: fullConfig.hourlyRates.weekday,
             hourly_rate_saturday: fullConfig.hourlyRates.saturday,
             hourly_rate_sunday: fullConfig.hourlyRates.sunday,
             hourly_rate_holiday: fullConfig.hourlyRates.holiday,
             rate_history: fullConfig.rateHistory, // Handle JSONB update
           }).eq('config_id', id).eq('user_id', user.id);
        }
      },

      addJobConfig: async (config) => {
        set((state) => ({
          jobConfigs: [...state.jobConfigs, config],
        }));

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('job_configs').insert({
             user_id: user.id,
             config_id: config.id,
             name: config.name,
             color: config.color,
             default_hours_weekday: config.defaultHours.weekday,
             default_hours_weekend: config.defaultHours.weekend,
             hourly_rate_weekday: config.hourlyRates.weekday,
             hourly_rate_saturday: config.hourlyRates.saturday,
             hourly_rate_sunday: config.hourlyRates.sunday,
             hourly_rate_holiday: config.hourlyRates.holiday,
             rate_history: config.rateHistory,
           });
        }
      },

      removeJobConfig: async (id) => {
        set((state) => ({
          jobConfigs: state.jobConfigs.filter((j) => j.id !== id),
          shifts: state.shifts.filter((s) => s.type !== id),
        }));

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Delete all shifts with this job type first
          await supabase.from('shifts').delete().eq('type', id).eq('user_id', user.id);
          // Then delete the job config
          await supabase.from('job_configs').delete().eq('config_id', id);
        }
      },

      updateProfile: async (isStudentVisaHolder, vacationPeriods) => {
        const periodsToSave = vacationPeriods || [];
        set({ 
          isStudentVisaHolder: isStudentVisaHolder,
          vacationPeriods: periodsToSave
        });
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase.from('profiles').upsert({
            id: user.id,
            is_student_visa_holder: isStudentVisaHolder,
            vacation_periods: periodsToSave
          });
          
          if (error) {
            console.error('Error updating profile:', error);
          }
        }
      },

      addExpense: async (expense) => {
        set((state) => ({ expenses: [...state.expenses, expense] }));
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const expenses = get().expenses;
          await supabase.from('profiles').update({ expenses }).eq('id', user.id);
        }
      },

      updateExpense: async (id, updatedExpense) => {
        set((state) => ({
          expenses: state.expenses.map((e) => (e.id === id ? { ...e, ...updatedExpense } : e)),
        }));
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const expenses = get().expenses;
          await supabase.from('profiles').update({ expenses }).eq('id', user.id);
        }
      },

      removeExpense: async (id) => {
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== id),
        }));
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const expenses = get().expenses;
          await supabase.from('profiles').update({ expenses }).eq('id', user.id);
        }
      },
    }),
    {
      name: 'paychecker-storage-v2',
    }
  )
);

// Helper to get wage config from job configs (for compatibility)
export const getWageConfigFromJobConfigs = (jobConfigs: JobConfig[]) => {
  const wageConfig: { [key: string]: { weekday: number; saturday: number; sunday: number; holiday: number } } = {};
  jobConfigs.forEach((job) => {
    wageConfig[job.id] = job.hourlyRates;
  });
  return wageConfig;
};

export const SUPER_RATE = 0.115;
