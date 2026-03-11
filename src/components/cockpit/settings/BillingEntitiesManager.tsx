import { useState, useRef } from "react";
import { useBillingEntities, useCgvTemplates, BillingEntity } from "@/hooks/cockpit/useBillingEntities";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Plus, Star, StarOff, Pencil, Trash2, FileText, Hash, Euro, Palette, Upload, X, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EntityFormData {
  name: string;
  legal_form: string;
  capital_amount: number | null;
  siren: string;
  tva_number: string;
  rcs_city: string;
  address: string;
  postal_code: string;
  city: string;
  email: string;
  phone: string;
  website: string;
  quote_prefix: string;
  quote_format: string;
  current_quote_sequence: number;
  default_validity_days: number;
  default_tva_rate: number;
  primary_color: string;
  cgv_template_id: string | null;
  logo_url: string | null;
}

const defaultFormData: EntityFormData = {
  name: "",
  legal_form: "SAS",
  capital_amount: null,
  siren: "",
  tva_number: "",
  rcs_city: "",
  address: "",
  postal_code: "",
  city: "",
  email: "",
  phone: "",
  website: "",
  quote_prefix: "",
  quote_format: "{prefix}{year}{month}{sequence}",
  current_quote_sequence: 0,
  default_validity_days: 30,
  default_tva_rate: 20,
  primary_color: "#1e40af",
  cgv_template_id: null,
};

