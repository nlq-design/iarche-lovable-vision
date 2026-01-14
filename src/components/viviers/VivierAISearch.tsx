import { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Search, 
  Loader2, 
  Save, 
  X, 
  Filter, 
  History, 
  Lightbulb,
  Download,
  Mail,
  ChevronDown,
  ChevronUp,
  Building2,
  User,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createAndDownloadExcel } from '@/utils/excelUtils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useNavigate } from 'react-router-dom';

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

interface AISearchHistory {
  query: string;
  filters: SearchFilters;
  resultCount: number;
  timestamp: string;
}

interface SmartSuggestion {
  text: string;
  query: string;
  type: 'refine' | 'new' | 'history';
}

interface VivierAISearchProps {
  onFiltersApply?: (filters: SearchFilters) => void;
  onResultsFound?: (results: AISearchResult['results'], totalCount: number) => void;
  onSaveList?: (name: string, filters: SearchFilters, results: AISearchResult['results']) => void;
  currentFilters?: SearchFilters;
}

const STORAGE_KEY = 'vivier-ai-history';
const MAX_HISTORY = 10;

const EXAMPLE_QUERIES = [
  "PME de + de 50 salariés en Île-de-France dans le secteur IT",
  "Entreprises qualifiées avec score > 70 à Paris",
  "Leads sans téléphone mais avec email dans le 33",
  "TPE du secteur conseil non encore contactées",
];

