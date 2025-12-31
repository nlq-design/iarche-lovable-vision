import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Save, 
  Download, 
  Sparkles,
  Plus,
  Trash2,
  GripVertical,
  Building2,
  User
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCockpitGeneratedDocuments, DOCUMENT_TYPE_LABELS, type GeneratedDocument } from '@/hooks/cockpit/useCockpitGeneratedDocuments';
import { useCockpitProjects } from '@/hooks/cockpit/useCockpitProjects';
import { useCockpitLeads } from '@/hooks/cockpit/useCockpitLeads';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { COLORS, GRADIENTS } from '@/components/admin/medias/shared/tokens';

interface DevisCDCEditorProps {
  documentId: string | null;
  documentType: 'quote' | 'spec' | 'proposal';
  onBack: () => void;
  onSave: () => void;
}

interface DocumentSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface DocumentContent {
  sections: DocumentSection[];
  metadata: {
    clientName?: string;
    clientCompany?: string;
    projectName?: string;
    validityDate?: string;
    totalAmount?: number;
    currency?: string;
  };
  theme: {
    primaryColor: string;
    accentColor: string;
    useGradient: boolean;
  };
}

const DEFAULT_QUOTE_SECTIONS: DocumentSection[] = [
  { id: '1', title: 'Contexte & Objectifs', content: '', order: 0 },
  { id: '2', title: 'Périmètre de la mission', content: '', order: 1 },
  { id: '3', title: 'Livrables', content: '', order: 2 },
  { id: '4', title: 'Planning prévisionnel', content: '', order: 3 },
  { id: '5', title: 'Conditions financières', content: '', order: 4 },
  { id: '6', title: 'Conditions générales', content: '', order: 5 },
];

const DEFAULT_SPEC_SECTIONS: DocumentSection[] = [
  { id: '1', title: 'Introduction', content: '', order: 0 },
  { id: '2', title: 'Contexte & Enjeux', content: '', order: 1 },
  { id: '3', title: 'Objectifs du projet', content: '', order: 2 },
  { id: '4', title: 'Périmètre fonctionnel', content: '', order: 3 },
  { id: '5', title: 'Spécifications techniques', content: '', order: 4 },
  { id: '6', title: 'Contraintes & Prérequis', content: '', order: 5 },
  { id: '7', title: 'Planning & Jalons', content: '', order: 6 },
  { id: '8', title: 'Critères de réception', content: '', order: 7 },
];

