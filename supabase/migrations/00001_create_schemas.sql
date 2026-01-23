-- Create schemas for organizing tables
CREATE SCHEMA IF NOT EXISTS amygdala;
CREATE SCHEMA IF NOT EXISTS meridian;

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA amygdala TO authenticated;
GRANT USAGE ON SCHEMA meridian TO authenticated;
GRANT USAGE ON SCHEMA amygdala TO anon;
GRANT USAGE ON SCHEMA meridian TO anon;
