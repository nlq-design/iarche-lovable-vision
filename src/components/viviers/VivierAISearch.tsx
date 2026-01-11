import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Search, Loader2, Save, X, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SearchFilters {
  search?: string;
  city?: string;
  postalCode?: string;
  region?: string;
  industry?: string;
  minScore?: number;
  maxScore?: number;
  minEmployees?: number;
  maxEmployees?: number;
  status?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasSiret?: boolean;
}

interface AISearchResult {
  success: boolean;
  query: string;
  filters: SearchFilters;
  explanation: string;
  intent: string;
  results: Array<{
    id: string;
    company_name: string | null;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    postal_code: string | null;
    region: string | null;
    industry: string | null;
    cold_score: number | null;
    status: string | null;
    employee_count: number | null;
    siret: string | null;
  }>;
  totalCount: number;
}

interface VivierAISearchProps {
  onFiltersApply?: (filters: SearchFilters) => void;
  onResultsFound?: (results: AISearchResult['results'], totalCount: number) => void;
  onSaveList?: (name: string, filters: SearchFilters, results: AISearchResult['results']) => void;
}

const EXAMPLE_QUERIES = [
  "PME de + de 50 salariés en Île-de-France dans le secteur IT",
  "Entreprises qualifiées avec score > 70 à Paris",
  "Leads sans téléphone mais avec email dans le 33",
  "TPE du secteur conseil non encore contactées",
];

export function VivierAISearch({ onFiltersApply, onResultsFound, onSaveList }: VivierAISearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<AISearchResult | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [listName, setListName] = useState('');

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      toast.error('Entrez une requête de recherche');
      return;
    }

    setIsSearching(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('vivier-ai-search', {
        body: { query: query.trim(), limit: 100 },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Recherche échouée');
      }

      setResult(data as AISearchResult);
      
      if (onResultsFound) {
        onResultsFound(data.results, data.totalCount);
      }

      toast.success(`${data.totalCount} leads trouvés`);
    } catch (err) {
      console.error('AI Search error:', err);
      toast.error(err instanceof Error ? err.message : 'Erreur de recherche');
    } finally {
      setIsSearching(false);
    }
  }, [query, onResultsFound]);

  const handleApplyFilters = () => {
    if (result?.filters && onFiltersApply) {
      onFiltersApply(result.filters);
      toast.success('Filtres appliqués');
    }
  };

  const handleSaveList = async () => {
    if (!listName.trim() || !result) return;

    try {
      const { error } = await supabase.from('vivier_lists').insert([{
        name: listName.trim(),
        description: result.explanation,
        list_type: 'dynamic',
        criteria_json: result.filters as unknown as Record<string, unknown>,
        lead_count: result.totalCount,
        last_sync_at: new Date().toISOString(),
      }] as any);

      if (error) throw error;

      toast.success(`Liste "${listName}" sauvegardée`);
      setShowSaveDialog(false);
      setListName('');

      if (onSaveList) {
        onSaveList(listName, result.filters, result.results);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de sauvegarde');
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  const renderFilterBadge = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return null;
    
    const labels: Record<string, string> = {
      search: 'Recherche',
      city: 'Ville',
      postalCode: 'Code postal',
      region: 'Région',
      industry: 'Secteur',
      minScore: 'Score min',
      maxScore: 'Score max',
      minEmployees: 'Effectif min',
      maxEmployees: 'Effectif max',
      status: 'Statut',
      hasEmail: 'Avec email',
      hasPhone: 'Avec téléphone',
      hasSiret: 'Avec SIRET',
    };

    return (
      <Badge key={key} variant="secondary" className="text-xs">
        {labels[key] || key}: {typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : String(value)}
      </Badge>
    );
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="w-5 h-5 text-primary" />
          Recherche IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Ex: PME du secteur IT avec score > 60 en Île-de-France"
              className="pl-9"
              disabled={isSearching}
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span className="ml-2 hidden sm:inline">Rechercher</span>
          </Button>
        </div>

        {/* Example queries */}
        {!result && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Exemples :</span>
            {EXAMPLE_QUERIES.map((example, i) => (
              <button
                key={i}
                onClick={() => handleExampleClick(example)}
                className="text-xs text-primary hover:underline"
              >
                {example.length > 40 ? example.slice(0, 40) + '...' : example}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-3 pt-2 border-t">
            {/* Explanation */}
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="shrink-0">
                {result.intent}
              </Badge>
              <p className="text-sm text-muted-foreground">{result.explanation}</p>
            </div>

            {/* Detected filters */}
            <div className="flex flex-wrap gap-1.5">
              <Filter className="w-4 h-4 text-muted-foreground" />
              {Object.entries(result.filters).map(([key, value]) => renderFilterBadge(key, value))}
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
              <div className="text-sm">
                <span className="font-semibold text-primary">{result.totalCount.toLocaleString('fr-FR')}</span>
                <span className="text-muted-foreground"> leads correspondent</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleApplyFilters}>
                  <Filter className="w-3 h-3 mr-1" />
                  Appliquer filtres
                </Button>
                <Button variant="default" size="sm" onClick={() => setShowSaveDialog(true)}>
                  <Save className="w-3 h-3 mr-1" />
                  Sauvegarder
                </Button>
              </div>
            </div>

            {/* Save dialog */}
            {showSaveDialog && (
              <div className="flex gap-2 items-center bg-background border rounded-lg p-3">
                <Input
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder="Nom de la liste..."
                  className="flex-1"
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveList} disabled={!listName.trim()}>
                  Sauvegarder
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Clear result */}
            <Button variant="ghost" size="sm" onClick={() => setResult(null)} className="w-full">
              Nouvelle recherche
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
