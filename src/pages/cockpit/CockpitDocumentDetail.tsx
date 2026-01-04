import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, 
  FileText, 
  FileCheck, 
  Sparkles, 
  Save, 
  Trash2,
  Download,
  Building2,
  User,
  Clock,
  CheckCircle2,
  Edit2,
  Eye,
  Loader2,
  Link as LinkIcon,
  Users
} from "lucide-react";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useCockpitGeneratedDocuments, DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_CONFIG, DocumentStatus, DocumentType } from '@/hooks/cockpit/useCockpitGeneratedDocuments';
import { useCockpitProjects } from '@/hooks/cockpit/useCockpitProjects';
import { useCockpitLeads } from '@/hooks/cockpit/useCockpitLeads';
import { ConsulteTab } from '@/components/cockpit/ConsulteTab';
import { LinkedPartnersSection } from '@/components/cockpit/LinkedPartnersSection';
import { LinkedSourcesSection } from '@/components/cockpit/LinkedSourcesSection';
import { DevisCDCPreview } from '@/components/cockpit/DevisCDCPreview';
import { DevisCDCEditor } from '@/components/cockpit/DevisCDCEditor';
import { supabase } from '@/integrations/supabase/client';

const DOCUMENT_TYPE_ICONS: Record<string, React.ElementType> = {
  quote: FileText,
  spec: FileCheck,
  proposal: FileText,
};

const DOCUMENT_TYPE_SLUG_MAP: Record<string, DocumentType> = {
  'devis': 'quote',
  'cdc': 'spec',
  'proposition': 'proposal',
};

const SLUG_PREFIX_MAP: Record<DocumentType, string> = {
  quote: 'devis',
  spec: 'cdc',
  proposal: 'proposition',
  report: 'rapport',
  email: 'email',
  contract: 'contrat',
};

