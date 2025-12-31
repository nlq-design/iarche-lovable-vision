-- Add total_chunks column to vectorization_status for tracking chunk count per resource type
ALTER TABLE public.vectorization_status 
ADD COLUMN IF NOT EXISTS total_chunks INTEGER DEFAULT 0;