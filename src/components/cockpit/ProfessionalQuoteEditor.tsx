import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Save, 
  Download, 
  Sparkles,
  Building2,
  User,
  FileText,
  Eye,
  ChevronDown,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Hash,
  CreditCard,
  FileDown
} from "lucide-react";
import { useDocxToPdfExport } from '@/hooks/cockpit/useDocxToPdfExport';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCockpitGeneratedDocuments, type GeneratedDocument } from '@/hooks/cockpit/useCockpitGeneratedDocuments';
import { useCockpitProjects } from '@/hooks/cockpit/useCockpitProjects';
import { useCockpitLeads } from '@/hooks/cockpit/useCockpitLeads';
import { useBillingEntities, type BillingEntity } from '@/hooks/cockpit/useBillingEntities';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  QuoteServicesTable, 
  QuoteBillingEntitySelector, 
  QuoteRIBEditor, 
  QuoteQRCodeSelector,
  type ServiceLine,
  type RIBData 
} from './quote-editor';
import { QuotePreview } from './QuotePreview';

interface ProfessionalQuoteEditorProps {
  documentId: string | null;
  onBack: () => void;
  onSave: () => void;
}

interface QuoteData {
  // Header info
  quoteNumber: string;
  quoteDate: string;
  validityDate: string;
  // Client info
  clientName: string;
  clientCompany: string;
  clientAddress: string;
  clientEmail: string;
  clientPhone: string;
  // Project info
  projectName: string;
  projectDescription: string;
  // Services
  services: ServiceLine[];
  // Financial
  tvaRate: number;
  currency: string;
  // Payment
  paymentTerms: string;
  rib: RIBData;
  paymentLink: string;
  // Billing entity
  billingEntityId: string | null;
}

const DEFAULT_QUOTE_DATA: QuoteData = {
  quoteNumber: '',
  quoteDate: format(new Date(), 'yyyy-MM-dd'),
  validityDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
  clientName: '',
  clientCompany: '',
  clientAddress: '',
  clientEmail: '',
  clientPhone: '',
  projectName: '',
  projectDescription: '',
  services: [],
  tvaRate: 20,
  currency: '€',
  paymentTerms: '30% à la signature, 40% à mi-projet, 30% à la livraison',
  rib: { iban: '', bic: '', titulaire: '', banque: '' },
  paymentLink: '',
  billingEntityId: null,
};

