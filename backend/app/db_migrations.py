"""
Lightweight SQLite migrations for schema changes without Alembic.
Currently adds missing columns and indexes for competency_dictionaries.
"""
from sqlalchemy import text
from sqlalchemy.engine import Engine


def _column_missing(engine: Engine, table: str, column: str) -> bool:
    with engine.connect() as conn:
        rows = conn.execute(text(f"PRAGMA table_info({table})")).mappings().all()
        cols = {r["name"] for r in rows}
        return column not in cols


def _index_missing(engine: Engine, table: str, index_name: str) -> bool:
    with engine.connect() as conn:
        # SQLite PRAGMA does not support bound parameters; inline table name safely
        rows = conn.execute(text(f"PRAGMA index_list({table})")).mappings().all()
        names = {r["name"] for r in rows}
        return index_name not in names


def _table_missing(engine: Engine, table: str) -> bool:
    """Check if a table exists in the database."""
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")).fetchone()
        return result is None


def migrate_competency_dictionary(engine: Engine):
    """Ensure competency_dictionaries has competency_code and proper unique indexes."""
    table = "competency_dictionaries"

    # Add competency_code if missing
    if _column_missing(engine, table, "competency_code"):
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN competency_code VARCHAR(100)"))

    # Drop old single-column unique index if exists to allow composite uniqueness
    if not _index_missing(engine, table, "ux_competency_code"):
        with engine.connect() as conn:
            conn.execute(text(f"DROP INDEX IF EXISTS ux_competency_code"))

    # Create composite unique index per-tenant on (tenant_id, competency_code)
    if _index_missing(engine, table, "ux_competency_tenant_code"):
        with engine.connect() as conn:
            conn.execute(text(f"CREATE UNIQUE INDEX ux_competency_tenant_code ON {table} (tenant_id, competency_code)"))


def migrate_assignment_tables(engine: Engine):
    """Create user_assignments and test_assignments tables if they don't exist."""
    # User assignments table
    if _table_missing(engine, "user_assignments"):
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE user_assignments (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36) NOT NULL,
                    admin_id VARCHAR(36) NOT NULL,
                    tenant_id VARCHAR(36) NOT NULL,
                    assigned_by VARCHAR(36) NOT NULL,
                    is_active BOOLEAN DEFAULT 1,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                    FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE CASCADE,
                    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
                    FOREIGN KEY (assigned_by) REFERENCES users (id),
                    UNIQUE (user_id, admin_id)
                )
            """))
    
    # Test assignments table
    if _table_missing(engine, "test_assignments"):
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE TABLE test_assignments (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36) NOT NULL,
                    admin_id VARCHAR(36) NOT NULL,
                    tenant_id VARCHAR(36) NOT NULL,
                    test_type VARCHAR(10) NOT NULL CHECK (test_type IN ('JDT', 'SJT')),
                    due_date TIMESTAMP,
                    max_attempts INTEGER DEFAULT 3,
                    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'started', 'completed', 'overdue', 'cancelled')),
                    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    started_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    custom_config TEXT,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                    FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE CASCADE,
                    FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
                    UNIQUE (user_id, test_type)
                )
            """))


def migrate_enhanced_media_and_submissions(engine: Engine):
    """Add enhanced columns for better media organization and submission tracking."""
    
    # Enhanced MediaFile columns
    media_file_table = "media_files"
    
    # Add new columns to media_files if missing
    if _column_missing(engine, media_file_table, "scenario_id"):
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {media_file_table} ADD COLUMN scenario_id VARCHAR(100)"))
    
    if _column_missing(engine, media_file_table, "is_follow_up"):
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {media_file_table} ADD COLUMN is_follow_up BOOLEAN DEFAULT 0"))
    
    if _column_missing(engine, media_file_table, "follow_up_sequence"):
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {media_file_table} ADD COLUMN follow_up_sequence INTEGER DEFAULT 0"))
    
    if _column_missing(engine, media_file_table, "firebase_path"):
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {media_file_table} ADD COLUMN firebase_path TEXT"))
    
    if _column_missing(engine, media_file_table, "transcription_status"):
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {media_file_table} ADD COLUMN transcription_status VARCHAR(50) DEFAULT 'pending'"))
    
    if _column_missing(engine, media_file_table, "transcription_text"):
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {media_file_table} ADD COLUMN transcription_text TEXT"))
    
    # Update storage_provider default to firebase for existing records
    with engine.connect() as conn:
        conn.execute(text(f"UPDATE {media_file_table} SET storage_provider = 'firebase' WHERE storage_provider = 'local'"))
    
    # Enhanced Submission columns
    submissions_table = "submissions"
    
    if _column_missing(engine, submissions_table, "total_questions"):
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {submissions_table} ADD COLUMN total_questions INTEGER DEFAULT 0"))
    
    if _column_missing(engine, submissions_table, "base_questions"):
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {submissions_table} ADD COLUMN base_questions INTEGER DEFAULT 0"))
    
    if _column_missing(engine, submissions_table, "follow_up_questions"):
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {submissions_table} ADD COLUMN follow_up_questions INTEGER DEFAULT 0"))
    
    if _column_missing(engine, submissions_table, "test_configuration"):
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {submissions_table} ADD COLUMN test_configuration JSON"))


def run_migrations(engine: Engine):
    """Run all lightweight migrations."""
    # Add any future migrations here
    migrate_competency_dictionary(engine)
    migrate_assignment_tables(engine)
    migrate_enhanced_media_and_submissions(engine)
