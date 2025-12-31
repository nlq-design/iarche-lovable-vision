import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Receipt,
  FileSignature,
  Plus,
  Sparkles,
  Loader2,
  Trash2,
  Eye,
  CheckCircle2,
  MoreVertical,
  Calendar,
  Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  useCockpitGeneratedDocuments,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_CONFIG,
  type GeneratedDocument,
  type DocumentType,
} from '@/hooks/cockpit/useCockpitGeneratedDocuments';

interface DocumentGeneratorProps {
  projectId?: string;
  opportunityId?: string;
}

const DOCUMENT_TYPES: { type: 'quote' | 'spec' | 'proposal'; label: string; icon: React.ReactNode; description: string }[] = [
  { type: 'quote', label: 'Devis', icon: <Receipt className="h-4 w-4" />, description: 'Génère un devis commercial structuré' },
  { type: 'spec', label: 'CDC', icon: <FileText className="h-4 w-4" />, description: 'Génère un cahier des charges détaillé' },
  { type: 'proposal', label: 'Proposition', icon: <FileSignature className="h-4 w-4" />, description: 'Génère une proposition commerciale' },
];

export function DocumentGenerator({ projectId, opportunityId }: DocumentGeneratorProps) {
  const { documents, isLoading, generateDocument, deleteDocument, approveDocument } = useCockpitGeneratedDocuments(projectId, opportunityId);
  
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedType, setSelectedType] = useState<'quote' | 'spec' | 'proposal' | null>(null);
  const [customInstructions, setCustomInstructions] = useState('');
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<GeneratedDocument | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const handleGenerate = () => {
    if (!selectedType) return;
    
    generateDocument.mutate({
      project_id: projectId,
      opportunity_id: opportunityId,
      document_type: selectedType,
      custom_instructions: customInstructions || undefined,
    }, {
      onSuccess: () => {
        setShowGenerateDialog(false);
        setSelectedType(null);
        setCustomInstructions('');
      },
    });
  };

  const handlePreview = (doc: GeneratedDocument) => {
    setPreviewDocument(doc);
    setShowPreviewDialog(true);
  };

  const handleApprove = (docId: string) => {
    approveDocument.mutate({ id: docId });
  };

  const handleDelete = () => {
    if (documentToDelete) {
      deleteDocument.mutate(documentToDelete, {
        onSuccess: () => {
          setShowDeleteDialog(false);
          setDocumentToDelete(null);
        },
      });
    }
  };

  const renderDocumentContent = (content: Record<string, unknown>, docType: DocumentType) => {
    if (docType === 'quote') {
      const quote = content as any;
      return (
        <div className="space-y-4 text-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">{quote.reference}</p>
              <p className="text-muted-foreground">Émis le {quote.date_emission}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">{quote.total_ttc?.toLocaleString('fr-FR')} € TTC</p>
              <p className="text-muted-foreground">{quote.total_ht?.toLocaleString('fr-FR')} € HT</p>
            </div>
          </div>
          
          <div className="border-t pt-3">
            <p className="font-medium mb-2">Objet : {quote.objet}</p>
          </div>
          
          {quote.lignes?.length > 0 && (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2">Qté</th>
                    <th className="text-right p-2">PU HT</th>
                    <th className="text-right p-2">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.lignes.map((ligne: any, i: number) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{ligne.description}</td>
                      <td className="text-right p-2">{ligne.quantite}</td>
                      <td className="text-right p-2">{ligne.prix_unitaire_ht?.toLocaleString('fr-FR')} €</td>
                      <td className="text-right p-2">{ligne.total_ht?.toLocaleString('fr-FR')} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {quote.conditions && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Paiement : {quote.conditions.paiement}</p>
              <p>Validité : {quote.conditions.validite}</p>
              <p>Délai : {quote.conditions.delai_realisation}</p>
            </div>
          )}
        </div>
      );
    }

    if (docType === 'spec') {
      const spec = content as any;
      return (
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-bold text-base">{spec.titre}</h3>
            <p className="text-muted-foreground text-xs">Version {spec.version} - {spec.date}</p>
          </div>
          
          {spec.sections?.map((section: any) => (
            <div key={section.numero} className="space-y-2">
              <h4 className="font-medium">{section.numero}. {section.titre}</h4>
              {section.contenu && <p className="text-muted-foreground">{section.contenu}</p>}
              {section.sous_sections?.map((sub: any) => (
                <div key={sub.numero} className="ml-4">
                  <h5 className="font-medium text-sm">{sub.numero} {sub.titre}</h5>
                  {sub.contenu && <p className="text-muted-foreground text-xs">{sub.contenu}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    if (docType === 'proposal') {
      const proposal = content as any;
      return (
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-bold text-base">{proposal.titre}</h3>
            <p className="text-muted-foreground text-xs">{proposal.date}</p>
          </div>
          
          {proposal.executive_summary && (
            <div className="p-3 bg-primary/5 rounded-lg">
              <p className="font-medium text-xs text-primary mb-1">Résumé</p>
              <p>{proposal.executive_summary}</p>
            </div>
          )}
          
          {proposal.sections?.map((section: any, i: number) => (
            <div key={i} className="space-y-1">
              <h4 className="font-medium">{section.titre}</h4>
              <p className="text-muted-foreground">{section.contenu}</p>
            </div>
          ))}
          
          {proposal.prochaines_etapes?.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Prochaines étapes</h4>
              <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
                {proposal.prochaines_etapes.map((step: string, i: number) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    return <pre className="text-xs overflow-auto">{JSON.stringify(content, null, 2)}</pre>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Documents IA
        </h3>
        <Button size="sm" className="h-7" onClick={() => setShowGenerateDialog(true)}>
          <Plus className="h-3 w-3 mr-1" />
          Générer
        </Button>
      </div>

      {/* Documents list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Aucun document généré</p>
            <Button variant="link" size="sm" onClick={() => setShowGenerateDialog(true)}>
              Générer votre premier document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const statusConfig = DOCUMENT_STATUS_CONFIG[doc.status];
            return (
              <Card key={doc.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="p-1.5 bg-primary/10 rounded">
                        {doc.document_type === 'quote' && <Receipt className="h-3.5 w-3.5 text-primary" />}
                        {doc.document_type === 'spec' && <FileText className="h-3.5 w-3.5 text-primary" />}
                        {doc.document_type === 'proposal' && <FileSignature className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                          <Badge variant={statusConfig.variant} className="text-xs h-4">
                            {statusConfig.label}
                          </Badge>
                          {doc.ai_generated && (
                            <Badge variant="outline" className="text-xs h-4">
                              <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                              IA
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePreview(doc)}>
                          <Eye className="h-3.5 w-3.5 mr-2" />
                          Aperçu
                        </DropdownMenuItem>
                        {doc.status === 'draft' && (
                          <DropdownMenuItem onClick={() => handleApprove(doc.id)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                            Approuver
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => {
                            setDocumentToDelete(doc.id);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Generate Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Générer un document
            </DialogTitle>
            <DialogDescription>
              Sélectionnez le type de document à générer par l'IA
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              {DOCUMENT_TYPES.map((docType) => (
                <button
                  key={docType.type}
                  onClick={() => setSelectedType(docType.type)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    selectedType === docType.type 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className={`p-2 rounded ${selectedType === docType.type ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {docType.icon}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{docType.label}</p>
                    <p className="text-xs text-muted-foreground">{docType.description}</p>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs">Instructions personnalisées (optionnel)</Label>
              <Textarea
                placeholder="Ex: Insister sur les délais courts, inclure une remise de 10%..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                className="min-h-[60px] text-sm"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleGenerate} 
              disabled={!selectedType || generateDocument.isPending}
            >
              {generateDocument.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Générer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewDocument && (
                <>
                  {previewDocument.document_type === 'quote' && <Receipt className="h-5 w-5" />}
                  {previewDocument.document_type === 'spec' && <FileText className="h-5 w-5" />}
                  {previewDocument.document_type === 'proposal' && <FileSignature className="h-5 w-5" />}
                  {previewDocument.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            {previewDocument && renderDocumentContent(previewDocument.content_json, previewDocument.document_type)}
          </ScrollArea>
          
          <DialogFooter>
            {previewDocument?.status === 'draft' && (
              <Button 
                variant="outline" 
                onClick={() => {
                  handleApprove(previewDocument.id);
                  setShowPreviewDialog(false);
                }}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approuver
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le document sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
