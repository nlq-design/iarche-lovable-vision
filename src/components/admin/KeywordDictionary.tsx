import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  Loader2, Search, Sparkles, BookOpen, Filter, Zap, Brain, CheckCircle2,
  Bell, Check, X, AlertTriangle, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface KeywordAlias {
  id: string;
  canonical_name: string;
  alias: string;
  context_type: string;
  phonetic_key: string | null;
  is_active: boolean;
  status: 'pending' | 'validated' | 'rejected';
  detected_count: number;
  first_detected_at: string | null;
  validated_at: string | null;
  validated_by: string | null;
  source_examples: unknown;
  created_at: string;
}

const CONTEXT_TYPES = [
  { value: 'lead', label: 'Lead/Client', color: 'bg-blue-500/10 text-blue-600' },
  { value: 'projet', label: 'Projet', color: 'bg-indigo-500/10 text-indigo-600' },
  { value: 'solution', label: 'Solution', color: 'bg-purple-500/10 text-purple-600' },
  { value: 'outil', label: 'Outil/Tech', color: 'bg-green-500/10 text-green-600' },
  { value: 'concurrent', label: 'Concurrent', color: 'bg-red-500/10 text-red-600' },
  { value: 'partenaire', label: 'Partenaire', color: 'bg-amber-500/10 text-amber-600' },
  { value: 'autre', label: 'Autre', color: 'bg-gray-500/10 text-gray-600' },
];

