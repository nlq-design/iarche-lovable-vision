import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Download, Printer } from 'lucide-react';
import { COLORS } from '@/components/admin/medias/shared/tokens';
import LogoArc from '@/components/ui/LogoArc';

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
  content_json: {
    sections?: InvitationSection[];
    metadata?: InvitationMetadata;
  };
  created_at: string;
  article_id?: string;
}

const AdminInvitationPreview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [doc, setDoc] = useState<InvitationDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (id && user && isAdmin) {
      loadDocument();
    }
  }, [id, user, isAdmin]);

  const loadDocument = async () => {
    const { data, error } = await supabase
      .from('generated_documents')
      .select('id, title, status, content_json, created_at, article_id')
      .eq('id', id!)
      .single();

    if (error || !data) {
      navigate('/admin/ateliers-webinaires');
      return;
    }
    setDoc(data as unknown as InvitationDocument);
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (authLoading || loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!doc) return null;

  const { sections = [], metadata = {} } = doc.content_json || {};
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <AdminLayout>
      <Helmet>
        <title>{doc.title} - Admin IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Admin toolbar - hidden on print */}
      <div className="print:hidden sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-6 py-3">
        <div className="container mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/ateliers-webinaires')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
            <Badge variant="secondary">{doc.status}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              Imprimer / PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Document content - brochure-style */}
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-4xl py-8 px-6 print:px-0 print:py-0">
          
          {/* Hero Section */}
          <section 
            className="relative rounded-2xl overflow-hidden mb-8 print:rounded-none print:mb-0 print:break-after-page"
            style={{ 
              background: `linear-gradient(135deg, ${COLORS.bleuNuit} 0%, ${COLORS.bleuNuit}dd 50%, ${COLORS.terracotta}40 100%)`,
              minHeight: '400px'
            }}
          >
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 right-10 w-64 h-64 rounded-full" style={{ background: COLORS.terracotta, filter: 'blur(80px)' }} />
              <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full" style={{ background: '#4A90D9', filter: 'blur(60px)' }} />
            </div>
            
            <div className="relative z-10 p-10 md:p-16 flex flex-col justify-center min-h-[400px]">
              <div className="mb-8">
                <img src="/logos/iarche-main.svg" alt="IArche" className="h-8 brightness-0 invert" />
              </div>
              
              {metadata.eventType && (
                <Badge className="w-fit mb-4 text-xs" style={{ background: COLORS.terracotta, color: 'white' }}>
                  {metadata.eventType}
                </Badge>
              )}
              
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
                {metadata.eventTitle || doc.title}
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
            if (section.id === 'hero') return null; // Already rendered above via metadata

            return (
              <section 
                key={section.id} 
                className="mb-8 print:break-inside-avoid print:mb-4"
              >
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden print:shadow-none print:border-0">
                  {/* Section header with accent bar */}
                  <div className="flex items-center gap-3 px-8 pt-8 pb-4">
                    <div 
                      className="w-1 h-8 rounded-full" 
                      style={{ background: index % 2 === 0 ? COLORS.terracotta : '#4A90D9' }}
                    />
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">
                      {section.title}
                    </h2>
                  </div>
                  
                  {/* Section content */}
                  <div 
                    className="px-8 pb-8 prose prose-sm md:prose-base max-w-none
                      prose-headings:text-foreground prose-headings:font-semibold
                      prose-p:text-muted-foreground prose-p:leading-relaxed
                      prose-strong:text-foreground
                      prose-ul:text-muted-foreground
                      prose-li:text-muted-foreground
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

          {/* Footer */}
          <section className="mt-12 mb-8 text-center print:mt-4">
            <div className="bg-muted/30 rounded-xl p-8 print:bg-transparent">
              <img src="/logos/iarche-main.svg" alt="IArche" className="h-6 mx-auto mb-4 opacity-60" />
              <p className="text-xs text-muted-foreground">
                Document généré automatiquement par IArche • {new Date(doc.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminInvitationPreview;
