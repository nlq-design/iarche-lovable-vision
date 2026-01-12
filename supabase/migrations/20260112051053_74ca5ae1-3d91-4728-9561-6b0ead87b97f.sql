-- Add schedule columns to vivier_campaigns
ALTER TABLE vivier_campaigns 
  ADD COLUMN IF NOT EXISTS schedule_days JSONB DEFAULT '{"0": false, "1": true, "2": true, "3": true, "4": true, "5": true, "6": false}',
  ADD COLUMN IF NOT EXISTS schedule_timezone TEXT DEFAULT 'Europe/Paris',
  ADD COLUMN IF NOT EXISTS schedule_from TEXT DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS schedule_to TEXT DEFAULT '18:00';

-- Add index for quick lookup
CREATE INDEX IF NOT EXISTS idx_vivier_campaigns_schedule_tz ON vivier_campaigns(schedule_timezone);