import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserProfile, UserRole } from '@/types';

// Helper: build display full_name from split fields
function buildFullName(data: any, fallback: string): string {
  if (data?.first_name && data?.last_name) {
    const parts = [data.first_name];
    if (data.middle_name) parts.push(data.middle_name);
    parts.push(data.last_name);
    return parts.join(' ');
  }
  return data?.full_name || fallback;
}

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

/**
 * Normalize raw DB role strings to our internal UserRole enum.
 * DB is the source of truth — metadata is only used as a fallback
 * when a brand-new account has no profile row yet.
 */
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

      // ── SECURITY: DB role is the source of truth ──────────────────────────
      // Only fall back to metadata if profile row doesn't exist yet
      // (i.e., right after signup before the DB trigger runs)
      const rawRole = data?.role ?? supaUser.user_metadata?.role;
      const role = normalizeRole(rawRole);

      // ── SECURITY: Block inactive/suspended accounts ───────────────────────
      if (data && data.is_active === false) {
        await supabase.auth.signOut();
        setUser(null);
        setLoading(false);
        return;
      }

      let driver_id = data?.driver_id ?? null;
      let operator_id = data?.operator_id ?? null;

      // ── Link driver record only if this user IS a driver ─────────────────
      // SECURITY: No fallback to random driver — must belong to this profile_id
      if (role === 'DRIVER' && !driver_id) {
        const { data: dData } = await supabase
          .from('drivers')
          .select('id')
          .eq('profile_id', supaUser.id)
          .maybeSingle();
        if (dData) {
          driver_id = dData.id;
          // Persist link
          if (data) {
            await supabase.from('profiles').update({ driver_id }).eq('id', supaUser.id);
          }
        }
        // REMOVED: dangerous fallback that grabbed first driver in DB
      }

      // ── Link operator record only if this user IS an operator ─────────────
      // SECURITY: No fallback to random operator — must belong to this profile_id
      if (role === 'OPERATOR' && !operator_id) {
        const { data: oData } = await supabase
          .from('operators')
          .select('id')
          .eq('profile_id', supaUser.id)
          .maybeSingle();
        if (oData) {
          operator_id = oData.id;
          // Persist link
          if (data) {
            await supabase.from('profiles').update({ operator_id }).eq('id', supaUser.id);
          }
        }
        // REMOVED: dangerous fallback that grabbed first operator in DB
      }

      if (error || !data) {
        // No profile row yet — use metadata fallback only for brand-new signups
        const meta = supaUser.user_metadata;
        const fallbackProfile: UserProfile = {
          id: supaUser.id,
          email: supaUser.email ?? '',
          full_name: buildFullName(meta, meta?.full_name ?? supaUser.email ?? ''),
          first_name: meta?.first_name ?? '',
          last_name: meta?.last_name ?? '',
          middle_name: meta?.middle_name ?? '',
          role,
          is_active: true,
          driver_id,
          operator_id,
          created_at: supaUser.created_at,
        };
        setUser(fallbackProfile);
      } else {
        const fullName = buildFullName(data, data.full_name ?? '');
        setUser({
          ...data as UserProfile,
          full_name: fullName,
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    // ── SECURITY: Check is_active immediately after login ─────────────────
    if (data?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile && profile.is_active === false) {
        await supabase.auth.signOut();
        return { error: 'Your account has been suspended. Please contact your administrator.' };
      }
    }

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
