-- Enable PostGIS and UUID extensions
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- Tenants (multi-tenancy root)
-- ==========================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    subscription_status VARCHAR(50) NOT NULL DEFAULT 'active',
    subscription_expires_at TIMESTAMPTZ,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_subscription ON tenants(subscription_status);

-- ==========================================
-- Users
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(tenant_id, email),
    CONSTRAINT chk_user_role CHECK (role IN ('super_admin', 'admin', 'manager', 'viewer'))
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(tenant_id, email);

-- ==========================================
-- Cemeteries
-- ==========================================
CREATE TABLE cemeteries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    boundary GEOMETRY(POLYGON, 4326),
    center_point GEOMETRY(POINT, 4326),
    total_acres DECIMAL(10, 2),
    established_date DATE,
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_cemeteries_tenant ON cemeteries(tenant_id);
CREATE INDEX idx_cemeteries_boundary ON cemeteries USING GIST(boundary);
CREATE INDEX idx_cemeteries_center ON cemeteries USING GIST(center_point);

-- ==========================================
-- Sections
-- ==========================================
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cemetery_id UUID NOT NULL REFERENCES cemeteries(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    section_type VARCHAR(50) NOT NULL DEFAULT 'standard',
    boundary GEOMETRY(POLYGON, 4326),
    center_point GEOMETRY(POINT, 4326),
    total_plots INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_section_type CHECK (section_type IN ('standard', 'mausoleum', 'columbarium', 'cremation_garden', 'memorial_walk', 'baby_land'))
);

CREATE INDEX idx_sections_tenant ON sections(tenant_id);
CREATE INDEX idx_sections_cemetery ON sections(cemetery_id);
CREATE INDEX idx_sections_boundary ON sections USING GIST(boundary);
CREATE INDEX idx_sections_center ON sections USING GIST(center_point);

-- ==========================================
-- Plots
-- ==========================================
CREATE TABLE plots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cemetery_id UUID NOT NULL REFERENCES cemeteries(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    plot_number VARCHAR(50) NOT NULL,
    row_number VARCHAR(50),
    plot_type VARCHAR(50) NOT NULL DEFAULT 'single',
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    boundary GEOMETRY(POLYGON, 4326),
    center_point GEOMETRY(POINT, 4326),
    depth DECIMAL(5, 2),
    width DECIMAL(5, 2),
    length DECIMAL(5, 2),
    price DECIMAL(12, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    max_occupants INTEGER NOT NULL DEFAULT 1,
    current_occupants INTEGER NOT NULL DEFAULT 0,
    orientation VARCHAR(20),
    has_vault BOOLEAN DEFAULT FALSE,
    is_corner_plot BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(tenant_id, cemetery_id, section_id, plot_number),
    CONSTRAINT chk_plot_type CHECK (plot_type IN ('single', 'double', 'family', 'cremation_niche', 'mausoleum_crypt', 'companion')),
    CONSTRAINT chk_plot_status CHECK (status IN ('available', 'occupied', 'reserved', 'closed', 'maintenance')),
    CONSTRAINT chk_occupants CHECK (current_occupants <= max_occupants)
);

CREATE INDEX idx_plots_tenant ON plots(tenant_id);
CREATE INDEX idx_plots_cemetery ON plots(cemetery_id);
CREATE INDEX idx_plots_section ON plots(section_id);
CREATE INDEX idx_plots_status ON plots(tenant_id, status);
CREATE INDEX idx_plots_boundary ON plots USING GIST(boundary);
CREATE INDEX idx_plots_center ON plots USING GIST(center_point);

-- Prevent double-sold plots: enforce status-based availability
CREATE OR REPLACE FUNCTION fn_prevent_double_sold()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'occupied' AND OLD.status = 'occupied' THEN
        -- Allow updates to existing occupied plots
        RETURN NEW;
    END IF;
    IF NEW.status = 'occupied' AND OLD.current_occupants >= OLD.max_occupants THEN
        RAISE EXCEPTION 'Plot cannot be marked occupied: max occupants reached';
    END IF;
    IF NEW.status = 'reserved' AND OLD.status IN ('occupied', 'reserved') THEN
        RAISE EXCEPTION 'Plot already reserved or occupied';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_double_sold
BEFORE UPDATE ON plots
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_double_sold();

-- ==========================================
-- Persons (deceased, owners, contacts)
-- ==========================================
CREATE TABLE persons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    maiden_name VARCHAR(100),
    person_type VARCHAR(50) NOT NULL DEFAULT 'deceased',
    date_of_birth DATE,
    date_of_death DATE,
    date_of_burial DATE,
    birth_place VARCHAR(255),
    death_place VARCHAR(255),
    bio TEXT,
    religion VARCHAR(100),
    military_branch VARCHAR(100),
    military_rank VARCHAR(100),
    obituary_url VARCHAR(500),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_person_type CHECK (person_type IN ('deceased', 'owner', 'contact', 'next_of_kin'))
);

CREATE INDEX idx_persons_tenant ON persons(tenant_id);
CREATE INDEX idx_persons_name ON persons(tenant_id, last_name, first_name);
CREATE INDEX idx_persons_burial ON persons(tenant_id, date_of_burial);

