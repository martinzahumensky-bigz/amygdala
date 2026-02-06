-- Visual Snapshots table for Data Trust Bubble
-- Stores extracted page data for comparison and AI analysis

CREATE TABLE IF NOT EXISTS amygdala.visual_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_url TEXT NOT NULL,
  page_title TEXT,
  asset_name TEXT,
  report_type TEXT,
  snapshot_data JSONB NOT NULL,
  kpi_count INTEGER DEFAULT 0,
  table_count INTEGER DEFAULT 0,
  alert_count INTEGER DEFAULT 0,
  ai_analysis JSONB, -- Stores AI analysis results
  comparison_result JSONB, -- Stores comparison with previous snapshot
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_visual_snapshots_asset
  ON amygdala.visual_snapshots(asset_name);
CREATE INDEX IF NOT EXISTS idx_visual_snapshots_page
  ON amygdala.visual_snapshots(page_url);
CREATE INDEX IF NOT EXISTS idx_visual_snapshots_created
  ON amygdala.visual_snapshots(created_at DESC);

-- Add comment
COMMENT ON TABLE amygdala.visual_snapshots IS 'Stores page data snapshots from Data Trust Bubble for comparison and AI analysis';

-- Grant permissions
GRANT ALL ON amygdala.visual_snapshots TO authenticated;
GRANT ALL ON amygdala.visual_snapshots TO service_role;
