-- SR Finance Database Schema - Migration 004
-- Adds emi_amount column to loan_applications table
-- Run this after 003_add_new_fields.sql

-- ============================================
-- LOAN APPLICATIONS TABLE - Add new columns
-- ============================================
ALTER TABLE loan_applications ADD COLUMN IF NOT EXISTS emi_amount TEXT;
