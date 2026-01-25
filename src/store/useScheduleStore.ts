import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Shift, JobConfig, VacationPeriod } from '../types';
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

      setCopiedShifts: (shifts) => set({ copiedShifts: shifts }),

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
        const { data: profileData } = await supabase
          .from('profiles')
          .select('is_student_visa_holder, vacation_periods')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          set({ 
            isStudentVisaHolder: profileData.is_student_visa_holder,
            vacationPeriods: profileData.vacation_periods || [] 
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

      addHoliday: (date) => set((state) => ({ holidays: [...state.holidays, date] })),
      removeHoliday: (date) => set((state) => ({ holidays: state.holidays.filter((d) => d !== date) })),

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
          await supabase.from('job_configs').delete().eq('config_id', id);
        }
      },

      updateProfile: async (isStudentVisaHolder, vacationPeriods) => {
        set((state) => ({ 
          isStudentVisaHolder: isStudentVisaHolder,
          vacationPeriods: vacationPeriods || state.vacationPeriods
        }));
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Flatten vacation periods for JSONB storage just in case, though Typescript should handle
          const updateData: any = {
            id: user.id,
            is_student_visa_holder: isStudentVisaHolder
          };
          if (vacationPeriods) {
            updateData.vacation_periods = vacationPeriods;
          }

          const { error } = await supabase.from('profiles').upsert(updateData);
          
          if (error) {
            console.error('Error updating profile:', error);
          }
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
