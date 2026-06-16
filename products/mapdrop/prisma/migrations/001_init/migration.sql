-- =============================================================================
-- MapDrop Initial Migration  —  PostgreSQL 16 + PostGIS 3.4
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE map_status AS ENUM ('PENDING', 'PROCESSING', 'READY', 'ERROR', 'ARCHIVED');
CREATE TYPE job_status AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- ---------------------------------------------------------------------------
-- Maps
-- ---------------------------------------------------------------------------
CREATE TABLE maps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT,
    anonymous_token TEXT,
    name            TEXT NOT NULL,
    description     TEXT,
    status          map_status NOT NULL DEFAULT 'PENDING',
    is_public       BOOLEAN NOT NULL DEFAULT false,
    column_mapping  JSONB,
    style_config    JSONB,
    source_file_url  TEXT,
    source_file_name TEXT,
    row_count       INTEGER,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_maps_user_id         ON maps(user_id);
CREATE INDEX idx_maps_anonymous_token ON maps(anonymous_token);
CREATE INDEX idx_maps_status          ON maps(status);
CREATE INDEX idx_maps_is_public       ON maps(is_public);
CREATE INDEX idx_maps_expires_at      ON maps(expires_at);

-- ---------------------------------------------------------------------------
-- Points  —  hash partitioned for parallel map-scoped queries
-- ---------------------------------------------------------------------------
CREATE TABLE points (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id       UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    lat          DOUBLE PRECISION NOT NULL,
    lng          DOUBLE PRECISION NOT NULL,
    geom         GEOMETRY(Point, 4326),
    properties   JSONB,
    geocoded_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY HASH (map_id);

-- 8 hash partitions → good balance for 150 k rows / map and parallel seq scans
CREATE TABLE points_p0 PARTITION OF points FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE points_p1 PARTITION OF points FOR VALUES WITH (MODULUS 8, REMAINDER 1);
CREATE TABLE points_p2 PARTITION OF points FOR VALUES WITH (MODULUS 8, REMAINDER 2);
CREATE TABLE points_p3 PARTITION OF points FOR VALUES WITH (MODULUS 8, REMAINDER 3);
CREATE TABLE points_p4 PARTITION OF points FOR VALUES WITH (MODULUS 8, REMAINDER 4);
CREATE TABLE points_p5 PARTITION OF points FOR VALUES WITH (MODULUS 8, REMAINDER 5);
CREATE TABLE points_p6 PARTITION OF points FOR VALUES WITH (MODULUS 8, REMAINDER 6);
CREATE TABLE points_p7 PARTITION OF points FOR VALUES WITH (MODULUS 8, REMAINDER 7);

CREATE INDEX idx_points_map_id  ON points(map_id);
CREATE INDEX idx_points_lat_lng ON points(lat, lng);
CREATE INDEX idx_points_created ON points(created_at);

-- GIST spatial index (automatically propagated to all 8 partitions)
CREATE INDEX idx_points_geom ON points USING GIST (geom);

-- ---------------------------------------------------------------------------
-- ShareLinks
-- ---------------------------------------------------------------------------
CREATE TABLE share_links (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id      UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    token       TEXT NOT NULL UNIQUE,
    name        TEXT,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_share_links_map_id  ON share_links(map_id);
CREATE INDEX idx_share_links_token   ON share_links(token);

-- ---------------------------------------------------------------------------
-- GeocodeJobs
-- ---------------------------------------------------------------------------
CREATE TABLE geocode_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    map_id          UUID NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
    status          job_status NOT NULL DEFAULT 'QUEUED',
    total_rows      INTEGER NOT NULL,
    processed_rows  INTEGER NOT NULL DEFAULT 0,
    failed_rows     INTEGER NOT NULL DEFAULT 0,
    errors          JSONB,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_geocode_jobs_map_id    ON geocode_jobs(map_id);
CREATE INDEX idx_geocode_jobs_status    ON geocode_jobs(status);
CREATE INDEX idx_geocode_jobs_created   ON geocode_jobs(created_at);

-- ---------------------------------------------------------------------------
-- UserSettings
-- ---------------------------------------------------------------------------
CREATE TABLE user_settings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       TEXT NOT NULL UNIQUE,
    preferences   JSONB,
    is_premium    BOOLEAN NOT NULL DEFAULT false,
    storage_used  BIGINT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- ---------------------------------------------------------------------------
-- Helper: update timestamps automatically
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_maps
    BEFORE UPDATE ON maps
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_geocode_jobs
    BEFORE UPDATE ON geocode_jobs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_user_settings
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ---------------------------------------------------------------------------
-- Vector tile generation  —  Mapbox/Leaflet compatible
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_tile(p_map_id UUID, p_z INT, p_x INT, p_y INT)
RETURNS BYTEA AS $$
DECLARE
    mercator_bbox geometry;
    mvt BYTEA;
BEGIN
    mercator_bbox := ST_TileEnvelope(p_z, p_x, p_y);

    SELECT ST_AsMVT(mvtgeom, 'points', 4096, 'geom')
    INTO mvt
    FROM (
        SELECT
            id,
            properties,
            ST_AsMVTGeom(
                ST_Transform(geom, 3857),
                mercator_bbox,
                4096,
                256,
                true
            ) AS geom
        FROM points
        WHERE map_id = p_map_id
          AND geom IS NOT NULL
          AND ST_Intersects(ST_Transform(geom, 3857), mercator_bbox)
    ) mvtgeom;

    RETURN mvt;
END;
$$ LANGUAGE plpgsql STABLE STRICT;

-- ---------------------------------------------------------------------------
-- Cleanup helper: purge expired anonymous maps (call via pg_cron or app)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_expired_maps()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM maps
    WHERE user_id IS NULL
      AND expires_at < now();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Row-Level Security (RLS)
-- ---------------------------------------------------------------------------
ALTER TABLE maps         ENABLE ROW LEVEL SECURITY;
ALTER TABLE points       ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links  ENABLE ROW LEVEL SECURITY;
ALTER TABLE geocode_jobs ENABLE ROW LEVEL SECURITY;

-- Maps ----------------------------------------------------------------------

-- Owner (authenticated or anonymous token) can do anything
CREATE POLICY maps_owner_all ON maps
    FOR ALL
    USING (
        user_id = current_setting('app.current_user_id', true)
        OR anonymous_token = current_setting('app.anonymous_token', true)
    );

-- Public maps are readable by anyone
CREATE POLICY maps_public_read ON maps
    FOR SELECT
    USING (is_public = true);

-- Valid share token grants read access
CREATE POLICY maps_share_read ON maps
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM share_links sl
            WHERE sl.map_id = maps.id
              AND sl.token = current_setting('app.share_token', true)
              AND (sl.expires_at IS NULL OR sl.expires_at > now())
        )
    );