export function DevisCDCEditor({ documentId, documentType, onBack, onSave }: DevisCDCEditorProps) {
  const [title, setTitle] = useState('');
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [metadata, setMetadata] = useState<DocumentContent['metadata']>({});
  const [theme, setTheme] = useState<DocumentContent['theme']>({
    primaryColor: COLORS.bleuNuit,
    accentColor: COLORS.terracotta,
    useGradient: true,
  });
  const [linkedProjectId, setLinkedProjectId] = useState<string>('none');
  const [linkedLeadId, setLinkedLeadId] = useState<string>('none');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { documents, updateDocument, generateDocument } = useCockpitGeneratedDocuments();
  const { projects } = useCockpitProjects();
  const { leads } = useCockpitLeads();

  // Load existing document or set defaults
  useEffect(() => {
    if (documentId) {
      const existingDoc = documents?.find(d => d.id === documentId);
      if (existingDoc) {
        setTitle(existingDoc.title);
        const content = existingDoc.content_json as unknown as DocumentContent;
        setSections(content?.sections || []);
        setMetadata(content?.metadata || {});
        setTheme(content?.theme || {
          primaryColor: COLORS.bleuNuit,
          accentColor: COLORS.terracotta,
          useGradient: true,
        });
        setLinkedProjectId(existingDoc.project_id || 'none');
        setLinkedLeadId(existingDoc.lead_id || 'none');
      }
    } else {
      // New document
      setTitle(`Nouveau ${DOCUMENT_TYPE_LABELS[documentType]}`);
      setSections(documentType === 'spec' ? DEFAULT_SPEC_SECTIONS : DEFAULT_QUOTE_SECTIONS);
    }
  }, [documentId, documents, documentType]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const contentJson: DocumentContent = {
        sections,
        metadata,
        theme,
      };

      if (documentId) {
        await updateDocument.mutateAsync({
          id: documentId,
          updates: { title, status: 'draft' },
        });
        
        // Update content separately
        const { error } = await supabase
          .from('generated_documents')
          .update({ 
            content_json: contentJson as any,
            project_id: linkedProjectId === 'none' ? null : linkedProjectId,
            lead_id: linkedLeadId === 'none' ? null : linkedLeadId,
          })
          .eq('id', documentId);
          
        if (error) throw error;
      } else {
        // Create new document
        const { error } = await supabase
          .from('generated_documents')
          .insert({
            title,
            document_type: documentType,
            content_json: contentJson as any,
            status: 'draft',
            project_id: linkedProjectId === 'none' ? null : linkedProjectId,
            lead_id: linkedLeadId === 'none' ? null : linkedLeadId,
            ai_generated: false,
          });
          
        if (error) throw error;
      }

      toast.success('Document enregistré');
      onSave();
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateWithAI = async () => {
    setIsGenerating(true);
    try {
      await generateDocument.mutateAsync({
        document_type: documentType,
        project_id: linkedProjectId === 'none' ? undefined : linkedProjectId,
        leadId: linkedLeadId === 'none' ? undefined : linkedLeadId,
      });
      toast.success('Document généré par IA');
      onBack();
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error('Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportDOCX = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-docx', {
        body: {
          title,
          sections,
          metadata,
          theme,
          documentType,
        },
      });

      if (error) throw error;

      // Download the file
      const blob = new Blob([Uint8Array.from(atob(data.docxBase64), c => c.charCodeAt(0))], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Document exporté en DOCX');
    } catch (error) {
      console.error('Error exporting DOCX:', error);
      toast.error('Erreur lors de l\'export DOCX');
    }
  };

  const addSection = () => {
    const newSection: DocumentSection = {
      id: Date.now().toString(),
      title: 'Nouvelle section',
      content: '',
      order: sections.length,
    };
    setSections([...sections, newSection]);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const updateSection = (id: string, field: 'title' | 'content', value: string) => {
    setSections(sections.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour
          </Button>
          <h1 className="text-xl font-semibold">
            {documentId ? 'Modifier' : 'Créer'} un {DOCUMENT_TYPE_LABELS[documentType]}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGenerateWithAI}
            disabled={isGenerating}
          >
            <Sparkles className="h-4 w-4 mr-1.5" />
            {isGenerating ? 'Génération...' : 'Compléter avec IA'}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportDOCX}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Exporter DOCX
          </Button>
          <Button 
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="h-4 w-4 mr-1.5" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Title */}
          <Card>
            <CardContent className="pt-4">
              <Label htmlFor="title">Titre du document</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1.5"
                placeholder="Titre du document..."
              />
            </CardContent>
          </Card>

          {/* Sections */}
          <Card>
            <CardHeader className="py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Sections</CardTitle>
              <Button variant="outline" size="sm" onClick={addSection}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {sections.map((section, index) => (
                <div 
                  key={section.id} 
                  className="p-4 border rounded-lg bg-muted/20 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <Input
                      value={section.title}
                      onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                      className="flex-1 font-medium"
                      placeholder="Titre de la section..."
                    />
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeSection(section.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={section.content}
                    onChange={(e) => updateSection(section.id, 'content', e.target.value)}
                    rows={4}
                    placeholder="Contenu de la section..."
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Linking */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Liaison</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="flex items-center gap-1.5 mb-1.5">
                  <Building2 className="h-4 w-4" />
                  Projet
                </Label>
                <Select value={linkedProjectId} onValueChange={setLinkedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {projects?.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="flex items-center gap-1.5 mb-1.5">
                  <User className="h-4 w-4" />
                  Lead
                </Label>
                <Select value={linkedLeadId} onValueChange={setLinkedLeadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {leads?.map(l => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="clientName">Nom du client</Label>
                <Input
                  id="clientName"
                  value={metadata.clientName || ''}
                  onChange={(e) => setMetadata({ ...metadata, clientName: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="clientCompany">Société</Label>
                <Input
                  id="clientCompany"
                  value={metadata.clientCompany || ''}
                  onChange={(e) => setMetadata({ ...metadata, clientCompany: e.target.value })}
                  className="mt-1"
                />
              </div>
              {documentType === 'quote' && (
                <>
                  <div>
                    <Label htmlFor="totalAmount">Montant total (€)</Label>
                    <Input
                      id="totalAmount"
                      type="number"
                      value={metadata.totalAmount || ''}
                      onChange={(e) => setMetadata({ ...metadata, totalAmount: parseFloat(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="validityDate">Date de validité</Label>
                    <Input
                      id="validityDate"
                      type="date"
                      value={metadata.validityDate || ''}
                      onChange={(e) => setMetadata({ ...metadata, validityDate: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Theme */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Thème graphique</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Couleur primaire</Label>
                <div className="flex gap-2 mt-1">
                  <div 
                    className="w-8 h-8 rounded border cursor-pointer"
                    style={{ backgroundColor: COLORS.bleuNuit }}
                    onClick={() => setTheme({ ...theme, primaryColor: COLORS.bleuNuit })}
                  />
                  <div 
                    className="w-8 h-8 rounded border cursor-pointer"
                    style={{ backgroundColor: COLORS.terracotta }}
                    onClick={() => setTheme({ ...theme, primaryColor: COLORS.terracotta })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useGradient"
                  checked={theme.useGradient}
                  onChange={(e) => setTheme({ ...theme, useGradient: e.target.checked })}
                />
                <Label htmlFor="useGradient">Utiliser le dégradé IArche</Label>
              </div>
              {theme.useGradient && (
                <div 
                  className="h-6 rounded"
                  style={{ background: GRADIENTS.arc.css }}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
