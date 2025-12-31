import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Switch } from '@/components/ui/switch';
import { 
  Plus, Trash2, Edit2, Download, Upload, RefreshCw, 
  Loader2, Search, Sparkles, BookOpen, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface KeywordAlias {
  id: string;
  canonical_name: string;
  alias: string;
  context_type: string;
  phonetic_key: string | null;
  is_active: boolean;
  created_at: string;
}

const CONTEXT_TYPES = [
  { value: 'solution', label: 'Solution', color: 'bg-purple-500/10 text-purple-600' },
  { value: 'client', label: 'Client', color: 'bg-blue-500/10 text-blue-600' },
  { value: 'concurrent', label: 'Concurrent', color: 'bg-red-500/10 text-red-600' },
  { value: 'outil', label: 'Outil', color: 'bg-green-500/10 text-green-600' },
  { value: 'service', label: 'Service', color: 'bg-orange-500/10 text-orange-600' },
  { value: 'autre', label: 'Autre', color: 'bg-gray-500/10 text-gray-600' },
];

export function KeywordDictionary() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterContext, setFilterContext] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAlias, setEditingAlias] = useState<KeywordAlias | null>(null);
  const [deleteAlias, setDeleteAlias] = useState<KeywordAlias | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    canonical_name: '',
    alias: '',
    context_type: 'solution',
    is_active: true,
  });

  // Fetch aliases
  const { data: aliases = [], isLoading, refetch } = useQuery({
    queryKey: ['keyword-aliases', filterContext],
    queryFn: async () => {
      let query = supabase
        .from('keyword_aliases')
        .select('*')
        .order('canonical_name');
      
      if (filterContext !== 'all') {
        query = query.eq('context_type', filterContext);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as KeywordAlias[];
    },
  });

  // Stats
  const stats = {
    total: aliases.length,
    active: aliases.filter(a => a.is_active).length,
    byContext: CONTEXT_TYPES.map(ct => ({
      ...ct,
      count: aliases.filter(a => a.context_type === ct.value).length,
    })),
  };

  // Filtered aliases
  const filteredAliases = aliases.filter(a => 
    !searchQuery || 
    a.canonical_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.alias.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('keyword_aliases')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyword-aliases'] });
      toast.success('Alias créé');
      resetForm();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & typeof formData) => {
      const { error } = await supabase
        .from('keyword_aliases')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyword-aliases'] });
      toast.success('Alias mis à jour');
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('keyword_aliases')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyword-aliases'] });
      toast.success('Alias supprimé');
      setDeleteAlias(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('keyword_aliases')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyword-aliases'] });
    },
  });

  const resetForm = () => {
    setFormData({ canonical_name: '', alias: '', context_type: 'solution', is_active: true });
    setShowAddDialog(false);
    setEditingAlias(null);
  };

  const handleSubmit = () => {
    if (!formData.canonical_name || !formData.alias) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    if (editingAlias) {
      updateMutation.mutate({ id: editingAlias.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (alias: KeywordAlias) => {
    setEditingAlias(alias);
    setFormData({
      canonical_name: alias.canonical_name,
      alias: alias.alias,
      context_type: alias.context_type,
      is_active: alias.is_active,
    });
    setShowAddDialog(true);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['canonical_name', 'alias', 'context_type', 'phonetic_key', 'is_active'];
    const csvContent = [
      headers.join(','),
      ...aliases.map(a => [
        `"${a.canonical_name}"`,
        `"${a.alias}"`,
        a.context_type,
        a.phonetic_key || '',
        a.is_active,
      ].join(',')),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `keyword-aliases-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };

  // Import CSV
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').slice(1); // Skip header
        const imports: typeof formData[] = [];

        for (const line of lines) {
          if (!line.trim()) continue;
          const [canonical_name, alias, context_type] = line.split(',').map(s => 
            s.replace(/^"|"$/g, '').trim()
          );
          if (canonical_name && alias) {
            imports.push({
              canonical_name,
              alias,
              context_type: CONTEXT_TYPES.find(ct => ct.value === context_type)?.value || 'autre',
              is_active: true,
            });
          }
        }

        if (imports.length === 0) {
          toast.error('Aucune donnée valide trouvée dans le fichier');
          return;
        }

        const { error } = await supabase
          .from('keyword_aliases')
          .upsert(imports, { onConflict: 'canonical_name,alias' });
        
        if (error) throw error;
        
        queryClient.invalidateQueries({ queryKey: ['keyword-aliases'] });
        toast.success(`${imports.length} alias importés`);
      } catch (err) {
        toast.error('Erreur lors de l\'import');
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getContextBadge = (contextType: string) => {
    const ctx = CONTEXT_TYPES.find(ct => ct.value === contextType);
    return ctx ? (
      <Badge className={`${ctx.color} text-xs`}>{ctx.label}</Badge>
    ) : (
      <Badge variant="outline" className="text-xs">{contextType}</Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <CardTitle>Dictionnaire de mots-clés</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Rafraîchir
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" />
                Import CSV
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
              />
              <Button size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter
              </Button>
            </div>
          </div>
          <CardDescription>
            Améliorez la détection des solutions, clients et outils dans les transcriptions audio
            en définissant des alias phonétiques et orthographiques.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-muted/50 border text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total alias</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 border text-center">
              <p className="text-2xl font-bold">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Actifs</p>
            </div>
            {stats.byContext.slice(0, 2).map(ctx => (
              <div key={ctx.value} className="p-3 rounded-lg bg-muted/50 border text-center">
                <p className="text-2xl font-bold">{ctx.count}</p>
                <p className="text-xs text-muted-foreground">{ctx.label}s</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un mot-clé ou alias..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterContext} onValueChange={setFilterContext}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {CONTEXT_TYPES.map(ct => (
                  <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAliases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Aucun alias trouvé</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Ajouter le premier
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom canonique</TableHead>
                  <TableHead>Alias</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Clé phonétique</TableHead>
                  <TableHead className="text-center">Actif</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAliases.map((alias) => (
                  <TableRow key={alias.id}>
                    <TableCell className="font-medium">{alias.canonical_name}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-0.5 rounded">{alias.alias}</code>
                    </TableCell>
                    <TableCell>{getContextBadge(alias.context_type)}</TableCell>
                    <TableCell>
                      {alias.phonetic_key ? (
                        <code className="text-xs text-muted-foreground">{alias.phonetic_key}</code>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={alias.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: alias.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(alias)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteAlias(alias)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAlias ? 'Modifier l\'alias' : 'Ajouter un alias'}
            </DialogTitle>
            <DialogDescription>
              Définissez un alias pour améliorer la reconnaissance vocale et textuelle.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="canonical_name">Nom canonique *</Label>
              <Input
                id="canonical_name"
                placeholder="Ex: Datalia"
                value={formData.canonical_name}
                onChange={(e) => setFormData(prev => ({ ...prev, canonical_name: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Le nom officiel/correct vers lequel l'alias sera normalisé
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="alias">Alias *</Label>
              <Input
                id="alias"
                placeholder="Ex: Atalia, Data Lia..."
                value={formData.alias}
                onChange={(e) => setFormData(prev => ({ ...prev, alias: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                La variante ou erreur courante à détecter
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Type de contexte</Label>
              <Select 
                value={formData.context_type} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, context_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTEXT_TYPES.map(ct => (
                    <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Actif</Label>
                <p className="text-xs text-muted-foreground">
                  Utiliser cet alias dans les traitements
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Annuler</Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingAlias ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAlias} onOpenChange={(open) => !open && setDeleteAlias(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet alias ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'alias "{deleteAlias?.alias}" pour "{deleteAlias?.canonical_name}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAlias && deleteMutation.mutate(deleteAlias.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}