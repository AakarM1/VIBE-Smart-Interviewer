-- =====================================================
-- TRAJECTORIE ASSESSMENT PLATFORM - POSTGRESQL SCHEMA
-- =====================================================
-- Multi-tenant assessment platform with role-based access control
-- Migrated from Firebase/Firestore to PostgreSQL
-- Supports SJT (Situational Judgment Tests) and JDT (Job Diagnostic Tests)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- USERS TABLE - Multi-tenant user management
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    candidate_name VARCHAR(255) NOT NULL,
    candidate_id VARCHAR(100) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('superadmin', 'admin', 'candidate')),
    
    -- Multi-language support
    preferred_language VARCHAR(10) DEFAULT 'en',
    language_code VARCHAR(10) DEFAULT 'en',
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Multi-tenant isolation
    tenant_id UUID, -- For company isolation (admin users manage their tenant)
    
    UNIQUE(candidate_id, client_name)
);

-- =====================================================
-- TENANTS TABLE - Company/Organization management
-- =====================================================
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    logo_url TEXT,
    custom_branding JSONB,
    
    -- Configuration overrides
    max_test_attempts INTEGER DEFAULT 3,
    allowed_test_types TEXT[] DEFAULT ARRAY['JDT', 'SJT'],
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- SUBMISSIONS TABLE - Test results and analysis
-- =====================================================
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Basic submission info
    candidate_name VARCHAR(255) NOT NULL,
    candidate_id VARCHAR(100) NOT NULL,
    test_type VARCHAR(10) NOT NULL CHECK (test_type IN ('JDT', 'SJT')),
    
    -- Multi-language support
    candidate_language VARCHAR(10) DEFAULT 'en',
    ui_language VARCHAR(10) DEFAULT 'en',
    
    -- Test data
    conversation_history JSONB NOT NULL,
    analysis_result JSONB,
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'submitted' CHECK (status IN ('submitted', 'analyzing', 'completed', 'failed')),
    analysis_completed BOOLEAN DEFAULT FALSE,
    analysis_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Performance optimization
    CONSTRAINT valid_conversation_history CHECK (jsonb_typeof(conversation_history) = 'array')
);

-- =====================================================
-- MEDIA_FILES TABLE - Video/Audio file management
-- =====================================================
CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
    
    -- File metadata
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('video', 'audio')),
    mime_type VARCHAR(100),
    file_size BIGINT,
    
    -- Question association
    question_index INTEGER NOT NULL,
    
    -- Storage details
    storage_provider VARCHAR(50) DEFAULT 'local' CHECK (storage_provider IN ('local', 's3', 'firebase')),
    storage_url TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- CONFIGURATIONS TABLE - Test and system configuration
-- =====================================================
CREATE TABLE configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Configuration type and scope
    config_type VARCHAR(50) NOT NULL CHECK (config_type IN ('jdt', 'sjt', 'global')),
    scope VARCHAR(50) DEFAULT 'tenant' CHECK (scope IN ('system', 'tenant')),
    
    -- Configuration data
    config_data JSONB NOT NULL,
    
    -- Versioning
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Ensure only one active config per type per tenant
    CONSTRAINT unique_active_config UNIQUE (tenant_id, config_type, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- =====================================================
-- COMPETENCY_DICTIONARIES TABLE - Competency definitions
-- =====================================================
CREATE TABLE competency_dictionaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Competency details
    competency_name VARCHAR(255) NOT NULL,
    competency_description TEXT,
    meta_competency VARCHAR(255),
    
    -- Scoring parameters
    max_score INTEGER DEFAULT 10,
    weight DECIMAL(3,2) DEFAULT 1.0,
    
    -- Multi-language support
    translations JSONB,
    
    -- Category and classification
    category VARCHAR(100),
    industry VARCHAR(100),
    role_category VARCHAR(100),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    
    UNIQUE(tenant_id, competency_name, is_active)
);

-- =====================================================
-- TEST_TEMPLATES TABLE - Predefined test configurations
-- =====================================================
CREATE TABLE test_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Template metadata
    template_name VARCHAR(255) NOT NULL,
    template_description TEXT,
    test_type VARCHAR(10) NOT NULL CHECK (test_type IN ('JDT', 'SJT')),
    
    -- Template configuration
    template_config JSONB NOT NULL,
    
    -- Competency mappings
    competency_mappings JSONB,
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- USER_SESSIONS TABLE - Session management
-- =====================================================
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session details
    session_token VARCHAR(512) UNIQUE NOT NULL,
    refresh_token VARCHAR(512) UNIQUE,
    
    -- Session metadata
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    
    -- Session timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Session status
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoke_reason VARCHAR(255)
);

-- =====================================================
-- AUDIT_LOGS TABLE - System audit trail
-- =====================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    
    -- Change tracking
    old_values JSONB,
    new_values JSONB,
    
    -- Request metadata
    ip_address INET,
    user_agent TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_candidate_id ON users(candidate_id);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_client_name ON users(client_name);

