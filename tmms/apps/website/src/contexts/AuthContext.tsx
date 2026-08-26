import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserProfile, UserRole } from '@/types';

interface AuthContextValue {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  hasPermission: (requiredRoles: UserRole[]) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Normalize raw DB role strings to our internal UserRole enum */
function normalizeRole(raw: string | undefined): UserRole {
  if (!raw) return 'STAFF';
  const upper = raw.toUpperCase();
  if (upper === 'ADMIN' || upper === 'SUPER_ADMIN') return 'ADMIN';
  if (upper === 'STAFF' || upper === 'TRAFFIC_ENFORCER') return 'STAFF';
  if (upper === 'OPERATOR') return 'OPERATOR';
  if (upper === 'DRIVER') return 'DRIVER';
  return 'STAFF';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSupaUser, setCurrentSupaUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setCurrentSupaUser(session.user);
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          setCurrentSupaUser(session.user);
          await fetchProfile(session.user);
        } else {
          setCurrentSupaUser(null);
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(supaUser: User) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supaUser.id)
        .maybeSingle();

      // Determine role from metadata first (which is accurate from registration), then fallback to profile
      const rawRole = supaUser.user_metadata?.role ?? data?.role;
      const role = normalizeRole(rawRole);

      let driver_id = data?.driver_id;
      let operator_id = data?.operator_id;

      // Link driver record if missing
      if (role === 'DRIVER' && !driver_id) {
        const { data: dData } = await supabase
          .from('drivers')
          .select('id')
          .eq('profile_id', supaUser.id)
          .maybeSingle();
        if (dData) driver_id = dData.id;
        else {
          // Fallback: grab first driver (demo mode)
          const { data: fallback } = await supabase.from('drivers').select('id').limit(1).maybeSingle();
          if (fallback) driver_id = fallback.id;
        }
        // Persist link in profile
        if (driver_id && data) {
          await supabase.from('profiles').update({ driver_id }).eq('id', supaUser.id);
        }
      }

      // Link operator record if missing
      if (role === 'OPERATOR' && !operator_id) {
        const { data: oData } = await supabase
          .from('operators')
          .select('id')
          .eq('profile_id', supaUser.id)
          .maybeSingle();
        if (oData) operator_id = oData.id;
        else {
          const { data: fallback } = await supabase.from('operators').select('id').limit(1).maybeSingle();
          if (fallback) operator_id = fallback.id;
        }
        if (operator_id && data) {
          await supabase.from('profiles').update({ operator_id }).eq('id', supaUser.id);
        }
      }

      if (error || !data) {
        // No profile row yet — use metadata fallback (happens right after signup before trigger runs)
        const fallbackProfile: UserProfile = {
          id: supaUser.id,
          email: supaUser.email ?? '',
          full_name: supaUser.user_metadata?.full_name ?? supaUser.email ?? '',
          role,
          is_active: true,
          driver_id,
          operator_id,
          created_at: supaUser.created_at,
        };
        setUser(fallbackProfile);
      } else {
        setUser({
          ...data as UserProfile,
          role,
          driver_id,
          operator_id,
        });
      }
    } catch (e) {
      console.error('Exception fetching profile', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function refreshProfile() {
    if (currentSupaUser) await fetchProfile(currentSupaUser);
  }

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  function hasPermission(requiredRoles: UserRole[]): boolean {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return requiredRoles.includes(user.role);
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, isDemoMode: false, signIn, signOut, hasPermission, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
