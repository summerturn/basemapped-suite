-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Utilities (multi-tenant orgs)
CREATE TABLE IF NOT EXISTS utilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    pwsid VARCHAR(50) UNIQUE,
    utility_type VARCHAR(50) CHECK (utility_type IN ('community_water', 'nontrans_noncommunity', 'transient_noncommunity', 'wastewater')),
    population_served INTEGER DEFAULT 0,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip VARCHAR(20),
    county VARCHAR(100),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    settings_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utility_id UUID REFERENCES utilities(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    role VARCHAR(50) CHECK (role IN ('super_admin', 'utility_admin', 'office_user', 'field_user', 'inspector', 'readonly')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asset Types
CREATE TABLE IF NOT EXISTS asset_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utility_id UUID REFERENCES utilities(id) ON DELETE CASCADE,
    type_key VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    geometry_type VARCHAR(20) CHECK (geometry_type IN ('point', 'line', 'polygon')),
    icon_url TEXT,
    color_hex VARCHAR(7) DEFAULT '#0C4A6E',
    attribute_schema_json JSONB DEFAULT '{}',
    default_inspection_template_json JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(utility_id, type_key)
);

-- Assets
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utility_id UUID REFERENCES utilities(id) ON DELETE CASCADE,
    asset_type_id UUID REFERENCES asset_types(id) ON DELETE SET NULL,
    external_id VARCHAR(100),
    geometry GEOMETRY(GEOMETRY, 4326),
    attributes JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_repair', 'retired', 'planned')),
    condition_rating INTEGER CHECK (condition_rating BETWEEN 1 AND 5),
    install_date DATE,
    material VARCHAR(100),
    diameter_mm NUMERIC(10,2),
    length_m NUMERIC(10,2),
    depth_m NUMERIC(10,2),
    parent_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    connected_asset_ids UUID[],
    address TEXT,
    gps_accuracy_m NUMERIC(8,2),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assets_utility ON assets(utility_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_geom ON assets USING GIST(geometry);

-- Asset Photos
CREATE TABLE IF NOT EXISTS asset_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    inspection_id UUID,
    file_key TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(50),
    caption TEXT,
    gps_lat NUMERIC(10, 8),
    gps_lon NUMERIC(11, 8),
    taken_by UUID REFERENCES users(id) ON DELETE SET NULL,
    taken_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_photos_asset ON asset_photos(asset_id);

-- Inspection Templates
CREATE TABLE IF NOT EXISTS inspection_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utility_id UUID REFERENCES utilities(id) ON DELETE CASCADE,
    asset_type_id UUID REFERENCES asset_types(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    form_schema_json JSONB NOT NULL DEFAULT '{}',
    frequency_days INTEGER,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inspections
CREATE TABLE IF NOT EXISTS inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
    template_id UUID REFERENCES inspection_templates(id) ON DELETE SET NULL,
    inspection_type VARCHAR(100),
    inspector_id UUID REFERENCES users(id) ON DELETE SET NULL,
    scheduled_date DATE,
    completed_date TIMESTAMPTZ,
    results_json JSONB DEFAULT '{}',
    condition_rating_after INTEGER CHECK (condition_rating_after BETWEEN 1 AND 5),
    gps_location GEOMETRY(POINT, 4326),
    signature_b64 TEXT,
    photos_json JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'failed', 'overdue')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inspections_asset ON inspections(asset_id);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector ON inspections(inspector_id);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON inspections(status);
CREATE INDEX IF NOT EXISTS idx_inspections_scheduled ON inspections(scheduled_date);

-- Work Orders
CREATE TABLE IF NOT EXISTS work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utility_id UUID REFERENCES utilities(id) ON DELETE CASCADE,
    asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    wo_type VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('emergency', 'high', 'medium', 'low')),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'assigned', 'in_progress', 'on_hold', 'completed', 'verified', 'closed')),
    assigned_crew_id UUID,
    assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    scheduled_date DATE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    labor_hours NUMERIC(6,2),
    parts_used_json JSONB DEFAULT '[]',
    photos JSONB DEFAULT '[]',
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wo_utility ON work_orders(utility_id);
CREATE INDEX IF NOT EXISTS idx_wo_asset ON work_orders(asset_id);
CREATE INDEX IF NOT EXISTS idx_wo_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_wo_priority ON work_orders(priority);

-- Crews
CREATE TABLE IF NOT EXISTS crews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utility_id UUID REFERENCES utilities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    member_ids UUID[],
    default_territory GEOMETRY(POLYGON, 4326),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crew Schedules