-- ==========================================
-- Graves
-- ==========================================
CREATE TABLE graves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plot_id UUID NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    grave_number VARCHAR(50),
    gps_location GEOMETRY(POINT, 4326),
    depth DECIMAL(5, 2),
    headstone_type VARCHAR(100),
    headstone_inscription TEXT,
    headstone_material VARCHAR(100),
    has_vase BOOLEAN DEFAULT FALSE,
    has_lights BOOLEAN DEFAULT FALSE,
    has_photo BOOLEAN DEFAULT FALSE,
    condition VARCHAR(50) DEFAULT 'good',
    condition_notes TEXT,
    burial_date DATE,
    exhumed_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_grave_condition CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'unknown'))
);

CREATE INDEX idx_graves_tenant ON graves(tenant_id);
CREATE INDEX idx_graves_plot ON graves(plot_id);
CREATE INDEX idx_graves_person ON graves(person_id);
CREATE INDEX idx_graves_location ON graves USING GIST(gps_location);

-- Update plot occupancy when grave changes
CREATE OR REPLACE FUNCTION fn_update_plot_occupancy()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
        UPDATE plots SET current_occupants = current_occupants + 1 WHERE id = NEW.plot_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        UPDATE plots SET current_occupants = GREATEST(current_occupants - 1, 0) WHERE id = NEW.plot_id;
    ELSIF TG_OP = 'DELETE' AND OLD.deleted_at IS NULL THEN
        UPDATE plots SET current_occupants = GREATEST(current_occupants - 1, 0) WHERE id = OLD.plot_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_plot_occupancy
AFTER INSERT OR UPDATE OR DELETE ON graves
FOR EACH ROW
EXECUTE FUNCTION fn_update_plot_occupancy();

-- ==========================================
-- Photos
-- ==========================================
CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    storage_provider VARCHAR(50) DEFAULT 'minio',
    caption TEXT,
    taken_at TIMESTAMPTZ,
    gps_location GEOMETRY(POINT, 4326),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_photo_entity_type CHECK (entity_type IN ('cemetery', 'section', 'plot', 'grave', 'person', 'document'))
);

CREATE INDEX idx_photos_tenant ON photos(tenant_id);
CREATE INDEX idx_photos_entity ON photos(tenant_id, entity_type, entity_id);
CREATE INDEX idx_photos_location ON photos USING GIST(gps_location);

-- ==========================================
-- Documents
-- ==========================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    storage_key VARCHAR(500),
    storage_provider VARCHAR(50) DEFAULT 'minio',
    issued_date DATE,
    expiry_date DATE,
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_doc_entity_type CHECK (entity_type IN ('cemetery', 'section', 'plot', 'grave', 'person', 'work_order'))
);

CREATE INDEX idx_documents_tenant ON documents(tenant_id);
CREATE INDEX idx_documents_entity ON documents(tenant_id, entity_type, entity_id);

-- ==========================================
-- Work Orders
-- ==========================================
CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    cemetery_id UUID NOT NULL REFERENCES cemeteries(id) ON DELETE CASCADE,
    plot_id UUID REFERENCES plots(id) ON DELETE SET NULL,
    grave_id UUID REFERENCES graves(id) ON DELETE SET NULL,
    wo_number VARCHAR(100) NOT NULL,
    work_type VARCHAR(100) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    description TEXT NOT NULL,
    scheduled_date DATE,
    completed_date DATE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    cost DECIMAL(12, 2),
    vendor_name VARCHAR(255),
    location_point GEOMETRY(POINT, 4326),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(tenant_id, wo_number),
    CONSTRAINT chk_wo_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    CONSTRAINT chk_wo_status CHECK (status IN ('open', 'in_progress', 'on_hold', 'completed', 'cancelled'))
);

CREATE INDEX idx_work_orders_tenant ON work_orders(tenant_id);
CREATE INDEX idx_work_orders_cemetery ON work_orders(cemetery_id);
CREATE INDEX idx_work_orders_status ON work_orders(tenant_id, status);
CREATE INDEX idx_work_orders_location ON work_orders USING GIST(location_point);

-- ==========================================
-- Audit Log
-- ==========================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_log_table ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ==========================================
-- Change Log (for sync)
-- ==========================================
CREATE TABLE change_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(10) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    checksum VARCHAR(64),
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    device_id VARCHAR(255),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    payload JSONB NOT NULL,
    is_conflicted BOOLEAN DEFAULT FALSE,
    conflict_resolved_at TIMESTAMPTZ,
    conflict_resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_change_operation CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE'))
);

CREATE INDEX idx_change_log_tenant ON change_log(tenant_id);
CREATE INDEX idx_change_log_table ON change_log(tenant_id, table_name, record_id);
CREATE INDEX idx_change_log_version ON change_log(tenant_id, table_name, record_id, version);
CREATE INDEX idx_change_log_changed_at ON change_log(tenant_id, changed_at);
CREATE INDEX idx_change_log_conflicted ON change_log(tenant_id, is_conflicted);

-- ==========================================
-- Auto-update updated_at columns
-- ==========================================
CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'tenants', 'users', 'cemeteries', 'sections', 'plots',
        'persons', 'graves', 'photos', 'documents', 'work_orders'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_update_updated_at();',
            tbl, tbl
        );
    END LOOP;
END $$;
