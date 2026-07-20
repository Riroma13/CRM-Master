-- Reporting & Analytics: Partition Management
--
-- Raw SQL to partition analytics_datasets by RANGE (window_start).
-- Applied manually AFTER Prisma migration creates the logical schema.
--
-- Prisma does not support PARTITION BY, so the actual partitioned tables
-- are created here. The Prisma schema serves as logical definition only.
--
-- Apply:
--   psql $DATABASE_URL -f packages/database/scripts/reporting-partitions.sql
--
-- Rollback:
--   DROP TABLE IF EXISTS analytics_datasets CASCADE;
--   DROP TABLE IF EXISTS analytics_snapshots CASCADE;
--   DROP TABLE IF EXISTS report_executions CASCADE;

-- ─── 1. Replace analytics_datasets with partitioned table ────────────

-- Drop the unpartitioned table created by Prisma migration
-- (only if no data yet — in production, this requires a migration strategy)
-- DROP TABLE IF EXISTS analytics_datasets CASCADE;

-- WARNING: In production, you must migrate data:
--   1. CREATE TABLE analytics_datasets_new (LIKE analytics_datasets INCLUDING ALL)
--      PARTITION BY RANGE (window_start);
--   2. Attach existing partitions
--   3. INSERT INTO analytics_datasets_new SELECT * FROM analytics_datasets;
--   4. DROP TABLE analytics_datasets;
--   5. ALTER TABLE analytics_datasets_new RENAME TO analytics_datasets;
--   6. Recreate indexes and constraints.

-- Partitioned table definition (for new deployments):
-- CREATE TABLE analytics_datasets (
--     "id" TEXT NOT NULL,
--     "tenant_id" TEXT NOT NULL,
--     "dataset_name" TEXT NOT NULL,
--     "metric_name" TEXT NOT NULL,
--     "granularity" TEXT NOT NULL,
--     "window_start" TIMESTAMP(3) NOT NULL,
--     "value" DOUBLE PRECISION NOT NULL,
--     "dimensions" JSONB NOT NULL DEFAULT '{}',
--     "updated_at" TIMESTAMP(3) NOT NULL,
-- ) PARTITION BY RANGE (window_start);

-- ═══════════════════════════════════════════════════════════════════════
-- Monthly partitions for analytics_datasets
-- ═══════════════════════════════════════════════════════════════════════

-- Create default partition for data before any managed partition
-- CREATE TABLE analytics_datasets_default
--     PARTITION OF analytics_datasets
--     FOR VALUES FROM (MINVALUE) TO ('2026-01-01');

-- Example: 2026 monthly partitions
-- CREATE TABLE analytics_datasets_2026_01
--     PARTITION OF analytics_datasets
--     FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
-- CREATE TABLE analytics_datasets_2026_02
--     PARTITION OF analytics_datasets
--     FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- ... repeat for each month ...

-- ─── 2. Partition management functions ───────────────────────────────

CREATE OR REPLACE FUNCTION create_monthly_partition(
    partition_date DATE,
    table_name TEXT DEFAULT 'analytics_datasets'
) RETURNS TEXT AS $$
DECLARE
    partition_suffix TEXT;
    start_date TEXT;
    end_date TEXT;
    partition_name TEXT;
BEGIN
    partition_suffix := to_char(partition_date, 'YYYY_MM');
    start_date := to_char(partition_date, 'YYYY-MM-01');
    end_date := to_char(partition_date + interval '1 month', 'YYYY-MM-01');
    partition_name := table_name || '_' || partition_suffix;

    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, table_name, start_date, end_date
    );

    RETURN partition_name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION drop_old_partitions(
    cutoff_date DATE,
    table_name TEXT DEFAULT 'analytics_datasets'
) RETURNS INTEGER AS $$
DECLARE
    part TEXT;
    dropped INTEGER := 0;
BEGIN
    FOR part IN
        SELECT inhrelid::regclass::text
        FROM pg_inherits
        WHERE inhparent = table_name::regclass
    LOOP
        IF substring(part from length(table_name)+2) ~ '^\d{4}_\d{2}$' THEN
            EXECUTE format('DROP TABLE IF EXISTS %I', part);
            dropped := dropped + 1;
        END IF;
    END LOOP;
    RETURN dropped;
END;
$$ LANGUAGE plpgsql;

-- ─── 3. Create past 12 months + current month partitions ─────────────

-- DO $$
-- DECLARE
--     d DATE := date_trunc('month', CURRENT_DATE - interval '12 months')::date;
--     end_date DATE := date_trunc('month', CURRENT_DATE + interval '1 month')::date;
-- BEGIN
--     WHILE d < end_date LOOP
--         PERFORM create_monthly_partition(d);
--         d := d + interval '1 month';
--     END LOOP;
-- END;
-- $$;

-- ═══════════════════════════════════════════════════════════════════════
-- Scheduling cron example (run monthly via SchedulingService):
--
--   SELECT create_monthly_partition(
--       date_trunc('month', CURRENT_DATE + interval '1 month')::date
--   );
--   SELECT drop_old_partitions(CURRENT_DATE - interval '13 months');
-- ═══════════════════════════════════════════════════════════════════════
