// src/hooks/useAuthSession.ts
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { useScheduleStore } from '../store/useScheduleStore';

export const useAuthSession = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { fetchData, clearData, setUserId } = useScheduleStore();

  // Use refs to avoid re-subscribing on every render (Zustand selectors may create new references)
  const fetchDataRef = useRef(fetchData);
  const clearDataRef = useRef(clearData);
  const setUserIdRef = useRef(setUserId);

  // Keep refs up-to-date
  useEffect(() => {
    fetchDataRef.current = fetchData;
    clearDataRef.current = clearData;
    setUserIdRef.current = setUserId;
  });

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
              if (import.meta.env.DEV) console.warn('Invalid session detected, clearing local auth:', userError);
              await supabase.auth.signOut({ scope: 'local' });
              setSession(null);
              setUserIdRef.current(null); // Ensure store knows user is gone
              clearDataRef.current();
              setLoading(false);
              return;
            }

            if (import.meta.env.DEV) console.warn('Session validation failed, keeping local session:', userError);
          }
        }

        setSession(session);
        if (session?.user) {
          setUserIdRef.current(session.user.id);
          fetchDataRef.current(session.user.id).catch(err => {
            if (import.meta.env.DEV) console.error('Background fetch failed:', err);
          });
        } else {
          // Prevent stale persisted auth state from being treated as authenticated
          setUserIdRef.current(null);
          clearDataRef.current();
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error('Error initializing session:', error);
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
        setUserIdRef.current(session.user.id);
        fetchDataRef.current(session.user.id).catch(err => {
          if (import.meta.env.DEV) console.error('Background fetch failed:', err);
        });
        setLoading(false);
      } else {
        setUserIdRef.current(null); // Ensure store knows user is gone
        clearDataRef.current();
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // Empty dependency array - subscription created once

  const logout = async () => {
    clearData();
    setUserId(null); // Ensure store knows user is gone
    setSession(null); // Force immediate UI update
    await supabase.auth.signOut();
  };

  return { session, loading, logout };
};
