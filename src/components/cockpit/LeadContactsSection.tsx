import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Users,
  Plus,
  Mail,
  Phone,
  MoreVertical,
  Pencil,
  Trash2,
  Star,
  StarOff,
  Briefcase,
} from "lucide-react";
import { useCockpitLeadContacts, LeadContact } from "@/hooks/cockpit/useCockpitLeadContacts";

interface LeadContactsSectionProps {
  leadId: string;
}

export function LeadContactsSection({ leadId }: LeadContactsSectionProps) {
  const { contacts, isLoading, createContact, updateContact, deleteContact, setPrimaryContact } = 
    useCockpitLeadContacts(leadId);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<LeadContact | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    position: "",
    notes: "",
    is_primary: false,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      position: "",
      notes: "",
      is_primary: false,
    });
  };

  const handleCreate = async () => {
    await createContact.mutateAsync({
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      position: formData.position || null,
      notes: formData.notes || null,
      is_primary: formData.is_primary,
    });
    setIsCreateOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingContact) return;
    await updateContact.mutateAsync({
      id: editingContact.id,
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      position: formData.position || null,
      notes: formData.notes || null,
    });
    setEditingContact(null);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteContact.mutateAsync(deleteConfirm);
    setDeleteConfirm(null);
  };

  const openEditDialog = (contact: LeadContact) => {
    setFormData({
      name: contact.name,
      email: contact.email || "",
      phone: contact.phone || "",
      position: contact.position || "",
      notes: contact.notes || "",
      is_primary: contact.is_primary,
    });
    setEditingContact(contact);
  };

  const ContactForm = () => (
    <div className="grid gap-4 py-4">
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
        <Label htmlFor="position">Fonction</Label>
        <Input
          id="position"
          value={formData.position}
          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          placeholder="Directeur, Chef de projet..."
        />
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

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Notes sur ce contact..."
        />
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contacts ({contacts?.length || 0})
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : contacts?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun contact ajouté. Ajoutez les interlocuteurs de ce lead.
          </p>
        ) : (
          <div className="space-y-2">
            {contacts?.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="text-xs">
                      {contact.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{contact.name}</span>
                      {contact.is_primary && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Principal
                        </Badge>
                      )}
                    </div>
                    {contact.position && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {contact.position}
                      </p>
                    )}
                    <div className="flex gap-3 mt-1">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!contact.is_primary && (
                      <DropdownMenuItem onClick={() => setPrimaryContact.mutate(contact.id)}>
                        <Star className="h-4 w-4 mr-2" />
                        Définir comme principal
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => openEditDialog(contact)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteConfirm(contact.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un contact</DialogTitle>
            </DialogHeader>
            <ContactForm />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
              <Button onClick={handleCreate} disabled={!formData.name || createContact.isPending}>
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingContact} onOpenChange={(open) => { if (!open) { setEditingContact(null); resetForm(); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier le contact</DialogTitle>
            </DialogHeader>
            <ContactForm />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingContact(null)}>Annuler</Button>
              <Button onClick={handleUpdate} disabled={!formData.name || updateContact.isPending}>
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce contact ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible.
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
      </CardContent>
    </Card>
  );
}
