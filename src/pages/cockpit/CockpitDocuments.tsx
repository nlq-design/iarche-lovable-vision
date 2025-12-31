import { useState } from 'react';
import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Plus, 
  Search, 
  Download, 
  Eye, 
  Trash2, 
  Sparkles, 
  FileCheck, 
  Clock,
  Building2,
  User,
  Link as LinkIcon
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCockpitGeneratedDocuments, DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_CONFIG } from '@/hooks/cockpit/useCockpitGeneratedDocuments';
import { useCockpitProjects } from '@/hooks/cockpit/useCockpitProjects';
import { useCockpitLeads } from '@/hooks/cockpit/useCockpitLeads';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DevisCDCEditor } from '@/components/cockpit/DevisCDCEditor';
import { DevisCDCPreview } from '@/components/cockpit/DevisCDCPreview';
import { AIGenerationModal } from '@/components/cockpit/AIGenerationModal';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DocumentType = 'quote' | 'spec' | 'proposal';
type ViewMode = 'list' | 'editor' | 'preview';

const CockpitDocuments = () => {
  const [activeTab, setActiveTab] = useState<DocumentType>('quote');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterLead, setFilterLead] = useState<string>('all');
  const [aiGenerationModalOpen, setAiGenerationModalOpen] = useState(false);

  const { documents, isLoading, deleteDocument, refetch } = useCockpitGeneratedDocuments();
  const { projects } = useCockpitProjects();
  const { leads } = useCockpitLeads();

  // Filter documents by type and search
  const filteredDocuments = documents?.filter(doc => {
    const matchesType = doc.document_type === activeTab;
    const matchesSearch = searchQuery === '' || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = filterProject === 'all' || doc.project_id === filterProject;
    const matchesLead = filterLead === 'all' || doc.lead_id === filterLead;
    return matchesType && matchesSearch && matchesProject && matchesLead;
  }) || [];

  const handleDelete = async () => {
    if (documentToDelete) {
      await deleteDocument.mutateAsync(documentToDelete);
      setDocumentToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedDocumentId(null);
    setViewMode('editor');
  };

  const handleViewDocument = (docId: string) => {
    setSelectedDocumentId(docId);
    setViewMode('preview');
  };

  const handleEditDocument = (docId: string) => {
    setSelectedDocumentId(docId);
    setViewMode('editor');
  };

  const getLinkedEntityName = (doc: typeof documents[0]) => {
    if (doc.project_id) {
      const project = projects?.find(p => p.id === doc.project_id);
      return project ? { type: 'project', name: project.name } : null;
    }
    if (doc.lead_id) {
      const lead = leads?.find(l => l.id === doc.lead_id);
      return lead ? { type: 'lead', name: lead.name } : null;
    }
    return null;
  };

  if (viewMode === 'editor') {
    return (
      <CockpitLayout>
        <DevisCDCEditor
          documentId={selectedDocumentId}
          documentType={activeTab}
          onBack={() => {
            setViewMode('list');
            refetch();
          }}
          onSave={() => {
            setViewMode('list');
            refetch();
          }}
        />
      </CockpitLayout>
    );
  }

  if (viewMode === 'preview' && selectedDocumentId) {
    const document = documents?.find(d => d.id === selectedDocumentId);
    if (document) {
      return (
        <CockpitLayout>
          <DevisCDCPreview
            document={document}
            onBack={() => setViewMode('list')}
            onEdit={() => setViewMode('editor')}
          />
        </CockpitLayout>
      );
    }
  }

  return (
    <CockpitLayout>
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Devis & CDC</h1>
            <p className="text-sm text-muted-foreground">Génération et gestion des documents commerciaux</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-sm"
              onClick={() => setAiGenerationModalOpen(true)}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Générer avec IA
            </Button>
            <Button size="sm" className="h-8 text-sm" onClick={handleCreateNew}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Nouveau document
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DocumentType)}>
          <TabsList>
            <TabsTrigger value="quote" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Devis
            </TabsTrigger>
            <TabsTrigger value="spec" className="gap-1.5">
              <FileCheck className="h-4 w-4" />
              Cahiers des charges
            </TabsTrigger>
            <TabsTrigger value="proposal" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Propositions
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un document..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-[180px] h-9">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Projet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les projets</SelectItem>
                {projects?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterLead} onValueChange={setFilterLead}>
              <SelectTrigger className="w-[180px] h-9">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Lead" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les leads</SelectItem>
                {leads?.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          <TabsContent value={activeTab} className="mt-4">
            <Card className="border shadow-sm">
              <CardHeader className="py-3 px-4 border-b bg-muted/30 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {DOCUMENT_TYPE_LABELS[activeTab]}
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {filteredDocuments.length}
                </Badge>
              </CardHeader>
              <CardContent className="p-4">
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <FileText className="h-10 w-10 mb-3 opacity-40" />
                    <p className="font-medium">Aucun document</p>
                    <p className="text-sm">Créez votre premier {DOCUMENT_TYPE_LABELS[activeTab].toLowerCase()}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredDocuments.map((doc) => {
                      const statusConfig = DOCUMENT_STATUS_CONFIG[doc.status as keyof typeof DOCUMENT_STATUS_CONFIG];
                      const linkedEntity = getLinkedEntityName(doc);
                      
                      return (
                        <div 
                          key={doc.id}
                          className="p-3 rounded-md border bg-background hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-sm">{doc.title}</h3>
                                <Badge 
                                  variant={statusConfig?.variant || 'secondary'}
                                  className="text-xs"
                                >
                                  {statusConfig?.label || doc.status}
                                </Badge>
                                {doc.ai_generated && (
                                  <Badge variant="outline" className="text-xs gap-1">
                                    <Sparkles className="h-3 w-3" />
                                    IA
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(doc.created_at || Date.now()), 'dd MMM yyyy', { locale: fr })}
                                </span>
                                {doc.version && (
                                  <span>v{doc.version}</span>
                                )}
                                {linkedEntity && (
                                  <span className="flex items-center gap-1">
                                    <LinkIcon className="h-3 w-3" />
                                    {linkedEntity.type === 'project' ? (
                                      <Building2 className="h-3 w-3" />
                                    ) : (
                                      <User className="h-3 w-3" />
                                    )}
                                    {linkedEntity.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0"
                                onClick={() => handleViewDocument(doc.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0"
                                onClick={() => handleEditDocument(doc.id)}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => {
                                  setDocumentToDelete(doc.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le document sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Generation Modal */}
      <AIGenerationModal
        open={aiGenerationModalOpen}
        onOpenChange={setAiGenerationModalOpen}
        documentType={activeTab}
        onGenerated={() => refetch()}
      />
    </CockpitLayout>
  );
};

export default CockpitDocuments;