const STATUS_CONFIG = {
  pending: { label: 'À valider', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  validated: { label: 'Validé', color: 'bg-green-500/10 text-green-600 border-green-500/30' },
  rejected: { label: 'Rejeté', color: 'bg-red-500/10 text-red-600 border-red-500/30' },
};

export function KeywordDictionary() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterContext, setFilterContext] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending'); // Default to pending
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAlias, setEditingAlias] = useState<KeywordAlias | null>(null);
  const [deleteAlias, setDeleteAlias] = useState<KeywordAlias | null>(null);
  const [validatingAlias, setValidatingAlias] = useState<KeywordAlias | null>(null);
  const [isAutoExtracting, setIsAutoExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<{
    sources_scanned?: number;
    entities_found?: number;
    aliases_inserted?: number;
  } | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    canonical_name: '',
    alias: '',
    context_type: 'solution',
    is_active: true,
  });

  // Fetch aliases
  const { data: aliases = [], isLoading, refetch } = useQuery({
    queryKey: ['keyword-aliases', filterContext, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('keyword_aliases')
        .select('*')
        .order('detected_count', { ascending: false })
        .order('canonical_name');
      
      if (filterContext !== 'all') {
        query = query.eq('context_type', filterContext);
      }
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as KeywordAlias[];
    },
  });

  // Count pending for badge
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
    pending: aliases.filter(a => a.status === 'pending').length,
    validated: aliases.filter(a => a.status === 'validated').length,
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

  // Validation mutation
  const validateMutation = useMutation({
    mutationFn: async ({ id, canonical_name, context_type }: { id: string; canonical_name: string; context_type: string }) => {
      const { error } = await supabase
        .from('keyword_aliases')
        .update({ 
          canonical_name,
          context_type,
          status: 'validated',
          validated_at: new Date().toISOString(),
          is_active: true
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keyword-aliases'] });
      queryClient.invalidateQueries({ queryKey: ['keyword-aliases-pending-count'] });
      toast.success('Alias validé');
      setValidatingAlias(null);
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

  const handleReject = (id: string) => {
    rejectMutation.mutate(id);
  };

  const handleValidate = () => {
    if (!validatingAlias) return;
    if (!formData.canonical_name) {
      toast.error('Veuillez saisir le nom correct');
      return;
    }
    validateMutation.mutate({
      id: validatingAlias.id,
      canonical_name: formData.canonical_name,
      context_type: formData.context_type
    });
  };

  const resetForm = () => {
    setFormData({ canonical_name: '', alias: '', context_type: 'solution', is_active: true });
    setShowAddDialog(false);
    setEditingAlias(null);
    setValidatingAlias(null);
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

  // Auto-extraction from CRM data
  const handleAutoExtract = async (mode: 'scan_all' | 'scan_recent' = 'scan_recent') => {
    setIsAutoExtracting(true);
    setExtractionProgress(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('extract-entities', {
        body: { mode, days_back: mode === 'scan_recent' ? 30 : 365 }
      });
      
      if (error) throw error;
      
      setExtractionProgress({
        sources_scanned: data.sources_scanned,
        entities_found: data.entities_found,
        aliases_inserted: data.aliases_inserted,
      });
      
      if (data.aliases_inserted > 0) {
        toast.success(`${data.aliases_inserted} nouveaux alias extraits automatiquement`);
        queryClient.invalidateQueries({ queryKey: ['keyword-aliases'] });
      } else {
        toast.info('Aucun nouvel alias détecté');
      }
    } catch (err) {
      console.error('Auto-extraction error:', err);
      toast.error('Erreur lors de l\'extraction automatique');
    } finally {
      setIsAutoExtracting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <CardTitle>Dictionnaire IA Auto-alimenté</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleAutoExtract('scan_recent')}
                disabled={isAutoExtracting}
              >
                {isAutoExtracting ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4 mr-1" />
                )}
                Extraction IA (30j)
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleAutoExtract('scan_all')}
                disabled={isAutoExtracting}
              >
                <Zap className="h-4 w-4 mr-1" />
                Scan complet
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Rafraîchir
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" />
                Import
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
                Manuel
              </Button>
            </div>
          </div>
          <CardDescription>
            Dictionnaire auto-alimenté par l'IA depuis les transcriptions, leads, projets et documents.
            Les entités récurrentes sont détectées et normalisées automatiquement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Extraction Progress */}
          {extractionProgress && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  Dernière extraction : {extractionProgress.sources_scanned} sources analysées, 
                  {' '}{extractionProgress.entities_found} entités détectées, 
                  {' '}{extractionProgress.aliases_inserted} nouveaux alias
                </span>
              </div>
            </div>
          )}
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-muted/50 border text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div 
              className={`p-3 rounded-lg border text-center cursor-pointer transition-colors ${filterStatus === 'pending' ? 'bg-amber-500/20 border-amber-500' : 'bg-amber-500/10 hover:bg-amber-500/15'}`}
              onClick={() => setFilterStatus('pending')}
            >
              <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              <p className="text-xs text-amber-700">À valider</p>
            </div>
            <div 
              className={`p-3 rounded-lg border text-center cursor-pointer transition-colors ${filterStatus === 'validated' ? 'bg-green-500/20 border-green-500' : 'bg-green-500/10 hover:bg-green-500/15'}`}
              onClick={() => setFilterStatus('validated')}
            >
              <p className="text-2xl font-bold text-green-600">{stats.validated}</p>
              <p className="text-xs text-green-700">Validés</p>
            </div>
            {stats.byContext.slice(0, 2).map(ctx => (
              <div key={ctx.value} className="p-3 rounded-lg bg-muted/50 border text-center">
                <p className="text-2xl font-bold">{ctx.count}</p>
                <p className="text-xs text-muted-foreground">{ctx.label}</p>
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
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="pending">À valider</SelectItem>
                <SelectItem value="validated">Validés</SelectItem>
                <SelectItem value="rejected">Rejetés</SelectItem>
              </SelectContent>
            </Select>
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
                  <TableHead>Mot détecté</TableHead>
                  <TableHead>Nom validé</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Détections</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAliases.map((alias) => (
                  <TableRow key={alias.id} className={alias.status === 'pending' ? 'bg-amber-500/5' : ''}>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-0.5 rounded">{alias.alias}</code>
                      {alias.phonetic_key && (
                        <span className="ml-2 text-xs text-muted-foreground">({alias.phonetic_key})</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {alias.status === 'pending' ? (
                        <span className="text-muted-foreground italic">À définir...</span>
                      ) : (
                        alias.canonical_name
                      )}
                    </TableCell>
                    <TableCell>{getContextBadge(alias.context_type)}</TableCell>
                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="text-xs">
                              {alias.detected_count}x
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            Détecté {alias.detected_count} fois
                            {alias.first_detected_at && (
                              <> depuis le {format(new Date(alias.first_detected_at), 'dd/MM/yy', { locale: fr })}</>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_CONFIG[alias.status]?.color || ''}>
                        {STATUS_CONFIG[alias.status]?.label || alias.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {alias.status === 'pending' && (
                          <>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-500/10"
                                    onClick={() => setValidatingAlias(alias)}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Valider</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-500/10"
                                    onClick={() => handleReject(alias.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Rejeter</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </>
                        )}
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

      {/* Validation Dialog */}
      <Dialog open={!!validatingAlias} onOpenChange={(open) => { 
        if (!open) {
          setValidatingAlias(null);
          setFormData({ canonical_name: '', alias: '', context_type: 'solution', is_active: true });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              Valider ce terme
            </DialogTitle>
            <DialogDescription>
              Ce mot a été détecté {validatingAlias?.detected_count} fois. Indiquez le nom correct et le type.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm font-medium">Mot détecté :</p>
              <code className="text-lg font-mono">{validatingAlias?.alias}</code>
              {validatingAlias?.phonetic_key && (
                <p className="text-xs text-muted-foreground mt-1">
                  Clé phonétique : {validatingAlias.phonetic_key}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="valid_name">Nom correct *</Label>
              <Input
                id="valid_name"
                placeholder="Ex: Datalia, Google, OpenAI..."
                value={formData.canonical_name}
                onChange={(e) => setFormData(prev => ({ ...prev, canonical_name: e.target.value }))}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Le nom officiel vers lequel normaliser
              </p>
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
                    <SelectItem key={ct.value} value={ct.value}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${ct.color.split(' ')[0]}`} />
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
                setValidatingAlias(null);
                setFormData({ canonical_name: '', alias: '', context_type: 'solution', is_active: true });
              }}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (validatingAlias) {
                  handleReject(validatingAlias.id);
                  setValidatingAlias(null);
                }
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Rejeter
            </Button>
            <Button 
              onClick={handleValidate}
              disabled={validateMutation.isPending || !formData.canonical_name}
              className="bg-green-600 hover:bg-green-700"
            >
              {validateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Check className="h-4 w-4 mr-1" />
              Valider
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