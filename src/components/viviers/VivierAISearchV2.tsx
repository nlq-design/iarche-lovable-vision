import { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, 
  Search, 
  Loader2, 
  Save, 
  Filter, 
  History, 
  Lightbulb,
  Download,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  Building2,
  User,
  MapPin,
  Target,
  CheckCircle2,
  AlertCircle,
  Rocket,
  TrendingUp,
  FileSpreadsheet,
  X
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
import { Progress } from '@/components/ui/progress';

// V3: Extended filters interface with email domains and exclusions
interface SearchFiltersV3 {
  // Text search
  search?: string;
  searchText?: string;
  searchInFields?: string[];
  
  // Email filters
  emailDomain?: string;
  emailDomainContains?: string;
  excludeEmailDomains?: string[];
  
  // Location
  city?: string;
  postalCodePrefix?: string | string[];
  excludeCities?: string[];
  
  // Company
  industry?: string;
  industryContains?: string;
  excludeIndustry?: string[];
  nafCode?: string;
  legalForm?: string;
  companySize?: string;
  revenueRange?: string;
  minEmployees?: number;
  maxEmployees?: number;
  createdAfter?: string;
  
  // Contact
  contactPosition?: string;
  hasContactName?: boolean;
  hasCompanyName?: boolean;
  
  // Scoring
  minScore?: number;
  maxScore?: number;
  status?: string;
  
  // Data presence
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasSiret?: boolean;
  hasWebsite?: boolean;
  hasLinkedin?: boolean;
  
  // Campaign eligibility
  campaignEligible?: boolean;
  source?: string;
  tags?: string[];
}

interface LeadResult {
  id: string;
  slug: string | null;
  company_name: string | null;
  contact_name: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  contact_position: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  postal_code: string | null;
  region: string | null;
  industry: string | null;
  naf_code: string | null;
  legal_form: string | null;
  company_size: string | null;
  cold_score: number | null;
  status: string | null;
  employee_count: number | null;
  siret: string | null;
  website: string | null;
  linkedin_url: string | null;
  tags: string[] | null;
  source: string | null;
  consent_marketing: boolean | null;
  unsubscribed_at: string | null;
  creation_date: string | null;
  created_at: string | null;
}

interface AISearchResultV3 {
  success: boolean;
  query: string;
  filters: SearchFiltersV3;
  interpretation: string;
  confidence: number;
  clarification?: string | null;
  results: LeadResult[];
  totalCount: number;
  stats: {
    withEmail: number;
    withPhone: number;
    withSiret: number;
    avgScore: number;
    campaignReady: number;
  };
}

interface AISearchHistory {
  query: string;
  filters: SearchFiltersV3;
  resultCount: number;
  timestamp: string;
}

interface SmartSuggestion {
  text: string;
  query: string;
  type: 'refine' | 'new' | 'history';
  icon?: React.ReactNode;
}

interface VivierAISearchV3Props {
  onFiltersApply?: (filters: SearchFiltersV3) => void;
  onResultsFound?: (results: LeadResult[], totalCount: number) => void;
  currentFilters?: SearchFiltersV3;
}

const STORAGE_KEY = 'vivier-ai-history-v3';
const MAX_HISTORY = 10;

const EXAMPLE_QUERIES = [
  "Emails @gmail.com",
  "Agences immobilières département 33",
  "PME IT en Île-de-France sans webmail",
  "Restaurants avec téléphone sauf Paris",
  "Entreprises avec siret et email pro",
  "Leads scorés > 60 éligibles campagne",
];

function loadHistory(): AISearchHistory[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: AISearchHistory[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {}
}

// V3 Filter label mappings
const FILTER_LABELS: Record<string, string> = {
  searchText: 'Texte',
  searchInFields: 'Dans',
  emailDomain: 'Email @',
  emailDomainContains: 'Email contient',
  excludeEmailDomains: 'Exclure emails',
  city: 'Ville',
  postalCodePrefix: 'Dept/CP',
  excludeCities: 'Exclure villes',
  industry: 'Secteur',
  industryContains: 'Secteur contient',
  excludeIndustry: 'Exclure secteurs',
  nafCode: 'Code NAF',
  legalForm: 'Forme juridique',
  companySize: 'Taille',
  minEmployees: 'Effectif ≥',
  maxEmployees: 'Effectif ≤',
  createdAfter: 'Créé après',
  contactPosition: 'Fonction',
  hasContactName: 'Nom contact',
  hasCompanyName: 'Nom entreprise',
  minScore: 'Score ≥',
  maxScore: 'Score ≤',
  status: 'Statut',
  hasEmail: 'Avec email',
  hasPhone: 'Avec tél',
  hasSiret: 'Avec SIRET',
  campaignEligible: 'Campagne OK',
  source: 'Source',
};

export function VivierAISearchV2({ onFiltersApply, onResultsFound, currentFilters }: VivierAISearchV3Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<AISearchResultV3 | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [listName, setListName] = useState('');
  const [history, setHistory] = useState<AISearchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isCleaningData, setIsCleaningData] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Smart suggestions based on context
  const suggestions = useMemo<SmartSuggestion[]>(() => {
    const items: SmartSuggestion[] = [];

    if (currentFilters) {
      if (currentFilters.city && !currentFilters.industry && !currentFilters.industryContains) {
        items.push({
          text: `+ Secteur IT`,
          query: `entreprises IT à ${currentFilters.city}`,
          type: 'refine',
          icon: <Building2 className="w-3 h-3" />,
        });
      }
      if (!currentFilters.campaignEligible) {
        items.push({
          text: `Éligibles campagne`,
          query: `${query || 'leads'} éligibles campagne`,
          type: 'refine',
          icon: <Rocket className="w-3 h-3" />,
        });
      }
      if (!currentFilters.minScore) {
        items.push({
          text: `Score > 60`,
          query: `${query || 'leads'} avec score supérieur à 60`,
          type: 'refine',
          icon: <TrendingUp className="w-3 h-3" />,
        });
      }
    }

    // History suggestions
    history.slice(0, 2).forEach(h => {
      if (!items.find(i => i.query === h.query)) {
        items.push({
          text: h.query.length > 30 ? h.query.slice(0, 30) + '...' : h.query,
          query: h.query,
          type: 'history',
          icon: <History className="w-3 h-3" />,
        });
      }
    });

    return items.slice(0, 5);
  }, [currentFilters, history, query]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      toast.error('Entrez une requête de recherche');
      return;
    }

    setIsSearching(true);
    setResult(null);
    setSelectedLeads(new Set());

    try {
      const { data, error } = await supabase.functions.invoke('vivier-ai-search', {
        body: { 
          query: query.trim(), 
          limit: 100,
          existingFilters: currentFilters,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Recherche échouée');
      }

      setResult(data as AISearchResultV3);
      
      // Update history
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

      toast.success(`${data.totalCount.toLocaleString('fr-FR')} leads trouvés`);
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
      toast.success('Filtres appliqués à la liste');
    }
  };

  const handleExportSelected = () => {
    if (!result?.results.length) {
      toast.error('Aucun résultat à exporter');
      return;
    }

    const toExport = selectedLeads.size > 0
      ? result.results.filter(r => selectedLeads.has(r.id))
      : result.results;

    // Cast to Record<string, unknown>[] for excel export
    createAndDownloadExcel(toExport as unknown as Record<string, unknown>[], `vivier-ia-${Date.now()}.xlsx`, 'Recherche IA')
      .then(() => toast.success(`${toExport.length} leads exportés`))
      .catch(() => toast.error("Erreur lors de l'export"));
  };

  const handleCreateCampaign = () => {
    if (!result) return;
    
    const leadIds = selectedLeads.size > 0 
      ? Array.from(selectedLeads)
      : result.results.map(r => r.id);
    
    // Navigate to campaigns with selected leads
    navigate(`/viviers/campaigns/new?leadIds=${leadIds.join(',')}&query=${encodeURIComponent(query)}`);
  };

  const handleSaveList = async () => {
    if (!listName.trim() || !result) return;

    try {
      const leadIds = selectedLeads.size > 0 
        ? Array.from(selectedLeads)
        : result.results.map(r => r.id);

      const { error } = await supabase.from('vivier_lists').insert([{
        name: listName.trim(),
        description: result.interpretation,
        list_type: selectedLeads.size > 0 ? 'static' : 'dynamic',
        criteria_json: selectedLeads.size > 0 ? { lead_ids: leadIds } : result.filters,
        lead_count: leadIds.length,
        last_sync_at: new Date().toISOString(),
      }] as any);

      if (error) throw error;

      toast.success(`Liste "${listName}" sauvegardée (${leadIds.length} leads)`);
      setShowSaveDialog(false);
      setListName('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de sauvegarde');
    }
  };

  const toggleSelectAll = () => {
    if (!result) return;
    if (selectedLeads.size === result.results.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(result.results.map(r => r.id)));
    }
  };

  const toggleLead = (id: string) => {
    const newSet = new Set(selectedLeads);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedLeads(newSet);
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
    toast.success('Historique effacé');
  };

  const clearResults = () => {
    setResult(null);
    setSelectedLeads(new Set());
    setQuery('');
  };

  const renderFilterBadge = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return null;
    const label = FILTER_LABELS[key] || key;
    const displayValue = typeof value === 'boolean' 
      ? (value ? '✓' : '✗') 
      : Array.isArray(value) 
        ? value.join(', ')
        : String(value);
    
    return (
      <Badge key={key} variant="secondary" className="text-xs gap-1">
        {label}: {displayValue}
      </Badge>
    );
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-muted-foreground';
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const previewResults = result?.results.slice(0, 10) || [];

  // Handle data cleanup
  const handleCleanupData = async (mode: 'preview' | 'execute') => {
    setIsCleaningData(true);
    try {
      const { data, error } = await supabase.functions.invoke('vivier-cleanup', {
        body: { mode, batchSize: 5000 },
      });
      
      if (error) throw error;
      
      if (mode === 'preview') {
        toast.info(`Aperçu: ${data.totalChanges} corrections possibles`, {
          description: `Villes: ${data.stats.citiesExtracted}, NAF: ${data.stats.nafCodesMoved}, Années: ${data.stats.yearsMoved}`,
        });
      } else {
        toast.success(`${data.totalChanges} corrections appliquées`, {
          description: `Erreurs: ${data.stats.errors}`,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur de nettoyage');
    } finally {
      setIsCleaningData(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            Recherche IA
            <Badge variant="outline" className="ml-2 text-xs">V3</Badge>
          </div>
          <div className="flex items-center gap-2">
            {/* Data cleanup button */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleCleanupData('preview')}
              disabled={isCleaningData}
              className="text-muted-foreground text-xs"
              title="Nettoyer les données polluées"
            >
              {isCleaningData ? <Loader2 className="w-3 h-3 animate-spin" /> : <Target className="w-3 h-3" />}
              <span className="hidden sm:inline ml-1">Nettoyer</span>
            </Button>
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
            {result && (
              <Button variant="ghost" size="sm" onClick={clearResults}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
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
              placeholder="Ex: agences immobilières à Bordeaux avec email..."
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
        {currentFilters && Object.keys(currentFilters).some(k => currentFilters[k as keyof SearchFiltersV3]) && (
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
                onClick={() => { setQuery(item.query); setShowHistory(false); }}
                className="w-full text-left px-2 py-1.5 rounded hover:bg-muted text-sm flex items-center justify-between"
              >
                <span className="truncate flex-1">{item.query}</span>
                <Badge variant="outline" className="ml-2 shrink-0 text-xs">
                  {item.resultCount.toLocaleString('fr-FR')}
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
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(s.query)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                    s.type === 'refine' 
                      ? 'border-primary/30 text-primary hover:bg-primary/10' 
                      : 'border-muted text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {s.icon}
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Example queries */}
        {!result && suggestions.length === 0 && (
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Exemples :</span>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((example, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(example)}
                  className="text-xs text-primary hover:underline"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4 pt-2 border-t">
            {/* Clarification alert if AI needs more info */}
            {result.clarification && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-medium">Clarification nécessaire</span>
                </div>
                <p className="mt-1 text-yellow-700 dark:text-yellow-300">{result.clarification}</p>
              </div>
            )}

            {/* Interpretation & Confidence */}
            <div className="flex items-start gap-2">
              <p className="text-sm text-muted-foreground flex-1">{result.interpretation}</p>
              <Badge variant={result.confidence >= 80 ? "default" : result.confidence >= 50 ? "secondary" : "destructive"} className="text-xs shrink-0">
                {result.confidence}% confiance
              </Badge>
            </div>

            {/* Detected filters */}
            <div className="flex flex-wrap gap-1.5">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              {Object.entries(result.filters).map(([key, value]) => renderFilterBadge(key, value))}
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-5 gap-2">
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-primary">{result.totalCount.toLocaleString('fr-FR')}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold flex items-center justify-center gap-1">
                  <Mail className="w-3 h-3" />
                  {result.stats.withEmail}
                </div>
                <div className="text-xs text-muted-foreground">Emails</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold flex items-center justify-center gap-1">
                  <Phone className="w-3 h-3" />
                  {result.stats.withPhone}
                </div>
                <div className="text-xs text-muted-foreground">Tél</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold">{result.stats.avgScore}</div>
                <div className="text-xs text-muted-foreground">Score moy.</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-green-600 flex items-center justify-center gap-1">
                  <Rocket className="w-3 h-3" />
                  {result.stats.campaignReady}
                </div>
                <div className="text-xs text-muted-foreground">Campagne</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
              <div className="text-sm">
                {selectedLeads.size > 0 ? (
                  <span><span className="font-semibold text-primary">{selectedLeads.size}</span> sélectionnés</span>
                ) : (
                  <span>Sélectionnez des leads ou exportez tout</span>
                )}
              </div>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={handleApplyFilters}>
                  <Filter className="w-3 h-3 mr-1" />
                  Appliquer
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportSelected}>
                  <FileSpreadsheet className="w-3 h-3 mr-1" />
                  {selectedLeads.size > 0 ? `Export (${selectedLeads.size})` : 'Export XLSX'}
                </Button>
                <Button variant="default" size="sm" onClick={() => setShowSaveDialog(true)}>
                  <Save className="w-3 h-3 mr-1" />
                  Liste
                </Button>
                {result.stats.campaignReady > 0 && (
                  <Button variant="default" size="sm" onClick={handleCreateCampaign} className="bg-green-600 hover:bg-green-700">
                    <Rocket className="w-3 h-3 mr-1" />
                    Campagne
                  </Button>
                )}
              </div>
            </div>

            {/* Preview with selection */}
            {previewResults.length > 0 && (
              <Collapsible open={showPreview} onOpenChange={setShowPreview}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="text-xs flex items-center gap-2">
                      Aperçu ({Math.min(10, result.results.length)} sur {result.totalCount})
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleSelectAll(); }}
                        className="text-primary hover:underline"
                      >
                        {selectedLeads.size === result.results.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                      </button>
                    </span>
                    {showPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ScrollArea className="h-[300px] mt-2">
                    <div className="space-y-2">
                      {previewResults.map((lead) => (
                        <div 
                          key={lead.id} 
                          className={`text-xs p-3 rounded border bg-background flex items-start gap-3 cursor-pointer transition-colors ${
                            selectedLeads.has(lead.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => toggleLead(lead.id)}
                        >
                          <Checkbox 
                            checked={selectedLeads.has(lead.id)}
                            onCheckedChange={() => toggleLead(lead.id)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="font-medium truncate">{lead.company_name || 'Sans nom'}</span>
                              {lead.legal_form && (
                                <Badge variant="outline" className="text-[10px] shrink-0">{lead.legal_form}</Badge>
                              )}
                              {lead.cold_score !== null && (
                                <span className={`font-bold shrink-0 ${getScoreColor(lead.cold_score)}`}>
                                  {lead.cold_score}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                              <User className="w-3 h-3 shrink-0" />
                              <span className="truncate">
                                {lead.contact_name || `${lead.contact_first_name || ''} ${lead.contact_last_name || ''}`.trim() || '-'}
                                {lead.contact_position && ` • ${lead.contact_position}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1">
                              {lead.city && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <MapPin className="w-3 h-3" />
                                  {lead.city}
                                  {lead.postal_code && ` (${lead.postal_code.slice(0, 2)})`}
                                </span>
                              )}
                              {lead.industry && (
                                <span className="text-muted-foreground truncate">{lead.industry}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            {lead.email ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-muted-foreground/30" />
                            )}
                            {lead.phone ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-muted-foreground/30" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Save dialog */}
            {showSaveDialog && (
              <div className="border rounded-lg p-3 space-y-2 bg-background">
                <div className="text-sm font-medium">Sauvegarder comme liste</div>
                <Input
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder="Nom de la liste..."
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveList()}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(false)}>
                    Annuler
                  </Button>
                  <Button size="sm" onClick={handleSaveList} disabled={!listName.trim()}>
                    <Save className="w-3 h-3 mr-1" />
                    Sauvegarder {selectedLeads.size > 0 ? `(${selectedLeads.size})` : `(${result.totalCount})`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
