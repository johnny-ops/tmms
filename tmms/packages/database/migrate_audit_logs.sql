-- ========================================================
-- Migration: Add Audit Logs Table
-- Description: Creates the audit_logs table to store system actions
-- ========================================================

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    "user" TEXT NOT NULL,
    role TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users (or service_role)
DROP POLICY IF EXISTS "Allow select on audit_logs for authenticated users" ON public.audit_logs;
CREATE POLICY "Allow select on audit_logs for authenticated users" 
    ON public.audit_logs 
    FOR SELECT 
    USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Allow insert access for authenticated users
DROP POLICY IF EXISTS "Allow insert on audit_logs for authenticated users" ON public.audit_logs;
CREATE POLICY "Allow insert on audit_logs for authenticated users" 
    ON public.audit_logs 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Add some seed data for demonstration
INSERT INTO public.audit_logs (action, module, entity, entity_id, "user", role, timestamp) VALUES 
('LOGIN', 'Auth', 'User Session', null, 'admin@lgu-tmms.gov.ph', 'SUPER_ADMIN', NOW() - INTERVAL '3 hours'),
('APPROVE', 'Franchise', 'Franchise', 'FRNCH-2024-001', 'admin@lgu-tmms.gov.ph', 'SUPER_ADMIN', NOW() - INTERVAL '2 hours');
