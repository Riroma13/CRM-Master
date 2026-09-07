-- CRM-Master fresh bootstrap v1 reporting overlay.
-- Replaces only the empty generated reporting parents.
DROP TABLE analytics_datasets CASCADE;
DROP TABLE analytics_snapshots CASCADE;

CREATE TABLE analytics_datasets (
    id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    dataset_name TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    granularity TEXT NOT NULL,
    window_start TIMESTAMP(3) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    dimensions JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP(3) NOT NULL,
    CONSTRAINT analytics_datasets_pkey PRIMARY KEY (id, window_start)
) PARTITION BY RANGE (window_start);

CREATE TABLE analytics_snapshots (
    id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    dataset_name TEXT NOT NULL,
    granularity TEXT NOT NULL,
    window_start TIMESTAMP(3) NOT NULL,
    window_end TIMESTAMP(3) NOT NULL,
    data JSONB NOT NULL,
    ttl INTEGER NOT NULL DEFAULT 300,
    expires_at TIMESTAMP(3) NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT analytics_snapshots_pkey PRIMARY KEY (id, window_start)
) PARTITION BY RANGE (window_start);
CREATE TABLE analytics_datasets_2020_01 PARTITION OF analytics_datasets FOR VALUES FROM ('2020-01-01') TO ('2020-02-01');
CREATE TABLE analytics_datasets_2020_02 PARTITION OF analytics_datasets FOR VALUES FROM ('2020-02-01') TO ('2020-03-01');
CREATE TABLE analytics_datasets_2020_03 PARTITION OF analytics_datasets FOR VALUES FROM ('2020-03-01') TO ('2020-04-01');
CREATE TABLE analytics_datasets_2020_04 PARTITION OF analytics_datasets FOR VALUES FROM ('2020-04-01') TO ('2020-05-01');
CREATE TABLE analytics_datasets_2020_05 PARTITION OF analytics_datasets FOR VALUES FROM ('2020-05-01') TO ('2020-06-01');
CREATE TABLE analytics_datasets_2020_06 PARTITION OF analytics_datasets FOR VALUES FROM ('2020-06-01') TO ('2020-07-01');
CREATE TABLE analytics_datasets_2020_07 PARTITION OF analytics_datasets FOR VALUES FROM ('2020-07-01') TO ('2020-08-01');
CREATE TABLE analytics_datasets_2020_08 PARTITION OF analytics_datasets FOR VALUES FROM ('2020-08-01') TO ('2020-09-01');
CREATE TABLE analytics_datasets_2020_09 PARTITION OF analytics_datasets FOR VALUES FROM ('2020-09-01') TO ('2020-10-01');
CREATE TABLE analytics_datasets_2020_10 PARTITION OF analytics_datasets FOR VALUES FROM ('2020-10-01') TO ('2020-11-01');
CREATE TABLE analytics_datasets_2020_11 PARTITION OF analytics_datasets FOR VALUES FROM ('2020-11-01') TO ('2020-12-01');
CREATE TABLE analytics_datasets_2020_12 PARTITION OF analytics_datasets FOR VALUES FROM ('2020-12-01') TO ('2021-01-01');
CREATE TABLE analytics_datasets_2021_01 PARTITION OF analytics_datasets FOR VALUES FROM ('2021-01-01') TO ('2021-02-01');
CREATE TABLE analytics_datasets_2021_02 PARTITION OF analytics_datasets FOR VALUES FROM ('2021-02-01') TO ('2021-03-01');
CREATE TABLE analytics_datasets_2021_03 PARTITION OF analytics_datasets FOR VALUES FROM ('2021-03-01') TO ('2021-04-01');
CREATE TABLE analytics_datasets_2021_04 PARTITION OF analytics_datasets FOR VALUES FROM ('2021-04-01') TO ('2021-05-01');
CREATE TABLE analytics_datasets_2021_05 PARTITION OF analytics_datasets FOR VALUES FROM ('2021-05-01') TO ('2021-06-01');
CREATE TABLE analytics_datasets_2021_06 PARTITION OF analytics_datasets FOR VALUES FROM ('2021-06-01') TO ('2021-07-01');
CREATE TABLE analytics_datasets_2021_07 PARTITION OF analytics_datasets FOR VALUES FROM ('2021-07-01') TO ('2021-08-01');
CREATE TABLE analytics_datasets_2021_08 PARTITION OF analytics_datasets FOR VALUES FROM ('2021-08-01') TO ('2021-09-01');
CREATE TABLE analytics_datasets_2021_09 PARTITION OF analytics_datasets FOR VALUES FROM ('2021-09-01') TO ('2021-10-01');
CREATE TABLE analytics_datasets_2021_10 PARTITION OF analytics_datasets FOR VALUES FROM ('2021-10-01') TO ('2021-11-01');
CREATE TABLE analytics_datasets_2021_11 PARTITION OF analytics_datasets FOR VALUES FROM ('2021-11-01') TO ('2021-12-01');
CREATE TABLE analytics_datasets_2021_12 PARTITION OF analytics_datasets FOR VALUES FROM ('2021-12-01') TO ('2022-01-01');
CREATE TABLE analytics_datasets_2022_01 PARTITION OF analytics_datasets FOR VALUES FROM ('2022-01-01') TO ('2022-02-01');
CREATE TABLE analytics_datasets_2022_02 PARTITION OF analytics_datasets FOR VALUES FROM ('2022-02-01') TO ('2022-03-01');
CREATE TABLE analytics_datasets_2022_03 PARTITION OF analytics_datasets FOR VALUES FROM ('2022-03-01') TO ('2022-04-01');
CREATE TABLE analytics_datasets_2022_04 PARTITION OF analytics_datasets FOR VALUES FROM ('2022-04-01') TO ('2022-05-01');
CREATE TABLE analytics_datasets_2022_05 PARTITION OF analytics_datasets FOR VALUES FROM ('2022-05-01') TO ('2022-06-01');
CREATE TABLE analytics_datasets_2022_06 PARTITION OF analytics_datasets FOR VALUES FROM ('2022-06-01') TO ('2022-07-01');
CREATE TABLE analytics_datasets_2022_07 PARTITION OF analytics_datasets FOR VALUES FROM ('2022-07-01') TO ('2022-08-01');
CREATE TABLE analytics_datasets_2022_08 PARTITION OF analytics_datasets FOR VALUES FROM ('2022-08-01') TO ('2022-09-01');
CREATE TABLE analytics_datasets_2022_09 PARTITION OF analytics_datasets FOR VALUES FROM ('2022-09-01') TO ('2022-10-01');
CREATE TABLE analytics_datasets_2022_10 PARTITION OF analytics_datasets FOR VALUES FROM ('2022-10-01') TO ('2022-11-01');
CREATE TABLE analytics_datasets_2022_11 PARTITION OF analytics_datasets FOR VALUES FROM ('2022-11-01') TO ('2022-12-01');
CREATE TABLE analytics_datasets_2022_12 PARTITION OF analytics_datasets FOR VALUES FROM ('2022-12-01') TO ('2023-01-01');
CREATE TABLE analytics_datasets_2023_01 PARTITION OF analytics_datasets FOR VALUES FROM ('2023-01-01') TO ('2023-02-01');
CREATE TABLE analytics_datasets_2023_02 PARTITION OF analytics_datasets FOR VALUES FROM ('2023-02-01') TO ('2023-03-01');
CREATE TABLE analytics_datasets_2023_03 PARTITION OF analytics_datasets FOR VALUES FROM ('2023-03-01') TO ('2023-04-01');
CREATE TABLE analytics_datasets_2023_04 PARTITION OF analytics_datasets FOR VALUES FROM ('2023-04-01') TO ('2023-05-01');
CREATE TABLE analytics_datasets_2023_05 PARTITION OF analytics_datasets FOR VALUES FROM ('2023-05-01') TO ('2023-06-01');
CREATE TABLE analytics_datasets_2023_06 PARTITION OF analytics_datasets FOR VALUES FROM ('2023-06-01') TO ('2023-07-01');
CREATE TABLE analytics_datasets_2023_07 PARTITION OF analytics_datasets FOR VALUES FROM ('2023-07-01') TO ('2023-08-01');
CREATE TABLE analytics_datasets_2023_08 PARTITION OF analytics_datasets FOR VALUES FROM ('2023-08-01') TO ('2023-09-01');
CREATE TABLE analytics_datasets_2023_09 PARTITION OF analytics_datasets FOR VALUES FROM ('2023-09-01') TO ('2023-10-01');
CREATE TABLE analytics_datasets_2023_10 PARTITION OF analytics_datasets FOR VALUES FROM ('2023-10-01') TO ('2023-11-01');
CREATE TABLE analytics_datasets_2023_11 PARTITION OF analytics_datasets FOR VALUES FROM ('2023-11-01') TO ('2023-12-01');
CREATE TABLE analytics_datasets_2023_12 PARTITION OF analytics_datasets FOR VALUES FROM ('2023-12-01') TO ('2024-01-01');
CREATE TABLE analytics_datasets_2024_01 PARTITION OF analytics_datasets FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE analytics_datasets_2024_02 PARTITION OF analytics_datasets FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE analytics_datasets_2024_03 PARTITION OF analytics_datasets FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE analytics_datasets_2024_04 PARTITION OF analytics_datasets FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');
CREATE TABLE analytics_datasets_2024_05 PARTITION OF analytics_datasets FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');
CREATE TABLE analytics_datasets_2024_06 PARTITION OF analytics_datasets FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
CREATE TABLE analytics_datasets_2024_07 PARTITION OF analytics_datasets FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');
CREATE TABLE analytics_datasets_2024_08 PARTITION OF analytics_datasets FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');
CREATE TABLE analytics_datasets_2024_09 PARTITION OF analytics_datasets FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');
CREATE TABLE analytics_datasets_2024_10 PARTITION OF analytics_datasets FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE analytics_datasets_2024_11 PARTITION OF analytics_datasets FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE analytics_datasets_2024_12 PARTITION OF analytics_datasets FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
CREATE TABLE analytics_datasets_2025_01 PARTITION OF analytics_datasets FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE analytics_datasets_2025_02 PARTITION OF analytics_datasets FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE analytics_datasets_2025_03 PARTITION OF analytics_datasets FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE analytics_datasets_2025_04 PARTITION OF analytics_datasets FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE analytics_datasets_2025_05 PARTITION OF analytics_datasets FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE analytics_datasets_2025_06 PARTITION OF analytics_datasets FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE analytics_datasets_2025_07 PARTITION OF analytics_datasets FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE analytics_datasets_2025_08 PARTITION OF analytics_datasets FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE analytics_datasets_2025_09 PARTITION OF analytics_datasets FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE analytics_datasets_2025_10 PARTITION OF analytics_datasets FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE analytics_datasets_2025_11 PARTITION OF analytics_datasets FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE analytics_datasets_2025_12 PARTITION OF analytics_datasets FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE analytics_datasets_2026_01 PARTITION OF analytics_datasets FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE analytics_datasets_2026_02 PARTITION OF analytics_datasets FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE analytics_datasets_2026_03 PARTITION OF analytics_datasets FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE analytics_datasets_2026_04 PARTITION OF analytics_datasets FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE analytics_datasets_2026_05 PARTITION OF analytics_datasets FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE analytics_datasets_2026_06 PARTITION OF analytics_datasets FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE analytics_datasets_2026_07 PARTITION OF analytics_datasets FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE analytics_datasets_2026_08 PARTITION OF analytics_datasets FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE analytics_datasets_2026_09 PARTITION OF analytics_datasets FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE analytics_datasets_2026_10 PARTITION OF analytics_datasets FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE analytics_datasets_2026_11 PARTITION OF analytics_datasets FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE analytics_datasets_2026_12 PARTITION OF analytics_datasets FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE analytics_datasets_2027_01 PARTITION OF analytics_datasets FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');
CREATE TABLE analytics_datasets_2027_02 PARTITION OF analytics_datasets FOR VALUES FROM ('2027-02-01') TO ('2027-03-01');
CREATE TABLE analytics_datasets_2027_03 PARTITION OF analytics_datasets FOR VALUES FROM ('2027-03-01') TO ('2027-04-01');
CREATE TABLE analytics_datasets_2027_04 PARTITION OF analytics_datasets FOR VALUES FROM ('2027-04-01') TO ('2027-05-01');
CREATE TABLE analytics_datasets_2027_05 PARTITION OF analytics_datasets FOR VALUES FROM ('2027-05-01') TO ('2027-06-01');
CREATE TABLE analytics_datasets_2027_06 PARTITION OF analytics_datasets FOR VALUES FROM ('2027-06-01') TO ('2027-07-01');
CREATE TABLE analytics_datasets_2027_07 PARTITION OF analytics_datasets FOR VALUES FROM ('2027-07-01') TO ('2027-08-01');
CREATE TABLE analytics_datasets_2027_08 PARTITION OF analytics_datasets FOR VALUES FROM ('2027-08-01') TO ('2027-09-01');
CREATE TABLE analytics_datasets_2027_09 PARTITION OF analytics_datasets FOR VALUES FROM ('2027-09-01') TO ('2027-10-01');
CREATE TABLE analytics_datasets_2027_10 PARTITION OF analytics_datasets FOR VALUES FROM ('2027-10-01') TO ('2027-11-01');
CREATE TABLE analytics_datasets_2027_11 PARTITION OF analytics_datasets FOR VALUES FROM ('2027-11-01') TO ('2027-12-01');
CREATE TABLE analytics_datasets_2027_12 PARTITION OF analytics_datasets FOR VALUES FROM ('2027-12-01') TO ('2028-01-01');
CREATE TABLE analytics_datasets_2028_01 PARTITION OF analytics_datasets FOR VALUES FROM ('2028-01-01') TO ('2028-02-01');
CREATE TABLE analytics_datasets_2028_02 PARTITION OF analytics_datasets FOR VALUES FROM ('2028-02-01') TO ('2028-03-01');
CREATE TABLE analytics_datasets_2028_03 PARTITION OF analytics_datasets FOR VALUES FROM ('2028-03-01') TO ('2028-04-01');
CREATE TABLE analytics_datasets_2028_04 PARTITION OF analytics_datasets FOR VALUES FROM ('2028-04-01') TO ('2028-05-01');
CREATE TABLE analytics_datasets_2028_05 PARTITION OF analytics_datasets FOR VALUES FROM ('2028-05-01') TO ('2028-06-01');
CREATE TABLE analytics_datasets_2028_06 PARTITION OF analytics_datasets FOR VALUES FROM ('2028-06-01') TO ('2028-07-01');
CREATE TABLE analytics_datasets_2028_07 PARTITION OF analytics_datasets FOR VALUES FROM ('2028-07-01') TO ('2028-08-01');
CREATE TABLE analytics_datasets_2028_08 PARTITION OF analytics_datasets FOR VALUES FROM ('2028-08-01') TO ('2028-09-01');
CREATE TABLE analytics_datasets_2028_09 PARTITION OF analytics_datasets FOR VALUES FROM ('2028-09-01') TO ('2028-10-01');
CREATE TABLE analytics_datasets_2028_10 PARTITION OF analytics_datasets FOR VALUES FROM ('2028-10-01') TO ('2028-11-01');
CREATE TABLE analytics_datasets_2028_11 PARTITION OF analytics_datasets FOR VALUES FROM ('2028-11-01') TO ('2028-12-01');
CREATE TABLE analytics_datasets_2028_12 PARTITION OF analytics_datasets FOR VALUES FROM ('2028-12-01') TO ('2029-01-01');
CREATE TABLE analytics_datasets_2029_01 PARTITION OF analytics_datasets FOR VALUES FROM ('2029-01-01') TO ('2029-02-01');
CREATE TABLE analytics_datasets_2029_02 PARTITION OF analytics_datasets FOR VALUES FROM ('2029-02-01') TO ('2029-03-01');
CREATE TABLE analytics_datasets_2029_03 PARTITION OF analytics_datasets FOR VALUES FROM ('2029-03-01') TO ('2029-04-01');
CREATE TABLE analytics_datasets_2029_04 PARTITION OF analytics_datasets FOR VALUES FROM ('2029-04-01') TO ('2029-05-01');
CREATE TABLE analytics_datasets_2029_05 PARTITION OF analytics_datasets FOR VALUES FROM ('2029-05-01') TO ('2029-06-01');
CREATE TABLE analytics_datasets_2029_06 PARTITION OF analytics_datasets FOR VALUES FROM ('2029-06-01') TO ('2029-07-01');
CREATE TABLE analytics_datasets_2029_07 PARTITION OF analytics_datasets FOR VALUES FROM ('2029-07-01') TO ('2029-08-01');
CREATE TABLE analytics_datasets_2029_08 PARTITION OF analytics_datasets FOR VALUES FROM ('2029-08-01') TO ('2029-09-01');
CREATE TABLE analytics_datasets_2029_09 PARTITION OF analytics_datasets FOR VALUES FROM ('2029-09-01') TO ('2029-10-01');
CREATE TABLE analytics_datasets_2029_10 PARTITION OF analytics_datasets FOR VALUES FROM ('2029-10-01') TO ('2029-11-01');
CREATE TABLE analytics_datasets_2029_11 PARTITION OF analytics_datasets FOR VALUES FROM ('2029-11-01') TO ('2029-12-01');
CREATE TABLE analytics_datasets_2029_12 PARTITION OF analytics_datasets FOR VALUES FROM ('2029-12-01') TO ('2030-01-01');
CREATE TABLE analytics_datasets_default PARTITION OF analytics_datasets DEFAULT;
CREATE TABLE analytics_snapshots_2020_01 PARTITION OF analytics_snapshots FOR VALUES FROM ('2020-01-01') TO ('2020-02-01');
CREATE TABLE analytics_snapshots_2020_02 PARTITION OF analytics_snapshots FOR VALUES FROM ('2020-02-01') TO ('2020-03-01');
CREATE TABLE analytics_snapshots_2020_03 PARTITION OF analytics_snapshots FOR VALUES FROM ('2020-03-01') TO ('2020-04-01');
CREATE TABLE analytics_snapshots_2020_04 PARTITION OF analytics_snapshots FOR VALUES FROM ('2020-04-01') TO ('2020-05-01');
CREATE TABLE analytics_snapshots_2020_05 PARTITION OF analytics_snapshots FOR VALUES FROM ('2020-05-01') TO ('2020-06-01');
CREATE TABLE analytics_snapshots_2020_06 PARTITION OF analytics_snapshots FOR VALUES FROM ('2020-06-01') TO ('2020-07-01');
CREATE TABLE analytics_snapshots_2020_07 PARTITION OF analytics_snapshots FOR VALUES FROM ('2020-07-01') TO ('2020-08-01');
CREATE TABLE analytics_snapshots_2020_08 PARTITION OF analytics_snapshots FOR VALUES FROM ('2020-08-01') TO ('2020-09-01');
CREATE TABLE analytics_snapshots_2020_09 PARTITION OF analytics_snapshots FOR VALUES FROM ('2020-09-01') TO ('2020-10-01');
CREATE TABLE analytics_snapshots_2020_10 PARTITION OF analytics_snapshots FOR VALUES FROM ('2020-10-01') TO ('2020-11-01');
CREATE TABLE analytics_snapshots_2020_11 PARTITION OF analytics_snapshots FOR VALUES FROM ('2020-11-01') TO ('2020-12-01');
CREATE TABLE analytics_snapshots_2020_12 PARTITION OF analytics_snapshots FOR VALUES FROM ('2020-12-01') TO ('2021-01-01');
CREATE TABLE analytics_snapshots_2021_01 PARTITION OF analytics_snapshots FOR VALUES FROM ('2021-01-01') TO ('2021-02-01');
CREATE TABLE analytics_snapshots_2021_02 PARTITION OF analytics_snapshots FOR VALUES FROM ('2021-02-01') TO ('2021-03-01');
CREATE TABLE analytics_snapshots_2021_03 PARTITION OF analytics_snapshots FOR VALUES FROM ('2021-03-01') TO ('2021-04-01');
CREATE TABLE analytics_snapshots_2021_04 PARTITION OF analytics_snapshots FOR VALUES FROM ('2021-04-01') TO ('2021-05-01');
CREATE TABLE analytics_snapshots_2021_05 PARTITION OF analytics_snapshots FOR VALUES FROM ('2021-05-01') TO ('2021-06-01');
CREATE TABLE analytics_snapshots_2021_06 PARTITION OF analytics_snapshots FOR VALUES FROM ('2021-06-01') TO ('2021-07-01');
CREATE TABLE analytics_snapshots_2021_07 PARTITION OF analytics_snapshots FOR VALUES FROM ('2021-07-01') TO ('2021-08-01');
CREATE TABLE analytics_snapshots_2021_08 PARTITION OF analytics_snapshots FOR VALUES FROM ('2021-08-01') TO ('2021-09-01');
CREATE TABLE analytics_snapshots_2021_09 PARTITION OF analytics_snapshots FOR VALUES FROM ('2021-09-01') TO ('2021-10-01');
CREATE TABLE analytics_snapshots_2021_10 PARTITION OF analytics_snapshots FOR VALUES FROM ('2021-10-01') TO ('2021-11-01');
CREATE TABLE analytics_snapshots_2021_11 PARTITION OF analytics_snapshots FOR VALUES FROM ('2021-11-01') TO ('2021-12-01');
CREATE TABLE analytics_snapshots_2021_12 PARTITION OF analytics_snapshots FOR VALUES FROM ('2021-12-01') TO ('2022-01-01');
CREATE TABLE analytics_snapshots_2022_01 PARTITION OF analytics_snapshots FOR VALUES FROM ('2022-01-01') TO ('2022-02-01');
CREATE TABLE analytics_snapshots_2022_02 PARTITION OF analytics_snapshots FOR VALUES FROM ('2022-02-01') TO ('2022-03-01');
CREATE TABLE analytics_snapshots_2022_03 PARTITION OF analytics_snapshots FOR VALUES FROM ('2022-03-01') TO ('2022-04-01');
CREATE TABLE analytics_snapshots_2022_04 PARTITION OF analytics_snapshots FOR VALUES FROM ('2022-04-01') TO ('2022-05-01');
CREATE TABLE analytics_snapshots_2022_05 PARTITION OF analytics_snapshots FOR VALUES FROM ('2022-05-01') TO ('2022-06-01');
CREATE TABLE analytics_snapshots_2022_06 PARTITION OF analytics_snapshots FOR VALUES FROM ('2022-06-01') TO ('2022-07-01');
CREATE TABLE analytics_snapshots_2022_07 PARTITION OF analytics_snapshots FOR VALUES FROM ('2022-07-01') TO ('2022-08-01');
CREATE TABLE analytics_snapshots_2022_08 PARTITION OF analytics_snapshots FOR VALUES FROM ('2022-08-01') TO ('2022-09-01');
CREATE TABLE analytics_snapshots_2022_09 PARTITION OF analytics_snapshots FOR VALUES FROM ('2022-09-01') TO ('2022-10-01');
CREATE TABLE analytics_snapshots_2022_10 PARTITION OF analytics_snapshots FOR VALUES FROM ('2022-10-01') TO ('2022-11-01');
CREATE TABLE analytics_snapshots_2022_11 PARTITION OF analytics_snapshots FOR VALUES FROM ('2022-11-01') TO ('2022-12-01');
CREATE TABLE analytics_snapshots_2022_12 PARTITION OF analytics_snapshots FOR VALUES FROM ('2022-12-01') TO ('2023-01-01');
CREATE TABLE analytics_snapshots_2023_01 PARTITION OF analytics_snapshots FOR VALUES FROM ('2023-01-01') TO ('2023-02-01');
CREATE TABLE analytics_snapshots_2023_02 PARTITION OF analytics_snapshots FOR VALUES FROM ('2023-02-01') TO ('2023-03-01');
CREATE TABLE analytics_snapshots_2023_03 PARTITION OF analytics_snapshots FOR VALUES FROM ('2023-03-01') TO ('2023-04-01');
CREATE TABLE analytics_snapshots_2023_04 PARTITION OF analytics_snapshots FOR VALUES FROM ('2023-04-01') TO ('2023-05-01');
CREATE TABLE analytics_snapshots_2023_05 PARTITION OF analytics_snapshots FOR VALUES FROM ('2023-05-01') TO ('2023-06-01');
CREATE TABLE analytics_snapshots_2023_06 PARTITION OF analytics_snapshots FOR VALUES FROM ('2023-06-01') TO ('2023-07-01');
CREATE TABLE analytics_snapshots_2023_07 PARTITION OF analytics_snapshots FOR VALUES FROM ('2023-07-01') TO ('2023-08-01');
CREATE TABLE analytics_snapshots_2023_08 PARTITION OF analytics_snapshots FOR VALUES FROM ('2023-08-01') TO ('2023-09-01');
CREATE TABLE analytics_snapshots_2023_09 PARTITION OF analytics_snapshots FOR VALUES FROM ('2023-09-01') TO ('2023-10-01');
CREATE TABLE analytics_snapshots_2023_10 PARTITION OF analytics_snapshots FOR VALUES FROM ('2023-10-01') TO ('2023-11-01');
CREATE TABLE analytics_snapshots_2023_11 PARTITION OF analytics_snapshots FOR VALUES FROM ('2023-11-01') TO ('2023-12-01');
CREATE TABLE analytics_snapshots_2023_12 PARTITION OF analytics_snapshots FOR VALUES FROM ('2023-12-01') TO ('2024-01-01');
CREATE TABLE analytics_snapshots_2024_01 PARTITION OF analytics_snapshots FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE analytics_snapshots_2024_02 PARTITION OF analytics_snapshots FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE analytics_snapshots_2024_03 PARTITION OF analytics_snapshots FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE analytics_snapshots_2024_04 PARTITION OF analytics_snapshots FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');
CREATE TABLE analytics_snapshots_2024_05 PARTITION OF analytics_snapshots FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');
CREATE TABLE analytics_snapshots_2024_06 PARTITION OF analytics_snapshots FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
CREATE TABLE analytics_snapshots_2024_07 PARTITION OF analytics_snapshots FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');
CREATE TABLE analytics_snapshots_2024_08 PARTITION OF analytics_snapshots FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');
CREATE TABLE analytics_snapshots_2024_09 PARTITION OF analytics_snapshots FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');
CREATE TABLE analytics_snapshots_2024_10 PARTITION OF analytics_snapshots FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE analytics_snapshots_2024_11 PARTITION OF analytics_snapshots FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE analytics_snapshots_2024_12 PARTITION OF analytics_snapshots FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
CREATE TABLE analytics_snapshots_2025_01 PARTITION OF analytics_snapshots FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE analytics_snapshots_2025_02 PARTITION OF analytics_snapshots FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE analytics_snapshots_2025_03 PARTITION OF analytics_snapshots FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE analytics_snapshots_2025_04 PARTITION OF analytics_snapshots FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE analytics_snapshots_2025_05 PARTITION OF analytics_snapshots FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE analytics_snapshots_2025_06 PARTITION OF analytics_snapshots FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE analytics_snapshots_2025_07 PARTITION OF analytics_snapshots FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE analytics_snapshots_2025_08 PARTITION OF analytics_snapshots FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE analytics_snapshots_2025_09 PARTITION OF analytics_snapshots FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE analytics_snapshots_2025_10 PARTITION OF analytics_snapshots FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE analytics_snapshots_2025_11 PARTITION OF analytics_snapshots FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE analytics_snapshots_2025_12 PARTITION OF analytics_snapshots FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE analytics_snapshots_2026_01 PARTITION OF analytics_snapshots FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE analytics_snapshots_2026_02 PARTITION OF analytics_snapshots FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE analytics_snapshots_2026_03 PARTITION OF analytics_snapshots FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE analytics_snapshots_2026_04 PARTITION OF analytics_snapshots FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE analytics_snapshots_2026_05 PARTITION OF analytics_snapshots FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE analytics_snapshots_2026_06 PARTITION OF analytics_snapshots FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE analytics_snapshots_2026_07 PARTITION OF analytics_snapshots FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE analytics_snapshots_2026_08 PARTITION OF analytics_snapshots FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE analytics_snapshots_2026_09 PARTITION OF analytics_snapshots FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE analytics_snapshots_2026_10 PARTITION OF analytics_snapshots FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE analytics_snapshots_2026_11 PARTITION OF analytics_snapshots FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE analytics_snapshots_2026_12 PARTITION OF analytics_snapshots FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE analytics_snapshots_2027_01 PARTITION OF analytics_snapshots FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');
CREATE TABLE analytics_snapshots_2027_02 PARTITION OF analytics_snapshots FOR VALUES FROM ('2027-02-01') TO ('2027-03-01');
CREATE TABLE analytics_snapshots_2027_03 PARTITION OF analytics_snapshots FOR VALUES FROM ('2027-03-01') TO ('2027-04-01');
CREATE TABLE analytics_snapshots_2027_04 PARTITION OF analytics_snapshots FOR VALUES FROM ('2027-04-01') TO ('2027-05-01');
CREATE TABLE analytics_snapshots_2027_05 PARTITION OF analytics_snapshots FOR VALUES FROM ('2027-05-01') TO ('2027-06-01');
CREATE TABLE analytics_snapshots_2027_06 PARTITION OF analytics_snapshots FOR VALUES FROM ('2027-06-01') TO ('2027-07-01');
CREATE TABLE analytics_snapshots_2027_07 PARTITION OF analytics_snapshots FOR VALUES FROM ('2027-07-01') TO ('2027-08-01');
CREATE TABLE analytics_snapshots_2027_08 PARTITION OF analytics_snapshots FOR VALUES FROM ('2027-08-01') TO ('2027-09-01');
CREATE TABLE analytics_snapshots_2027_09 PARTITION OF analytics_snapshots FOR VALUES FROM ('2027-09-01') TO ('2027-10-01');
CREATE TABLE analytics_snapshots_2027_10 PARTITION OF analytics_snapshots FOR VALUES FROM ('2027-10-01') TO ('2027-11-01');
CREATE TABLE analytics_snapshots_2027_11 PARTITION OF analytics_snapshots FOR VALUES FROM ('2027-11-01') TO ('2027-12-01');
CREATE TABLE analytics_snapshots_2027_12 PARTITION OF analytics_snapshots FOR VALUES FROM ('2027-12-01') TO ('2028-01-01');
CREATE TABLE analytics_snapshots_2028_01 PARTITION OF analytics_snapshots FOR VALUES FROM ('2028-01-01') TO ('2028-02-01');
CREATE TABLE analytics_snapshots_2028_02 PARTITION OF analytics_snapshots FOR VALUES FROM ('2028-02-01') TO ('2028-03-01');
CREATE TABLE analytics_snapshots_2028_03 PARTITION OF analytics_snapshots FOR VALUES FROM ('2028-03-01') TO ('2028-04-01');
CREATE TABLE analytics_snapshots_2028_04 PARTITION OF analytics_snapshots FOR VALUES FROM ('2028-04-01') TO ('2028-05-01');
CREATE TABLE analytics_snapshots_2028_05 PARTITION OF analytics_snapshots FOR VALUES FROM ('2028-05-01') TO ('2028-06-01');
CREATE TABLE analytics_snapshots_2028_06 PARTITION OF analytics_snapshots FOR VALUES FROM ('2028-06-01') TO ('2028-07-01');
CREATE TABLE analytics_snapshots_2028_07 PARTITION OF analytics_snapshots FOR VALUES FROM ('2028-07-01') TO ('2028-08-01');
CREATE TABLE analytics_snapshots_2028_08 PARTITION OF analytics_snapshots FOR VALUES FROM ('2028-08-01') TO ('2028-09-01');
CREATE TABLE analytics_snapshots_2028_09 PARTITION OF analytics_snapshots FOR VALUES FROM ('2028-09-01') TO ('2028-10-01');
CREATE TABLE analytics_snapshots_2028_10 PARTITION OF analytics_snapshots FOR VALUES FROM ('2028-10-01') TO ('2028-11-01');
CREATE TABLE analytics_snapshots_2028_11 PARTITION OF analytics_snapshots FOR VALUES FROM ('2028-11-01') TO ('2028-12-01');
CREATE TABLE analytics_snapshots_2028_12 PARTITION OF analytics_snapshots FOR VALUES FROM ('2028-12-01') TO ('2029-01-01');
CREATE TABLE analytics_snapshots_2029_01 PARTITION OF analytics_snapshots FOR VALUES FROM ('2029-01-01') TO ('2029-02-01');
CREATE TABLE analytics_snapshots_2029_02 PARTITION OF analytics_snapshots FOR VALUES FROM ('2029-02-01') TO ('2029-03-01');
CREATE TABLE analytics_snapshots_2029_03 PARTITION OF analytics_snapshots FOR VALUES FROM ('2029-03-01') TO ('2029-04-01');
CREATE TABLE analytics_snapshots_2029_04 PARTITION OF analytics_snapshots FOR VALUES FROM ('2029-04-01') TO ('2029-05-01');
CREATE TABLE analytics_snapshots_2029_05 PARTITION OF analytics_snapshots FOR VALUES FROM ('2029-05-01') TO ('2029-06-01');
CREATE TABLE analytics_snapshots_2029_06 PARTITION OF analytics_snapshots FOR VALUES FROM ('2029-06-01') TO ('2029-07-01');
CREATE TABLE analytics_snapshots_2029_07 PARTITION OF analytics_snapshots FOR VALUES FROM ('2029-07-01') TO ('2029-08-01');
CREATE TABLE analytics_snapshots_2029_08 PARTITION OF analytics_snapshots FOR VALUES FROM ('2029-08-01') TO ('2029-09-01');
CREATE TABLE analytics_snapshots_2029_09 PARTITION OF analytics_snapshots FOR VALUES FROM ('2029-09-01') TO ('2029-10-01');
CREATE TABLE analytics_snapshots_2029_10 PARTITION OF analytics_snapshots FOR VALUES FROM ('2029-10-01') TO ('2029-11-01');
CREATE TABLE analytics_snapshots_2029_11 PARTITION OF analytics_snapshots FOR VALUES FROM ('2029-11-01') TO ('2029-12-01');
CREATE TABLE analytics_snapshots_2029_12 PARTITION OF analytics_snapshots FOR VALUES FROM ('2029-12-01') TO ('2030-01-01');
CREATE TABLE analytics_snapshots_default PARTITION OF analytics_snapshots DEFAULT;

