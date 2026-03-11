import { useState, useEffect } from "react";
import { useOwnerProfile, OwnerProfileInput } from "@/hooks/cockpit/useOwnerProfile";
import { useBillingEntities } from "@/hooks/cockpit/useBillingEntities";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Pencil, Plus, Building2, Mail, Briefcase } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const defaultFormData: OwnerProfileInput = {
  display_name: "",
  role_label: "",
  avatar_url: "",
  email: "",
  primary_company_id: null,
};

export function OwnerProfileManager() {
  const { ownerProfile, isLoading, createOwnerProfile, updateOwnerProfile } = useOwnerProfile();
  const { entities: billingEntities } = useBillingEntities();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [formData, setFormData] = useState<OwnerProfileInput>(defaultFormData);
  const isEditing = !!ownerProfile;

  useEffect(() => {
    if (ownerProfile && sheetOpen) {
      setFormData({
        display_name: ownerProfile.display_name,
        role_label: ownerProfile.role_label ?? "",
        avatar_url: ownerProfile.avatar_url ?? "",
        email: ownerProfile.email ?? "",
        primary_company_id: ownerProfile.primary_company_id,
      });
    } else if (!ownerProfile && sheetOpen) {
      setFormData(defaultFormData);
    }
  }, [ownerProfile, sheetOpen]);

  const handleSave = () => {
    if (!formData.display_name.trim()) return;

    const payload: OwnerProfileInput = {
      ...formData,
      primary_company_id: formData.primary_company_id || null,
    };

    if (isEditing) {
      updateOwnerProfile.mutate(payload, { onSuccess: () => setSheetOpen(false) });
    } else {
      createOwnerProfile.mutate(payload, { onSuccess: () => setSheetOpen(false) });
    }
  };

  const isSaving = createOwnerProfile.isPending || updateOwnerProfile.isPending;
  const initials = ownerProfile?.display_name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  const linkedCompany = billingEntities.find((e) => e.id === ownerProfile?.primary_company_id);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserCircle className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Profil Propriétaire</CardTitle>
                <CardDescription>Informations internes — non visibles par vos clients</CardDescription>
              </div>
            </div>
            {ownerProfile ? (
              <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            ) : (
              <Button size="sm" onClick={() => setSheetOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer mon profil
              </Button>
            )}
          </div>
        </CardHeader>
        {ownerProfile && (
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={ownerProfile.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground truncate">{ownerProfile.display_name}</p>
                  {ownerProfile.role_label && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {ownerProfile.role_label}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {ownerProfile.email && (
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {ownerProfile.email}
                    </span>
                  )}
                  {linkedCompany && (
                    <span className="flex items-center gap-1 truncate">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      {linkedCompany.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{isEditing ? "Modifier le profil" : "Créer mon profil"}</SheetTitle>
            <SheetDescription>
              Ce profil est utilisé en interne pour l'attribution CRM.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="display_name">Nom affiché *</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData((p) => ({ ...p, display_name: e.target.value }))}
                placeholder="Jean Dupont"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role_label">
                <Briefcase className="h-3.5 w-3.5 inline mr-1" />
                Fonction
              </Label>
              <Input
                id="role_label"
                value={formData.role_label ?? ""}
                onChange={(e) => setFormData((p) => ({ ...p, role_label: e.target.value }))}
                placeholder="Fondateur, Gérant, Associé…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="h-3.5 w-3.5 inline mr-1" />
                Email professionnel
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email ?? ""}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                placeholder="jean@entreprise.fr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar_url">URL Avatar</Label>
              <Input
                id="avatar_url"
                value={formData.avatar_url ?? ""}
                onChange={(e) => setFormData((p) => ({ ...p, avatar_url: e.target.value }))}
                placeholder="https://…"
              />
              {formData.avatar_url && (
                <Avatar className="h-10 w-10 mt-1">
                  <AvatarImage src={formData.avatar_url} />
                  <AvatarFallback>?</AvatarFallback>
                </Avatar>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                <Building2 className="h-3.5 w-3.5 inline mr-1" />
                Société principale
              </Label>
              <Select
                value={formData.primary_company_id ?? "none"}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, primary_company_id: v === "none" ? null : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucune société liée" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {billingEntities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
                      {entity.is_default ? " ★" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>
                Annuler
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={isSaving || !formData.display_name.trim()}
              >
                {isSaving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
