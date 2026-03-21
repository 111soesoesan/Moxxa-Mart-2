-- ============================================================
-- Migration: Drop legacy shops.payment_info column
-- Date: 2026-03-21
--
-- Payment data is now exclusively managed via the payment_methods
-- table (created in migration 20260315000000). The JSONB column
-- payment_info on shops is unused and superseded.
-- ============================================================

ALTER TABLE public.shops DROP COLUMN IF EXISTS payment_info;
