import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Download, Trash2, Eye, FileText, MoreHorizontal } from 'lucide-react';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
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
import { useForms } from '@/hooks/useForms';
import { useFormResponses } from '@/hooks/useFormResponses';
import { Form, FormResponse } from '@/types/forms';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const FormResponses = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getFormById } = useForms();
  const { loading, getResponses, deleteResponse, deleteMultipleResponses, exportResponses } = useFormResponses();

  const [form, setForm] = useState<Form | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    
    const formData = await getFormById(id);
    if (formData) {
      setForm(formData);
      const result = await getResponses(id);
      setResponses(result.data);
    } else {
      toast({ title: 'Erreur', description: 'Formulaire non trouvé', variant: 'destructive' });
      navigate('/admin/formulaires');
    }
  };

  const filteredResponses = responses.filter(response => {
    const searchLower = search.toLowerCase();
    const matchesSearch = Object.values(response.data).some(
      value => String(value).toLowerCase().includes(searchLower)
    );
    
    if (dateFilter === 'all') return matchesSearch;
    
    const responseDate = new Date(response.submitted_at);
    const now = new Date();
    
    if (dateFilter === 'today') {
      return matchesSearch && responseDate.toDateString() === now.toDateString();
    }
    if (dateFilter === '7days') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return matchesSearch && responseDate >= weekAgo;
    }
    if (dateFilter === '30days') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return matchesSearch && responseDate >= monthAgo;
    }
    
    return matchesSearch;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredResponses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredResponses.map(r => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleDelete = async () => {
    if (responseToDelete) {
      await deleteResponse(responseToDelete);
      setDeleteDialogOpen(false);
      setResponseToDelete(null);
      loadData();
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length > 0) {
      await deleteMultipleResponses(selectedIds);
      setSelectedIds([]);
      loadData();
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    if (!id) return;
    await exportResponses(id, { format, includeMetadata: true });
  };

  const viewDetail = (response: FormResponse) => {
    setSelectedResponse(response);
    setDetailModalOpen(true);
  };

  const conversionRate = form ? 
    (form.views_count > 0 ? ((form.submissions_count / form.views_count) * 100).toFixed(1) : '0') : '0';

  if (!form) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  // Get display columns from form fields
  const displayFields = form.fields
    .filter(f => !['heading', 'paragraph', 'divider'].includes(f.type))
    .slice(0, 4);

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/formulaires')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour
          </Button>
          <div>
            <h1 className="text-xl font-bold text-primary">Réponses : {form.title}</h1>
            <p className="text-sm text-muted-foreground">{responses.length} réponses</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total réponses</p>
            <p className="text-2xl font-bold text-primary">{form.submissions_count}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Taux de conversion</p>
            <p className="text-2xl font-bold text-primary">{conversionRate}%</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Vues totales</p>
            <p className="text-2xl font-bold text-primary">{form.views_count}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher dans les réponses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="7days">7 derniers jours</SelectItem>
              <SelectItem value="30days">30 derniers jours</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                Export JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Selected Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-4 mb-4 p-3 bg-muted rounded-lg">
            <span className="text-sm">{selectedIds.length} sélectionné(s)</span>
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
              <Trash2 className="h-4 w-4 mr-1" />
              Supprimer
            </Button>
          </div>
        )}

        {/* Table */}
        {filteredResponses.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune réponse</h3>
            <p className="text-muted-foreground text-sm">
              {search ? 'Aucun résultat pour cette recherche' : 'Ce formulaire n\'a pas encore reçu de réponses'}
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === filteredResponses.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  {displayFields.map(field => (
                    <TableHead key={field.id}>{field.label}</TableHead>
                  ))}
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResponses.map(response => (
                  <TableRow key={response.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(response.id)}
                        onCheckedChange={() => toggleSelect(response.id)}
                      />
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(response.submitted_at), 'dd/MM/yy HH:mm', { locale: fr })}
                    </TableCell>
                    {displayFields.map(field => (
                      <TableCell key={field.id} className="max-w-[200px] truncate">
                        {Array.isArray(response.data[field.id]) 
                          ? response.data[field.id].join(', ')
                          : String(response.data[field.id] || '-')}
                      </TableCell>
                    ))}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => viewDetail(response)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Voir détail
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setResponseToDelete(response.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Detail Modal */}
        <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Détail de la réponse</DialogTitle>
            </DialogHeader>
            {selectedResponse && (
              <div className="space-y-4 pt-4">
                <div className="text-sm text-muted-foreground">
                  Soumis le {format(new Date(selectedResponse.submitted_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </div>
                
                <div className="space-y-4">
                  {form.fields
                    .filter(f => !['heading', 'paragraph', 'divider'].includes(f.type))
                    .map(field => (
                      <div key={field.id} className="border-b pb-3">
                        <p className="text-sm font-medium text-muted-foreground">{field.label}</p>
                        <p className="mt-1">
                          {Array.isArray(selectedResponse.data[field.id])
                            ? selectedResponse.data[field.id].join(', ')
                            : String(selectedResponse.data[field.id] || '-')}
                        </p>
                      </div>
                    ))}
                </div>

                {selectedResponse.metadata && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Métadonnées</p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {selectedResponse.metadata.device && (
                        <p>Appareil : {selectedResponse.metadata.device}</p>
                      )}
                      {selectedResponse.metadata.source && (
                        <p>Source : {selectedResponse.metadata.source}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette réponse ?</AlertDialogTitle>
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
      </div>
    </AdminLayout>
  );
};

export default FormResponses;