// Load history from localStorage
function loadHistory(): AISearchHistory[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save history to localStorage
function saveHistory(history: AISearchHistory[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // Ignore localStorage errors
  }
}

export function VivierAISearch({ onFiltersApply, onResultsFound, onSaveList, currentFilters }: VivierAISearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<AISearchResult | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [listName, setListName] = useState('');
  const [history, setHistory] = useState<AISearchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Generate smart suggestions based on current filters and history
  const suggestions = useMemo<SmartSuggestion[]>(() => {
    const items: SmartSuggestion[] = [];

    // Suggestions based on current filters
    if (currentFilters) {
      if (currentFilters.city && !currentFilters.minScore) {
        items.push({
          text: `Ajouter : score > 60`,
          query: `score supérieur à 60 à ${currentFilters.city}`,
          type: 'refine',
        });
      }
      if (currentFilters.minScore && !currentFilters.hasEmail) {
        items.push({
          text: `Filtrer : avec email`,
          query: `avec email et score > ${currentFilters.minScore}`,
          type: 'refine',
        });
      }
      if (!currentFilters.industry) {
        items.push({
          text: `Secteur IT`,
          query: `secteur informatique${currentFilters.city ? ` à ${currentFilters.city}` : ''}`,
          type: 'refine',
        });
      }
    }

    // Recent history suggestions
    history.slice(0, 3).forEach(h => {
      if (!items.find(i => i.query === h.query)) {
        items.push({
          text: h.query.length > 35 ? h.query.slice(0, 35) + '...' : h.query,
          query: h.query,
          type: 'history',
        });
      }
    });

    return items.slice(0, 5);
  }, [currentFilters, history]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      toast.error('Entrez une requête de recherche');
      return;
    }

    setIsSearching(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('vivier-ai-search', {
        body: { 
          query: query.trim(), 
          limit: 100,
          existingFilters: currentFilters, // Pass current filters to combine
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Recherche échouée');
      }

      setResult(data as AISearchResult);
      
      // Add to history
      const newHistory: AISearchHistory = {
        query: query.trim(),
        filters: data.filters,
        resultCount: data.totalCount,
        timestamp: new Date().toISOString(),
      };
      const updatedHistory = [newHistory, ...history.filter(h => h.query !== query.trim())].slice(0, MAX_HISTORY);
      setHistory(updatedHistory);
      saveHistory(updatedHistory);
      
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
  }, [query, currentFilters, history, onResultsFound]);

  const handleApplyFilters = () => {
    if (result?.filters && onFiltersApply) {
      onFiltersApply(result.filters);
      toast.success('Filtres appliqués');
    }
  };

  const handleExportResults = () => {
    if (!result?.results.length) {
      toast.error('Aucun résultat à exporter');
      return;
    }

    createAndDownloadExcel(result.results, `vivier-ai-${Date.now()}.xlsx`, 'Recherche IA')
      .then(() => toast.success(`${result.results.length} leads exportés`))
      .catch(() => toast.error("Erreur lors de l'export"));
  };

  const handleCreateCampaign = () => {
    if (!result) return;
    // Save as list first, then redirect to campaigns
    navigate(`/viviers/campaigns?aiQuery=${encodeURIComponent(query)}`);
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

  const handleSuggestionClick = (suggestion: SmartSuggestion) => {
    setQuery(suggestion.query);
  };

  const handleHistoryClick = (item: AISearchHistory) => {
    setQuery(item.query);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
    toast.success('Historique effacé');
  };

  const renderFilterBadge = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return null;
    
    const labels: Record<string, string> = {
      search: 'Recherche',
      city: 'Ville',
      postalCode: 'CP',
      region: 'Région',
      industry: 'Secteur',
      minScore: 'Score ≥',
      maxScore: 'Score ≤',
      minEmployees: 'Effectif ≥',
      maxEmployees: 'Effectif ≤',
      status: 'Statut',
      hasEmail: 'Email',
      hasPhone: 'Tél',
      hasSiret: 'SIRET',
    };

    return (
      <Badge key={key} variant="secondary" className="text-xs">
        {labels[key] || key}: {typeof value === 'boolean' ? (value ? '✓' : '✗') : String(value)}
      </Badge>
    );
  };

  // Preview of first 5 results
  const previewResults = result?.results.slice(0, 5) || [];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Recherche IA
          </div>
          {history.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowHistory(!showHistory)}
              className="text-muted-foreground"
            >
              <History className="w-4 h-4 mr-1" />
              {history.length}
            </Button>
          )}
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
              placeholder="Ex: PME du secteur IT avec score > 60"
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
          </Button>
        </div>

        {/* Context indicator */}
        {currentFilters && Object.keys(currentFilters).some(k => currentFilters[k as keyof SearchFilters]) && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Filter className="w-3 h-3" />
            L'IA combinera avec vos filtres actuels
          </div>
        )}

        {/* History dropdown */}
        {showHistory && history.length > 0 && (
          <div className="border rounded-lg bg-background p-2 space-y-1">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-medium text-muted-foreground">Historique récent</span>
              <Button variant="ghost" size="sm" onClick={clearHistory} className="h-6 text-xs">
                Effacer
              </Button>
            </div>
            {history.map((item, i) => (
              <button
                key={i}
                onClick={() => handleHistoryClick(item)}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm flex items-center justify-between"
              >
                <span className="truncate flex-1">{item.query}</span>
                <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                  {item.resultCount}
                </Badge>
              </button>
            ))}
          </div>
        )}

        {/* Smart suggestions */}
        {!result && suggestions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lightbulb className="w-3 h-3" />
              Suggestions
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    suggestion.type === 'refine' 
                      ? 'border-primary/30 text-primary hover:bg-primary/10' 
                      : suggestion.type === 'history'
                      ? 'border-muted text-muted-foreground hover:bg-muted'
                      : 'border-secondary text-secondary-foreground hover:bg-secondary'
                  }`}
                >
                  {suggestion.type === 'history' && <History className="w-3 h-3 inline mr-1" />}
                  {suggestion.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Example queries (only when no suggestions and no result) */}
        {!result && suggestions.length === 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground">Exemples :</span>
            {EXAMPLE_QUERIES.slice(0, 2).map((example, i) => (
              <button
                key={i}
                onClick={() => setQuery(example)}
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

            {/* Stats and actions */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
              <div className="text-sm">
                <span className="font-semibold text-primary">{result.totalCount.toLocaleString('fr-FR')}</span>
                <span className="text-muted-foreground"> leads</span>
              </div>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={handleApplyFilters}>
                  <Filter className="w-3 h-3 mr-1" />
                  Appliquer
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportResults}>
                  <Download className="w-3 h-3 mr-1" />
                  XLSX
                </Button>
                <Button variant="default" size="sm" onClick={() => setShowSaveDialog(true)}>
                  <Save className="w-3 h-3 mr-1" />
                  Liste
                </Button>
              </div>
            </div>

            {/* Preview */}
            {previewResults.length > 0 && (
              <Collapsible open={showPreview} onOpenChange={setShowPreview}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="text-xs">Aperçu ({previewResults.length} premiers)</span>
                    {showPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2 mt-2">
                    {previewResults.map((lead) => (
                      <div 
                        key={lead.id} 
                        className="text-xs p-2 rounded border bg-background flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate">{lead.company_name || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground mt-0.5">
                            {lead.contact_name && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {lead.contact_name}
                              </span>
                            )}
                            {lead.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {lead.city}
                              </span>
                            )}
                          </div>
                        </div>
                        {lead.cold_score !== null && (
                          <Badge 
                            variant={lead.cold_score >= 70 ? 'default' : lead.cold_score >= 40 ? 'secondary' : 'outline'}
                            className="shrink-0"
                          >
                            {lead.cold_score}
                          </Badge>
                        )}
                      </div>
                    ))}
                    {result.totalCount > 5 && (
                      <p className="text-xs text-center text-muted-foreground">
                        + {result.totalCount - 5} autres leads
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

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
