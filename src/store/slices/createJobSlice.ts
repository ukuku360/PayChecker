import type { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabaseClient';
import type { JobConfig } from '../../types';
import type { ShiftSlice } from './createShiftSlice';
import type { UserSlice } from './createUserSlice';

export interface JobSlice {
  jobConfigs: JobConfig[];
  addJobConfig: (config: JobConfig) => Promise<void>;
  updateJobConfig: (id: string, config: Partial<JobConfig>) => Promise<void>;
  removeJobConfig: (id: string) => Promise<void>;
}

// Ensure `set` has access to other slices if needed, hence the generic text if using combined state
// but here we might need to cast or define dependencies in the generic.
// Using simple StateCreator with manual dependency handling is safer for now.

export const createJobSlice: StateCreator<JobSlice & ShiftSlice & UserSlice, [], [], JobSlice> = (set, get) => ({
  jobConfigs: [],

  addJobConfig: async (config) => {
    set((state) => ({
      jobConfigs: [...state.jobConfigs, config],
    }));

    let userId = get().userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (userId) {
      const { error } = await supabase.from('job_configs').insert({
        user_id: userId,
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
        default_break_minutes: config.defaultBreakMinutes || null,
        default_start_time: config.defaultStartTime || null,
        default_end_time: config.defaultEndTime || null,
      });
      if (error) console.error('Error adding job config:', error);
    }
  },

  updateJobConfig: async (id, config) => {
    set((state) => ({
      jobConfigs: state.jobConfigs.map((j) => (j.id === id ? { ...j, ...config } : j)),
    }));

    let userId = get().userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (userId) {
      const state = get();
      const fullConfig = state.jobConfigs.find((j) => j.id === id);
      if (!fullConfig) return;

      const { error } = await supabase
        .from('job_configs')
        .update({
          name: fullConfig.name,
          color: fullConfig.color,
          default_hours_weekday: fullConfig.defaultHours.weekday,
          default_hours_weekend: fullConfig.defaultHours.weekend,
          hourly_rate_weekday: fullConfig.hourlyRates.weekday,
          hourly_rate_saturday: fullConfig.hourlyRates.saturday,
          hourly_rate_sunday: fullConfig.hourlyRates.sunday,
          hourly_rate_holiday: fullConfig.hourlyRates.holiday,
          rate_history: fullConfig.rateHistory,
          default_break_minutes: fullConfig.defaultBreakMinutes || null,
          default_start_time: fullConfig.defaultStartTime || null,
          default_end_time: fullConfig.defaultEndTime || null,
        })
        .eq('config_id', id)
        .eq('user_id', userId);
      if (error) console.error('Error updating job config:', error);
    }
  },

  removeJobConfig: async (id) => {
    set((state) => ({
      jobConfigs: state.jobConfigs.filter((j) => j.id !== id),
      shifts: state.shifts.filter((s) => s.type !== id),
    }));

    let userId = get().userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (userId) {
      // Delete all shifts with this job type first
      const { error: shiftError } = await supabase
        .from('shifts')
        .delete()
        .eq('type', id)
        .eq('user_id', userId);
      if (shiftError) console.error('Error deleting related shifts:', shiftError);

      // Then delete the job config
      const { error: configError } = await supabase
        .from('job_configs')
        .delete()
        .eq('config_id', id);
      if (configError) console.error('Error deleting job config:', configError);
    }
  },
});
