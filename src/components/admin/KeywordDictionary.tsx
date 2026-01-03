import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Loader2, Search, BookOpen, Filter, Brain, CheckCircle2,
  Clock, XCircle, AlertTriangle, Eye
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
  status: string;
  detected_count: number;
  first_detected_at: string | null;
  validated_at: string | null;
  validated_by: string | null;
  source_examples: unknown;
  created_at: string;
}

const CONTEXT_TYPES = [
  { value: 'lead', label: 'Lead/Client', color: 'bg-blue-500/10 text-blue-600' },
  { value: 'projet', label: 'Projet', color: 'bg-green-500/10 text-green-600' },
  { value: 'solution', label: 'Solution', color: 'bg-purple-500/10 text-purple-600' },
  { value: 'partenaire', label: 'Partenaire', color: 'bg-orange-500/10 text-orange-600' },
  { value: 'outil', label: 'Outil/Logiciel', color: 'bg-cyan-500/10 text-cyan-600' },
  { value: 'autre', label: 'Autre', color: 'bg-gray-500/10 text-gray-600' },
];

const STATUS_CONFIG = {
  pending: { label: 'En attente', icon: Clock, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' },
  validated: { label: 'Validé', icon: CheckCircle2, color: 'bg-green-500/10 text-green-600 border-green-500/30' },
  rejected: { label: 'Rejeté', icon: XCircle, color: 'bg-red-500/10 text-red-600 border-red-500/30' },
};

export function KeywordDictionary() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'pending' | 'validated' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterContext, setFilterContext] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [validatingAlias, setValidatingAlias] = useState<KeywordAlias | null>(null);
  const [editingAlias, setEditingAlias] = useState<KeywordAlias | null>(null);
  const [deleteAlias, setDeleteAlias] = useState<KeywordAlias | null>(null);
  const [viewExamples, setViewExamples] = useState<KeywordAlias | null>(null);
  const [isAutoExtracting, setIsAutoExtracting] = useState(false);
  
  // Form state for validation
  const [validationForm, setValidationForm] = useState({
    canonical_name: '',
    context_type: 'autre',
  });
  
  // Form state for manual add
  const [formData, setFormData] = useState({
    canonical_name: '',
    alias: '',
    context_type: 'autre',
    is_active: true,
  });

  // Fetch aliases by status
  const { data: aliases = [], isLoading, refetch } = useQuery({
    queryKey: ['keyword-aliases', activeTab, filterContext],
    queryFn: async () => {
      let query = supabase
        .from('keyword_aliases')
        .select('*')
        .eq('status', activeTab)
        .order('detected_count', { ascending: false });
      
      if (filterContext !== 'all') {
        query = query.eq('context_type', filterContext);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as KeywordAlias[];
    },
  });

  // Fetch pending count for badge
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['keyword-aliases-pending-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('keyword_aliases')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count || 0;
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

  // Validate mutation
  const validateMutation = useMutation({
    mutationFn: async ({ id, canonical_name, context_type }: { 
      id: string; 
      canonical_name: string; 
      context_type: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('keyword_aliases')
        .update({
          canonical_name,
          context_type,
          status: 'validated',
          validated_at: new Date().toISOString(),
          validated_by: user?.id || null,
          is_active: true,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyword-aliases'] });
      queryClient.invalidateQueries({ queryKey: ['keyword-aliases-pending-count'] });
      toast.success('Alias validé et activé');
      setValidatingAlias(null);
      setValidationForm({ canonical_name: '', context_type: 'autre' });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Erreur de validation');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('keyword_aliases')
        .update({ status: 'rejected', is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyword-aliases'] });
      queryClient.invalidateQueries({ queryKey: ['keyword-aliases-pending-count'] });
      toast.success('Alias rejeté');
    },
  });

  // Create mutation (manual add)
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('keyword_aliases')
        .insert({
          ...data,
          status: 'validated',
          validated_at: new Date().toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyword-aliases'] });
      toast.success('Alias créé et validé');
      resetForm();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    },
  });

  // Update mutation
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

  // Delete mutation
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
      queryClient.invalidateQueries({ queryKey: ['keyword-aliases-pending-count'] });
      toast.success('Alias supprimé');
      setDeleteAlias(null);
    },
  });

  // Toggle active mutation
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
    setFormData({ canonical_name: '', alias: '', context_type: 'autre', is_active: true });
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

  const handleValidate = () => {
    if (!validatingAlias || !validationForm.canonical_name) {
      toast.error('Veuillez saisir le nom correct');
      return;
    }
    validateMutation.mutate({
      id: validatingAlias.id,
      canonical_name: validationForm.canonical_name,
      context_type: validationForm.context_type,
    });
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

  const openValidationDialog = (alias: KeywordAlias) => {
    setValidatingAlias(alias);
    setValidationForm({
      canonical_name: alias.canonical_name || alias.alias,
      context_type: alias.context_type || 'autre',
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['canonical_name', 'alias', 'context_type', 'status', 'detected_count', 'is_active'];
    const csvContent = [
      headers.join(','),
      ...aliases.map(a => [
        `"${a.canonical_name}"`,
        `"${a.alias}"`,
        a.context_type,
        a.status,
        a.detected_count,
        a.is_active,
      ].join(',')),
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `keyword-aliases-${activeTab}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
        const lines = text.split('\n').slice(1);
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
          toast.error('Aucune donnée valide trouvée');
          return;
        }

        const { error } = await supabase
          .from('keyword_aliases')
          .upsert(
            imports.map(i => ({ ...i, status: 'validated', validated_at: new Date().toISOString() })),
            { onConflict: 'canonical_name,alias' }
          );
        
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

  // Auto-extraction
  const handleAutoExtract = async () => {
    setIsAutoExtracting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('extract-entities', {
        body: { mode: 'scan_recent', days_back: 30 }
      });
      
      if (error) throw error;
      
      if (data.aliases_inserted > 0) {
        toast.success(`${data.aliases_inserted} nouveaux mots détectés à valider`);
        queryClient.invalidateQueries({ queryKey: ['keyword-aliases'] });
        queryClient.invalidateQueries({ queryKey: ['keyword-aliases-pending-count'] });
        setActiveTab('pending');
      } else {
        toast.info('Aucun nouveau mot détecté');
      }
    } catch (err) {
      console.error('Auto-extraction error:', err);
      toast.error('Erreur lors de l\'extraction');
    } finally {
      setIsAutoExtracting(false);
    }
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
              <CardTitle>Dictionnaire de Reconnaissance</CardTitle>
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingCount} à valider
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAutoExtract}
                disabled={isAutoExtracting}
              >
                {isAutoExtracting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4 mr-1" />
                )}
                Scanner les sources
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" />
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
            Les mots détectés dans les transcriptions et documents sont listés ici. 
            Validez-les avec le bon orthographe et un tag pour enrichir la reconnaissance IA.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              En attente
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="validated" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Validés
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <XCircle className="h-4 w-4" />
              Rejetés
            </TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
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
        </div>

        <TabsContent value="pending" className="mt-0">
          <PendingTable 
            aliases={filteredAliases}
            isLoading={isLoading}
            onValidate={openValidationDialog}
            onReject={(a) => rejectMutation.mutate(a.id)}
            onViewExamples={setViewExamples}
            getContextBadge={getContextBadge}
          />
        </TabsContent>

        <TabsContent value="validated" className="mt-0">
          <ValidatedTable 
            aliases={filteredAliases}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={setDeleteAlias}
            onToggleActive={(id, is_active) => toggleActiveMutation.mutate({ id, is_active })}
            getContextBadge={getContextBadge}
          />
        </TabsContent>

        <TabsContent value="rejected" className="mt-0">
          <RejectedTable 
            aliases={filteredAliases}
            isLoading={isLoading}
            onRestore={(a) => {
              setValidatingAlias(a);
              setValidationForm({ canonical_name: a.alias, context_type: 'autre' });
            }}
            onDelete={setDeleteAlias}
          />
        </TabsContent>
      </Tabs>

      {/* Validation Dialog */}
      <Dialog open={!!validatingAlias} onOpenChange={(open) => !open && setValidatingAlias(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Valider ce mot détecté
            </DialogTitle>
            <DialogDescription>
              Corrigez l'orthographe si nécessaire et assignez un type.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted border">
              <p className="text-sm text-muted-foreground mb-1">Mot détecté :</p>
              <p className="text-lg font-mono font-medium">{validatingAlias?.alias}</p>
              {validatingAlias && validatingAlias.detected_count > 1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Détecté {validatingAlias.detected_count} fois
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="correct_name">Nom correct *</Label>
              <Input
                id="correct_name"
                placeholder="Écrivez le nom correct..."
                value={validationForm.canonical_name}
                onChange={(e) => setValidationForm(prev => ({ ...prev, canonical_name: e.target.value }))}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                C'est ce nom qui sera utilisé pour identifier l'entité
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={validationForm.context_type} 
                onValueChange={(v) => setValidationForm(prev => ({ ...prev, context_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTEXT_TYPES.map(ct => (
                    <SelectItem key={ct.value} value={ct.value}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${ct.color.split(' ')[0].replace('/10', '')}`} />
                        {ct.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                if (validatingAlias) rejectMutation.mutate(validatingAlias.id);
                setValidatingAlias(null);
              }}
              className="text-destructive hover:text-destructive"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Rejeter
            </Button>
            <Button 
              onClick={handleValidate}
              disabled={validateMutation.isPending || !validationForm.canonical_name}
            >
              {validateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Examples Dialog */}
      <Dialog open={!!viewExamples} onOpenChange={(open) => !open && setViewExamples(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contextes de détection</DialogTitle>
            <DialogDescription>
              Exemples où "{viewExamples?.alias}" a été détecté
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {(() => {
              const examples = viewExamples?.source_examples as Array<{ source_type: string; source_id: string; excerpt: string }> | null;
              if (examples && examples.length > 0) {
                return examples.map((ex, i) => (
                  <div key={i} className="p-3 rounded-lg bg-muted border text-sm">
                    <Badge variant="outline" className="mb-2">{ex.source_type}</Badge>
                    <p className="text-muted-foreground italic">"{ex.excerpt}"</p>
                  </div>
                ));
              }
              return (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun exemple de contexte enregistré
                </p>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAlias ? 'Modifier l\'alias' : 'Ajouter manuellement'}
            </DialogTitle>
            <DialogDescription>
              Créez un alias pour améliorer la reconnaissance.
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
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="alias">Alias / Variante *</Label>
              <Input
                id="alias"
                placeholder="Ex: Atalia, Data Lia..."
                value={formData.alias}
                onChange={(e) => setFormData(prev => ({ ...prev, alias: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Type</Label>
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
                <p className="text-xs text-muted-foreground">Utiliser dans les traitements</p>
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
              L'alias "{deleteAlias?.alias}" sera définitivement supprimé.
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

// Sub-components for tables
function PendingTable({ 
  aliases, 
  isLoading, 
  onValidate, 
  onReject,
  onViewExamples,
  getContextBadge 
}: {
  aliases: KeywordAlias[];
  isLoading: boolean;
  onValidate: (a: KeywordAlias) => void;
  onReject: (a: KeywordAlias) => void;
  onViewExamples: (a: KeywordAlias) => void;
  getContextBadge: (type: string) => React.ReactNode;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (aliases.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>Aucun mot en attente de validation</p>
          <p className="text-sm mt-1">Lancez un scan pour détecter de nouveaux mots</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mot détecté</TableHead>
              <TableHead className="text-center">Détections</TableHead>
              <TableHead>Première détection</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aliases.map((alias) => (
              <TableRow key={alias.id} className="bg-yellow-500/5">
                <TableCell>
                  <code className="text-base font-medium bg-muted px-2 py-1 rounded">
                    {alias.alias}
                  </code>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline">{alias.detected_count}×</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {alias.first_detected_at 
                    ? format(new Date(alias.first_detected_at), 'dd MMM yyyy', { locale: fr })
                    : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {alias.source_examples && Array.isArray(alias.source_examples) && alias.source_examples.length > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onViewExamples(alias)}
                        title="Voir les contextes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onReject(alias)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onValidate(alias)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Valider
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ValidatedTable({ 
  aliases, 
  isLoading, 
  onEdit, 
  onDelete,
  onToggleActive,
  getContextBadge 
}: {
  aliases: KeywordAlias[];
  isLoading: boolean;
  onEdit: (a: KeywordAlias) => void;
  onDelete: (a: KeywordAlias) => void;
  onToggleActive: (id: string, is_active: boolean) => void;
  getContextBadge: (type: string) => React.ReactNode;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (aliases.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>Aucun alias validé</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
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
            {aliases.map((alias) => (
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
                    onCheckedChange={(checked) => onToggleActive(alias.id, checked)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(alias)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDelete(alias)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RejectedTable({ 
  aliases, 
  isLoading, 
  onRestore,
  onDelete 
}: {
  aliases: KeywordAlias[];
  isLoading: boolean;
  onRestore: (a: KeywordAlias) => void;
  onDelete: (a: KeywordAlias) => void;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (aliases.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12 text-muted-foreground">
          <XCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
          <p>Aucun alias rejeté</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mot rejeté</TableHead>
              <TableHead>Détections</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aliases.map((alias) => (
              <TableRow key={alias.id} className="opacity-60">
                <TableCell>
                  <code className="text-sm bg-muted px-2 py-0.5 rounded line-through">
                    {alias.alias}
                  </code>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{alias.detected_count}×</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onRestore(alias)}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Restaurer
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onDelete(alias)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
