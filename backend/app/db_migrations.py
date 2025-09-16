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


def run_migrations(engine: Engine):
    """Run all lightweight migrations."""
    # Add any future migrations here
    migrate_competency_dictionary(engine)
