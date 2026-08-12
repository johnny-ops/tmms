-- GOVSERVE TMMS Database Schema
-- Run this SQL in your Supabase SQL Editor to create/fix all tables

-- ============================================
-- 1. PROFILES TABLE (Users) - Create First
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'TRAFFIC_OFFICER', 'VIEWER')) DEFAULT 'VIEWER',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. OPERATORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS operators (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  contact_number TEXT,
  email TEXT,
  address TEXT,
  organization TEXT,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. DRIVERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  license_number TEXT UNIQUE NOT NULL,
  contact_number TEXT,
  address TEXT,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. ROUTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS routes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  distance_km DECIMAL(10, 2),
  estimated_time_minutes INTEGER,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. VEHICLES TABLE (After operators)
-- ============================================
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  plate_number TEXT UNIQUE NOT NULL,
  vehicle_type TEXT NOT NULL,
  operator_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'FOR_INSPECTION', 'SUSPENDED')) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. INSPECTIONS TABLE (After vehicles)
-- ============================================
CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  inspector_name TEXT NOT NULL,
  inspection_date DATE NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('PASSED', 'FAILED', 'PENDING')),
  notes TEXT,
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add document_url column if table already exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inspections' AND column_name = 'document_url'
  ) THEN
    ALTER TABLE inspections ADD COLUMN document_url TEXT;
  END IF;
END $$;

-- ============================================
-- 7. REGISTRATIONS TABLE (After vehicles)
-- ============================================
CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  registration_number TEXT UNIQUE NOT NULL,
  registration_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'EXPIRING', 'EXPIRED', 'SUSPENDED')),
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. FRANCHISES TABLE (After operators and routes)
-- ============================================
CREATE TABLE IF NOT EXISTS franchises (
  id TEXT PRIMARY KEY,
  operator_id TEXT NOT NULL,
  franchise_number TEXT UNIQUE NOT NULL,
  route_id TEXT,
  issue_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'EXPIRING', 'EXPIRED', 'SUSPENDED')) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. TRAFFIC TICKETS TABLE (After vehicles)
-- ============================================
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  ticket_number TEXT UNIQUE NOT NULL,
  vehicle_id TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  violation_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  fine_amount DECIMAL(10, 2),
  status TEXT NOT NULL CHECK (status IN ('ISSUED', 'PAID', 'CONTESTED', 'CANCELLED', 'UNDER_REVIEW')) DEFAULT 'ISSUED',
  evidence_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. PARKING AREAS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS parking_areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  total_slots INTEGER NOT NULL DEFAULT 0,
  occupied_slots INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE')) DEFAULT 'ACTIVE',
  hourly_rate DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. PARKING SLOTS TABLE (After parking_areas)
-- ============================================
CREATE TABLE IF NOT EXISTS parking_slots (
  id TEXT PRIMARY KEY,
  parking_area_id TEXT NOT NULL,
  slot_number TEXT NOT NULL,
  slot_status TEXT NOT NULL CHECK (slot_status IN ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'OUT_OF_SERVICE')) DEFAULT 'AVAILABLE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parking_area_id, slot_number)
);

-- ============================================
-- 12. TERMINALS TABLE (After routes)
-- ============================================
CREATE TABLE IF NOT EXISTS terminals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE')) DEFAULT 'ACTIVE',
  route_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add route_id column if missing
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
-- 13. AI DETECTIONS TABLE
-- ============================================
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
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE franchises ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE parking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES (Allow authenticated users to access)
-- ============================================

-- Inspections
DROP POLICY IF EXISTS "Allow authenticated read access" ON inspections;
CREATE POLICY "Allow authenticated read access" ON inspections FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert access" ON inspections;
CREATE POLICY "Allow authenticated insert access" ON inspections FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated update access" ON inspections;
CREATE POLICY "Allow authenticated update access" ON inspections FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated delete access" ON inspections;
CREATE POLICY "Allow authenticated delete access" ON inspections FOR DELETE TO authenticated USING (true);

-- Registrations
DROP POLICY IF EXISTS "Allow authenticated read access" ON registrations;
CREATE POLICY "Allow authenticated read access" ON registrations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert access" ON registrations;
CREATE POLICY "Allow authenticated insert access" ON registrations FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated update access" ON registrations;
CREATE POLICY "Allow authenticated update access" ON registrations FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated delete access" ON registrations;
CREATE POLICY "Allow authenticated delete access" ON registrations FOR DELETE TO authenticated USING (true);

-- Parking Areas
DROP POLICY IF EXISTS "Allow authenticated read access" ON parking_areas;
CREATE POLICY "Allow authenticated read access" ON parking_areas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert access" ON parking_areas;
CREATE POLICY "Allow authenticated insert access" ON parking_areas FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated update access" ON parking_areas;
CREATE POLICY "Allow authenticated update access" ON parking_areas FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated delete access" ON parking_areas;
CREATE POLICY "Allow authenticated delete access" ON parking_areas FOR DELETE TO authenticated USING (true);

-- Terminals
DROP POLICY IF EXISTS "Allow authenticated read access" ON terminals;
CREATE POLICY "Allow authenticated read access" ON terminals FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated insert access" ON terminals;
CREATE POLICY "Allow authenticated insert access" ON terminals FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated update access" ON terminals;
CREATE POLICY "Allow authenticated update access" ON terminals FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Allow authenticated delete access" ON terminals;
CREATE POLICY "Allow authenticated delete access" ON terminals FOR DELETE TO authenticated USING (true);

-- Apply same policies to other tables
-- Vehicles
DROP POLICY IF EXISTS "Allow authenticated access" ON vehicles;
CREATE POLICY "Allow authenticated access" ON vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Operators
DROP POLICY IF EXISTS "Allow authenticated access" ON operators;
CREATE POLICY "Allow authenticated access" ON operators FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Drivers
DROP POLICY IF EXISTS "Allow authenticated access" ON drivers;
CREATE POLICY "Allow authenticated access" ON drivers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Routes
DROP POLICY IF EXISTS "Allow authenticated access" ON routes;
CREATE POLICY "Allow authenticated access" ON routes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Franchises
DROP POLICY IF EXISTS "Allow authenticated access" ON franchises;
CREATE POLICY "Allow authenticated access" ON franchises FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tickets
DROP POLICY IF EXISTS "Allow authenticated access" ON tickets;
CREATE POLICY "Allow authenticated access" ON tickets FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Parking Slots
DROP POLICY IF EXISTS "Allow authenticated access" ON parking_slots;
CREATE POLICY "Allow authenticated access" ON parking_slots FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- AI Detections
DROP POLICY IF EXISTS "Allow authenticated access" ON ai_detections;
CREATE POLICY "Allow authenticated access" ON ai_detections FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Profiles
DROP POLICY IF EXISTS "Allow authenticated access" ON profiles;
CREATE POLICY "Allow authenticated access" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- CREATE INDEXES FOR BETTER PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle_id ON inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_registrations_vehicle_id ON registrations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_terminals_route_id ON terminals(route_id);
CREATE INDEX IF NOT EXISTS idx_tickets_vehicle_id ON tickets(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_parking_slots_area_id ON parking_slots(parking_area_id);
CREATE INDEX IF NOT EXISTS idx_franchises_operator_id ON franchises(operator_id);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Database setup complete! All tables, columns, and policies created.';
END $$;