export function BillingEntitiesManager() {
  const { entities, isLoading, createEntity, updateEntity, deleteEntity, setDefaultEntity } = useBillingEntities();
  const { templates } = useCgvTemplates();
  const [editingEntity, setEditingEntity] = useState<BillingEntity | null>(null);
  const [formData, setFormData] = useState<EntityFormData>(defaultFormData);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleEdit = (entity: BillingEntity) => {
    setEditingEntity(entity);
    setFormData({
      name: entity.name,
      legal_form: entity.legal_form || "SAS",
      capital_amount: entity.capital_amount,
      siren: entity.siren || "",
      tva_number: entity.tva_number || "",
      rcs_city: entity.rcs_city || "",
      address: entity.address || "",
      postal_code: entity.postal_code || "",
      city: entity.city || "",
      email: entity.email || "",
      phone: entity.phone || "",
      website: entity.website || "",
      quote_prefix: entity.quote_prefix || "",
      quote_format: entity.quote_format || "{prefix}{year}{month}{sequence}",
      current_quote_sequence: entity.current_quote_sequence || 0,
      default_validity_days: entity.default_validity_days || 30,
      default_tva_rate: entity.default_tva_rate || 20,
      primary_color: entity.primary_color || "#1e40af",
      cgv_template_id: entity.cgv_template_id,
    });
    setIsSheetOpen(true);
  };

  const handleCreate = () => {
    setEditingEntity(null);
    setFormData(defaultFormData);
    setIsSheetOpen(true);
  };

  const handleSubmit = async () => {
    if (editingEntity) {
      await updateEntity.mutateAsync({ id: editingEntity.id, ...formData });
    } else {
      await createEntity.mutateAsync(formData);
    }
    setIsSheetOpen(false);
  };

  const previewQuoteNumber = () => {
    const now = new Date();
    let preview = formData.quote_format;
    preview = preview.replace("{prefix}", formData.quote_prefix);
    preview = preview.replace("{year}", now.getFullYear().toString());
    preview = preview.replace("{month}", (now.getMonth() + 1).toString().padStart(2, "0"));
    preview = preview.replace("{sequence}", (formData.current_quote_sequence + 1).toString().padStart(4, "0"));
    preview = preview.replace("{seq}", (formData.current_quote_sequence + 1).toString());
    return preview;
  };

  if (isLoading) {
    return <div className="p-4 text-muted-foreground">Chargement...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Sociétés Émettrices
          </CardTitle>
          <CardDescription>
            Gérez les entités juridiques utilisées pour vos devis et factures
          </CardDescription>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Société
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {entities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune société configurée</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer votre première société
                </Button>
              </div>
            ) : (
              entities.map((entity) => (
                <div
                  key={entity.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border",
                    entity.is_default && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: entity.primary_color || "#1e40af" }}
                    >
                      {entity.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{entity.name}</span>
                        {entity.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Par défaut
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {entity.legal_form} • SIREN: {entity.siren || "Non renseigné"} • Préfixe: {entity.quote_prefix || "-"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDefaultEntity.mutate(entity.id)}
                      disabled={entity.is_default}
                    >
                      {entity.is_default ? (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <StarOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(entity)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteEntity.mutate(entity.id)}
                      disabled={entity.is_default}
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

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingEntity ? `Modifier ${editingEntity.name}` : "Nouvelle Société"}
            </SheetTitle>
            <SheetDescription>
              Configurez les informations de la société émettrice
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="general" className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="quote">Devis</TabsTrigger>
              <TabsTrigger value="legal">Légal</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom de la société *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="SAVOIRIA 64"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="legal_form">Forme juridique</Label>
                    <Select
                      value={formData.legal_form}
                      onValueChange={(v) => setFormData({ ...formData, legal_form: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAS">SAS</SelectItem>
                        <SelectItem value="SARL">SARL</SelectItem>
                        <SelectItem value="EURL">EURL</SelectItem>
                        <SelectItem value="SA">SA</SelectItem>
                        <SelectItem value="EI">Entreprise Individuelle</SelectItem>
                        <SelectItem value="Auto">Auto-entrepreneur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Code postal</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Site web</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Couleur principale
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={formData.primary_color}
                      onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="quote" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="h-4 w-4" />
                    <span className="font-medium">Numérotation des devis</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configurez le format de numérotation automatique
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quote_prefix">Préfixe</Label>
                      <Input
                        id="quote_prefix"
                        value={formData.quote_prefix}
                        onChange={(e) => setFormData({ ...formData, quote_prefix: e.target.value })}
                        placeholder="64"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="current_sequence">Séquence actuelle</Label>
                      <Input
                        id="current_sequence"
                        type="number"
                        value={formData.current_quote_sequence}
                        onChange={(e) =>
                          setFormData({ ...formData, current_quote_sequence: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label htmlFor="quote_format">Format</Label>
                    <Input
                      id="quote_format"
                      value={formData.quote_format}
                      onChange={(e) => setFormData({ ...formData, quote_format: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Variables: {"{prefix}"}, {"{year}"}, {"{month}"}, {"{sequence}"} (4 chiffres), {"{seq}"} (sans padding)
                    </p>
                  </div>

                  <div className="mt-4 p-3 bg-background rounded border">
                    <span className="text-sm text-muted-foreground">Prochain numéro : </span>
                    <span className="font-mono font-medium">{previewQuoteNumber()}</span>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="validity">Validité par défaut (jours)</Label>
                    <Input
                      id="validity"
                      type="number"
                      value={formData.default_validity_days}
                      onChange={(e) =>
                        setFormData({ ...formData, default_validity_days: parseInt(e.target.value) || 30 })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tva">Taux TVA par défaut (%)</Label>
                    <Input
                      id="tva"
                      type="number"
                      step="0.1"
                      value={formData.default_tva_rate}
                      onChange={(e) =>
                        setFormData({ ...formData, default_tva_rate: parseFloat(e.target.value) || 20 })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Template CGV associé
                  </Label>
                  <Select
                    value={formData.cgv_template_id || "none"}
                    onValueChange={(v) =>
                      setFormData({ ...formData, cgv_template_id: v === "none" ? null : v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun template</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} (v{t.version})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="legal" className="space-y-4 mt-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="capital">Capital social (€)</Label>
                    <Input
                      id="capital"
                      type="number"
                      value={formData.capital_amount || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          capital_amount: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      placeholder="500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rcs">RCS</Label>
                    <Input
                      id="rcs"
                      value={formData.rcs_city}
                      onChange={(e) => setFormData({ ...formData, rcs_city: e.target.value })}
                      placeholder="PAU"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="siren">SIREN</Label>
                    <Input
                      id="siren"
                      value={formData.siren}
                      onChange={(e) => setFormData({ ...formData, siren: e.target.value })}
                      placeholder="935 282 855"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tva_number">N° TVA Intracommunautaire</Label>
                    <Input
                      id="tva_number"
                      value={formData.tva_number}
                      onChange={(e) => setFormData({ ...formData, tva_number: e.target.value })}
                      placeholder="FR96935282855"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsSheetOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name}>
              {editingEntity ? "Mettre à jour" : "Créer"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
