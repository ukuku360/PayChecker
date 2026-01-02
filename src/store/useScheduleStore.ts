import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Shift, JobConfig } from '../types';

interface ScheduleState {
  shifts: Shift[];
  jobConfigs: JobConfig[];
  holidays: string[]; // ['2024-01-01', ...]
  
  addShift: (shift: Shift) => void;
  updateShift: (id: string, shift: Partial<Shift>) => void;
  removeShift: (id: string) => void;
  addHoliday: (date: string) => void;
  removeHoliday: (date: string) => void;
  updateJobConfig: (id: string, config: Partial<JobConfig>) => void;
  addJobConfig: (config: JobConfig) => void;
  removeJobConfig: (id: string) => void;
}

const DEFAULT_JOB_CONFIGS: JobConfig[] = [
  {
    id: 'RA',
    name: 'RA',
    color: 'blue',
    defaultHours: {
      weekday: 2,
      weekend: 4,
    },
    hourlyRates: {
      weekday: 25,
      saturday: 30,
      sunday: 35,
      holiday: 40,
    },
  },
  {
    id: 'STF',
    name: 'STF',
    color: 'emerald',
    defaultHours: {
      weekday: 7.5,
      weekend: 7.5,
    },
    hourlyRates: {
      weekday: 30,
      saturday: 37.5,
      sunday: 45,
      holiday: 52.5,
    },
  },
];

export const useScheduleStore = create<ScheduleState>()(
  persist(
    (set) => ({
      shifts: [],
      jobConfigs: DEFAULT_JOB_CONFIGS,
      holidays: [],

      // Allow multiple jobs per day, but replace if same date + same type
      addShift: (shift) => set((state) => ({ 
        shifts: [
          ...state.shifts.filter(s => !(s.date === shift.date && s.type === shift.type)), 
          shift
        ]
      })),
      updateShift: (id, updatedShift) => set((state) => ({
        shifts: state.shifts.map((s) => (s.id === id ? { ...s, ...updatedShift } : s)),
      })),
      removeShift: (id) => set((state) => ({
        shifts: state.shifts.filter((s) => s.id !== id),
      })),
      addHoliday: (date) => set((state) => ({ holidays: [...state.holidays, date] })),
      removeHoliday: (date) => set((state) => ({ holidays: state.holidays.filter((d) => d !== date) })),
      updateJobConfig: (id, config) => set((state) => ({
        jobConfigs: state.jobConfigs.map((j) => (j.id === id ? { ...j, ...config } : j)),
      })),
      addJobConfig: (config) => set((state) => ({
        jobConfigs: [...state.jobConfigs, config],
      })),
      removeJobConfig: (id) => set((state) => ({
        jobConfigs: state.jobConfigs.filter((j) => j.id !== id),
        shifts: state.shifts.filter((s) => s.type !== id), // Also remove shifts for this job
      })),
    }),
    {
      name: 'paychecker-storage',
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
