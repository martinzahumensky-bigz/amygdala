-- Fix schema permissions for service_role and other roles
-- service_role needs full access to all tables for API operations

-- Grant full access to service_role on amygdala schema
GRANT ALL ON SCHEMA amygdala TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA amygdala TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA amygdala TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA amygdala TO service_role;

-- Grant full access to service_role on meridian schema
GRANT ALL ON SCHEMA meridian TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA meridian TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA meridian TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA meridian TO service_role;

-- Also grant to anon for public API access (with RLS protection)
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA amygdala TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA amygdala TO anon;

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA meridian TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA meridian TO anon;

-- Grant to authenticated users as well
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA amygdala TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA amygdala TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA meridian TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA meridian TO authenticated;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA amygdala GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA amygdala GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA amygdala GRANT SELECT, INSERT, UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA amygdala GRANT USAGE ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA amygdala GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA amygdala GRANT USAGE ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA meridian GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA meridian GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA meridian GRANT SELECT, INSERT, UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA meridian GRANT USAGE ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA meridian GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA meridian GRANT USAGE ON SEQUENCES TO authenticated;
