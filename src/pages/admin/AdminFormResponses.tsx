import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, Trash2, Eye, FileText, MoreHorizontal, Calendar, Filter } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface FormWithTitle {
  id: string;
  title: string;
  slug: string;
}

interface ResponseWithForm {
  id: string;
  form_id: string;
  data: Record<string, any>;
  metadata: Record<string, any>;
  submitted_at: string;
  form_title?: string;
  form_slug?: string;
}

const AdminFormResponses = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<FormWithTitle[]>([]);
  const [responses, setResponses] = useState<ResponseWithForm[]>([]);
  const [search, setSearch] = useState('');
  const [formFilter, setFormFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<ResponseWithForm | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load forms
      const { data: formsData, error: formsError } = await supabase
        .from('forms')
        .select('id, title, slug')
        .order('title');
      
      if (formsError) throw formsError;
      setForms(formsData || []);

      // Load all responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('form_responses')
        .select('*')
        .order('submitted_at', { ascending: false });
      
      if (responsesError) throw responsesError;

      // Map form titles to responses
      const formMap = new Map(formsData?.map(f => [f.id, { title: f.title, slug: f.slug }]) || []);
      const enrichedResponses = (responsesData || []).map(r => ({
        ...r,
        data: r.data as Record<string, any>,
        metadata: r.metadata as Record<string, any>,
        form_title: formMap.get(r.form_id)?.title || 'Formulaire inconnu',
        form_slug: formMap.get(r.form_id)?.slug,
      }));
      
      setResponses(enrichedResponses);
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de charger les données', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredResponses = responses.filter(response => {
    // Form filter
    if (formFilter !== 'all' && response.form_id !== formFilter) return false;
    
    // Search
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || 
      Object.values(response.data).some(value => String(value).toLowerCase().includes(searchLower)) ||
      response.form_title?.toLowerCase().includes(searchLower);
    
    if (!matchesSearch) return false;
    
    // Date filter
    const responseDate = new Date(response.submitted_at);
    const now = new Date();
    
    if (dateFilter === 'today') {
      return responseDate.toDateString() === now.toDateString();
    } else if (dateFilter === '7days') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return responseDate >= weekAgo;
    } else if (dateFilter === '30days') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return responseDate >= monthAgo;
    } else if (dateFilter === 'custom') {
      let matchesDate = true;
      if (startDate) matchesDate = responseDate >= new Date(startDate);
      if (endDate && matchesDate) matchesDate = responseDate <= new Date(endDate + 'T23:59:59');
      return matchesDate;
    }
    
    return true;
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
      const { error } = await supabase
        .from('form_responses')
        .delete()
        .eq('id', responseToDelete);
      
      if (error) {
        toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' });
      } else {
        toast({ title: 'Succès', description: 'Réponse supprimée' });
        loadData();
      }
      setDeleteDialogOpen(false);
      setResponseToDelete(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length > 0) {
      const { error } = await supabase
        .from('form_responses')
        .delete()
        .in('id', selectedIds);
      
      if (error) {
        toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' });
      } else {
        toast({ title: 'Succès', description: `${selectedIds.length} réponses supprimées` });
        setSelectedIds([]);
        loadData();
      }
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    const dataToExport = filteredResponses.map(r => ({
      id: r.id,
      formulaire: r.form_title,
      date: r.submitted_at,
      ...r.data,
      device: r.metadata?.device,
      source: r.metadata?.source,
    }));

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reponses-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // CSV
      const headers = new Set<string>(['formulaire', 'date', 'device', 'source']);
      dataToExport.forEach(r => Object.keys(r).forEach(k => headers.add(k)));
      headers.delete('id');
      
      const headerRow = Array.from(headers).join(',');
      const dataRows = dataToExport.map(r => {
        return Array.from(headers).map(h => {
          const val = (r as any)[h];
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val ?? '';
        }).join(',');
      });
      
      const csv = [headerRow, ...dataRows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reponses-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    
    toast({ title: 'Export réussi', description: `Fichier ${format.toUpperCase()} téléchargé` });
  };

  const viewDetail = (response: ResponseWithForm) => {
    setSelectedResponse(response);
    setDetailModalOpen(true);
  };

  // Stats
  const totalResponses = responses.length;
  const todayResponses = responses.filter(r => 
    new Date(r.submitted_at).toDateString() === new Date().toDateString()
  ).length;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-primary">Toutes les réponses</h1>
          <p className="text-sm text-muted-foreground">Vue consolidée de tous les formulaires</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total réponses</p>
            <p className="text-2xl font-bold text-primary">{totalResponses}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Aujourd'hui</p>
            <p className="text-2xl font-bold text-primary">{todayResponses}</p>
          </div>
          <div className="bg-card border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Formulaires actifs</p>
            <p className="text-2xl font-bold text-primary">{forms.length}</p>
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
          <Select value={formFilter} onValueChange={setFormFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tous les formulaires" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les formulaires</SelectItem>
              {forms.map(form => (
                <SelectItem key={form.id} value={form.id}>{form.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes dates</SelectItem>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="7days">7 derniers jours</SelectItem>
              <SelectItem value="30days">30 derniers jours</SelectItem>
              <SelectItem value="custom">Personnalisé</SelectItem>
            </SelectContent>
          </Select>
          {dateFilter === 'custom' && (
            <>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[140px]"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[140px]"
              />
            </>
          )}
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
              {search || formFilter !== 'all' ? 'Aucun résultat pour ces filtres' : 'Aucun formulaire n\'a encore reçu de réponses'}
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
                  <TableHead>Formulaire</TableHead>
                  <TableHead>Aperçu données</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResponses.map(response => {
                  // Get first 2 data fields for preview
                  const dataPreview = Object.entries(response.data)
                    .slice(0, 2)
                    .map(([_, v]) => String(v).slice(0, 30))
                    .join(' • ');
                  
                  return (
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
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className="cursor-pointer hover:bg-primary/10"
                          onClick={() => response.form_slug && navigate(`/admin/formulaires/${response.form_id}/responses`)}
                        >
                          {response.form_title}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">
                        {dataPreview || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {response.metadata?.device || 'N/A'}
                        </Badge>
                      </TableCell>
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
                  );
                })}
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
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{selectedResponse.form_title}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(selectedResponse.submitted_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                  </span>
                </div>
                
                <div className="space-y-4 pt-4">
                  {Object.entries(selectedResponse.data).map(([key, value]) => (
                    <div key={key} className="border-b pb-3">
                      <p className="text-sm font-medium text-muted-foreground">{key}</p>
                      <p className="mt-1">
                        {Array.isArray(value) ? value.join(', ') : String(value || '-')}
                      </p>
                    </div>
                  ))}
                </div>

                {selectedResponse.metadata && Object.keys(selectedResponse.metadata).length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Métadonnées</p>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {selectedResponse.metadata.device && (
                        <p>Appareil : {selectedResponse.metadata.device}</p>
                      )}
                      {selectedResponse.metadata.source && (
                        <p>Source : {selectedResponse.metadata.source}</p>
                      )}
                      {selectedResponse.metadata.referrer && (
                        <p>Referrer : {selectedResponse.metadata.referrer}</p>
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

export default AdminFormResponses;