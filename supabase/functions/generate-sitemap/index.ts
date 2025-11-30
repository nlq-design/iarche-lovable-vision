import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=3600', // Cache 1h
}

const SITE_URL = 'https://iarche.fr'

// Pages statiques avec leur configuration SEO
const staticPages = [
  { url: '/', changefreq: 'weekly', priority: '1.0' },
  { url: '/services', changefreq: 'monthly', priority: '0.9' },
  { url: '/services/audit', changefreq: 'monthly', priority: '0.8' },
  { url: '/services/developpement', changefreq: 'monthly', priority: '0.8' },
  { url: '/services/accompagnement', changefreq: 'monthly', priority: '0.8' },
  { url: '/services/conformite', changefreq: 'monthly', priority: '0.8' },
  { url: '/solutions', changefreq: 'monthly', priority: '0.9' },
  { url: '/contact', changefreq: 'monthly', priority: '0.8' },
  { url: '/newsletter', changefreq: 'monthly', priority: '0.6' },
  { url: '/livre-or', changefreq: 'weekly', priority: '0.6' },
  { url: '/actualites', changefreq: 'daily', priority: '0.8' },
  { url: '/articles', changefreq: 'daily', priority: '0.8' },
  { url: '/cas-clients', changefreq: 'weekly', priority: '0.8' },
  { url: '/livres-blancs', changefreq: 'monthly', priority: '0.7' },
  { url: '/ateliers-webinaires', changefreq: 'weekly', priority: '0.7' },
  { url: '/mentions-legales', changefreq: 'yearly', priority: '0.3' },
  { url: '/conditions-generales', changefreq: 'yearly', priority: '0.3' },
  { url: '/confidentialite', changefreq: 'yearly', priority: '0.3' },
]

// Mapping resource_type → URL prefix
const resourceTypeToPath: Record<string, string> = {
  'actualite': '/actualites',
  'article': '/articles',
  'cas-client': '/cas-clients',
  'livre-blanc': '/livres-blancs',
  'atelier-webinaire': '/ateliers-webinaires',
  'service': '/services',
  'solution': '/solutions',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Generating dynamic sitemap...')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Récupérer tous les articles publiés avec leurs métadonnées
    const { data: articles, error } = await supabase
      .from('articles')
      .select('slug, resource_type, updated_at, published_at')
      .eq('published', true)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching articles:', error)
      throw error
    }

    console.log(`Found ${articles?.length || 0} published articles`)

    // Générer les URLs des articles avec lastmod dynamique
    const articleUrls = (articles || []).map(article => {
      const basePath = resourceTypeToPath[article.resource_type] || '/articles'
      const lastmod = article.updated_at 
        ? new Date(article.updated_at).toISOString().split('T')[0] 
        : article.published_at
        ? new Date(article.published_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]
      
      return {
        url: `${basePath}/${article.slug}`,
        lastmod,
        changefreq: 'monthly',
        priority: '0.6',
      }
    })

    // Date actuelle pour les pages statiques
    const today = new Date().toISOString().split('T')[0]
    
    // Construire le XML du sitemap
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${staticPages.map(page => `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
${articleUrls.map(article => `  <url>
    <loc>${SITE_URL}${article.url}</loc>
    <lastmod>${article.lastmod}</lastmod>
    <changefreq>${article.changefreq}</changefreq>
    <priority>${article.priority}</priority>
  </url>`).join('\n')}
</urlset>`

    console.log('Sitemap generated successfully')
    
    return new Response(xml, { 
      headers: corsHeaders,
      status: 200 
    })

  } catch (error) {
    console.error('Sitemap generation error:', error)
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<error>Error generating sitemap</error>`, 
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/xml; charset=utf-8'
        }
      }
    )
  }
})
