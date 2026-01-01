import { useState } from "react";
import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Users, 
  Plus, 
  Search, 
  Brain, 
  UserCheck, 
  Handshake,
  Mail,
  Phone,
  Globe,
  Linkedin,
  MoreVertical,
  Pencil,
  Trash2,
  Building2
} from "lucide-react";
import { useCockpitPartners, Partner, PartnerType, PARTNER_TYPES } from "@/hooks/cockpit/useCockpitPartners";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const PARTNER_TYPE_CONFIG: Record<PartnerType, { label: string; icon: React.ReactNode; color: string }> = {
  expert_ia: { label: "Expert IA", icon: <Brain className="h-4 w-4" />, color: "bg-purple-100 text-purple-800" },
  independant: { label: "Indépendant", icon: <UserCheck className="h-4 w-4" />, color: "bg-blue-100 text-blue-800" },
  apport_affaires: { label: "Apport d'affaires", icon: <Handshake className="h-4 w-4" />, color: "bg-amber-100 text-amber-800" },
};

export default function CockpitPartenaires() {
  const { partners, isLoading, stats, createPartner, updatePartner, deletePartner } = useCockpitPartners();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<PartnerType | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    partner_type: "independant" as PartnerType,
    bio: "",
    linkedin_url: "",
    website: "",
    specialties: [] as string[],
    commission_rate: null as number | null,
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      company: "",
      partner_type: "independant",
      bio: "",
      linkedin_url: "",
      website: "",
      specialties: [],
      commission_rate: null,
      is_active: true,
    });
  };

  const handleCreate = async () => {
    await createPartner.mutateAsync({
      ...formData,
      avatar_url: null,
    });
    setIsCreateOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingPartner) return;
    await updatePartner.mutateAsync({
      id: editingPartner.id,
      ...formData,
    });
    setEditingPartner(null);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deletePartner.mutateAsync(deleteConfirm);
    setDeleteConfirm(null);
  };

  const openEditDialog = (partner: Partner) => {
    setFormData({
      name: partner.name,
      email: partner.email || "",
      phone: partner.phone || "",
      company: partner.company || "",
      partner_type: partner.partner_type,
      bio: partner.bio || "",
      linkedin_url: partner.linkedin_url || "",
      website: partner.website || "",
      specialties: partner.specialties || [],
      commission_rate: partner.commission_rate,
      is_active: partner.is_active,
    });
    setEditingPartner(partner);
  };

  const filteredPartners = partners?.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || p.partner_type === filterType;
    return matchesSearch && matchesType;
  });

  const PartnerForm = () => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Prénom Nom"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Entreprise</Label>
          <Input
            id="company"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            placeholder="Société"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="partner_type">Type de partenaire *</Label>
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@exemple.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+33 6 00 00 00 00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="linkedin">LinkedIn</Label>
          <Input
            id="linkedin"
            value={formData.linkedin_url}
            onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
            placeholder="https://linkedin.com/in/..."
          />
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio / Présentation</Label>
        <Textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          placeholder="Courte description..."
          rows={3}
        />
      </div>

      {formData.partner_type === "apport_affaires" && (
        <div className="space-y-2">
          <Label htmlFor="commission">Taux de commission (%)</Label>
          <Input
            id="commission"
            type="number"
            min={0}
            max={100}
            value={formData.commission_rate || ""}
            onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value ? Number(e.target.value) : null })}
            placeholder="10"
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <Label htmlFor="is_active">Actif</Label>
        <Switch
          id="is_active"
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
      </div>
    </div>
  );

  return (
    <CockpitLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Partenaires</h1>
            <p className="text-muted-foreground">Gérez votre réseau de partenaires et experts</p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau partenaire
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Créer un partenaire</DialogTitle>
              </DialogHeader>
              <PartnerForm />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                <Button onClick={handleCreate} disabled={!formData.name || createPartner.isPending}>
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Brain className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.byType.expert_ia}</p>
                  <p className="text-xs text-muted-foreground">Experts IA</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <UserCheck className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.byType.independant}</p>
                  <p className="text-xs text-muted-foreground">Indépendants</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Handshake className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.byType.apport_affaires}</p>
                  <p className="text-xs text-muted-foreground">Apporteurs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un partenaire..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as PartnerType | "all")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {PARTNER_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Partners Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6 h-48" />
              </Card>
            ))}
          </div>
        ) : filteredPartners?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium">Aucun partenaire</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Commencez par ajouter votre premier partenaire
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPartners?.map((partner) => {
              const typeConfig = PARTNER_TYPE_CONFIG[partner.partner_type];
              return (
                <Card key={partner.id} className={!partner.is_active ? "opacity-60" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={partner.avatar_url || undefined} />
                          <AvatarFallback>{partner.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{partner.name}</CardTitle>
                          {partner.company && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {partner.company}
                            </p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(partner)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeleteConfirm(partner.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Badge className={typeConfig.color}>
                      {typeConfig.icon}
                      <span className="ml-1">{typeConfig.label}</span>
                    </Badge>

                    {partner.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{partner.bio}</p>
                    )}

                    <div className="flex flex-wrap gap-2 text-sm">
                      {partner.email && (
                        <a href={`mailto:${partner.email}`} className="text-muted-foreground hover:text-primary flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Email
                        </a>
                      )}
                      {partner.phone && (
                        <a href={`tel:${partner.phone}`} className="text-muted-foreground hover:text-primary flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          Appeler
                        </a>
                      )}
                      {partner.linkedin_url && (
                        <a href={partner.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary flex items-center gap-1">
                          <Linkedin className="h-3 w-3" />
                          LinkedIn
                        </a>
                      )}
                      {partner.website && (
                        <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          Site
                        </a>
                      )}
                    </div>

                    {partner.partner_type === "apport_affaires" && partner.commission_rate && (
                      <p className="text-xs text-muted-foreground">
                        Commission: {partner.commission_rate}%
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingPartner} onOpenChange={(open) => { if (!open) { setEditingPartner(null); resetForm(); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Modifier le partenaire</DialogTitle>
            </DialogHeader>
            <PartnerForm />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingPartner(null)}>Annuler</Button>
              <Button onClick={handleUpdate} disabled={!formData.name || updatePartner.isPending}>
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce partenaire ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Le partenaire sera retiré de tous les projets et documents.
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
      </div>
    </CockpitLayout>
  );
}
