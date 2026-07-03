-- SR Finance Database Schema - Migration 002
-- Adds new columns for additional fields across leads, customers, and loan_applications
-- Run this after 001_init.sql

-- ============================================
-- LEADS TABLE - Add new columns
-- ============================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS residence_address TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS office_address TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cibil_score TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS purchase_value TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sale_deed_amount TEXT;

-- ============================================
-- CUSTOMERS TABLE - Add new columns
-- ============================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS residence_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS office_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS cibil_score TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS purchase_value TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sale_deed_amount TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS co_applicants JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- LOAN APPLICATIONS TABLE - Add new columns
-- ============================================
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS residence_address TEXT;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS office_address TEXT;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS cibil_score TEXT;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS purchase_value TEXT;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS sale_deed_amount TEXT;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS co_applicants JSONB DEFAULT '[]'::jsonb;
