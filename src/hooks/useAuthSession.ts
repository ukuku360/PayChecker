// src/hooks/useAuthSession.ts
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { useScheduleStore } from '../store/useScheduleStore';

export const useAuthSession = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { fetchData, clearData, setUserId } = useScheduleStore();

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const { data: { user }, error: userError } = await supabase.auth.getUser(session.access_token);
           if (userError || !user) {
            const shouldClearSession =
              userError?.status === 401 ||
              userError?.status === 403 ||
              /jwt|invalid|expired/i.test(userError?.message ?? '');

            if (shouldClearSession) {
              console.warn('Invalid session detected, clearing local auth:', userError);
              await supabase.auth.signOut({ scope: 'local' });
              setSession(null);
              setUserId(null); // Ensure store knows user is gone
              clearData();
              setLoading(false);
              return;
            }

            console.warn('Session validation failed, keeping local session:', userError);
          }
        }

        setSession(session);
        if (session?.user) {
          setUserId(session.user.id);
          fetchData(session.user.id).catch(err => console.error('Background fetch failed:', err));
        }
      } catch (error) {
        console.error('Error initializing session:', error);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      if (session?.user) {
        setUserId(session.user.id);
        fetchData(session.user.id).catch(err => console.error('Background fetch failed:', err));
        setLoading(false); 
      } else {
        setUserId(null); // Ensure store knows user is gone
        clearData();
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchData, clearData, setUserId]);

  const logout = async () => {
    clearData();
    setUserId(null); // Ensure store knows user is gone
    setSession(null); // Force immediate UI update
    await supabase.auth.signOut();
  };

  return { session, loading, logout };
};
