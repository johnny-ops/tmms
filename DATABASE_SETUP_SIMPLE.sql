-- GOVSERVE TMMS Database Schema - Simple Version
-- Run this SQL in Supabase SQL Editor

-- ============================================
-- Step 1: Create basic tables (no foreign keys)
-- ============================================

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'VIEWER',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Operators
CREATE TABLE IF NOT EXISTS operators (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  contact_number TEXT,
  email TEXT,
  address TEXT,
  organization TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drivers
CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  license_number TEXT UNIQUE NOT NULL,
  contact_number TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routes
CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  distance_km DECIMAL(10, 2),
  estimated_time_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  plate_number TEXT UNIQUE NOT NULL,
  vehicle_type TEXT NOT NULL,
  operator_id TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspections
CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  inspector_name TEXT NOT NULL,
  inspection_date DATE NOT NULL,
  result TEXT NOT NULL,
  notes TEXT,
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registrations
CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  registration_number TEXT UNIQUE NOT NULL,
  registration_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status TEXT NOT NULL,
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Franchises
CREATE TABLE IF NOT EXISTS franchises (
  id TEXT PRIMARY KEY,
  operator_id TEXT NOT NULL,
  franchise_number TEXT UNIQUE NOT NULL,
  route_id TEXT,
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT UNIQUE NOT NULL,
  vehicle_id TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  violation_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  fine_amount DECIMAL(10, 2),
  status TEXT NOT NULL DEFAULT 'ISSUED',
  evidence_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parking Areas
CREATE TABLE IF NOT EXISTS parking_areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  total_slots INTEGER NOT NULL DEFAULT 0,
  occupied_slots INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  hourly_rate DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parking Slots
CREATE TABLE IF NOT EXISTS parking_slots (
  id TEXT PRIMARY KEY,
  parking_area_id TEXT NOT NULL,
  slot_number TEXT NOT NULL,
  slot_status TEXT NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parking_area_id, slot_number)
);

-- Terminals
CREATE TABLE IF NOT EXISTS terminals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  route_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Detections
CREATE TABLE IF NOT EXISTS ai_detections (
  id TEXT PRIMARY KEY,
  camera_id TEXT NOT NULL,
  detection_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  plate_number TEXT,
  vehicle_type TEXT,
  confidence DECIMAL(5, 4),
  evidence_frame TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Step 2: Add missing columns to existing tables
-- ============================================

-- Add document_url to inspections if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inspections' AND column_name = 'document_url'
  ) THEN
    ALTER TABLE inspections ADD COLUMN document_url TEXT;
  END IF;
END $$;

-- Add route_id to terminals if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'terminals' AND column_name = 'route_id'
  ) THEN
    ALTER TABLE terminals ADD COLUMN route_id TEXT;
  END IF;
END $$;

-- ============================================
-- Step 3: Enable Row Level Security
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_detections ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 4: Create RLS Policies (Allow all for authenticated users)
-- ============================================

-- Helper function to create all policies for a table
CREATE OR REPLACE FUNCTION create_policies_for_table(table_name TEXT) 
RETURNS VOID AS $$
BEGIN
  EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated access" ON %I', table_name);
  EXECUTE format('CREATE POLICY "Allow authenticated access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', table_name);
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
SELECT create_policies_for_table('profiles');
SELECT create_policies_for_table('operators');
SELECT create_policies_for_table('drivers');
SELECT create_policies_for_table('routes');
SELECT create_policies_for_table('vehicles');
SELECT create_policies_for_table('inspections');
SELECT create_policies_for_table('registrations');
SELECT create_policies_for_table('franchises');
SELECT create_policies_for_table('tickets');
SELECT create_policies_for_table('parking_areas');
SELECT create_policies_for_table('parking_slots');
SELECT create_policies_for_table('terminals');
SELECT create_policies_for_table('ai_detections');

-- Drop helper function
DROP FUNCTION create_policies_for_table(TEXT);

-- ============================================
-- Success!
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Database setup complete!';
END $$;
