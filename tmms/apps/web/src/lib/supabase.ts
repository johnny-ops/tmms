import { createClient } from '@supabase/supabase-js';

// ─── Supabase Configuration ────────────────────────────────────────────────
// Credentials are hardcoded here so developers don't need to manage .env files
// for Supabase. Only the AI service URL needs to be configured via .env.
// Project: GOVSERVE TMMS | https://repaixqtxgoynmlrpibi.supabase.co
const SUPABASE_URL = 'https://repaixqtxgoynmlrpibi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcGFpeHF0eGdveW5tbHJwaWJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODc0NjMsImV4cCI6MjEwMTg2MzQ2M30.1UyStSSVda_KaotUdvn6O5WbCECdygPN8_QsTs7wFPU';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

export default supabase;
