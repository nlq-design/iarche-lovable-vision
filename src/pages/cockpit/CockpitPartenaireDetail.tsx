import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Brain, 
  UserCheck, 
  Handshake,
  Link2,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Building2,
  Loader2,
  RotateCcw,
  Sparkles,
  Send,
  UserPlus,
  Shield
} from "lucide-react";
import { useCockpitPartners, Partner, PartnerType, PartnerSubtype, PARTNER_TYPES, PARTNER_SUBTYPES, generateSlug } from "@/hooks/cockpit/useCockpitPartners";
import { ConsulteTab } from "@/components/cockpit/ConsulteTab";
import { LinkedTranscriptionsSection } from "@/components/cockpit/LinkedTranscriptionsSection";
import { LinkedFilesSection } from "@/components/cockpit/LinkedFilesSection";
import { LinkedGeneratedDocumentsSection } from "@/components/cockpit/LinkedGeneratedDocumentsSection";
import { PartnerLoginHistoryTab } from "@/components/cockpit/PartnerLoginHistoryTab";
import { useQueryClient } from "@tanstack/react-query";
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
import { InvitePartnerDialog } from "@/components/cockpit/InvitePartnerDialog";

const PARTNER_TYPE_CONFIG: Record<PartnerType, { label: string; icon: React.ReactNode; color: string }> = {
  client: { label: "Client", icon: <UserCheck className="h-4 w-4" />, color: "text-emerald-600" },
  partenaire: { label: "Partenaire", icon: <Brain className="h-4 w-4" />, color: "text-purple-600" },
  affilie: { label: "Affilié", icon: <Link2 className="h-4 w-4" />, color: "text-blue-600" },
  apporteur_affaires: { label: "Apporteur d'affaires", icon: <Handshake className="h-4 w-4" />, color: "text-amber-600" },
};

const PARTNER_SUBTYPE_LABELS: Record<PartnerSubtype, string> = {
  expert_ia: "Expert IA",
  independant: "Indépendant",
  apport_affaires: "Apport d'affaires",
};

