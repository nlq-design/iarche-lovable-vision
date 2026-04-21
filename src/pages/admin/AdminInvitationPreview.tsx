import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Printer, Lock, Unlock, Copy, Save, Plus, Trash2, Mail } from 'lucide-react';
import { COLORS } from '@/components/admin/medias/shared/tokens';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import FloatingToolbar from '@/components/admin/FloatingToolbar';
import { EmailHtmlExportDialog } from '@/components/admin/invitation/EmailHtmlExportDialog';

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

interface InvitationModules {
  programme?: { rows: ProgrammeRow[] };
}

interface InvitationDocument {
  id: string;
  title: string;
  status: string;
  slug: string | null;
  content_json: {
    sections?: InvitationSection[];
    metadata?: InvitationMetadata;
    modules?: InvitationModules;
  };
  created_at: string;
  article_id?: string;
}

/* ── Helpers ── */

/** Parse an HTML table string into structured rows */
function parseHtmlTableToRows(html: string): ProgrammeRow[] {
  const rows: ProgrammeRow[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    const cells: string[] = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(match[1])) !== null) {
      cells.push(cellMatch[1].replace(/<[^>]*>/g, '').trim());
    }
    if (cells.length >= 3 && cells[0].toLowerCase() !== 'horaire') {
      rows.push({ horaire: cells[0], theme: cells[1], intervenant: cells[2] });
    }
  }
  return rows;
}

/** Build programme HTML from rows (for saving back into section.content) */
function buildProgrammeHtml(rows: ProgrammeRow[]): string {
  const tbody = rows
    .map(r => `<tr><td>${r.horaire}</td><td>${r.theme}</td><td>${r.intervenant}</td></tr>`)
    .join('');
  return `<div class='invitation-programme'><table class='programme-table'><thead><tr><th>Horaire</th><th>Thème</th><th>Intervenant</th></tr></thead><tbody>${tbody}</tbody></table></div>`;
}

/* ── Component ── */

