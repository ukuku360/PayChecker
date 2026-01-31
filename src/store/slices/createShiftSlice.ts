import type { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabaseClient';
import { toast } from '../useToastStore';
import type { Shift, ShiftTemplate } from '../../types';

export interface ShiftSlice {
  shifts: Shift[];
  copiedShifts: {
    type: string;
    hours: number;
    note?: string;
    startTime?: string;
    endTime?: string;
    breakMinutes?: number;
  }[] | null;
  templates: ShiftTemplate[];

  addShift: (shift: Shift) => Promise<void>;
  addMultipleShifts: (shifts: Shift[]) => Promise<void>;
  updateShift: (id: string, shift: Partial<Shift>) => Promise<void>;
  removeShift: (id: string) => Promise<void>;
  removeShiftsInRange: (startDate: string, endDate: string) => Promise<void>;
  setCopiedShifts: (shifts: { type: string; hours: number }[] | null) => void;
  
  addTemplate: (template: ShiftTemplate) => void;
  removeTemplate: (id: string) => void;
}

import type { UserSlice } from './createUserSlice';

export const createShiftSlice: StateCreator<ShiftSlice & UserSlice, [], [], ShiftSlice> = (set, get) => ({
  shifts: [],
  copiedShifts: null,
  templates: [],

  setCopiedShifts: (shifts) => set({ copiedShifts: shifts }),

  addTemplate: (template) => set((state) => ({ templates: [...state.templates, template] })),
  removeTemplate: (id) => set((state) => ({ templates: state.templates.filter((t) => t.id !== id) })),

  addShift: async (shift) => {
    // Save previous state for rollback
    const previousShifts = get().shifts;

    // Optimistic update
    set((state) => ({
      shifts: [
        ...state.shifts.filter((s) => !(s.date === shift.date && s.type === shift.type)),
        shift,
      ],
    }));

    let userId = get().userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (userId) {
      const { data, error } = await supabase
        .from('shifts')
        .upsert(
          {
            user_id: userId,
            date: shift.date,
            type: shift.type,
            hours: shift.hours,
            note: shift.note,
            start_time: shift.startTime,
            end_time: shift.endTime,
            break_minutes: shift.breakMinutes,
          },
          { onConflict: 'user_id, date, type' }
        )
        .select('id')
        .single();

      if (error) {
        console.error('Error adding shift:', error);
        set({ shifts: previousShifts }); // Rollback
        toast.error('Failed to save shift. Please try again.');
      } else if (data) {
        // Update local state with the actual UUID from database
        set((state) => ({
          shifts: state.shifts.map((s) =>
            s.date === shift.date && s.type === shift.type ? { ...s, id: data.id } : s
          ),
        }));
      }
    }
  },

  addMultipleShifts: async (newShifts) => {
    if (newShifts.length === 0) return;

    // Save previous state for rollback
    const previousShifts = get().shifts;

    // Optimistic update
    set((state) => {
      const existingShiftKeys = new Set(newShifts.map((s) => `${s.date}-${s.type}`));
      const filteredShifts = state.shifts.filter(
        (s) => !existingShiftKeys.has(`${s.date}-${s.type}`)
      );
      return { shifts: [...filteredShifts, ...newShifts] };
    });

    let userId = get().userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (userId) {
      // Bulk upsert to Supabase
      const shiftsToUpsert = newShifts.map((shift) => ({
        user_id: userId,
        date: shift.date,
        type: shift.type,
        hours: shift.hours,
        note: shift.note,
        start_time: shift.startTime,
        end_time: shift.endTime,
        break_minutes: shift.breakMinutes,
      }));

      const { data, error } = await supabase
        .from('shifts')
        .upsert(shiftsToUpsert, { onConflict: 'user_id, date, type' })
        .select('id, date, type');

      if (error) {
        console.error('Error adding multiple shifts:', error);
        // Rollback on error
        set({ shifts: previousShifts });
        toast.error('Failed to save shifts. Changes have been reverted.');
        throw new Error('Failed to save shifts. Changes have been reverted.');
      }

      // Update local state with actual UUIDs from database
      if (data && data.length > 0) {
        set((state) => ({
          shifts: state.shifts.map((s) => {
            const dbShift = data.find((d) => d.date === s.date && d.type === s.type);
            return dbShift ? { ...s, id: dbShift.id } : s;
          }),
        }));
      }
    }
  },

  updateShift: async (id, updatedShift) => {
    const previousShifts = get().shifts;
    set((state) => ({
      shifts: state.shifts.map((s) => (s.id === id ? { ...s, ...updatedShift } : s)),
    }));

    let userId = get().userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (userId) {
      const { error } = await supabase
        .from('shifts')
        .update({
          ...(updatedShift.hours !== undefined && { hours: updatedShift.hours }),
          ...(updatedShift.note !== undefined && { note: updatedShift.note }),
          ...(updatedShift.startTime !== undefined && { start_time: updatedShift.startTime }),
          ...(updatedShift.endTime !== undefined && { end_time: updatedShift.endTime }),
          ...(updatedShift.breakMinutes !== undefined && {
            break_minutes: updatedShift.breakMinutes,
          }),
        })
        .eq('id', id);
      if (error) {
        console.error('Error updating shift:', error);
        set({ shifts: previousShifts }); // Rollback
        toast.error('Failed to update shift. Please try again.');
      }
    }
  },

  removeShift: async (id) => {
    const previousShifts = get().shifts;
    set((state) => ({
      shifts: state.shifts.filter((s) => s.id !== id),
    }));

    let userId = get().userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (userId) {
      const { error } = await supabase.from('shifts').delete().eq('id', id);
      if (error) {
        console.error('Error removing shift:', error);
        set({ shifts: previousShifts }); // Rollback
        toast.error('Failed to delete shift. Please try again.');
      }
    }
  },

  removeShiftsInRange: async (startDate, endDate) => {
    const previousShifts = get().shifts;
    set({
      shifts: previousShifts.filter((s) => s.date < startDate || s.date > endDate),
    });

    let userId = get().userId;
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    }

    if (!userId) return;

    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);
    if (error) {
      console.error('Error removing shifts in range:', error);
      set({ shifts: previousShifts }); // Rollback
      toast.error('Failed to clear shifts. Please try again.');
    }
  },
});
