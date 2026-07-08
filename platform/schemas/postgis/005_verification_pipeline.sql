-- Data verification pipeline — user submissions never auto-publish

CREATE TABLE IF NOT EXISTS data_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_type TEXT NOT NULL CHECK (submission_type IN (
    'place', 'address', 'entrance', 'road', 'business', 'correction', 'feedback'
  )),
  payload JSONB NOT NULL,
  submitter_id TEXT,
  submitter_role TEXT CHECK (submitter_role IN ('driver', 'customer', 'admin', 'merchant', 'api')),
  gps_geom GEOMETRY(Point, 4326),
  gps_accuracy_m REAL,
  gps_captured_at TIMESTAMPTZ,
  status flipwi_verification_status DEFAULT 'pending',
  ai_confidence_score REAL,
  ai_flags JSONB DEFAULT '[]',
  reviewer_id TEXT,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  production_record_id UUID,
  production_table TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification_audit (
  id BIGSERIAL PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES data_submissions(id),
  from_status flipwi_verification_status,
  to_status flipwi_verification_status NOT NULL,
  actor_id TEXT,
  actor_type TEXT CHECK (actor_type IN ('system', 'ai', 'admin')),
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conflict_resolution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  osm_sync_version_id UUID REFERENCES dataset_versions(id),
  conflict_type TEXT NOT NULL CHECK (conflict_type IN (
    'osm_deleted', 'osm_moved', 'name_changed', 'geometry_changed', 'duplicate'
  )),
  proprietary_table TEXT NOT NULL,
  proprietary_id UUID NOT NULL,
  osm_id BIGINT,
  resolution TEXT CHECK (resolution IN ('keep_proprietary', 'merge_osm', 'manual_review', 'pending')),
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON data_submissions (status);
CREATE INDEX IF NOT EXISTS idx_submissions_type ON data_submissions (submission_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_audit_sub ON verification_audit (submission_id);
CREATE INDEX IF NOT EXISTS idx_conflict_pending ON conflict_resolution (resolution) WHERE resolution = 'pending';

-- Trigger: log status transitions
CREATE OR REPLACE FUNCTION log_verification_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO verification_audit (submission_id, from_status, to_status, actor_type)
    VALUES (NEW.id, OLD.status, NEW.status, 'system');
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_submission_status ON data_submissions;
CREATE TRIGGER trg_submission_status
  BEFORE UPDATE ON data_submissions
  FOR EACH ROW EXECUTE FUNCTION log_verification_transition();
