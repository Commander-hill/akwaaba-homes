-- =============================================================================
-- AkwaabaHomes PostgreSQL Least-Privilege Runtime Role Hardening
-- Run as the database owner / migration role AFTER running `prisma migrate deploy`.
-- Use the schema owner ONLY for migrations, and configure DATABASE_URL in the
-- running API to connect as `akwaaba_app`.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'akwaaba_app') THEN
    CREATE ROLE akwaaba_app WITH LOGIN PASSWORD 'CHANGE_THIS_STRONG_RANDOM_PASSWORD' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

-- Prevent runtime role from creating objects or altering schemas
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM akwaaba_app;
GRANT USAGE ON SCHEMA public TO akwaaba_app;

-- Standard CRUD on application tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO akwaaba_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO akwaaba_app;

-- Enforce append-only immutability on AuditLog (no UPDATE / DELETE / TRUNCATE)
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE "AuditLog" FROM akwaaba_app;
GRANT SELECT, INSERT ON TABLE "AuditLog" TO akwaaba_app;

-- Apply default privileges to future tables created by migrations
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO akwaaba_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO akwaaba_app;

-- Enforce per-role query timeout (15 seconds) to mitigate slow-query DoS
ALTER ROLE akwaaba_app SET statement_timeout = '15s';
ALTER ROLE akwaaba_app SET idle_in_transaction_session_timeout = '30s';