CREATE UNIQUE INDEX analytics_datasets_tenant_id_dataset_name_metric_name_granul_key
    ON analytics_datasets (tenant_id, dataset_name, metric_name, granularity, window_start);
CREATE INDEX analytics_datasets_tenant_id_dataset_name_granularity_window_idx
    ON analytics_datasets (tenant_id, dataset_name, granularity, window_start DESC);
CREATE INDEX analytics_datasets_tenant_id_metric_name_window_start_idx
    ON analytics_datasets (tenant_id, metric_name, window_start DESC);
CREATE INDEX analytics_datasets_tenant_id_idx
    ON analytics_datasets (tenant_id);
CREATE INDEX analytics_snapshots_tenant_id_name_expires_at_idx
    ON analytics_snapshots (tenant_id, name, expires_at);
CREATE INDEX analytics_snapshots_tenant_id_idx
    ON analytics_snapshots (tenant_id);

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
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
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
        IF substring(part from length(table_name)+2) ~ '^\d{4}_\d{2}$'
           AND to_date(substring(part from length(table_name)+2), 'YYYY_MM')
               < date_trunc('month', cutoff_date)::date THEN
            EXECUTE format('DROP TABLE IF EXISTS %I', part);
            dropped := dropped + 1;
        END IF;
    END LOOP;
    RETURN dropped;
END;
$$ LANGUAGE plpgsql;