CREATE TABLE IF NOT EXISTS crew_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crew_id UUID REFERENCES crews(id) ON DELETE CASCADE,
    wo_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
    title VARCHAR(255),
    start_datetime TIMESTAMPTZ,
    end_datetime TIMESTAMPTZ,
    location_geo GEOMETRY(POINT, 4326),
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compliance: Service Line Inventory (LCRR)
CREATE TABLE IF NOT EXISTS compliance_service_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utility_id UUID REFERENCES utilities(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    customer_name VARCHAR(255),
    lead_status VARCHAR(50) CHECK (lead_status IN ('lead', 'galvanized_requiring_replacement', 'non_lead', 'lead_status_unknown')),
    replacement_date DATE,
    sampling_site_tier VARCHAR(20),
    last_sample_date DATE,
    sample_result_pb_ppb NUMERIC(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sl_utility ON compliance_service_lines(utility_id);
CREATE INDEX IF NOT EXISTS idx_sl_lead ON compliance_service_lines(lead_status);

-- Compliance: Samples
CREATE TABLE IF NOT EXISTS compliance_samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utility_id UUID REFERENCES utilities(id) ON DELETE CASCADE,
    service_line_id UUID REFERENCES compliance_service_lines(id) ON DELETE SET NULL,
    sample_date DATE NOT NULL,
    lead_result_ppb NUMERIC(10,2),
    copper_result_ppm NUMERIC(10,2),
    action_level_exceeded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_samples_utility ON compliance_samples(utility_id);
CREATE INDEX IF NOT EXISTS idx_samples_date ON compliance_samples(sample_date);

-- Change Log (for sync)
CREATE TABLE IF NOT EXISTS change_log (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    row_id UUID NOT NULL,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    sync_session_id UUID,
    sequence_number BIGINT
);
CREATE INDEX IF NOT EXISTS idx_changelog_table ON change_log(table_name, row_id);
CREATE INDEX IF NOT EXISTS idx_changelog_session ON change_log(sync_session_id);
CREATE INDEX IF NOT EXISTS idx_changelog_time ON change_log(changed_at);

-- Sync Sessions
CREATE TABLE IF NOT EXISTS sync_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'active',
    changes_pushed INTEGER DEFAULT 0,
    changes_pulled INTEGER DEFAULT 0
);

-- Sync Conflicts
CREATE TABLE IF NOT EXISTS sync_conflicts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sync_sessions(id) ON DELETE CASCADE,
    table_name VARCHAR(100) NOT NULL,
    row_id UUID NOT NULL,
    server_data JSONB,
    client_data JSONB,
    resolution VARCHAR(50),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Map Regions (for offline tiles)
CREATE TABLE IF NOT EXISTS map_regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utility_id UUID REFERENCES utilities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    bounds GEOMETRY(POLYGON, 4326),
    min_zoom INTEGER DEFAULT 10,
    max_zoom INTEGER DEFAULT 18,
    estimated_size_mb INTEGER,
    file_key TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_regions_utility ON map_regions(utility_id);

-- Spatial helper functions
CREATE OR REPLACE FUNCTION fn_get_assets_in_radius(
    lat NUMERIC, lon NUMERIC, radius_m NUMERIC
) RETURNS TABLE(asset_id UUID, distance_m NUMERIC) AS $$
BEGIN
    RETURN QUERY
    SELECT a.id, ST_Distance(
        a.geometry::geography,
        ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography
    )::NUMERIC AS distance_m
    FROM assets a
    WHERE ST_DWithin(
        a.geometry::geography,
        ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
        radius_m
    )
    ORDER BY distance_m;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_get_connected_assets(asset_id UUID)
RETURNS TABLE(connected_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT UNNEST(a.connected_asset_ids) AS connected_id
    FROM assets a
    WHERE a.id = asset_id AND a.connected_asset_ids IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_calculate_pipe_length(geom GEOMETRY)
RETURNS NUMERIC AS $$
BEGIN
    RETURN ST_Length(geom::geography)::NUMERIC;
END;
$$ LANGUAGE plpgsql;

-- Auto-write change_log triggers
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO change_log (table_name, row_id, operation, new_data, changed_at)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO change_log (table_name, row_id, operation, old_data, new_data, changed_at)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO change_log (table_name, row_id, operation, old_data, changed_at)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), NOW());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to key tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_assets_audit') THEN
        CREATE TRIGGER trg_assets_audit AFTER INSERT OR UPDATE OR DELETE ON assets
        FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_inspections_audit') THEN
        CREATE TRIGGER trg_inspections_audit AFTER INSERT OR UPDATE OR DELETE ON inspections
        FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_work_orders_audit') THEN
        CREATE TRIGGER trg_work_orders_audit AFTER INSERT OR UPDATE OR DELETE ON work_orders
        FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();
    END IF;
END $$;

-- Updated at triggers
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY['utilities', 'users', 'asset_types', 'assets', 'inspection_templates', 'inspections', 'work_orders', 'crews', 'compliance_service_lines', 'map_regions'];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()', tbl, tbl);
    END LOOP;
END $$;
