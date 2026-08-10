-- ============================================================
-- MARK EXISTING MIGRATIONS AS APPLIED
-- Generated: 2026-04-15
-- Purpose: The baseline owns the historical schema. The active tree keeps
--          39 no-op stubs so remote history can be reconciled normally.
--          Do not pre-register those versions here: Supabase executes the
--          stubs during reset and records each version after it succeeds.
-- ============================================================

-- Ensure the schema_migrations table exists (Supabase manages this)
CREATE SCHEMA IF NOT EXISTS supabase_migrations;

CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
  version VARCHAR(255) NOT NULL,
  statements TEXT[],
  name VARCHAR(255),
  PRIMARY KEY (version)
);

-- No historical versions are pre-registered here. The active no-op stubs
-- execute after this marker and the Supabase runner records them normally.

-- ============================================================
-- DOWN
-- This migration only ensures that Supabase's migration-history table exists.
-- Do not drop or delete that table during rollback: doing so would destroy
-- runner-owned history rather than revert application schema or data.
-- ============================================================

-- ============================================================
-- END OF MIGRATION MARKING
-- ============================================================