export default function CockpitDocumentDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('apercu');
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Determine if this is a new document
  const isNewDocument = slug?.startsWith('nouveau-');
  const documentTypeFromSlug = isNewDocument 
    ? DOCUMENT_TYPE_SLUG_MAP[slug?.replace('nouveau-', '') || ''] || 'quote'
    : null;

  const { documents, isLoading, deleteDocument, updateDocument, refetch } = useCockpitGeneratedDocuments();
  const { projects } = useCockpitProjects();
  const { leads } = useCockpitLeads();

  // Find document by slug (which is the ID for now)
  const document = !isNewDocument 
    ? documents?.find(d => d.id === slug)
    : null;

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editStatus, setEditStatus] = useState<DocumentStatus>('draft');
  const [editProjectId, setEditProjectId] = useState<string>('none');
  const [editLeadId, setEditLeadId] = useState<string>('none');

  // Initialize form state from document
  useEffect(() => {
    if (document) {
      setEditTitle(document.title);
      setEditStatus(document.status as DocumentStatus);
      setEditProjectId(document.project_id || 'none');
      setEditLeadId(document.lead_id || 'none');
    }
  }, [document]);

  const handleSave = async () => {
    if (!document) return;
    setIsSaving(true);
    try {
      await updateDocument.mutateAsync({
        id: document.id,
        updates: {
          title: editTitle,
          status: editStatus,
        }
      });

      // Update project/lead links if changed
      const updateData: Record<string, any> = {};
      if (editProjectId !== (document.project_id || 'none')) {
        updateData.project_id = editProjectId === 'none' ? null : editProjectId;
      }
      if (editLeadId !== (document.lead_id || 'none')) {
        updateData.lead_id = editLeadId === 'none' ? null : editLeadId;
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('generated_documents')
          .update(updateData)
          .eq('id', document.id);
        
        if (error) throw error;
      }

      setIsEditing(false);
      refetch();
      toast.success('Document mis à jour');
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!document) return;
    setIsDeleting(true);
    try {
      await deleteDocument.mutateAsync(document.id);
      navigate('/cockpit/documents');
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleExportDOCX = async () => {
    if (!document) return;
    try {
      // Extract sections from content_json
      const contentJson = document.content_json as any;
      const sections = contentJson?.sections || [];
      const metadata = contentJson?.metadata || {};
      const theme = contentJson?.theme || {
        primaryColor: '#1A2B4A',
        accentColor: '#B04A32',
        useGradient: true,
      };

      const { data, error } = await supabase.functions.invoke('generate-docx', {
        body: {
          title: document.title,
          sections,
          metadata,
          theme,
          documentType: document.document_type,
        }
      });
      
      if (error) throw error;
      
      // Handle base64 response
      if (data?.docxBase64) {
        const blob = new Blob([Uint8Array.from(atob(data.docxBase64), c => c.charCodeAt(0))], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = url;
        link.download = `${document.title.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Document DOCX exporté');
      } else if (data?.download_url) {
        window.open(data.download_url, '_blank');
        toast.success('Document DOCX généré');
      }
    } catch (error: any) {
      console.error('DOCX export error:', error);
      toast.error(`Erreur export: ${error.message}`);
    }
  };

  const handleExportPDF = async () => {
    if (!document) return;
    setIsExportingPDF(true);
    try {
      // Extract sections from content_json
      const contentJson = document.content_json as any;
      const sections = contentJson?.sections || [];
      const metadata = contentJson?.metadata || {};
      const theme = contentJson?.theme || {
        primaryColor: '#1A2B4A',
        accentColor: '#B04A32',
        useGradient: true,
      };

      // First generate DOCX
      const { data: docxData, error: docxError } = await supabase.functions.invoke('generate-docx', {
        body: {
          title: document.title,
          sections,
          metadata,
          theme,
          documentType: document.document_type,
        }
      });
      
      if (docxError) throw docxError;
      
      // Then convert to PDF via iLovePDF
      const { data, error } = await supabase.functions.invoke('convert-to-pdf', {
        body: { document_id: document.id }
      });
      
      if (error) throw error;
      
      if (data?.pdf_url) {
        window.open(data.pdf_url, '_blank');
        toast.success('PDF généré avec succès');
      }
    } catch (error: any) {
      console.error('PDF export error:', error);
      toast.error(`Erreur export PDF: ${error.message}`);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Get linked entities for display
  const linkedProject = document?.project_id 
    ? projects?.find(p => p.id === document.project_id)
    : null;
  const linkedLead = document?.lead_id 
    ? leads?.find(l => l.id === document.lead_id)
    : null;

  // Loading state
  if (isLoading) {
    return (
      <CockpitLayout>
        <div className="p-5 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </CockpitLayout>
    );
  }

  // New document mode - redirect to editor
  if (isNewDocument && documentTypeFromSlug) {
    const editorType = documentTypeFromSlug as 'quote' | 'spec' | 'proposal';
    return (
      <CockpitLayout>
        <DevisCDCEditor
          documentId={null}
          documentType={editorType}
          onBack={() => navigate('/cockpit/documents')}
          onSave={() => {
            refetch();
            navigate('/cockpit/documents');
          }}
        />
      </CockpitLayout>
    );
  }

  // Document not found
  if (!document) {
    return (
      <CockpitLayout>
        <div className="p-5 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Document non trouvé</h2>
          <p className="text-muted-foreground mb-4">Le document demandé n'existe pas ou a été supprimé.</p>
          <Button onClick={() => navigate('/cockpit/documents')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux documents
          </Button>
        </div>
      </CockpitLayout>
    );
  }

  const DocIcon = DOCUMENT_TYPE_ICONS[document.document_type] || FileText;
  const statusConfig = DOCUMENT_STATUS_CONFIG[document.status as DocumentStatus];

  return (
    <CockpitLayout>
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 shrink-0"
              onClick={() => navigate('/cockpit/documents')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <DocIcon className="h-5 w-5 text-primary" />
                {isEditing ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="h-8 text-lg font-semibold w-80"
                  />
                ) : (
                  <h1 className="text-xl font-semibold">{document.title}</h1>
                )}
                <Badge variant={statusConfig?.variant || 'secondary'}>
                  {statusConfig?.label || document.status}
                </Badge>
                {document.ai_generated && (
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    IA
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Créé le {format(new Date(document.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                </span>
                {document.version && (
                  <span>Version {document.version}</span>
                )}
                <Badge variant="outline" className="text-xs">
                  {DOCUMENT_TYPE_LABELS[document.document_type as DocumentType]}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                  Annuler
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Enregistrer
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Modifier
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportDOCX}>
                  <Download className="h-4 w-4 mr-1" />
                  DOCX
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportPDF}
                  disabled={isExportingPDF}
                >
                  {isExportingPDF ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4 mr-1" />
                  )}
                  PDF
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column - Document content */}
          <div className="lg:col-span-2 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="apercu" className="gap-1.5">
                  <Eye className="h-4 w-4" />
                  Aperçu
                </TabsTrigger>
                <TabsTrigger value="edition" className="gap-1.5">
                  <Edit2 className="h-4 w-4" />
                  Édition
                </TabsTrigger>
                <TabsTrigger value="consulte" className="gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Consulte
                </TabsTrigger>
              </TabsList>

              <TabsContent value="apercu" className="mt-4">
                <DevisCDCPreview
                  document={document}
                  onBack={() => {}}
                  onEdit={() => setActiveTab('edition')}
                />
              </TabsContent>

              <TabsContent value="edition" className="mt-4">
                <DevisCDCEditor
                  documentId={document.id}
                  documentType={document.document_type as 'quote' | 'spec' | 'proposal'}
                  onBack={() => setActiveTab('apercu')}
                  onSave={() => {
                    refetch();
                    setActiveTab('apercu');
                    toast.success('Document mis à jour');
                  }}
                />
              </TabsContent>

              <TabsContent value="consulte" className="mt-4">
                <ConsulteTab
                  entityType="document"
                  entityId={document.id}
                  entityName={document.title}
                  summary={document.ai_documents_summary}
                  onSynthesisComplete={() => refetch()}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right column - Metadata & Links */}
          <div className="space-y-4">
            {/* Status & Links */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status */}
                {isEditing ? (
                  <div className="space-y-2">
                    <Label className="text-xs">Statut</Label>
                    <Select value={editStatus} onValueChange={(v) => setEditStatus(v as DocumentStatus)}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DOCUMENT_STATUS_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Statut</span>
                    <Badge variant={statusConfig?.variant || 'secondary'}>
                      {statusConfig?.label || document.status}
                    </Badge>
                  </div>
                )}

                {/* Linked Project */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Projet lié
                  </Label>
                  {isEditing ? (
                    <Select value={editProjectId} onValueChange={setEditProjectId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        {projects?.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : linkedProject ? (
                    <Link 
                      to={`/cockpit/projects/${linkedProject.id}`}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{linkedProject.name}</span>
                    </Link>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun projet lié</p>
                  )}
                </div>

                {/* Linked Lead */}
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Lead lié
                  </Label>
                  {isEditing ? (
                    <Select value={editLeadId} onValueChange={setEditLeadId}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        {leads?.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : linkedLead ? (
                    <Link 
                      to={`/cockpit/leads/${linkedLead.id}`}
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <User className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{linkedLead.name}</span>
                      {linkedLead.company && (
                        <span className="text-xs text-muted-foreground">({linkedLead.company})</span>
                      )}
                    </Link>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun lead lié</p>
                  )}
                </div>

                {/* Approval info */}
                {document.approved_at && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Approuvé le {format(new Date(document.approved_at), 'dd MMM yyyy', { locale: fr })}
                    </div>
                  </div>
                )}

                {/* Sent info */}
                {document.sent_at && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <LinkIcon className="h-4 w-4" />
                    Envoyé le {format(new Date(document.sent_at), 'dd MMM yyyy', { locale: fr })}
                    {document.sent_to && <span>à {document.sent_to}</span>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Linked Sources (Projects, Leads, Transcriptions, Solutions) */}
            <LinkedSourcesSection
              documentId={document.id}
              projectId={document.project_id}
              leadId={document.lead_id}
              specificationId={document.specification_id}
              onSourceLinked={() => refetch()}
            />

            {/* Linked Partners */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Partenaires liés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LinkedPartnersSection entityType="document" entityId={document.id} />
              </CardContent>
            </Card>

            {/* AI Metadata */}

            {/* AI Metadata */}
            {document.ai_metadata && Object.keys(document.ai_metadata).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Métadonnées IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    {(document.ai_metadata as any).model && (
                      <p><span className="font-medium">Modèle:</span> {(document.ai_metadata as any).model}</p>
                    )}
                    {(document.ai_metadata as any).generated_at && (
                      <p><span className="font-medium">Généré le:</span> {format(new Date((document.ai_metadata as any).generated_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</p>
                    )}
                    {(document.ai_metadata as any).tokens_used && (
                      <p><span className="font-medium">Tokens:</span> {(document.ai_metadata as any).tokens_used}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le document "{document.title}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CockpitLayout>
  );
}
