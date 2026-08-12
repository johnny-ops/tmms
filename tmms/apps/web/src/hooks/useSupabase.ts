/**
 * useTable — a generic hook that fetches a Supabase table
 * and falls back to demo data when running without credentials.
 *
 * Usage:
 *   const { data: vehicles, loading, error, refetch } = useTable('vehicles');
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useTable<T = any>(
  table: string,
  _unusedFallback?: T[], // Kept for backwards compatibility with existing component signatures temporarily, will be ignored
  options?: {
    select?: string;
    orderBy?: string;
    ascending?: boolean;
    filter?: { column: string; value: any };
  }
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from(table).select(options?.select ?? '*');
      if (options?.filter) {
        query = query.eq(options.filter.column, options.filter.value);
      }
      if (options?.orderBy) {
        query = query.order(options.orderBy, { ascending: options?.ascending ?? true });
      }
      const { data: rows, error: err } = await query;
      if (err) {
        console.error(`[useTable:${table}] error:`, err.message);
        setError(err.message);
        setData([]);
      } else {
        setData((rows ?? []) as T[]);
      }
    } catch (e: any) {
      console.error(`[useTable:${table}] exception:`, e.message);
      setError(e.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [table]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch, isConnected: true };
}

/**
 * useRealtime — subscribes to INSERT events on a Supabase table.
 * Calls onInsert() with the new row payload.
 */
export function useRealtime<T = any>(
  table: string,
  onInsert?: (row: T) => void,
  onUpdate?: (row: T) => void,
  onDelete?: (row: T) => void
) {
  useEffect(() => {

    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          if (payload.eventType === 'INSERT' && onInsert) {
            onInsert(payload.new as T);
          }
          if (payload.eventType === 'UPDATE' && onUpdate) {
            onUpdate(payload.new as T);
          }
          if (payload.eventType === 'DELETE' && onDelete) {
            onDelete(payload.old as T);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [table]);
}
