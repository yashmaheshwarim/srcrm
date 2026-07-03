-- SR Finance Database Schema - Migration 003
-- Adds new columns for property address, scheme name, date, and completion status
-- Run this after 002_add_new_columns.sql

-- ============================================
-- CUSTOMERS TABLE - Add new columns
-- ============================================
ALTER TABLE customers ADD COLUMN IF NOT EXISTS property_address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS scheme_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS date_added TEXT;

-- ============================================
-- LOAN APPLICATIONS TABLE - Add new columns
-- ============================================
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS property_address TEXT;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS scheme_name TEXT;
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS completion_status TEXT DEFAULT 'pending' CHECK (completion_status IN ('pending', 'completed'));
