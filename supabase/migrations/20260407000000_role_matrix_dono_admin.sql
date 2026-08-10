-- Historical migration stub retained for Supabase remote-history parity.
-- The complete schema/data represented by this version is captured by
-- 00000000000000_baseline_legacy_schema.sql and marked applied by
-- 00000000000001_mark_existing_migrations_applied.sql.
-- Keep this versioned filename so preview branches can reconcile history.

-- UP: intentionally empty; the baseline owns this historical migration.
SELECT 1;

-- DOWN
-- No-op by design: rollback boundary is the baseline/PITR, not this history stub.
SELECT 1;
