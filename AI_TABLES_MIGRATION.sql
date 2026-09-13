-- =====================================================================
-- TMMS AI Tables Migration
-- Run this in your Supabase SQL Editor AFTER running DATABASE_SETUP.sql
-- =====================================================================

-- ============================================
-- 1. AI VIOLATION CANDIDATES
--    Stores raw AI detections awaiting human review.
--    Violations flow: AI_SUGGESTED → VERIFIED (→ ticket) or REJECTED
-- ============================================
CREATE TABLE IF NOT EXISTS ai_violation_candidates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id           TEXT NOT NULL,
  rule_triggered      TEXT NOT NULL CHECK (rule_triggered IN (
                        'BEAT_RED_LIGHT','SWERVING','ILLEGAL_PARKING',
                        'OBSTRUCTION','OVERSPEEDING'
                      )),
  ai_confidence       DECIMAL(5, 4) NOT NULL DEFAULT 0.0,
  location            TEXT,
  plate_number        TEXT,             -- NULL if OCR disabled or plate not found
  ocr_confidence      DECIMAL(5, 4),    -- NULL if OCR not used
  vehicle_type        TEXT,             -- e.g. CAR, MOTORCYCLE, JEEPNEY, TRICYCLE
  track_id            INTEGER,          -- ByteTrack object ID
  violation_reason    TEXT,             -- Human-readable detection reason
  verification_status TEXT NOT NULL CHECK (verification_status IN (
                        'AI_SUGGESTED','VERIFIED','REJECTED'
                      )) DEFAULT 'AI_SUGGESTED',
  evidence_image_url  TEXT,             -- Supabase storage URL of annotated frame
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns to existing table (safe to run on existing data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_violation_candidates' AND column_name = 'vehicle_type'
  ) THEN
    ALTER TABLE ai_violation_candidates ADD COLUMN vehicle_type TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_violation_candidates' AND column_name = 'track_id'
  ) THEN
    ALTER TABLE ai_violation_candidates ADD COLUMN track_id INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_violation_candidates' AND column_name = 'ocr_confidence'
  ) THEN
    ALTER TABLE ai_violation_candidates ADD COLUMN ocr_confidence DECIMAL(5,4);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_violation_candidates' AND column_name = 'violation_reason'
  ) THEN
    ALTER TABLE ai_violation_candidates ADD COLUMN violation_reason TEXT;
  END IF;
END $$;

-- ============================================
-- 2. CAMERA CONFIGS
--    Per-camera violation zone/line configuration.
--    Updated via the AI service API and loaded on camera start.
-- ============================================
CREATE TABLE IF NOT EXISTS camera_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id       TEXT UNIQUE NOT NULL,
  camera_name     TEXT,
  camera_location TEXT,
  violation_lines JSONB NOT NULL DEFAULT '[]'::jsonb,
  violation_zones JSONB NOT NULL DEFAULT '[]'::jsonb,
  speed_config    JSONB NOT NULL DEFAULT '{}'::jsonb,
  tl_roi          JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. AI MODEL EVALUATIONS (optional tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_model_evaluations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name        TEXT NOT NULL,
  model_path        TEXT,
  model_type        TEXT NOT NULL CHECK (model_type IN ('PRETRAINED_COCO', 'CUSTOM_PH_TRAFFIC', 'PLATE_DETECTOR')),
  map50             DECIMAL(6,4),
  map50_95          DECIMAL(6,4),
  precision         DECIMAL(6,4),
  recall            DECIMAL(6,4),
  f1_score          DECIMAL(6,4),
  per_class_metrics JSONB,
  epochs_trained    INTEGER,
  training_images   INTEGER,
  val_images        INTEGER,
  notes             TEXT,
  evaluated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE ai_violation_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE camera_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_evaluations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- ai_violation_candidates: authenticated + anon (AI service uses anon key)
DROP POLICY IF EXISTS "Allow authenticated access" ON ai_violation_candidates;
CREATE POLICY "Allow authenticated access"
  ON ai_violation_candidates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon insert" ON ai_violation_candidates;
CREATE POLICY "Allow anon insert"
  ON ai_violation_candidates FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon select" ON ai_violation_candidates;
CREATE POLICY "Allow anon select"
  ON ai_violation_candidates FOR SELECT TO anon
  USING (true);

-- camera_configs
DROP POLICY IF EXISTS "Allow authenticated access" ON camera_configs;
CREATE POLICY "Allow authenticated access"
  ON camera_configs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon access" ON camera_configs;
CREATE POLICY "Allow anon access"
  ON camera_configs FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- ai_model_evaluations
DROP POLICY IF EXISTS "Allow authenticated access" ON ai_model_evaluations;
CREATE POLICY "Allow authenticated access"
  ON ai_model_evaluations FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ai_violations_camera_id
  ON ai_violation_candidates(camera_id);
CREATE INDEX IF NOT EXISTS idx_ai_violations_status
  ON ai_violation_candidates(verification_status);
CREATE INDEX IF NOT EXISTS idx_ai_violations_rule
  ON ai_violation_candidates(rule_triggered);
CREATE INDEX IF NOT EXISTS idx_ai_violations_created
  ON ai_violation_candidates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_camera_configs_camera_id
  ON camera_configs(camera_id);

DO $$
BEGIN
  RAISE NOTICE 'AI tables migration complete!';
  RAISE NOTICE 'Tables: ai_violation_candidates, camera_configs, ai_model_evaluations';
  RAISE NOTICE 'Next: Create "evidence" bucket in Supabase Storage (Dashboard -> Storage).';
END $$;
