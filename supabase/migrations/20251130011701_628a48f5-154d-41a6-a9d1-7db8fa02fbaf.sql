-- Add ressources_complementaires column to articles table
ALTER TABLE public.articles 
ADD COLUMN IF NOT EXISTS ressources_complementaires jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.articles.ressources_complementaires IS 'Array of complementary resources: [{titre: string, url: string}]';