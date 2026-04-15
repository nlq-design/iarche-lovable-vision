import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { COLORS } from '@/components/admin/medias/shared/tokens';
import EventLandingForm from '@/components/events/EventLandingForm';

interface InvitationSection {
  id: string;
  order: number;
  title: string;
  content: string;
}

interface InvitationMetadata {
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  eventType?: string;
  organizerName?: string;
}

interface InvitationDocument {
  id: string;
  title: string;
  status: string;
  slug: string;
  article_id: string | null;
  content_json: {
    sections?: InvitationSection[];
    metadata?: InvitationMetadata;
  };
  created_at: string;
}

const EventLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const [doc, setDoc] = useState<InvitationDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) loadDocument();
  }, [slug]);

  const loadDocument = async () => {
    const { data, error: err } = await supabase
      .from('generated_documents')
      .select('id, title, status, slug, article_id, content_json, created_at')
      .eq('slug', slug!)
      .eq('status', 'approved')
      .single();

    if (err || !data) {
      setError('Événement non trouvé');
      setLoading(false);
      return;
    }
    setDoc(data as unknown as InvitationDocument);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Événement non trouvé</h1>
          <p className="text-muted-foreground">Ce programme n'est pas disponible ou n'a pas encore été publié.</p>
        </div>
      </div>
    );
  }

  const { sections = [], metadata = {} } = doc.content_json || {};
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const pageTitle = metadata.eventTitle || doc.title;

  return (
    <>
      <Helmet>
        <title>{pageTitle} - IArche</title>
        <meta name="description" content={`${pageTitle} - Programme et inscription`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-4xl py-8 px-6">

          {/* Hero Section */}
          <section
            className="relative rounded-2xl overflow-hidden mb-8"
            style={{
              background: `linear-gradient(135deg, ${COLORS.bleuNuit} 0%, ${COLORS.bleuNuit}dd 50%, ${COLORS.terracotta}40 100%)`,
              minHeight: '360px'
            }}
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 right-10 w-64 h-64 rounded-full" style={{ background: COLORS.terracotta, filter: 'blur(80px)' }} />
              <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full" style={{ background: '#4A90D9', filter: 'blur(60px)' }} />
            </div>

            <div className="relative z-10 p-10 md:p-16 flex flex-col justify-center min-h-[360px]">
              <div className="mb-8">
                <img src="/logos/iarche-main.svg" alt="IArche" className="h-8 brightness-0 invert" />
              </div>

              {metadata.eventType && (
                <Badge className="w-fit mb-4 text-xs" style={{ background: COLORS.terracotta, color: 'white' }}>
                  {metadata.eventType}
                </Badge>
              )}

              <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
                {pageTitle}
              </h1>

              <div className="flex flex-wrap gap-4 mt-6 text-white/90 text-sm md:text-base">
                {metadata.eventDate && (
                  <span className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                    📅 {metadata.eventDate}
                  </span>
                )}
                {metadata.eventLocation && (
                  <span className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                    📍 {metadata.eventLocation}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Content Sections */}
          {sortedSections.map((section, index) => {
            if (section.id === 'hero') return null;
            return (
              <section key={section.id} className="mb-8">
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 px-8 pt-8 pb-4">
                    <div
                      className="w-1 h-8 rounded-full"
                      style={{ background: index % 2 === 0 ? COLORS.terracotta : '#4A90D9' }}
                    />
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">
                      {section.title}
                    </h2>
                  </div>
                  <div
                    className="px-8 pb-8 prose prose-sm md:prose-base max-w-none
                      prose-headings:text-foreground prose-headings:font-semibold
                      prose-p:text-muted-foreground prose-p:leading-relaxed
                      prose-strong:text-foreground
                      prose-ul:text-muted-foreground prose-li:text-muted-foreground
                      prose-table:text-sm
                      [&_table]:w-full [&_table]:border-collapse
                      [&_th]:bg-muted/50 [&_th]:text-left [&_th]:px-4 [&_th]:py-3 [&_th]:font-semibold [&_th]:text-foreground [&_th]:border-b
                      [&_td]:px-4 [&_td]:py-3 [&_td]:border-b [&_td]:border-border
                      [&_tr:last-child_td]:border-b-0
                      [&_.invitation-hero]:hidden
                    "
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                </div>
              </section>
            );
          })}

          {/* Registration Form */}
          {doc.article_id && (
            <section id="inscription" className="mb-8">
              <div
                className="rounded-xl border-2 overflow-hidden p-8"
                style={{
                  borderColor: `${COLORS.terracotta}30`,
                  background: `${COLORS.terracotta}05`,
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-1 h-8 rounded-full" style={{ background: COLORS.terracotta }} />
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">
                    Inscription
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground mb-6 ml-4 pl-px">
                  Remplissez ce formulaire pour confirmer votre participation.
                </p>
                <EventLandingForm articleId={doc.article_id} />
              </div>
            </section>
          )}

          {/* Footer */}
          <section className="mt-12 mb-8 text-center">
            <div className="bg-muted/30 rounded-xl p-8">
              <img src="/logos/iarche-main.svg" alt="IArche" className="h-6 mx-auto mb-4 opacity-60" />
              <p className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} IArche • Programme officiel
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default EventLanding;
