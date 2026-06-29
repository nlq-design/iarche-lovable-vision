import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import {
  Section,
  Reveal,
  HeroEyebrow,
  SectionTitle,
  AnimatedArc,
  Particles,
  SolidCard,
} from '@/components/brand';
import EventLandingForm from '@/components/events/EventLandingForm';


interface InvitationSection {
  id: string;
  order: number;
  title: string;
  content: string;
}

interface ProgrammeRow {
  horaire: string;
  theme: string;
  intervenant: string;
}

interface InvitationMetadata {
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  eventType?: string;
  organizerName?: string;
  qrTitle?: string;
  qrDescription?: string;
  footerText?: string;
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
    modules?: {
      programme?: { rows: ProgrammeRow[] };
    };
  };
  created_at: string;
}

interface ArticleEventData {
  event_date?: string;
  event_location?: string;
  heure_debut?: string;
  type_evenement?: string;
}

const EventLanding = () => {
  const { slug } = useParams<{ slug: string }>();
  const [doc, setDoc] = useState<InvitationDocument | null>(null);
  const [articleData, setArticleData] = useState<ArticleEventData>({});
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

    // Fetch linked article event data for email notifications
    if (data.article_id) {
      const { data: article } = await supabase
        .from('articles')
        .select('event_date, event_location, heure_debut, type_evenement')
        .eq('id', data.article_id)
        .single();
      if (article) {
        setArticleData(article);
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="sec-light min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="sec-light min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="section-title text-2xl md:text-3xl font-semibold mb-2">Événement non trouvé</h1>
          <p className="text-text-subtle">Ce programme n'est pas disponible ou n'a pas encore été publié.</p>
        </div>
      </div>
    );
  }

  const { sections = [], metadata = {}, modules } = doc.content_json || {};
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const pageTitle = metadata.eventTitle || doc.title;
  const programmeRows = modules?.programme?.rows || [];

  const proseClasses = `prose prose-sm md:prose-base max-w-none
    prose-headings:text-foreground prose-headings:font-semibold
    prose-p:text-text-subtle prose-p:leading-relaxed
    prose-strong:text-foreground
    prose-ul:text-text-subtle prose-li:text-text-subtle
    prose-table:text-sm
    [&_table]:w-full [&_table]:border-collapse [&_table]:table-auto
    md:[&_th]:bg-muted/50 md:[&_th]:text-left md:[&_th]:px-4 md:[&_th]:py-3 md:[&_th]:font-semibold md:[&_th]:text-foreground md:[&_th]:border-b
    md:[&_td]:px-4 md:[&_td]:py-3 md:[&_td]:border-b md:[&_td]:border-border
    md:[&_tr:last-child_td]:border-b-0
    max-md:[&_table]:block max-md:[&_thead]:hidden max-md:[&_tbody]:block
    max-md:[&_tr]:block max-md:[&_tr]:bg-muted/30 max-md:[&_tr]:rounded-lg max-md:[&_tr]:p-3 max-md:[&_tr]:mb-3 max-md:[&_tr]:space-y-1
    max-md:[&_td]:block max-md:[&_td]:px-0 max-md:[&_td]:py-0 max-md:[&_td]:border-0 max-md:[&_td]:text-text-subtle
    max-md:[&_td:first-child]:text-xs max-md:[&_td:first-child]:font-semibold max-md:[&_td:first-child]:text-foreground
    max-md:[&_td:nth-child(2)]:text-sm
    max-md:[&_td:last-child]:text-xs max-md:[&_td:last-child]:text-text-subtle
    [&_.invitation-hero]:hidden
    [&_hr]:my-4 [&_hr]:border-border
    overflow-x-auto break-words [overflow-wrap:break-word]`;

  const isProgrammeSection = (section: InvitationSection) =>
    section.id === 'programme' && programmeRows.length > 0;

  return (
    <>
      <Helmet>
        <title>{pageTitle} - IArche</title>
        <meta name="description" content={`${pageTitle} - Programme et inscription`} />
      </Helmet>

      <main>
        {/* ── Hero (charte v4.0 — sec-dark + particules + arc) ──────── */}
        <section className="sec-dark relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24">
          <Particles />

          <div className="relative z-[1] mx-auto w-full max-w-[880px] px-7 md:px-11">
            <div className="mb-8">
              <Logo variant="white" size="md" />
            </div>

            {metadata.eventType && <HeroEyebrow>{metadata.eventType}</HeroEyebrow>}

            <h1 className="mt-6 text-[clamp(30px,5vw,56px)] font-semibold tracking-[-0.025em] leading-[1.05] text-white break-words [overflow-wrap:break-word]">
              {pageTitle}
            </h1>

            <AnimatedArc />

            {(metadata.eventDate || metadata.eventLocation) && (
              <div className="mt-8 flex flex-wrap gap-3">
                {metadata.eventDate && (
                  <span className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm text-white/85 break-words">
                    {metadata.eventDate}
                  </span>
                )}
                {metadata.eventLocation && (
                  <span className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm text-white/85 break-words">
                    {metadata.eventLocation}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Contenu (sections en cartes sable) ───────────────────── */}
        {sortedSections.some((s) => s.id !== 'hero' && s.id !== 'cta') && (
          <Section tone="light" container="narrow" spacing="compact">
            <div className="space-y-6">
              {sortedSections.map((section, index) => {
                if (section.id === 'hero' || section.id === 'cta') return null;
                return (
                  <Reveal key={section.id} delay={index * 60}>
                    <SolidCard>
                      <h2 className="text-[22px] md:text-2xl font-semibold text-foreground leading-tight mb-5 break-words [overflow-wrap:break-word]">
                        {section.title}
                      </h2>

                      {isProgrammeSection(section) ? (
                        <>
                          {/* Desktop table */}
                          <table className="hidden md:table w-full border-collapse table-auto text-sm">
                            <thead>
                              <tr>
                                <th className="bg-muted/50 text-left px-4 py-3 font-semibold text-foreground border-b">Horaire</th>
                                <th className="bg-muted/50 text-left px-4 py-3 font-semibold text-foreground border-b">Thème</th>
                                <th className="bg-muted/50 text-left px-4 py-3 font-semibold text-foreground border-b">Intervenant</th>
                              </tr>
                            </thead>
                            <tbody>
                              {programmeRows.map((row, ri) => (
                                <tr key={ri}>
                                  <td className="px-4 py-3 border-b border-border text-text-subtle break-words">{row.horaire}</td>
                                  <td className="px-4 py-3 border-b border-border text-text-subtle break-words">{row.theme}</td>
                                  <td className="px-4 py-3 border-b border-border text-text-subtle break-words">{row.intervenant}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {/* Mobile stacked cards */}
                          <div className="md:hidden space-y-3">
                            {programmeRows.map((row, ri) => (
                              <div key={ri} className="bg-muted/40 rounded-lg p-3 space-y-1">
                                <div className="text-xs font-semibold text-foreground">{row.horaire}</div>
                                <div className="text-sm text-text-subtle">{row.theme}</div>
                                {row.intervenant && (
                                  <div className="text-xs text-text-subtle/70">{row.intervenant}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div
                          className={proseClasses}
                          dangerouslySetInnerHTML={{ __html: section.content }}
                        />
                      )}
                    </SolidCard>
                  </Reveal>
                );
              })}
            </div>
          </Section>
        )}

        {/* ── Inscription (section warm) ───────────────────────────── */}
        {doc.article_id && (
          <Section tone="warm" container="narrow" spacing="compact" id="inscription">
            <Reveal>
              <SectionTitle as="h2" arc={false} eyebrow="Participer" lede={metadata.qrDescription || 'Remplissez ce formulaire pour confirmer votre participation.'}>
                {metadata.qrTitle || 'Inscription'}
              </SectionTitle>
              <div className="mt-8">
                <EventLandingForm
                  articleId={doc.article_id}
                  articleTitle={metadata.eventTitle || doc.title}
                  eventDate={articleData.event_date || metadata.eventDate}
                  eventLocation={articleData.event_location || metadata.eventLocation}
                  heureDebut={articleData.heure_debut}
                  typeEvenement={articleData.type_evenement || metadata.eventType}
                />
              </div>
            </Reveal>
          </Section>
        )}

        {/* ── Footer ───────────────────────────────────────────────── */}
        <Section tone="light" spacing="compact" container="narrow">
          <div className="text-center">
            <div className="mx-auto w-[160px] max-w-[55%]">
              <Logo variant="main" size="md" />
            </div>
            <p className="mt-5 text-xs text-text-subtle break-words [overflow-wrap:break-word]">
              {metadata.footerText || `© ${new Date().getFullYear()} IArche • Programme officiel`}
            </p>
          </div>
        </Section>
      </main>
    </>
  );
};

export default EventLanding;
