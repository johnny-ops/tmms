import { createClient } from '@supabase/supabase-js';

// Hardcoded Supabase configuration to avoid .env issues
const supabaseUrl = 'https://repaixqtxgoynmlrpibi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlcGFpeHF0eGdveW5tbHJwaWJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODc0NjMsImV4cCI6MjEwMTg2MzQ2M30.1UyStSSVda_KaotUdvn6O5WbCECdygPN8_QsTs7wFPU';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce' // Use PKCE flow for better security
    }
  }
);

export default supabase;
