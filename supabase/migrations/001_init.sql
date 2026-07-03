-- SR Finance Database Schema
-- Run this SQL in your Supabase SQL Editor to initialize the database

-- ============================================
-- USERS TABLE (admin, jobber, partner roles)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  mobile_number TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'jobber', 'partner')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- LEADS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT,
  residence_address TEXT,
  office_address TEXT,
  purpose_of_loan TEXT,
  loan_category TEXT NOT NULL DEFAULT '',
  required_amount TEXT NOT NULL DEFAULT '',
  cibil_score TEXT,
  purchase_value TEXT,
  sale_deed_amount TEXT,
  lead_source TEXT NOT NULL DEFAULT '',
  assigned_to TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'new',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transferred_from TEXT REFERENCES users(id),
  transferred_to TEXT REFERENCES users(id),
  transfer_status TEXT CHECK (transfer_status IN ('pending', 'accepted', 'rejected'))
);

-- ============================================
-- CUSTOMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  full_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  address TEXT NOT NULL DEFAULT '',
  residence_address TEXT,
  office_address TEXT,
  pan_number TEXT NOT NULL DEFAULT '',
  aadhaar_number TEXT NOT NULL DEFAULT '',
  employment_type TEXT NOT NULL DEFAULT 'Salaried',
  monthly_income TEXT NOT NULL DEFAULT '',
  existing_liabilities TEXT NOT NULL DEFAULT '',
  assigned_to TEXT NOT NULL REFERENCES users(id),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  loan_category TEXT,
  purpose_of_loan TEXT,
  has_co_applicant BOOLEAN DEFAULT FALSE,
  co_applicants JSONB DEFAULT '[]'::jsonb,
  cibil_score TEXT,
  purchase_value TEXT,
  sale_deed_amount TEXT,
  documents JSONB DEFAULT '[]'::jsonb
);

-- ============================================
-- LOAN APPLICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS loan_applications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id TEXT NOT NULL DEFAULT '',
  customer_name TEXT NOT NULL DEFAULT '',
  mobile_number TEXT NOT NULL DEFAULT '',
  address TEXT,
  residence_address TEXT,
  office_address TEXT,
  loan_category TEXT NOT NULL,
  purpose_of_loan TEXT,
  lender TEXT NOT NULL,
  requested_amount TEXT NOT NULL,
  cibil_score TEXT,
  purchase_value TEXT,
  sale_deed_amount TEXT,
  approval_amount TEXT,
  interest_rate TEXT,
  tenure TEXT,
  emi_amount TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  assigned_to TEXT NOT NULL REFERENCES users(id),
  documents JSONB DEFAULT '[]'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  application_number TEXT,
  submission_date TEXT,
  disbursement_date TEXT,
  rejection_reason TEXT,
  has_co_applicant BOOLEAN DEFAULT FALSE,
  co_applicants JSONB DEFAULT '[]'::jsonb
);

-- ============================================
-- FOLLOW UPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS follow_ups (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_name TEXT NOT NULL,
  mobile_number TEXT NOT NULL,
  address TEXT,
  purpose_of_loan TEXT,
  lead_id TEXT,
  application_id TEXT,
  type TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  next_follow_up_date TEXT NOT NULL,
  next_follow_up_time TEXT NOT NULL DEFAULT '10:00',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_to TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- AUDIT LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- LENDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS lenders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE
);

-- ============================================
-- SENT EMAILS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sent_emails (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  has_attachment BOOLEAN DEFAULT FALSE,
  image_attachment TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_by TEXT NOT NULL
);

-- ============================================
-- SMS MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sms_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  to_phone TEXT NOT NULL,
  to_name TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent'
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_to ON customers(assigned_to);
CREATE INDEX IF NOT EXISTS idx_loan_applications_assigned_to ON loan_applications(assigned_to);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned_to ON follow_ups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_date ON follow_ups(next_follow_up_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- SEED DATA: Default admin and demo accounts
-- ============================================
INSERT INTO users (id, full_name, email, username, password, mobile_number, role, status)
VALUES
  ('user_admin_1', 'Admin User', 'admin@srcrm.com', 'admin', 'admin123', '9999999999', 'admin', 'active'),
  ('user_jobber_1', 'Jobber User', 'jobber@srcrm.com', 'jobber', 'jobber123', '9876543210', 'jobber', 'active')
ON CONFLICT (username) DO NOTHING;

INSERT INTO lenders (id, name)
VALUES
  ('lender_1', 'HDFC Bank'),
  ('lender_2', 'ICICI Bank'),
  ('lender_3', 'SBI'),
  ('lender_4', 'Axis Bank'),
  ('lender_5', 'Kotak Mahindra')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- Allow public access since the app handles its own authentication
-- via the users table (not Supabase Auth)
-- In production, consider restricting to specific IPs or implementing a proper auth layer
CREATE POLICY "Allow all access" ON users FOR ALL USING (true);
CREATE POLICY "Allow all access" ON leads FOR ALL USING (true);
CREATE POLICY "Allow all access" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all access" ON loan_applications FOR ALL USING (true);
CREATE POLICY "Allow all access" ON follow_ups FOR ALL USING (true);
CREATE POLICY "Allow all access" ON audit_logs FOR ALL USING (true);
CREATE POLICY "Allow all access" ON lenders FOR ALL USING (true);
CREATE POLICY "Allow all access" ON sent_emails FOR ALL USING (true);
CREATE POLICY "Allow all access" ON sms_messages FOR ALL USING (true);