export default function CockpitPartenaireDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isNew = slug === "nouveau";
  
  const { partners, allPartners, isLoading, createPartner, updatePartner, deletePartner, softDeletePartner, restorePartner } = useCockpitPartners();
  const queryClient = useQueryClient();
  
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    slug: "",
    name: "",
    email: "",
    phone: "",
    company: "",
    partner_type: "partenaire" as PartnerType,
    partner_subtype: null as PartnerSubtype | null,
    bio: "",
    linkedin_url: "",
    website: "",
    specialties: [] as string[],
    commission_rate: null as number | null,
    is_active: true,
  });

  // Find existing partner by slug or UUID (in allPartners to include trashed ones)
  const existingPartner = !isNew ? allPartners?.find(p => p.slug === slug || p.id === slug) : null;

  useEffect(() => {
    if (existingPartner) {
      setFormData({
        slug: existingPartner.slug || "",
        name: existingPartner.name,
        email: existingPartner.email || "",
        phone: existingPartner.phone || "",
        company: existingPartner.company || "",
        partner_type: existingPartner.partner_type,
        partner_subtype: existingPartner.partner_subtype,
        bio: existingPartner.bio || "",
        linkedin_url: existingPartner.linkedin_url || "",
        website: existingPartner.website || "",
        specialties: existingPartner.specialties || [],
        commission_rate: existingPartner.commission_rate,
        is_active: existingPartner.is_active,
      });
    }
  }, [existingPartner]);

  const handleSlugChange = (value: string) => {
    const newSlug = generateSlug(value);
    setFormData((prev) => ({
      ...prev,
      slug: newSlug,
      name: prev.name || value.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  };

  const handleSave = async () => {
    if (isNew) {
      await createPartner.mutateAsync({
        ...formData,
        avatar_url: null,
        user_id: null,
      });
      navigate("/cockpit/partenaires");
    } else if (existingPartner) {
      await updatePartner.mutateAsync({
        id: existingPartner.id,
        ...formData,
      });
      navigate("/cockpit/partenaires");
    }
  };

  const handleDelete = async () => {
    if (existingPartner) {
      await deletePartner.mutateAsync(existingPartner.id);
      navigate("/cockpit/partenaires");
    }
  };

  const handleSoftDelete = async () => {
    if (existingPartner) {
      await softDeletePartner.mutateAsync(existingPartner.id);
      navigate("/cockpit/partenaires");
    }
  };

  const handleRestore = async () => {
    if (existingPartner) {
      await restorePartner.mutateAsync(existingPartner.id);
    }
  };

  if (isLoading && !isNew) {
    return (
      <CockpitLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </CockpitLayout>
    );
  }

  if (!isNew && !existingPartner && !isLoading) {
    return (
      <CockpitLayout>
        <div className="text-center py-12">
          <h2 className="text-lg font-medium">Partenaire non trouvé</h2>
          <p className="text-muted-foreground mt-2">Le partenaire "{slug}" n'existe pas.</p>
          <Button onClick={() => navigate("/cockpit/partenaires")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
      </CockpitLayout>
    );
  }

  const isInTrash = existingPartner?.deleted_at != null;

  return (
    <CockpitLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/cockpit/partenaires")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">
                {isNew ? "Nouveau partenaire" : formData.name || "Partenaire"}
              </h1>
              {!isNew && formData.slug && (
                <p className="text-sm text-muted-foreground font-mono">{formData.slug}</p>
              )}
            </div>
            {isInTrash && (
              <Badge variant="destructive">Dans la corbeille</Badge>
            )}
          </div>
          <div className="flex gap-2">
            {isInTrash ? (
              <>
                <Button variant="outline" onClick={handleRestore} disabled={restorePartner.isPending}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurer
                </Button>
                <Button variant="destructive" onClick={() => setDeleteConfirm(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer définitivement
                </Button>
              </>
            ) : (
              <>
                {!isNew && existingPartner && !existingPartner.user_id && (
                  <Button variant="outline" onClick={() => setInviteDialogOpen(true)}>
                    <Send className="h-4 w-4 mr-2" />
                    Inviter
                  </Button>
                )}
                {!isNew && existingPartner?.user_id && (
                  <Badge variant="secondary" className="h-9 px-3 flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Compte lié
                  </Badge>
                )}
                {!isNew && (
                  <Button variant="outline" onClick={handleSoftDelete} disabled={softDeletePartner.isPending}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Mettre à la corbeille
                  </Button>
                )}
                <Button 
                  onClick={handleSave} 
                  disabled={!formData.slug || !formData.name || createPartner.isPending || updatePartner.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isNew ? "Créer" : "Enregistrer"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="informations" className="space-y-4">
          <TabsList className="h-9">
            <TabsTrigger value="informations" className="gap-1.5 text-sm h-7">
              <UserCheck className="h-3.5 w-3.5" />
              Informations
            </TabsTrigger>
            {!isNew && existingPartner && (
              <TabsTrigger value="documents" className="gap-1.5 text-sm h-7">
                <Building2 className="h-3.5 w-3.5" />
                Docs
              </TabsTrigger>
            )}
            {!isNew && existingPartner && (
              <TabsTrigger value="consulte" className="gap-1.5 text-sm h-7">
                <Sparkles className="h-3.5 w-3.5" />
                Consulte
              </TabsTrigger>
            )}
            {!isNew && existingPartner && existingPartner.user_id && (
              <TabsTrigger value="activite" className="gap-1.5 text-sm h-7">
                <Shield className="h-3.5 w-3.5" />
                Activité
              </TabsTrigger>
            )}
          </TabsList>

          {/* Informations Tab */}
          <TabsContent value="informations" className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main info */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Informations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Slug */}
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug (identifiant unique) *</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="jean-dupont"
                      className="font-mono"
                      disabled={!isNew}
                    />
                    <p className="text-xs text-muted-foreground">
                      Identifiant unique du partenaire (ex: prenom-nom)
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom complet *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Prénom Nom"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Entreprise</Label>
                      <div className="relative">
                        <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="company"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          placeholder="Société"
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="partner_type">Type *</Label>
                      <Select
                        value={formData.partner_type}
                        onValueChange={(v) => setFormData({ ...formData, partner_type: v as PartnerType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PARTNER_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                {PARTNER_TYPE_CONFIG[type.value].icon}
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="partner_subtype">Sous-type</Label>
                      <Select
                        value={formData.partner_subtype ?? "none"}
                        onValueChange={(v) => setFormData({ ...formData, partner_subtype: v === "none" ? null : (v as PartnerSubtype) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Aucun" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun</SelectItem>
                          {PARTNER_SUBTYPES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="email@exemple.com"
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <div className="relative">
                        <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+33 6 00 00 00 00"
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="linkedin">LinkedIn</Label>
                      <div className="relative">
                        <Linkedin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="linkedin"
                          value={formData.linkedin_url}
                          onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                          placeholder="linkedin.com/in/..."
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Site web</Label>
                      <div className="relative">
                        <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="website"
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          placeholder="https://..."
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Présentation du partenaire..."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Sidebar */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Paramètres</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_active">Partenaire actif</Label>
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="commission">Taux de commission (%)</Label>
                      <Input
                        id="commission"
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={formData.commission_rate ?? ""}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          commission_rate: e.target.value ? parseFloat(e.target.value) : null 
                        })}
                        placeholder="10"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Métadonnées */}
                {!isNew && existingPartner && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Métadonnées</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-2">
                      <p>Créé le {new Date(existingPartner.created_at).toLocaleDateString("fr-FR")}</p>
                      <p>Modifié le {new Date(existingPartner.updated_at).toLocaleDateString("fr-FR")}</p>
                      {existingPartner.deleted_at && (
                        <p className="text-destructive">
                          Supprimé le {new Date(existingPartner.deleted_at).toLocaleDateString("fr-FR")}
                        </p>
                      )}
                      
                      {/* Login stats */}
                      <div className="border-t pt-2 mt-2">
                        <p className="font-medium text-foreground mb-1">Connexions</p>
                        {existingPartner.last_login_at ? (
                          <>
                            <p>
                              Dernière connexion :{" "}
                              {new Date(existingPartner.last_login_at).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            <p>Total connexions : {existingPartner.login_count || 0}</p>
                          </>
                        ) : existingPartner.user_id ? (
                          <p className="text-muted-foreground/70 italic">Jamais connecté</p>
                        ) : (
                          <p className="text-muted-foreground/70 italic">Compte non activé</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Documents Tab */}
          {!isNew && existingPartner && (
            <TabsContent value="documents" className="space-y-4">
              {/* Transcriptions liées */}
              <LinkedTranscriptionsSection entityType="partner" entityId={existingPartner.id} />

              {/* Fichiers importés */}
              <LinkedFilesSection entityType="partner" entityId={existingPartner.id} title="Fichiers importés" />

              {/* Documents liés from cockpit-documents */}
              <LinkedGeneratedDocumentsSection entityType="partner" entityId={existingPartner.id} title="Documents liés" />
            </TabsContent>
          )}

          {/* Consulte Tab */}
          {!isNew && existingPartner && (
            <TabsContent value="consulte">
              <ConsulteTab
                entityType="partner"
                entityId={existingPartner.id}
                entityName={existingPartner.name}
                summary={existingPartner.ai_documents_summary || null}
                onSynthesisComplete={() => {
                  queryClient.invalidateQueries({ queryKey: ['cockpit-partners'] });
                  queryClient.invalidateQueries({ queryKey: ['cockpit-partners-all'] });
                }}
              />
            </TabsContent>
          )}

          {/* Activité Tab - Login History */}
          {!isNew && existingPartner && existingPartner.user_id && (
            <TabsContent value="activite" className="space-y-4">
              <PartnerLoginHistoryTab partnerId={existingPartner.id} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le partenaire sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Dialog */}
      {existingPartner && (
        <InvitePartnerDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          partnerId={existingPartner.id}
          partnerName={existingPartner.name}
          partnerEmail={existingPartner.email || undefined}
        />
      )}
    </CockpitLayout>
  );
}
