import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Copy, QrCode, Trash2, Edit, Eye, MoreHorizontal, FileText } from 'lucide-react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useForms } from '@/hooks/useForms';
import { Form } from '@/types/forms';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const AdminFormulaires = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading, getForms, createForm, deleteForm, duplicateForm, toggleFormActive } = useForms();
  
  const [forms, setForms] = useState<Form[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<Form | null>(null);
  const [newFormDialogOpen, setNewFormDialogOpen] = useState(false);
  const [newFormTitle, setNewFormTitle] = useState('');
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    const data = await getForms();
    setForms(data);
  };

  const filteredForms = forms.filter(form => {
    const matchesSearch = form.title.toLowerCase().includes(search.toLowerCase()) ||
                         form.slug.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'active' && form.is_active) ||
                         (filter === 'inactive' && !form.is_active);
    return matchesSearch && matchesFilter;
  });

  const handleCreateForm = async () => {
    if (!newFormTitle.trim()) return;
    const form = await createForm(newFormTitle);
    if (form) {
      setNewFormDialogOpen(false);
      setNewFormTitle('');
      navigate(`/admin/formulaires/${form.id}`);
    }
  };

  const handleDelete = async () => {
    if (!formToDelete) return;
    await deleteForm(formToDelete.id);
    setDeleteDialogOpen(false);
    setFormToDelete(null);
    loadForms();
  };

  const handleDuplicate = async (form: Form) => {
    const duplicated = await duplicateForm(form.id);
    if (duplicated) {
      loadForms();
    }
  };

  const handleToggleActive = async (form: Form) => {
    await toggleFormActive(form.id, !form.is_active);
    loadForms();
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`https://iarche.fr/formulaires/${slug}`);
    toast({ title: 'Lien copié', description: 'Le lien du formulaire a été copié' });
  };

  const showQRCode = (form: Form) => {
    setSelectedForm(form);
    setQrDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-primary">Formulaires</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Créez et gérez vos formulaires personnalisés
            </p>
          </div>
          <Button onClick={() => setNewFormDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau formulaire
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un formulaire..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="inactive">Inactifs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Forms Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-lg border p-5 animate-pulse">
                <div className="h-5 bg-muted rounded w-3/4 mb-3" />
                <div className="h-3 bg-muted rounded w-1/2 mb-4" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filteredForms.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucun formulaire</h3>
            <p className="text-muted-foreground text-sm mb-4">
              {search ? 'Aucun résultat pour cette recherche' : 'Créez votre premier formulaire'}
            </p>
            {!search && (
              <Button onClick={() => setNewFormDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer un formulaire
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredForms.map((form) => (
              <div
                key={form.id}
                className="bg-card rounded-lg border p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-primary truncate">{form.title}</h3>
                    <button
                      onClick={() => copyLink(form.slug)}
                      className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1"
                    >
                      <span className="truncate">/f/{form.slug}</span>
                      <Copy className="h-3 w-3 flex-shrink-0" />
                    </button>
                  </div>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={() => handleToggleActive(form)}
                    className="ml-2"
                  />
                </div>

                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
                  <span>{form.submissions_count} réponses</span>
                  <span>•</span>
                  <span>{form.views_count} vues</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Créé le {format(new Date(form.created_at), 'dd/MM/yyyy', { locale: fr })}
                  </span>
                  <Badge variant={form.is_active ? 'default' : 'secondary'}>
                    {form.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/formulaires/${form.id}`)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    Éditer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/formulaires/${form.id}/responses`)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Réponses
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => showQRCode(form)}>
                        <QrCode className="h-4 w-4 mr-2" />
                        QR Code
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(form)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Dupliquer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setFormToDelete(form);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* New Form Dialog */}
        <Dialog open={newFormDialogOpen} onOpenChange={setNewFormDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau formulaire</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Titre du formulaire"
                value={newFormTitle}
                onChange={(e) => setNewFormTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateForm()}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setNewFormDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateForm} disabled={!newFormTitle.trim()}>
                  Créer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer le formulaire ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action est irréversible. Le formulaire "{formToDelete?.title}" et toutes ses réponses seront supprimés.
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

        {/* QR Code Dialog */}
        <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>QR Code - {selectedForm?.title}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center py-6">
              {selectedForm?.qr_code_url ? (
                <img
                  src={selectedForm.qr_code_url}
                  alt="QR Code"
                  className="w-48 h-48 border rounded-lg"
                />
              ) : (
                <div className="w-48 h-48 border rounded-lg flex items-center justify-center bg-muted">
                  <p className="text-sm text-muted-foreground text-center px-4">
                    Le QR Code sera généré après la première sauvegarde
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-4">
                {window.location.origin}/formulaires/{selectedForm?.slug}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminFormulaires;
