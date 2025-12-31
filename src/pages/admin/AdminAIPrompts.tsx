import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/layouts/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Save, Copy, Bot, FileJson, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AIPrompt {
  id: string;
  name: string;
  slug: string;
  category: string;
  system_prompt: string;
  user_prompt: string | null;
  output_schema: Record<string, unknown> | null;
  model_config: Record<string, unknown>;
  version: number;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: 'transcription', label: 'Transcription vocale' },
  { value: 'lead_scoring', label: 'Scoring leads' },
  { value: 'insights', label: 'Insights IA' },
  { value: 'summary', label: 'Résumés' },
  { value: 'document_generation', label: 'Génération documents' },
];

const MODELS = [
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (rapide)' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (précis)' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini' },
  { value: 'openai/gpt-5', label: 'GPT-5 (premium)' },
];

export default function AdminAIPrompts() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<AIPrompt | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    category: 'transcription',
    system_prompt: '',
    user_prompt: '',
    output_schema: '',
    model: 'google/gemini-2.5-flash',
  });

  const { data: prompts = [], isLoading } = useQuery({
    queryKey: ['admin-ai-prompts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_prompts')
        .select('*')
        .order('category')
        .order('name');
      if (error) throw error;
      return data as AIPrompt[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      let outputSchema = null;
      if (data.output_schema.trim()) {
        try {
          outputSchema = JSON.parse(data.output_schema);
        } catch (e) {
          throw new Error('Schema JSON invalide');
        }
      }

      const payload = {
        name: data.name,
        slug: data.slug,
        category: data.category,
        system_prompt: data.system_prompt,
        user_prompt: data.user_prompt || null,
        output_schema: outputSchema,
        model_config: { model: data.model },
      };

      if (data.id) {
        const { error } = await supabase
          .from('ai_prompts')
          .update({ ...payload, version: (editingPrompt?.version ?? 0) + 1 })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ai_prompts')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Prompt sauvegardé');
      queryClient.invalidateQueries({ queryKey: ['admin-ai-prompts'] });
      setEditDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_prompts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Prompt supprimé');
      queryClient.invalidateQueries({ queryKey: ['admin-ai-prompts'] });
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });

  const resetForm = () => {
    setEditingPrompt(null);
    setFormData({
      name: '',
      slug: '',
      category: 'transcription',
      system_prompt: '',
      user_prompt: '',
      output_schema: '',
      model: 'google/gemini-2.5-flash',
    });
  };

  const openEditDialog = (prompt?: AIPrompt) => {
    if (prompt) {
      setEditingPrompt(prompt);
      setFormData({
        name: prompt.name,
        slug: prompt.slug,
        category: prompt.category,
        system_prompt: prompt.system_prompt,
        user_prompt: prompt.user_prompt ?? '',
        output_schema: prompt.output_schema ? JSON.stringify(prompt.output_schema, null, 2) : '',
        model: (prompt.model_config as Record<string, string>)?.model ?? 'google/gemini-2.5-flash',
      });
    } else {
      resetForm();
    }
    setEditDialogOpen(true);
  };

  const duplicatePrompt = (prompt: AIPrompt) => {
    setEditingPrompt(null);
    setFormData({
      name: `${prompt.name} (copie)`,
      slug: `${prompt.slug}_copy`,
      category: prompt.category,
      system_prompt: prompt.system_prompt,
      user_prompt: prompt.user_prompt ?? '',
      output_schema: prompt.output_schema ? JSON.stringify(prompt.output_schema, null, 2) : '',
      model: (prompt.model_config as Record<string, string>)?.model ?? 'google/gemini-2.5-flash',
    });
    setEditDialogOpen(true);
  };

  const filteredPrompts = selectedCategory === 'all'
    ? prompts
    : prompts.filter(p => p.category === selectedCategory);

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.label ?? category;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Bot className="h-6 w-6" />
              Prompts IA
            </h1>
            <p className="text-muted-foreground">
              Gérez les prompts système utilisés par les modules IA
            </p>
          </div>
          <Button onClick={() => openEditDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau prompt
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Prompts Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Modèle</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Mis à jour</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : filteredPrompts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucun prompt trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPrompts.map(prompt => (
                    <TableRow key={prompt.id}>
                      <TableCell className="font-medium">{prompt.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {prompt.slug}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getCategoryLabel(prompt.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(prompt.model_config as Record<string, string>)?.model ?? '-'}
                      </TableCell>
                      <TableCell>v{prompt.version}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(prompt.updated_at), 'dd MMM yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => duplicatePrompt(prompt)}
                            title="Dupliquer"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(prompt)}
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm('Supprimer ce prompt ?')) {
                                deleteMutation.mutate(prompt.id);
                              }
                            }}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                {editingPrompt ? 'Modifier le prompt' : 'Nouveau prompt'}
              </DialogTitle>
              <DialogDescription>
                Configurez le prompt système pour les fonctionnalités IA
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="general" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="general">Général</TabsTrigger>
                <TabsTrigger value="prompts">Prompts</TabsTrigger>
                <TabsTrigger value="schema">Schéma JSON</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: RDV commercial"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug (identifiant unique)</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      placeholder="Ex: transcription_rdv_commercial"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Catégorie</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Modèle IA</Label>
                    <Select
                      value={formData.model}
                      onValueChange={(value) => setFormData({ ...formData, model: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODELS.map(model => (
                          <SelectItem key={model.value} value={model.value}>
                            {model.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="prompts" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="system_prompt">
                    Prompt Système
                    <span className="text-muted-foreground text-xs ml-2">
                      (instructions pour l'IA)
                    </span>
                  </Label>
                  <Textarea
                    id="system_prompt"
                    value={formData.system_prompt}
                    onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
                    placeholder="Tu es un assistant CRM interne..."
                    className="min-h-[200px] font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user_prompt">
                    Prompt Utilisateur
                    <span className="text-muted-foreground text-xs ml-2">
                      (optionnel - préfixe des données)
                    </span>
                  </Label>
                  <Textarea
                    id="user_prompt"
                    value={formData.user_prompt}
                    onChange={(e) => setFormData({ ...formData, user_prompt: e.target.value })}
                    placeholder="Analyse la transcription et produis le JSON..."
                    className="min-h-[100px] font-mono text-sm"
                  />
                </div>
              </TabsContent>

              <TabsContent value="schema" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="output_schema" className="flex items-center gap-2">
                    <FileJson className="h-4 w-4" />
                    Schéma de sortie JSON
                    <span className="text-muted-foreground text-xs">
                      (structure attendue de la réponse)
                    </span>
                  </Label>
                  <Textarea
                    id="output_schema"
                    value={formData.output_schema}
                    onChange={(e) => setFormData({ ...formData, output_schema: e.target.value })}
                    placeholder='{"type": "object", "properties": {...}}'
                    className="min-h-[300px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format JSON Schema pour la validation et le tool calling
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                onClick={() => saveMutation.mutate({
                  ...formData,
                  id: editingPrompt?.id,
                })}
                disabled={saveMutation.isPending || !formData.name || !formData.slug || !formData.system_prompt}
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