const AdminInvitationPreview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [doc, setDoc] = useState<InvitationDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [freezing, setFreezing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [emailExportOpen, setEmailExportOpen] = useState(false);

  const [editSections, setEditSections] = useState<InvitationSection[]>([]);
  const [editMetadata, setEditMetadata] = useState<InvitationMetadata>({});
  const [programmeRows, setProgrammeRows] = useState<ProgrammeRow[]>([]);
  const [originalJson, setOriginalJson] = useState<string>('');

  const contentContainerRef = useRef<HTMLDivElement>(null);

  const isApproved = doc?.status === 'approved';
  const editable = !isApproved;

  const hasChanges = useMemo(() => {
    if (!doc) return false;
    return JSON.stringify({ sections: editSections, metadata: editMetadata, programmeRows }) !== originalJson;
  }, [doc, editSections, editMetadata, programmeRows, originalJson]);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/admin');
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (id && user && isAdmin) loadDocument();
  }, [id, user, isAdmin]);

  const loadDocument = async () => {
    const { data, error } = await supabase
      .from('generated_documents')
      .select('id, title, status, slug, content_json, created_at, article_id')
      .eq('id', id!)
      .single();

    if (error || !data) { navigate('/admin/ateliers-webinaires'); return; }
    const document = data as unknown as InvitationDocument;
    setDoc(document);

    const sections = document.content_json?.sections || [];
    const metadata = document.content_json?.metadata || {};
    
    // Hydrate programme rows from modules or parse from section HTML
    let rows: ProgrammeRow[] = [];
    if (document.content_json?.modules?.programme?.rows?.length) {
      rows = document.content_json.modules.programme.rows;
    } else {
      const progSection = sections.find(s => s.id === 'programme');
      if (progSection) {
        rows = parseHtmlTableToRows(progSection.content);
      }
    }

    setEditSections(sections);
    setEditMetadata(metadata);
    setProgrammeRows(rows);
    setOriginalJson(JSON.stringify({ sections, metadata, programmeRows: rows }));
    setLoading(false);

    if (document.slug) generateQRCode(document.slug);
  };

  const generateQRCode = async (slug: string) => {
    try {
      const url = `https://iarche.fr/evenements/${slug}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 200, margin: 2,
        color: { dark: COLORS.bleuNuit, light: '#FFFFFF' },
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('QR code generation failed:', err);
    }
  };

  const updateSectionContent = useCallback((sectionId: string, content: string) => {
    setEditSections(prev => prev.map(s => s.id === sectionId ? { ...s, content } : s));
  }, []);

  const updateSectionTitle = useCallback((sectionId: string, title: string) => {
    setEditSections(prev => prev.map(s => s.id === sectionId ? { ...s, title } : s));
  }, []);

  const updateMetadata = useCallback((key: keyof InvitationMetadata, value: string) => {
    setEditMetadata(prev => ({ ...prev, [key]: value }));
  }, []);

  // Programme row management
  const updateProgrammeRow = useCallback((index: number, field: keyof ProgrammeRow, value: string) => {
    setProgrammeRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  }, []);

  const addProgrammeRow = useCallback(() => {
    setProgrammeRows(prev => [...prev, { horaire: '', theme: '', intervenant: '' }]);
  }, []);

  const removeProgrammeRow = useCallback((index: number) => {
    setProgrammeRows(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = async () => {
    if (!doc || !hasChanges) return;
    setSaving(true);

    // Sync programme rows back into the programme section HTML
    const syncedSections = editSections.map(s => {
      if (s.id === 'programme' && programmeRows.length > 0) {
        return { ...s, content: buildProgrammeHtml(programmeRows) };
      }
      return s;
    });

    const newContentJson = {
      ...doc.content_json,
      sections: syncedSections,
      metadata: editMetadata,
      modules: { ...doc.content_json?.modules, programme: { rows: programmeRows } },
    };

    const { error } = await supabase
      .from('generated_documents')
      .update({ content_json: newContentJson as any })
      .eq('id', doc.id);

    if (error) {
      toast.error('Erreur lors de la sauvegarde');
    } else {
      toast.success('Modifications enregistrées');
      setDoc(prev => prev ? { ...prev, content_json: newContentJson } : null);
      setEditSections(syncedSections);
      setOriginalJson(JSON.stringify({ sections: syncedSections, metadata: editMetadata, programmeRows }));
    }
    setSaving(false);
  };

  const handleFreeze = async () => {
    if (!doc) return;
    if (hasChanges) { toast.error('Veuillez enregistrer vos modifications avant de figer.'); return; }
    setFreezing(true);
    const { error } = await supabase
      .from('generated_documents')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', doc.id);

    if (error) {
      toast.error('Erreur lors du figement');
    } else {
      toast.success('Version figée ! Le lien public est maintenant actif.');
      setDoc(prev => prev ? { ...prev, status: 'approved' } : null);
    }
    setFreezing(false);
  };

  const handleUnfreeze = async () => {
    if (!doc) return;
    const { error } = await supabase
      .from('generated_documents')
      .update({ status: 'draft' })
      .eq('id', doc.id);

    if (error) {
      toast.error('Erreur lors du défigement');
    } else {
      toast.success('Document débloqué — vous pouvez le modifier.');
      setDoc(prev => prev ? { ...prev, status: 'draft' } : null);
    }
  };

  const handlePrint = () => window.print();

  const handleOpenEmailExport = () => {
    if (hasChanges) {
      toast.error('Modifications non sauvegardées', {
        description: "Sauvegarde d'abord avant d'exporter le HTML email.",
      });
      return;
    }
    setEmailExportOpen(true);
  };

  const copyPublicUrl = () => {
    if (!doc?.slug) return;
    const url = `https://iarche.fr/evenements/${doc.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('URL publique copiée !', { description: url });
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

  const sortedSections = [...editSections].sort((a, b) => a.order - b.order);
  const publicUrl = doc.slug ? `https://iarche.fr/evenements/${doc.slug}` : null;

  const defaultFooter = `Document généré automatiquement par IArche • ${new Date(doc.created_at).toLocaleDateString('fr-FR')}`;
  const defaultQrTitle = 'Inscription';
  const defaultQrDesc = 'Scannez ce QR code pour vous inscrire directement en ligne, ou rendez-vous sur :';

  // Prose classes shared between admin and public
  const proseClasses = `prose prose-sm md:prose-base max-w-none
    prose-headings:text-foreground prose-headings:font-semibold
    prose-p:text-muted-foreground prose-p:leading-relaxed
    prose-strong:text-foreground
    prose-ul:text-muted-foreground prose-li:text-muted-foreground
    prose-table:text-sm
    [&_table]:w-full [&_table]:border-collapse [&_table]:table-fixed
    [&_th]:bg-muted/50 [&_th]:text-left [&_th]:px-4 [&_th]:py-3 [&_th]:font-semibold [&_th]:text-foreground [&_th]:border-b
    [&_td]:px-4 [&_td]:py-3 [&_td]:border-b [&_td]:border-border
    [&_tr:last-child_td]:border-b-0
    [&_.invitation-hero]:hidden
    [&_hr]:my-4 [&_hr]:border-border
    overflow-x-auto break-words [overflow-wrap:break-word]`;

  /** Check if a section is the programme section (render structured table instead) */
  const isProgrammeSection = (section: InvitationSection) =>
    section.id === 'programme' && programmeRows.length > 0;

  return (
    <AdminLayout>
      <Helmet>
        <title>{doc.title} - Admin IArche</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Admin toolbar */}
      <div className="print:hidden sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-6 py-3">
        <div className="container mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin/ateliers-webinaires')}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
            <Badge variant={isApproved ? 'default' : 'secondary'}>
              {isApproved ? '✅ Figé' : '✏️ Brouillon — cliquez sur le texte pour éditer'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {editable && (
              <>
                <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                  Enregistrer
                </Button>
                <Button variant="default" size="sm" onClick={handleFreeze} disabled={freezing}>
                  {freezing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
                  Figer la version
                </Button>
              </>
            )}
            {isApproved && (
              <Button variant="outline" size="sm" onClick={handleUnfreeze}>
                <Unlock className="h-4 w-4 mr-1" />
                Défiger pour modifier
              </Button>
            )}
            {publicUrl && (
              <Button variant="outline" size="sm" onClick={copyPublicUrl}>
                <Copy className="h-4 w-4 mr-1" />
                Copier lien public
              </Button>
            )}
            {doc?.slug && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEmailExport}
                disabled={hasChanges}
                title={hasChanges ? "Sauvegarde d'abord vos modifications" : 'Exporter le HTML email pour Brevo'}
              >
                <Mail className="h-4 w-4 mr-1" />
                Copier HTML email
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              Imprimer / PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Document content */}
      <div className="min-h-screen bg-background" ref={contentContainerRef}>
        <FloatingToolbar
          containerRef={contentContainerRef}
          disabled={isApproved}
          onExportEmailHtml={doc?.slug ? handleOpenEmailExport : undefined}
        />

        <div className="container mx-auto max-w-4xl py-8 px-6 print:px-0 print:py-0">

          {/* Hero Section */}
          <section
            className="relative rounded-2xl overflow-hidden mb-8 print:rounded-none print:mb-0 print:break-after-page"
            style={{
              background: `linear-gradient(135deg, ${COLORS.bleuNuit} 0%, ${COLORS.bleuNuit}dd 50%, ${COLORS.terracotta}40 100%)`,
              minHeight: '400px',
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

              {/* Event type badge */}
              <Badge className="w-fit mb-4 text-xs" style={{ background: COLORS.terracotta, color: 'white' }}>
                <span
                  contentEditable={editable}
                  suppressContentEditableWarning
                  className="outline-none min-w-[2ch] whitespace-pre-wrap"
                  onBlur={e => updateMetadata('eventType', e.currentTarget.textContent || '')}
                  dangerouslySetInnerHTML={{ __html: editMetadata.eventType || 'Type d\'événement' }}
                />
              </Badge>

              {/* Event title — contentEditable div that wraps */}
              <div
                contentEditable={editable}
                suppressContentEditableWarning
                className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight outline-none break-words [overflow-wrap:break-word] whitespace-pre-wrap"
                onBlur={e => updateMetadata('eventTitle', e.currentTarget.textContent || '')}
                dangerouslySetInnerHTML={{ __html: editMetadata.eventTitle || doc.title }}
              />

              <div className="flex flex-wrap gap-4 mt-6 text-white/90 text-sm md:text-base">
                <span className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 max-w-full">
                  📅
                  <span
                    contentEditable={editable}
                    suppressContentEditableWarning
                    className="outline-none min-w-[4ch] whitespace-pre-wrap break-words"
                    onBlur={e => updateMetadata('eventDate', e.currentTarget.textContent || '')}
                    dangerouslySetInnerHTML={{ __html: editMetadata.eventDate || 'Date' }}
                  />
                </span>
                <span className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 max-w-full">
                  📍
                  <span
                    contentEditable={editable}
                    suppressContentEditableWarning
                    className="outline-none min-w-[4ch] whitespace-pre-wrap break-words"
                    onBlur={e => updateMetadata('eventLocation', e.currentTarget.textContent || '')}
                    dangerouslySetInnerHTML={{ __html: editMetadata.eventLocation || 'Lieu' }}
                  />
                </span>
              </div>
            </div>
          </section>

          {/* Content Sections */}
          {sortedSections.map((section, index) => {
            if (section.id === 'hero') return null;

            return (
              <section key={section.id} className="mb-8 print:break-inside-avoid print:mb-4">
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden print:shadow-none print:border-0">
                  {/* Section title — contentEditable */}
                  <div className="flex items-center gap-3 px-8 pt-8 pb-4">
                    <div
                      className="w-1 h-8 rounded-full flex-shrink-0"
                      style={{ background: index % 2 === 0 ? COLORS.terracotta : '#4A90D9' }}
                    />
                    <div
                      contentEditable={editable}
                      suppressContentEditableWarning
                      className="text-xl md:text-2xl font-bold text-foreground outline-none break-words [overflow-wrap:break-word] whitespace-pre-wrap flex-1 min-w-0"
                      onBlur={e => updateSectionTitle(section.id, e.currentTarget.textContent || '')}
                      dangerouslySetInnerHTML={{ __html: section.title }}
                    />
                  </div>

                  {/* Programme section → structured table */}
                  {isProgrammeSection(section) ? (
                    <div className="px-8 pb-8">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse table-fixed text-sm">
                          <thead>
                            <tr>
                              <th className="bg-muted/50 text-left px-4 py-3 font-semibold text-foreground border-b w-[20%]">Horaire</th>
                              <th className="bg-muted/50 text-left px-4 py-3 font-semibold text-foreground border-b w-[50%]">Thème</th>
                              <th className="bg-muted/50 text-left px-4 py-3 font-semibold text-foreground border-b w-[25%]">Intervenant</th>
                              {editable && <th className="bg-muted/50 px-2 py-3 border-b w-[5%]" />}
                            </tr>
                          </thead>
                          <tbody>
                            {programmeRows.map((row, ri) => (
                              <tr key={ri} className="group">
                                <td className="px-4 py-3 border-b border-border align-top">
                                  <div
                                    contentEditable={editable}
                                    suppressContentEditableWarning
                                    className="outline-none text-muted-foreground whitespace-pre-wrap break-words min-h-[1.5em]"
                                    onBlur={e => updateProgrammeRow(ri, 'horaire', e.currentTarget.textContent || '')}
                                    dangerouslySetInnerHTML={{ __html: row.horaire }}
                                  />
                                </td>
                                <td className="px-4 py-3 border-b border-border align-top">
                                  <div
                                    contentEditable={editable}
                                    suppressContentEditableWarning
                                    className="outline-none text-muted-foreground whitespace-pre-wrap break-words min-h-[1.5em]"
                                    onBlur={e => updateProgrammeRow(ri, 'theme', e.currentTarget.textContent || '')}
                                    dangerouslySetInnerHTML={{ __html: row.theme }}
                                  />
                                </td>
                                <td className="px-4 py-3 border-b border-border align-top">
                                  <div
                                    contentEditable={editable}
                                    suppressContentEditableWarning
                                    className="outline-none text-muted-foreground whitespace-pre-wrap break-words min-h-[1.5em]"
                                    onBlur={e => updateProgrammeRow(ri, 'intervenant', e.currentTarget.textContent || '')}
                                    dangerouslySetInnerHTML={{ __html: row.intervenant }}
                                  />
                                </td>
                                {editable && (
                                  <td className="px-2 py-3 border-b border-border align-middle text-center">
                                    <button
                                      onClick={() => removeProgrammeRow(ri)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive/80 p-1"
                                      title="Supprimer cette ligne"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {editable && (
                        <button
                          onClick={addProgrammeRow}
                          className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-md hover:bg-muted/50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Ajouter une ligne
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Normal section — free prose */
                    <div
                      className={`px-8 pb-8 ${proseClasses} focus:outline-none`}
                      contentEditable={editable}
                      suppressContentEditableWarning
                      dangerouslySetInnerHTML={{ __html: section.content }}
                      onBlur={e => updateSectionContent(section.id, e.currentTarget.innerHTML)}
                    />
                  )}
                </div>
              </section>
            );
          })}

          {/* QR Code Section */}
          {qrDataUrl && publicUrl && (
            <section className="mb-8 print:break-inside-avoid">
              <div className="bg-card rounded-xl border shadow-sm overflow-hidden print:shadow-none print:border-0 p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-8 rounded-full" style={{ background: COLORS.terracotta }} />
                  <div
                    contentEditable={editable}
                    suppressContentEditableWarning
                    className="text-xl md:text-2xl font-bold text-foreground outline-none break-words whitespace-pre-wrap flex-1 min-w-0"
                    onBlur={e => updateMetadata('qrTitle', e.currentTarget.textContent || '')}
                    dangerouslySetInnerHTML={{ __html: editMetadata.qrTitle || defaultQrTitle }}
                  />
                </div>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-shrink-0">
                    <img src={qrDataUrl} alt="QR Code inscription" className="w-40 h-40" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-muted-foreground mb-2 outline-none break-words [overflow-wrap:break-word] whitespace-pre-wrap"
                      contentEditable={editable}
                      suppressContentEditableWarning
                      dangerouslySetInnerHTML={{ __html: editMetadata.qrDescription || defaultQrDesc }}
                      onBlur={e => updateMetadata('qrDescription', e.currentTarget.innerHTML)}
                    />
                    <p className="text-primary font-medium text-sm break-all">{publicUrl}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Footer */}
          <section className="mt-12 mb-8 text-center print:mt-4">
            <div className="bg-muted/30 rounded-xl p-8 print:bg-transparent">
              <img src="/logos/iarche-main.svg" alt="IArche" className="h-6 mx-auto mb-4 opacity-60" />
              <p
                className="text-xs text-muted-foreground outline-none break-words [overflow-wrap:break-word] whitespace-pre-wrap"
                contentEditable={editable}
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: editMetadata.footerText || defaultFooter }}
                onBlur={e => updateMetadata('footerText', e.currentTarget.innerHTML)}
              />
            </div>
          </section>
        </div>
      </div>

      {doc && doc.slug && (
        <EmailHtmlExportDialog
          open={emailExportOpen}
          onOpenChange={setEmailExportOpen}
          docId={doc.id}
          slug={doc.slug}
          content={{
            metadata: editMetadata,
            sections: editSections,
            modules: { programme: { rows: programmeRows } },
          }}
          eventTitle={editMetadata.eventTitle || doc.title}
        />
      )}
    </AdminLayout>
  );
};

export default AdminInvitationPreview;