-- Submissions table indexes
CREATE INDEX idx_submissions_user_id ON submissions(user_id);
CREATE INDEX idx_submissions_tenant_id ON submissions(tenant_id);
CREATE INDEX idx_submissions_test_type ON submissions(test_type);
CREATE INDEX idx_submissions_candidate_id ON submissions(candidate_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_created_at ON submissions(created_at);
CREATE INDEX idx_submissions_analysis_completed ON submissions(analysis_completed);

-- Media files indexes
CREATE INDEX idx_media_files_submission_id ON media_files(submission_id);
CREATE INDEX idx_media_files_file_type ON media_files(file_type);
CREATE INDEX idx_media_files_question_index ON media_files(question_index);

-- Configurations indexes
CREATE INDEX idx_configurations_tenant_id ON configurations(tenant_id);
CREATE INDEX idx_configurations_config_type ON configurations(config_type);
CREATE INDEX idx_configurations_is_active ON configurations(is_active);

-- Competency dictionaries indexes
CREATE INDEX idx_competency_dictionaries_tenant_id ON competency_dictionaries(tenant_id);
CREATE INDEX idx_competency_dictionaries_category ON competency_dictionaries(category);
CREATE INDEX idx_competency_dictionaries_role_category ON competency_dictionaries(role_category);

-- Test templates indexes
CREATE INDEX idx_test_templates_tenant_id ON test_templates(tenant_id);
CREATE INDEX idx_test_templates_test_type ON test_templates(test_type);
CREATE INDEX idx_test_templates_is_active ON test_templates(is_active);

-- User sessions indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_is_active ON user_sessions(is_active);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic updated_at updates
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER submissions_updated_at BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER media_files_updated_at BEFORE UPDATE ON media_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER configurations_updated_at BEFORE UPDATE ON configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER competency_dictionaries_updated_at BEFORE UPDATE ON competency_dictionaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER test_templates_updated_at BEFORE UPDATE ON test_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    action_type VARCHAR(10);
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type := 'CREATE';
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'UPDATE';
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'DELETE';
    END IF;
    
    -- Insert audit log
    INSERT INTO audit_logs (
        action,
        resource_type,
        resource_id,
        old_values,
        new_values
    ) VALUES (
        action_type,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        CASE 
            WHEN TG_OP = 'INSERT' THEN NULL
            ELSE row_to_json(OLD)
        END,
        CASE 
            WHEN TG_OP = 'DELETE' THEN NULL
            ELSE row_to_json(NEW)
        END
    );
    
    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for user statistics per tenant
CREATE VIEW user_statistics AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    COUNT(u.id) as total_users,
    COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admin_count,
    COUNT(CASE WHEN u.role = 'candidate' THEN 1 END) as candidate_count,
    COUNT(CASE WHEN u.last_login > NOW() - INTERVAL '30 days' THEN 1 END) as active_users_30d
FROM tenants t
LEFT JOIN users u ON t.id = u.tenant_id AND u.is_active = true
GROUP BY t.id, t.name;

-- View for submission statistics
CREATE VIEW submission_statistics AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    s.test_type,
    COUNT(s.id) as total_submissions,
    COUNT(CASE WHEN s.analysis_completed = true THEN 1 END) as completed_analyses,
    COUNT(CASE WHEN s.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as submissions_30d,
    AVG(EXTRACT(EPOCH FROM (s.analysis_completed_at - s.created_at))/60) as avg_analysis_time_minutes
FROM tenants t
LEFT JOIN submissions s ON t.id = s.tenant_id
GROUP BY t.id, t.name, s.test_type;

-- =====================================================
-- INITIAL DATA SETUP
-- =====================================================

-- Create system tenant for superadmin
INSERT INTO tenants (id, name, domain) 
VALUES ('00000000-0000-0000-0000-000000000001', 'System', 'system.trajectorie.com');

-- Create superadmin user
INSERT INTO users (
    id, 
    email, 
    password_hash, 
    candidate_name, 
    candidate_id, 
    client_name, 
    role, 
    tenant_id
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'superadmin@gmail.com',
    '$2b$12$placeholder_hash_replace_in_production',
    'Super Administrator',
    'SUPERADMIN001',
    'System',
    'superadmin',
    '00000000-0000-0000-0000-000000000001'
);

-- =====================================================
-- PERFORMANCE AND MAINTENANCE
-- =====================================================

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() OR (is_active = false AND revoked_at < NOW() - INTERVAL '7 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to archive old audit logs (optional, for large datasets)
CREATE OR REPLACE FUNCTION archive_old_audit_logs(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- In production, you might move to an archive table instead of deleting
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECURITY POLICIES (Row Level Security)
-- =====================================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data (unless admin/superadmin)
CREATE POLICY users_isolation ON users
    FOR ALL
    TO application_role
    USING (
        current_setting('app.current_user_id')::uuid = id OR
        current_setting('app.current_user_role') IN ('admin', 'superadmin') OR
        (current_setting('app.current_user_role') = 'admin' AND 
         current_setting('app.current_tenant_id')::uuid = tenant_id)
    );

-- Submissions isolation by tenant
CREATE POLICY submissions_isolation ON submissions
    FOR ALL
    TO application_role
    USING (
        current_setting('app.current_tenant_id')::uuid = tenant_id OR
        current_setting('app.current_user_role') = 'superadmin'
    );

-- Configurations isolation by tenant
CREATE POLICY configurations_isolation ON configurations
    FOR ALL
    TO application_role
    USING (
        current_setting('app.current_tenant_id')::uuid = tenant_id OR
        current_setting('app.current_user_role') = 'superadmin' OR
        scope = 'system'
    );

-- Media files follow submission access
CREATE POLICY media_files_isolation ON media_files
    FOR ALL
    TO application_role
    USING (
        EXISTS (
            SELECT 1 FROM submissions s 
            WHERE s.id = submission_id 
            AND (s.tenant_id = current_setting('app.current_tenant_id')::uuid OR
                 current_setting('app.current_user_role') = 'superadmin')
        )
    );

-- =====================================================
-- DATABASE ROLES
-- =====================================================

-- Create application role
CREATE ROLE application_role;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO application_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO application_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO application_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO application_role;

-- Create read-only role for reporting
CREATE ROLE readonly_role;
GRANT USAGE ON SCHEMA public TO readonly_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_role;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO readonly_role;

COMMENT ON SCHEMA public IS 'Trajectorie Assessment Platform - Multi-tenant PostgreSQL Schema';