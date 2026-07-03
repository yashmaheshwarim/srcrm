-- SR Finance Database Schema - Migration 005
-- Adds disbursed_amount column (missing from all previous migrations) and stored_files column
-- Run this after 004_add_loan_fields.sql

-- ============================================
-- LOAN APPLICATIONS TABLE - Add missing columns
-- ============================================
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS disbursed_amount TEXT;

-- stored_files might already exist if 002_storage.sql was already run
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS stored_files JSONB DEFAULT '[]'::jsonb;

-- emi_amount might already exist from 001_init.sql, but ensure it's there
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS emi_amount TEXT;

-- ============================================
-- CUSTOMERS TABLE - Add stored_files column
-- ============================================
-- stored_files might already exist if 002_storage.sql was already run
ALTER TABLE customers ADD COLUMN IF NOT EXISTS stored_files JSONB DEFAULT '[]'::jsonb;