-- Points --------------------------------------------------------------------

-- Owner access via parent map
CREATE POLICY points_owner_all ON points
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM maps m
            WHERE m.id = points.map_id
              AND (
                  m.user_id = current_setting('app.current_user_id', true)
                  OR m.anonymous_token = current_setting('app.anonymous_token', true)
              )
        )
    );

-- Public map points are readable
CREATE POLICY points_public_read ON points
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM maps m
            WHERE m.id = points.map_id
              AND m.is_public = true
        )
    );

-- Share link points are readable
CREATE POLICY points_share_read ON points
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM maps m
            JOIN share_links sl ON sl.map_id = m.id
            WHERE m.id = points.map_id
              AND sl.token = current_setting('app.share_token', true)
              AND (sl.expires_at IS NULL OR sl.expires_at > now())
        )
    );

-- ShareLinks ----------------------------------------------------------------

-- Readable by map owner
CREATE POLICY share_links_owner_read ON share_links
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM maps m
            WHERE m.id = share_links.map_id
              AND (
                  m.user_id = current_setting('app.current_user_id', true)
                  OR m.anonymous_token = current_setting('app.anonymous_token', true)
              )
        )
    );

-- Readable when attached to a public map
CREATE POLICY share_links_public_map ON share_links
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM maps m
            WHERE m.id = share_links.map_id
              AND m.is_public = true
        )
    );

-- GeocodeJobs ---------------------------------------------------------------

-- Owner access via parent map
CREATE POLICY geocode_jobs_owner_all ON geocode_jobs
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM maps m
            WHERE m.id = geocode_jobs.map_id
              AND (
                  m.user_id = current_setting('app.current_user_id', true)
                  OR m.anonymous_token = current_setting('app.anonymous_token', true)
              )
        )
    );
