import { useState } from "react";
import { useCgvTemplates, CgvTemplate } from "@/hooks/cockpit/useBillingEntities";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Plus, Pencil, Eye, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function CgvTemplatesManager() {
  const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate } = useCgvTemplates();
  const [editingTemplate, setEditingTemplate] = useState<CgvTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<CgvTemplate | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    content_html: "",
    version: "1.0",
  });

  const handleEdit = (template: CgvTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || "",
      content_html: template.content_html,
      version: template.version || "1.0",
    });
    setIsSheetOpen(true);
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({
      name: "",
      description: "",
      content_html: DEFAULT_CGV_TEMPLATE,
      version: "1.0",
    });
    setIsSheetOpen(true);
  };

  const handleSubmit = async () => {
    if (editingTemplate) {
      await updateTemplate.mutateAsync({ id: editingTemplate.id, ...formData });
    } else {
      await createTemplate.mutateAsync(formData);
    }
    setIsSheetOpen(false);
  };

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Chargement...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Templates CGV
            </CardTitle>
            <CardDescription>
              Gérez vos modèles de Conditions Générales de Vente
            </CardDescription>
          </div>
          <Button onClick={handleCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Template
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun template CGV configuré</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer un template
                  </Button>
                </div>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border",
                      template.is_default && "border-primary bg-primary/5"
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{template.name}</span>
                        <Badge variant="outline">v{template.version}</Badge>
                        {template.is_default && (
                          <Badge variant="secondary" className="text-xs">Par défaut</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {template.description || "Aucune description"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setPreviewTemplate(template)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTemplate.mutate(template.id)}
                        disabled={template.is_default}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[700px] sm:max-w-[700px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingTemplate ? `Modifier ${editingTemplate.name}` : "Nouveau Template CGV"}
            </SheetTitle>
            <SheetDescription>
              Créez ou modifiez un modèle de Conditions Générales de Vente
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">Nom du template *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="CGV Développement Sur-Mesure"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="version">Version</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="1.0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="CGV pour les prestations de développement..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Contenu HTML</Label>
              <Textarea
                id="content"
                value={formData.content_html}
                onChange={(e) => setFormData({ ...formData, content_html: e.target.value })}
                className="min-h-[400px] font-mono text-sm"
                placeholder="<h1>Conditions Générales de Vente</h1>..."
              />
              <p className="text-xs text-muted-foreground">
                Utilisez du HTML pour formater vos CGV. Elles seront intégrées aux devis générés.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsSheetOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name || !formData.content_html}>
              {editingTemplate ? "Mettre à jour" : "Créer"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aperçu : {previewTemplate?.name}</DialogTitle>
            <DialogDescription>Version {previewTemplate?.version}</DialogDescription>
          </DialogHeader>
          <div
            className="prose prose-sm max-w-none mt-4 p-6 bg-white rounded border"
            dangerouslySetInnerHTML={{ __html: previewTemplate?.content_html || "" }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

const DEFAULT_CGV_TEMPLATE = `<h1>CONDITIONS GÉNÉRALES DE VENTE</h1>
<p><em>Prestations de développement sur-mesure</em></p>

<h2>ARTICLE 1 – OBJET</h2>
<p>Les présentes Conditions Générales de Vente définissent les conditions dans lesquelles le Prestataire réalise pour le Client des prestations de développement informatique sur-mesure.</p>

<h2>ARTICLE 2 – PÉRIMÈTRE DES PRESTATIONS</h2>
<p>Le périmètre des Prestations est défini dans le devis accepté par le Client. Toute demande de modification ou d'ajout de fonctionnalités non prévues au devis initial fera l'objet d'un avenant chiffré.</p>

<h2>ARTICLE 3 – PRIX ET CONDITIONS FINANCIÈRES</h2>
<p>Le prix des Prestations est fixé au forfait dans le devis. Ce prix est indiqué en euros, hors taxes.</p>

<h2>ARTICLE 4 – COMMANDE ET PAIEMENT</h2>
<p>La commande est réputée ferme et définitive dès signature du devis et versement de l'acompte prévu.</p>

<h2>ARTICLE 5 – DÉLAIS ET LIVRAISON</h2>
<p>Les délais mentionnés au devis sont donnés à titre indicatif et courent à compter de la réception de l'ensemble des éléments nécessaires et du versement de l'acompte.</p>

<h2>ARTICLE 6 – GARANTIE</h2>
<p>Le Prestataire garantit la correction des anomalies bloquantes pendant une durée de 1 mois suivant la livraison définitive.</p>

<h2>ARTICLE 7 – PROPRIÉTÉ INTELLECTUELLE</h2>
<p>Le code source développé spécifiquement pour le Client lui est cédé en pleine propriété à compter du paiement intégral du prix.</p>

<h2>ARTICLE 8 – RESPONSABILITÉ</h2>
<p>La responsabilité du Prestataire est limitée au montant HT effectivement payé par le Client.</p>

<h2>ARTICLE 9 – CONFIDENTIALITÉ</h2>
<p>Chaque partie s'engage à maintenir confidentielles les informations de l'autre partie. Cette obligation perdure 2 ans après la fin des Prestations.</p>

<h2>ARTICLE 10 – LOI APPLICABLE</h2>
<p>Les présentes CGV sont soumises au droit français.</p>`;
