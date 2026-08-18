import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export async function signInAdmin(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error;
}

export async function signOutAdmin() {
  const { error } = await supabase.auth.signOut();
  return error;
}

// Tracks whether a Supabase session is currently active. Being logged in at
// all is treated as "is admin" — RLS policies are the real gate (only the
// one admin account can write to protected tables), this hook just drives
// which controls the UI shows.
export function useAdminSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return { session, isAdmin: !!session, loading };
}
