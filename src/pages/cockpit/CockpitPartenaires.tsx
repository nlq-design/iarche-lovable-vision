import { useState } from "react";
import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  Building2,
  Link2,
  FolderKanban,
  FileText,
  Briefcase,
  Calendar,
  Mic
} from "lucide-react";
import { useCockpitPartners, Partner, PartnerType, PARTNER_TYPES } from "@/hooks/cockpit/useCockpitPartners";
import { usePartnerLinkCounts } from "@/hooks/cockpit/usePartnerLinks";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PARTNER_TYPE_CONFIG: Record<PartnerType, { label: string; icon: React.ReactNode; color: string }> = {
  expert_ia: { label: "Expert IA", icon: <Brain className="h-3 w-3" />, color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  independant: { label: "Indépendant", icon: <UserCheck className="h-3 w-3" />, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  apport_affaires: { label: "Apporteur", icon: <Handshake className="h-3 w-3" />, color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
};

export default function CockpitPartenaires() {
  const { partners, isLoading, stats, createPartner, updatePartner, deletePartner } = useCockpitPartners();
  const { data: linkCounts } = usePartnerLinkCounts();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<PartnerType | "all">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? (filteredPartners?.map(p => p.id) || []) : []);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const PartnerForm = () => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs">Nom *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Prénom Nom"
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company" className="text-xs">Entreprise</Label>
          <Input
            id="company"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            placeholder="Société"
            className="h-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="partner_type" className="text-xs">Type de partenaire *</Label>
        <Select
          value={formData.partner_type}
          onValueChange={(v) => setFormData({ ...formData, partner_type: v as PartnerType })}
        >
          <SelectTrigger className="h-9">
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
          <Label htmlFor="email" className="text-xs">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="email@exemple.com"
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-xs">Téléphone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+33 6 00 00 00 00"
            className="h-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="linkedin" className="text-xs">LinkedIn</Label>
          <Input
            id="linkedin"
            value={formData.linkedin_url}
            onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
            placeholder="https://linkedin.com/in/..."
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website" className="text-xs">Site web</Label>
          <Input
            id="website"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://..."
            className="h-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio" className="text-xs">Bio / Présentation</Label>
        <Textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          placeholder="Courte description..."
          rows={2}
          className="text-sm"
        />
      </div>

      {formData.partner_type === "apport_affaires" && (
        <div className="space-y-2">
          <Label htmlFor="commission" className="text-xs">Taux de commission (%)</Label>
          <Input
            id="commission"
            type="number"
            min={0}
            max={100}
            value={formData.commission_rate || ""}
            onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value ? Number(e.target.value) : null })}
            placeholder="10"
            className="h-9"
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <Label htmlFor="is_active" className="text-xs">Actif</Label>
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
      <div className="space-y-4">
        {/* Header compact */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Partenaires</h1>
            <p className="text-sm text-muted-foreground">Réseau d'experts et apporteurs</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 text-sm">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Nouveau
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Créer un partenaire</DialogTitle>
                </DialogHeader>
                <PartnerForm />
                <DialogFooter>
                  <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
                  <Button size="sm" onClick={handleCreate} disabled={!formData.name || createPartner.isPending}>
                    Créer
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats inline + Search */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-3 bg-muted/40 rounded-lg border">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{stats.total}</span>
            </div>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-600" />
              <span className="font-medium text-purple-600">{stats.byType.expert_ia}</span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-600">{stats.byType.independant}</span>
            </div>
            <div className="flex items-center gap-2">
              <Handshake className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-amber-600">{stats.byType.apport_affaires}</span>
            </div>
          </div>
          
          <div className="flex-1" />
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Rechercher..." 
                className="pl-8 h-8 w-full sm:w-[200px] text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as PartnerType | "all")}>
              <SelectTrigger className="w-full sm:w-[140px] h-8 text-sm">
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
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Chargement...</div>
            ) : filteredPartners?.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-medium text-sm">Aucun partenaire</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Commencez par ajouter votre premier partenaire
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10 sticky left-0 bg-card z-10">
                        <Checkbox
                          checked={selectedIds.length === filteredPartners?.length && (filteredPartners?.length || 0) > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="text-xs min-w-[200px]">Partenaire</TableHead>
                      <TableHead className="text-xs min-w-[100px]">Type</TableHead>
                      <TableHead className="text-xs min-w-[120px]">Contact</TableHead>
                      <TableHead className="text-xs min-w-[100px]">Liaisons</TableHead>
                      <TableHead className="text-xs w-[80px]">Statut</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPartners?.map((partner) => {
                      const typeConfig = PARTNER_TYPE_CONFIG[partner.partner_type];
                      const counts = linkCounts?.[partner.id];
                      const totalLinks = counts?.total || 0;
                      
                      return (
                        <TableRow 
                          key={partner.id} 
                          className={`cursor-pointer hover:bg-muted/40 ${!partner.is_active ? "opacity-50" : ""}`}
                          onClick={() => openEditDialog(partner)}
                        >
                          <TableCell className="sticky left-0 bg-card z-10" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.includes(partner.id)}
                              onCheckedChange={() => toggleSelect(partner.id)}
                            />
                          </TableCell>
                          
                          {/* Partenaire */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={partner.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">{partner.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{partner.name}</p>
                                {partner.company && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                    <Building2 className="h-3 w-3 flex-shrink-0" />
                                    {partner.company}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          
                          {/* Type */}
                          <TableCell>
                            <Badge variant="secondary" className={`text-xs ${typeConfig.color}`}>
                              {typeConfig.icon}
                              <span className="ml-1">{typeConfig.label}</span>
                            </Badge>
                          </TableCell>
                          
                          {/* Contact */}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1.5">
                              {partner.email && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a href={`mailto:${partner.email}`} className="p-1.5 rounded hover:bg-muted">
                                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent><p className="text-xs">{partner.email}</p></TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {partner.phone && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <a href={`tel:${partner.phone}`} className="p-1.5 rounded hover:bg-muted">
                                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                      </a>
                                    </TooltipTrigger>
                                    <TooltipContent><p className="text-xs">{partner.phone}</p></TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              {partner.linkedin_url && (
                                <a href={partner.linkedin_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-muted">
                                  <Linkedin className="h-3.5 w-3.5 text-muted-foreground" />
                                </a>
                              )}
                              {partner.website && (
                                <a href={partner.website} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-muted">
                                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                </a>
                              )}
                            </div>
                          </TableCell>
                          
                          {/* Liaisons */}
                          <TableCell>
                            {totalLinks > 0 ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1.5">
                                      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                                      <span className="text-sm font-medium">{totalLinks}</span>
                                      <div className="flex gap-0.5">
                                        {counts?.byType.project ? <FolderKanban className="h-3 w-3 text-emerald-600" /> : null}
                                        {counts?.byType.lead ? <Users className="h-3 w-3 text-blue-600" /> : null}
                                        {counts?.byType.document ? <FileText className="h-3 w-3 text-orange-600" /> : null}
                                        {counts?.byType.opportunity ? <Briefcase className="h-3 w-3 text-purple-600" /> : null}
                                        {counts?.byType.booking ? <Calendar className="h-3 w-3 text-pink-600" /> : null}
                                        {counts?.byType.transcription ? <Mic className="h-3 w-3 text-cyan-600" /> : null}
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-xs space-y-1">
                                      {counts?.byType.project ? <p>Projets: {counts.byType.project}</p> : null}
                                      {counts?.byType.lead ? <p>Leads: {counts.byType.lead}</p> : null}
                                      {counts?.byType.opportunity ? <p>Opportunités: {counts.byType.opportunity}</p> : null}
                                      {counts?.byType.document ? <p>Documents: {counts.byType.document}</p> : null}
                                      {counts?.byType.booking ? <p>RDV: {counts.byType.booking}</p> : null}
                                      {counts?.byType.transcription ? <p>Transcriptions: {counts.byType.transcription}</p> : null}
                                      {counts?.byType.solution ? <p>Solutions: {counts.byType.solution}</p> : null}
                                      {counts?.byType.task ? <p>Tâches: {counts.byType.task}</p> : null}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          
                          {/* Statut */}
                          <TableCell>
                            <Badge variant={partner.is_active ? "default" : "secondary"} className="text-xs">
                              {partner.is_active ? "Actif" : "Inactif"}
                            </Badge>
                          </TableCell>
                          
                          {/* Actions */}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
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
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingPartner} onOpenChange={(open) => { if (!open) { setEditingPartner(null); resetForm(); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Modifier le partenaire</DialogTitle>
            </DialogHeader>
            <PartnerForm />
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setEditingPartner(null)}>Annuler</Button>
              <Button size="sm" onClick={handleUpdate} disabled={!formData.name || updatePartner.isPending}>
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
