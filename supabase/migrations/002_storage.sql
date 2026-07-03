-- ============================================
-- Storage Bucket Reference (for tracking uploaded files)
-- ============================================

-- Create a table to track uploaded files and their metadata
CREATE TABLE IF NOT EXISTS uploaded_files (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  file_key TEXT NOT NULL,
  url TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  compressed BOOLEAN NOT NULL DEFAULT false,
  entity_type TEXT, -- e.g., 'customer', 'application', 'lead'
  entity_id TEXT,   -- e.g., the customer/application/lead id
  uploaded_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for looking up files by entity
CREATE INDEX IF NOT EXISTS idx_uploaded_files_entity ON uploaded_files(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_by ON uploaded_files(uploaded_by);

-- Enable RLS
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON uploaded_files FOR ALL USING (true);

-- NOTE: The actual S3 bucket must be created manually via:
-- 1. Supabase Dashboard → Storage → Create bucket "documents" (public)
-- 2. Or via SQL: 
--    insert into storage.buckets (id, name, public) values ('documents', 'documents', true);
--    
-- The bucket name should match the S3_BUCKET env variable in .env.local

-- ============================================
-- Add stored_files column to existing tables
-- ============================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS stored_files JSONB DEFAULT '[]'::jsonb;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS stored_files JSONB DEFAULT '[]'::jsonb;
