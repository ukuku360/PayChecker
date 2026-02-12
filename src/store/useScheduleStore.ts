import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import type { JobConfig, Shift, AustraliaVisaType, RateHistoryItem } from '../types';
import { legacyToVisaType } from '../types';
import i18n from '../i18n';
import type { CountryCode } from '../data/countries';

// Slices
import { createShiftSlice, type ShiftSlice } from './slices/createShiftSlice';
import { createJobSlice, type JobSlice } from './slices/createJobSlice';
import { createUserSlice, type UserSlice } from './slices/createUserSlice';

const DEFAULT_JOB_CONFIGS: JobConfig[] = [];

// Database row types for type-safe mapping
interface DbJobConfig {
  config_id: string;
  name: string;
  color: string;
  default_hours_weekday: number | null;
  default_hours_weekend: number | null;
  hourly_rate_weekday: number | null;
  hourly_rate_saturday: number | null;
  hourly_rate_sunday: number | null;
  hourly_rate_holiday: number | null;
  rate_history: RateHistoryItem[] | null;
  default_break_minutes: number | null;
  default_start_time: string | null;
  default_end_time: string | null;
}

interface DbShift {
  id: string;
  date: string;
  type: string;
  hours: number;
  note: string | null;
  start_time: string | null;
  end_time: string | null;
  break_minutes: number | null;
}

// Combined Store Interface
// We need to omit the slice-specific interfaces if there are clashes, but here we designed them to be unique or compatible.
// We can simply extend them.
export interface ScheduleState extends ShiftSlice, JobSlice, UserSlice {
  fetchData: (userId?: string) => Promise<void>;
  saveData: () => Promise<void>;
  clearData: () => void;
}

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (...a) => ({
      ...createShiftSlice(...a),
      ...createJobSlice(...a),
      ...createUserSlice(...a),

      saveData: async () => {}, // Placeholder

      clearData: () => {
        const set = a[0];
        set({
          userId: null,
          isAdmin: false,
          shifts: [],
          jobConfigs: DEFAULT_JOB_CONFIGS,
          holidays: [],
          copiedShifts: null,
          isStudentVisaHolder: false,
          visaType: 'domestic' as AustraliaVisaType,
          vacationPeriods: [],
          savingsGoal: 0,
          expenses: [],
          country: null,
          hasSeenHelp: false,
          isLoaded: false,
        });
      },

      fetchData: async (userId?: string) => {
        const set = a[0];
        let user: { id: string } | null = null;

        if (userId) {
          user = { id: userId };
        } else {
          const { data } = await supabase.auth.getUser();
          user = data.user ? { id: data.user.id } : null;
        }

        if (!user) return;

        set({ userId: user.id });

        // Fetch all data in parallel (user_id filter added for defense-in-depth, RLS also enforced)
        const [
          { data: jobData, error: jobError },
           { data: shiftData, error: shiftError },
           { data: profileData, error: profileError }
        ] = await Promise.all([
          supabase.from('job_configs').select('*').eq('user_id', user.id),
          supabase.from('shifts').select('*').eq('user_id', user.id),
          supabase.from('profiles').select('is_student_visa_holder, visa_type, vacation_periods, savings_goal, holidays, expenses, country, is_admin, has_seen_help').eq('id', user.id).maybeSingle()
        ]);
        
        // Handle Job Configs
        if (jobError && import.meta.env.DEV) console.error('Error fetching job configs:', jobError);

        if (jobData && !jobError) {
           const mappedJobs: JobConfig[] = (jobData as DbJobConfig[]).map((j) => ({
             id: j.config_id,
             name: j.name,
             color: j.color,
             defaultHours: {
               weekday: j.default_hours_weekday ?? 0,
               weekend: j.default_hours_weekend ?? 0,
             },
             hourlyRates: {
               weekday: j.hourly_rate_weekday ?? 0,
               saturday: j.hourly_rate_saturday ?? 0,
               sunday: j.hourly_rate_sunday ?? 0,
               holiday: j.hourly_rate_holiday ?? 0,
             },
             rateHistory: j.rate_history || [],
             defaultBreakMinutes: j.default_break_minutes ?? undefined,
             defaultStartTime: j.default_start_time ?? undefined,
             defaultEndTime: j.default_end_time ?? undefined,
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

        // Handle Shifts
        if (shiftError && import.meta.env.DEV) console.error('Error fetching shifts:', shiftError);

        if (shiftData && !shiftError) {
          const mappedShifts: Shift[] = (shiftData as DbShift[]).map((s) => ({
            id: s.id,
            date: s.date,
            type: s.type,
            hours: s.hours,
            note: s.note ?? undefined,
            startTime: s.start_time ?? undefined,
            endTime: s.end_time ?? undefined,
            breakMinutes: s.break_minutes ?? undefined,
          }));
          set({ shifts: mappedShifts });
        }

        // Handle Profile
        if (profileError && import.meta.env.DEV) {
          console.error('Error fetching profile:', profileError);
        }
        
        if (profileData) {
          const country = profileData.country as CountryCode | null;

          // Handle visa type: prefer new visa_type field, fall back to legacy boolean
          let visaType: AustraliaVisaType = 'domestic';
          if (profileData.visa_type) {
            visaType = profileData.visa_type as AustraliaVisaType;
          } else if (profileData.is_student_visa_holder) {
            // Migrate from legacy boolean
            visaType = legacyToVisaType(profileData.is_student_visa_holder);
          }

          set({
            visaType,
            isStudentVisaHolder: visaType === 'student_visa', // Keep legacy field in sync
            vacationPeriods: profileData.vacation_periods || [],
            savingsGoal: Number(profileData.savings_goal) || 0,
            holidays: profileData.holidays || [],
            expenses: profileData.expenses || [],
            country: country,
            isAdmin: profileData.is_admin === true,
            hasSeenHelp: profileData.has_seen_help === true,
          });
          // Update i18n language based on country (Simplified to 'en' for AU-only)
          if (country) {
            i18n.changeLanguage('en');
          }
        } else {
          // Profile doesn't exist - create one with defaults
          const { error: createError } = await supabase.from('profiles').insert({
            id: user.id,
            is_student_visa_holder: false,
            visa_type: 'domestic',
            vacation_periods: [],
            savings_goal: 0,
            holidays: [],
            is_admin: false,
          });

          if (createError && import.meta.env.DEV) {
            console.error('Error creating profile:', createError);
          }

          set({
            visaType: 'domestic' as AustraliaVisaType,
            isStudentVisaHolder: false,
            vacationPeriods: [],
            savingsGoal: 0,
            holidays: [],
            expenses: [],
            country: null,
            isAdmin: false,
            hasSeenHelp: false,
          });
        }
        
        set({ isLoaded: true });
      },
    }),
    {
      name: 'paychecker-storage-v2',
      partialize: (state) => {
        const { isLoaded, ...persistedState } = state;
        void isLoaded;
        return persistedState;
      },
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
