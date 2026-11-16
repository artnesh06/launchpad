-- No-op.
-- This migration originally created the "SnapshotJob" table. Because its folder
-- name has no timestamp it sorts after every dated migration, while
-- 20260106033101_add_phase_index already drops "SnapshotJob" and the model is
-- no longer in schema.prisma. Creating the table here would only leave an
-- orphan table on fresh databases, so it is intentionally empty.
SELECT 1;