export function ProfessionalQuoteEditor({ documentId, onBack, onSave }: ProfessionalQuoteEditorProps) {
  const [title, setTitle] = useState('');
  const [quoteData, setQuoteData] = useState<QuoteData>(DEFAULT_QUOTE_DATA);
  const [linkedProjectId, setLinkedProjectId] = useState<string>('none');
  const [linkedLeadId, setLinkedLeadId] = useState<string>('none');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const previewRef = useRef<HTMLDivElement>(null);

  const { documents } = useCockpitGeneratedDocuments();
  const { projects } = useCockpitProjects();
  const { leads } = useCockpitLeads();
  const { entities: billingEntities, isLoading: billingLoading, defaultEntity, generateQuoteNumber } = useBillingEntities();
  const { exportPdf, isExporting: isExportingPdf } = useDocxToPdfExport();

  // Load existing document or set defaults
  useEffect(() => {
    if (documentId) {
      const existingDoc = documents?.find(d => d.id === documentId);
      if (existingDoc) {
        setTitle(existingDoc.title);
        const content = existingDoc.content_json as any;
        const metadata = content?.metadata || {};
        
        // Rebuild quoteData from saved content
        setQuoteData({
          quoteNumber: existingDoc.quote_number || '',
          quoteDate: metadata.quoteDate || format(new Date(), 'yyyy-MM-dd'),
          validityDate: metadata.validityDate || format(addDays(new Date(), 30), 'yyyy-MM-dd'),
          clientName: metadata.clientName || '',
          clientCompany: metadata.clientCompany || '',
          clientAddress: metadata.clientAddress || '',
          clientEmail: metadata.clientEmail || '',
          clientPhone: metadata.clientPhone || '',
          projectName: metadata.projectName || '',
          projectDescription: metadata.projectDescription || '',
          services: metadata.services || [],
          tvaRate: metadata.tvaRate || 20,
          currency: metadata.currency || '€',
          paymentTerms: metadata.paymentTerms || DEFAULT_QUOTE_DATA.paymentTerms,
          rib: metadata.rib || DEFAULT_QUOTE_DATA.rib,
          paymentLink: metadata.paymentLink || '',
          billingEntityId: existingDoc.billing_entity_id || null,
        });
        setLinkedProjectId(existingDoc.project_id || 'none');
        setLinkedLeadId(existingDoc.lead_id || 'none');
      }
    } else {
      // New document
      setTitle('Nouveau devis');
      if (defaultEntity) {
        setQuoteData(prev => ({
          ...prev,
          billingEntityId: defaultEntity.id,
          tvaRate: defaultEntity.default_tva_rate || 20,
        }));
      }
    }
  }, [documentId, documents, defaultEntity]);

  // Auto-fill metadata from linked entities
  useEffect(() => {
    if (linkedLeadId && linkedLeadId !== 'none') {
      const lead = leads?.find(l => l.id === linkedLeadId);
      if (lead) {
        setQuoteData(prev => ({
          ...prev,
          clientName: lead.name || prev.clientName,
          clientCompany: lead.company || prev.clientCompany,
          clientEmail: lead.email || prev.clientEmail,
          clientPhone: lead.phone || prev.clientPhone,
        }));
      }
    }
    if (linkedProjectId && linkedProjectId !== 'none') {
      const project = projects?.find(p => p.id === linkedProjectId);
      if (project) {
        setQuoteData(prev => ({
          ...prev,
          projectName: project.name || prev.projectName,
        }));
        if (!title || title === 'Nouveau devis') {
          setTitle(`Devis - ${project.name}`);
        }
      }
    }
  }, [linkedLeadId, linkedProjectId, leads, projects, title]);

  // Generate quote number when billing entity is selected
  const handleBillingEntitySelect = async (entityId: string) => {
    setQuoteData(prev => ({ ...prev, billingEntityId: entityId || null }));
    
    if (entityId && !quoteData.quoteNumber && !documentId) {
      try {
        const newNumber = await generateQuoteNumber(entityId);
        setQuoteData(prev => ({ ...prev, quoteNumber: newNumber }));
        toast.success(`Numéro de devis généré: ${newNumber}`);
      } catch (error) {
        console.error('Error generating quote number:', error);
      }
    }
    
    // Update TVA rate from entity
    const entity = billingEntities.find(e => e.id === entityId);
    if (entity?.default_tva_rate) {
      setQuoteData(prev => ({ ...prev, tvaRate: entity.default_tva_rate || 20 }));
    }
  };

  // Calculate totals
  const totalHT = quoteData.services
    .filter(s => !s.isPhase)
    .reduce((sum, s) => sum + s.quantity * s.unitPrice, 0);
  const tvaAmount = totalHT * (quoteData.tvaRate / 100);
  const totalTTC = totalHT + tvaAmount;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build content_json in the format expected by QuotePreview
      const billingEntity = billingEntities.find(e => e.id === quoteData.billingEntityId);
      
      const sections = [
        {
          id: 'header',
          title: 'En-tête',
          content: buildHeaderHTML(billingEntity, quoteData),
          order: 0,
        },
        {
          id: 'object',
          title: 'Objet',
          content: `<div><h3>${quoteData.projectName || 'Projet'}</h3><p>${quoteData.projectDescription || ''}</p></div>`,
          order: 1,
        },
        {
          id: 'services',
          title: 'Prestations',
          content: buildServicesHTML(quoteData.services, quoteData.currency),
          order: 2,
        },
        {
          id: 'totals',
          title: 'Totaux',
          content: buildTotalsHTML(totalHT, tvaAmount, totalTTC, quoteData.tvaRate, quoteData.currency),
          order: 3,
        },
        {
          id: 'payment',
          title: 'Paiement',
          content: `<div><p>${quoteData.paymentTerms}</p></div>`,
          order: 4,
        },
      ];

      const contentJson = {
        sections,
        metadata: {
          ...quoteData,
          totalHT,
          tvaAmount,
          totalTTC,
          billingEntityName: billingEntity?.name,
        },
      };

      if (documentId) {
        const { error } = await supabase
          .from('generated_documents')
          .update({ 
            title,
            content_json: contentJson as any,
            project_id: linkedProjectId === 'none' ? null : linkedProjectId,
            lead_id: linkedLeadId === 'none' ? null : linkedLeadId,
            billing_entity_id: quoteData.billingEntityId,
            quote_number: quoteData.quoteNumber,
            quote_metadata: {
              totalHT,
              tvaAmount,
              totalTTC,
              tvaRate: quoteData.tvaRate,
              validityDate: quoteData.validityDate,
            } as any,
          })
          .eq('id', documentId);
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('generated_documents')
          .insert({
            title,
            document_type: 'quote',
            content_json: contentJson as any,
            status: 'draft',
            project_id: linkedProjectId === 'none' ? null : linkedProjectId,
            lead_id: linkedLeadId === 'none' ? null : linkedLeadId,
            billing_entity_id: quoteData.billingEntityId,
            quote_number: quoteData.quoteNumber,
            quote_metadata: {
              totalHT,
              tvaAmount,
              totalTTC,
              tvaRate: quoteData.tvaRate,
              validityDate: quoteData.validityDate,
            } as any,
            ai_generated: false,
          });
          
        if (error) throw error;
      }

      toast.success('Devis enregistré');
      onSave();
    } catch (error) {
      console.error('Error saving quote:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportDOCX = async () => {
    try {
      const billingEntity = billingEntities.find(e => e.id === quoteData.billingEntityId);
      
      const sections = [
        { id: 'header', title: 'En-tête', content: buildHeaderHTML(billingEntity, quoteData), order: 0 },
        { id: 'object', title: 'Objet', content: `<div><h3>${quoteData.projectName}</h3><p>${quoteData.projectDescription}</p></div>`, order: 1 },
        { id: 'services', title: 'Prestations', content: buildServicesHTML(quoteData.services, quoteData.currency), order: 2 },
        { id: 'totals', title: 'Totaux', content: buildTotalsHTML(totalHT, tvaAmount, totalTTC, quoteData.tvaRate, quoteData.currency), order: 3 },
        { id: 'payment', title: 'Paiement', content: `<div><p>${quoteData.paymentTerms}</p></div>`, order: 4 },
      ];

      const { data, error } = await supabase.functions.invoke('generate-docx', {
        body: {
          title,
          sections,
          metadata: { ...quoteData, totalHT, tvaAmount, totalTTC },
          documentType: 'quote',
        },
      });

      if (error) throw error;

      const blob = new Blob([Uint8Array.from(atob(data.docxBase64), c => c.charCodeAt(0))], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Devis exporté en DOCX');
    } catch (error) {
      console.error('Error exporting DOCX:', error);
      toast.error('Erreur lors de l\'export DOCX');
    }
  };

  const handleExportPdfHD = async () => {
    const billingEntity = billingEntities.find(e => e.id === quoteData.billingEntityId);
    
    const sections = [
      { id: 'header', title: 'En-tête', content: buildHeaderHTML(billingEntity, quoteData), order: 0 },
      { id: 'object', title: 'Objet', content: `<div><h3>${quoteData.projectName}</h3><p>${quoteData.projectDescription}</p></div>`, order: 1 },
      { id: 'services', title: 'Prestations', content: buildServicesHTML(quoteData.services, quoteData.currency), order: 2 },
      { id: 'totals', title: 'Totaux', content: buildTotalsHTML(totalHT, tvaAmount, totalTTC, quoteData.tvaRate, quoteData.currency), order: 3 },
      { id: 'payment', title: 'Paiement', content: `<div><p>${quoteData.paymentTerms}</p></div>`, order: 4 },
    ];

    await exportPdf({
      title,
      sections,
      metadata: { ...quoteData, totalHT, tvaAmount, totalTTC },
      documentType: 'quote',
      documentId: documentId || undefined,
    });
  };

  // Build preview document for QuotePreview component
  const buildPreviewDocument = (): GeneratedDocument => {
    const billingEntity = billingEntities.find(e => e.id === quoteData.billingEntityId);
    
    return {
      id: documentId || 'preview',
      title,
      document_type: 'quote',
      content_json: {
        sections: [
          { id: 'header', title: 'En-tête', content: buildHeaderHTML(billingEntity, quoteData), order: 0 },
          { id: 'object', title: 'Objet', content: `<div><h3>${quoteData.projectName || 'Projet'}</h3><p class="object-description">${quoteData.projectDescription || ''}</p></div>`, order: 1 },
          { id: 'services', title: 'Prestations', content: buildServicesHTML(quoteData.services, quoteData.currency), order: 2 },
          { id: 'totals', title: 'Totaux', content: buildTotalsHTML(totalHT, tvaAmount, totalTTC, quoteData.tvaRate, quoteData.currency), order: 3 },
          { id: 'payment', title: 'Paiement', content: `<div><p>${quoteData.paymentTerms}</p></div>`, order: 4 },
        ],
        metadata: {
          ...quoteData,
          totalHT,
          tvaAmount,
          totalTTC,
          validityDays: Math.ceil((new Date(quoteData.validityDate).getTime() - new Date(quoteData.quoteDate).getTime()) / (1000 * 60 * 60 * 24)),
        },
      } as any,
      status: 'draft',
      project_id: linkedProjectId === 'none' ? null : linkedProjectId,
      lead_id: linkedLeadId === 'none' ? null : linkedLeadId,
      ai_generated: false,
      created_at: quoteData.quoteDate || new Date().toISOString(),
      quote_number: quoteData.quoteNumber,
      workspace_id: '',
      ai_metadata: null as any,
      ai_documents_summary: null,
      approved_at: null,
      approved_by: null,
      created_by: null,
      opportunity_id: null,
      output_format: null,
      output_storage_path: null,
      sent_at: null,
      sent_to: null,
      specification_id: null,
      supersedes_document_id: null,
      updated_at: null as any,
      version: null as any,
      billing_entity_id: quoteData.billingEntityId,
      quote_metadata: null,
    };
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
            {documentId ? 'Modifier le devis' : 'Nouveau devis'}
          </h1>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="h-4 w-4" />
                Exporter
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPdfHD} disabled={isExportingPdf}>
                <FileDown className="h-4 w-4 mr-2" />
                {isExportingPdf ? 'Export en cours...' : 'Export PDF HD'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportDOCX}>
                <FileText className="h-4 w-4 mr-2" />
                Export DOCX
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
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

      {/* Main Content with Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'editor' | 'preview')}>
        <TabsList className="mb-4">
          <TabsTrigger value="editor" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Éditeur
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5">
            <Eye className="h-4 w-4" />
            Aperçu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Left 2/3 */}
            <div className="lg:col-span-2 space-y-4">
              {/* Quote Header Info */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Informations du devis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="quoteNumber" className="text-xs flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        N° Devis
                      </Label>
                      <Input
                        id="quoteNumber"
                        value={quoteData.quoteNumber}
                        onChange={(e) => setQuoteData(prev => ({ ...prev, quoteNumber: e.target.value }))}
                        placeholder="DEV-2024-001"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quoteDate" className="text-xs flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Date d'émission
                      </Label>
                      <Input
                        id="quoteDate"
                        type="date"
                        value={quoteData.quoteDate}
                        onChange={(e) => setQuoteData(prev => ({ ...prev, quoteDate: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="validityDate" className="text-xs flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Date de validité
                      </Label>
                      <Input
                        id="validityDate"
                        type="date"
                        value={quoteData.validityDate}
                        onChange={(e) => setQuoteData(prev => ({ ...prev, validityDate: e.target.value }))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="title">Titre du devis</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="mt-1"
                      placeholder="Devis - Projet XYZ"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Project / Object */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Objet du devis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="projectName">Intitulé du projet</Label>
                    <Input
                      id="projectName"
                      value={quoteData.projectName}
                      onChange={(e) => setQuoteData(prev => ({ ...prev, projectName: e.target.value }))}
                      placeholder="Développement application IA..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="projectDescription">Description</Label>
                    <Textarea
                      id="projectDescription"
                      value={quoteData.projectDescription}
                      onChange={(e) => setQuoteData(prev => ({ ...prev, projectDescription: e.target.value }))}
                      placeholder="Description détaillée du projet et des livrables attendus..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Services Table */}
              <QuoteServicesTable
                services={quoteData.services}
                onChange={(services) => setQuoteData(prev => ({ ...prev, services }))}
                currency={quoteData.currency}
                tvaRate={quoteData.tvaRate}
              />

              {/* Payment Terms */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Conditions de paiement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={quoteData.paymentTerms}
                    onChange={(e) => setQuoteData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                    placeholder="30% à la signature, 40% à mi-projet, 30% à la livraison"
                    rows={2}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Right 1/3 */}
            <div className="space-y-4">
              {/* Billing Entity Selector */}
              <QuoteBillingEntitySelector
                entities={billingEntities}
                selectedEntityId={quoteData.billingEntityId}
                onSelect={handleBillingEntitySelect}
                isLoading={billingLoading}
              />

              {/* Linking */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Liaison CRM</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="flex items-center gap-1.5 mb-1.5 text-xs">
                      <Building2 className="h-3.5 w-3.5" />
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
                    <Label className="flex items-center gap-1.5 mb-1.5 text-xs">
                      <User className="h-3.5 w-3.5" />
                      Lead / Client
                    </Label>
                    <Select value={linkedLeadId} onValueChange={setLinkedLeadId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un lead" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucun</SelectItem>
                        {leads?.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.name} {l.company && `(${l.company})`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Client Information */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Client / Destinataire</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="clientName" className="flex items-center gap-1.5 text-xs">
                      <User className="h-3 w-3" />
                      Nom du contact
                    </Label>
                    <Input
                      id="clientName"
                      value={quoteData.clientName}
                      onChange={(e) => setQuoteData(prev => ({ ...prev, clientName: e.target.value }))}
                      placeholder="Jean Dupont"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientCompany" className="flex items-center gap-1.5 text-xs">
                      <Building2 className="h-3 w-3" />
                      Société
                    </Label>
                    <Input
                      id="clientCompany"
                      value={quoteData.clientCompany}
                      onChange={(e) => setQuoteData(prev => ({ ...prev, clientCompany: e.target.value }))}
                      placeholder="ACME SAS"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientAddress" className="flex items-center gap-1.5 text-xs">
                      <MapPin className="h-3 w-3" />
                      Adresse
                    </Label>
                    <Input
                      id="clientAddress"
                      value={quoteData.clientAddress}
                      onChange={(e) => setQuoteData(prev => ({ ...prev, clientAddress: e.target.value }))}
                      placeholder="123 rue de Paris, 75001 Paris"
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="clientEmail" className="flex items-center gap-1 text-xs">
                        <Mail className="h-3 w-3" />
                        Email
                      </Label>
                      <Input
                        id="clientEmail"
                        type="email"
                        value={quoteData.clientEmail}
                        onChange={(e) => setQuoteData(prev => ({ ...prev, clientEmail: e.target.value }))}
                        placeholder="contact@acme.fr"
                        className="mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="clientPhone" className="flex items-center gap-1 text-xs">
                        <Phone className="h-3 w-3" />
                        Téléphone
                      </Label>
                      <Input
                        id="clientPhone"
                        type="tel"
                        value={quoteData.clientPhone}
                        onChange={(e) => setQuoteData(prev => ({ ...prev, clientPhone: e.target.value }))}
                        placeholder="01 23 45 67 89"
                        className="mt-1 text-xs"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* RIB */}
              <QuoteRIBEditor
                rib={quoteData.rib}
                onChange={(rib) => setQuoteData(prev => ({ ...prev, rib }))}
              />

              {/* QR Code Payment */}
              <QuoteQRCodeSelector
                paymentLink={quoteData.paymentLink}
                onPaymentLinkChange={(paymentLink) => setQuoteData(prev => ({ ...prev, paymentLink }))}
              />

              {/* TVA Rate */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Paramètres financiers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="tvaRate" className="text-xs">Taux de TVA (%)</Label>
                    <Input
                      id="tvaRate"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={quoteData.tvaRate}
                      onChange={(e) => setQuoteData(prev => ({ ...prev, tvaRate: parseFloat(e.target.value) || 0 }))}
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <div ref={previewRef}>
            <QuotePreview
              document={buildPreviewDocument()}
              onBack={() => setActiveTab('editor')}
              onEdit={() => setActiveTab('editor')}
              isEmbedded
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper functions to build HTML content for sections
function buildHeaderHTML(billingEntity: BillingEntity | undefined, quoteData: QuoteData): string {
  const emitterHTML = billingEntity ? `
    <div class="quote-emitter">
      <h3>Émetteur</h3>
      <p><strong>${billingEntity.name}</strong></p>
      ${billingEntity.legal_form ? `<p>${billingEntity.legal_form}${billingEntity.capital_amount ? ` au capital de ${billingEntity.capital_amount.toLocaleString('fr-FR')} €` : ''}</p>` : ''}
      ${billingEntity.address ? `<p>${billingEntity.address}</p>` : ''}
      ${billingEntity.postal_code || billingEntity.city ? `<p>${billingEntity.postal_code || ''} ${billingEntity.city || ''}</p>` : ''}
      ${billingEntity.siren ? `<p>SIREN: ${billingEntity.siren}</p>` : ''}
      ${billingEntity.tva_number ? `<p>TVA: ${billingEntity.tva_number}</p>` : ''}
      ${billingEntity.email ? `<p>${billingEntity.email}</p>` : ''}
      ${billingEntity.phone ? `<p>${billingEntity.phone}</p>` : ''}
    </div>
  ` : '<div class="quote-emitter"><h3>Émetteur</h3><p>Non configuré</p></div>';

  const receiverHTML = `
    <div class="quote-receiver">
      <h3>Destinataire</h3>
      ${quoteData.clientCompany ? `<p><strong>${quoteData.clientCompany}</strong></p>` : ''}
      ${quoteData.clientName ? `<p>À l'attention de ${quoteData.clientName}</p>` : ''}
      ${quoteData.clientAddress ? `<p>${quoteData.clientAddress}</p>` : ''}
      ${quoteData.clientEmail ? `<p>${quoteData.clientEmail}</p>` : ''}
      ${quoteData.clientPhone ? `<p>${quoteData.clientPhone}</p>` : ''}
    </div>
  `;

  return `<div class="quote-parties">${emitterHTML}${receiverHTML}</div>`;
}

function buildServicesHTML(services: ServiceLine[], currency: string): string {
  if (services.length === 0) {
    return '<p class="text-muted-foreground">Aucune prestation définie</p>';
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  let html = `
    <table class="services-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Qté</th>
          <th>Unité</th>
          <th>P.U. HT</th>
          <th>Total HT</th>
        </tr>
      </thead>
      <tbody>
  `;

  services.forEach(service => {
    if (service.isPhase) {
      html += `
        <tr class="phase-header">
          <td colspan="5"><strong>${service.description}</strong></td>
        </tr>
      `;
    } else {
      const lineTotal = service.quantity * service.unitPrice;
      html += `
        <tr>
          <td>
            <strong>${service.description}</strong>
            ${service.details ? `<small>${service.details}</small>` : ''}
          </td>
          <td>${service.quantity}</td>
          <td>${service.unit}</td>
          <td>${formatCurrency(service.unitPrice)} ${currency}</td>
          <td>${formatCurrency(lineTotal)} ${currency}</td>
        </tr>
      `;
    }
  });

  html += '</tbody></table>';
  return html;
}

function buildTotalsHTML(totalHT: number, tvaAmount: number, totalTTC: number, tvaRate: number, currency: string): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return `
    <div class="totals-row">
      <span>Total HT</span>
      <span>${formatCurrency(totalHT)} ${currency}</span>
    </div>
    <div class="totals-row">
      <span>TVA ${tvaRate}%</span>
      <span>${formatCurrency(tvaAmount)} ${currency}</span>
    </div>
    <div class="totals-row total-final">
      <span>Total TTC</span>
      <span>${formatCurrency(totalTTC)} ${currency}</span>
    </div>
  `;
}

export default ProfessionalQuoteEditor;
