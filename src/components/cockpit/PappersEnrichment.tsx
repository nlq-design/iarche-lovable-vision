import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  Search, 
  Loader2, 
  CheckCircle2, 
  MapPin, 
  Users, 
  Euro,
  Calendar,
  Globe,
  FileText,
  User,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { usePappersLookup, PappersEnrichedData, PappersCompanyResult } from '@/hooks/cockpit/usePappersLookup';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PappersEnrichmentProps {
  leadId: string;
  currentSiret?: string | null;
  currentCompany?: string | null;
  onEnriched?: () => void;
}

export function PappersEnrichment({ 
  leadId, 
  currentSiret, 
  currentCompany,
  onEnriched 
}: PappersEnrichmentProps) {
  const { searchCompanies, lookupBySiret, isLoading } = usePappersLookup();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(currentCompany || '');
  const [searchResults, setSearchResults] = useState<PappersCompanyResult[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<PappersEnrichedData | null>(null);
  const [siretInput, setSiretInput] = useState(currentSiret || '');
  const [isSearching, setIsSearching] = useState(false);
  const [view, setView] = useState<'search' | 'preview' | 'success'>('search');

  const handleSearch = async () => {
    if (!searchQuery || searchQuery.length < 2) return;
    setIsSearching(true);
    const results = await searchCompanies(searchQuery);
    setSearchResults(results?.results || []);
    setIsSearching(false);
  };

  const handleSelectCompany = async (company: PappersCompanyResult) => {
    const data = await lookupBySiret(company.siret);
    if (data) {
      setSelectedCompany(data);
      setSiretInput(company.siret);
      setView('preview');
    }
  };

  const handleDirectSiretLookup = async () => {
    if (!siretInput) return;
    const data = await lookupBySiret(siretInput);
    if (data) {
      setSelectedCompany(data);
      setView('preview');
    }
  };

  const handleEnrich = async () => {
    if (!siretInput) return;
    const data = await lookupBySiret(siretInput, leadId);
    if (data?.lead_updated) {
      setView('success');
      onEnriched?.();
      setTimeout(() => {
        setOpen(false);
        setView('search');
        setSelectedCompany(null);
      }, 1500);
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4 text-terracotta-500" />
          Enrichir via Pappers
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Enrichissement Pappers
          </DialogTitle>
          <DialogDescription>
            Recherchez une entreprise par nom ou SIRET pour enrichir automatiquement les données du lead.
          </DialogDescription>
        </DialogHeader>

        {view === 'success' ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <p className="text-lg font-medium">Lead enrichi avec succès !</p>
          </div>
        ) : view === 'preview' && selectedCompany ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {/* Company Header */}
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedCompany.company_name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedCompany.legal_form}</p>
                    </div>
                    <Badge variant="secondary">{selectedCompany.siret}</Badge>
                  </div>
                </div>

                {/* Address */}
                {(selectedCompany.address || selectedCompany.city) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Adresse</p>
                      <p className="text-sm text-muted-foreground">
                        {[selectedCompany.address, selectedCompany.postal_code, selectedCompany.city]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Industry */}
                {selectedCompany.naf_label && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Activité (NAF: {selectedCompany.naf_code})</p>
                      <p className="text-sm text-muted-foreground">{selectedCompany.naf_label}</p>
                    </div>
                  </div>
                )}

                {/* Employees & Revenue */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedCompany.employees && (
                    <div className="flex items-start gap-3">
                      <Users className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Effectif</p>
                        <p className="text-sm text-muted-foreground">{selectedCompany.employees}</p>
                      </div>
                    </div>
                  )}
                  {selectedCompany.revenue && (
                    <div className="flex items-start gap-3">
                      <Euro className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Chiffre d'affaires</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(selectedCompany.revenue)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Creation date & Website */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedCompany.creation_date && (
                    <div className="flex items-start gap-3">
                      <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Date de création</p>
                        <p className="text-sm text-muted-foreground">{selectedCompany.creation_date}</p>
                      </div>
                    </div>
                  )}
                  {selectedCompany.website && (
                    <div className="flex items-start gap-3">
                      <Globe className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Site web</p>
                        <a 
                          href={selectedCompany.website.startsWith('http') ? selectedCompany.website : `https://${selectedCompany.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-terracotta-500 hover:underline flex items-center gap-1"
                        >
                          {selectedCompany.website}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Representatives */}
                {selectedCompany.representatives && selectedCompany.representatives.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Dirigeants
                    </p>
                    <div className="grid gap-2">
                      {selectedCompany.representatives.map((rep, i) => (
                        <div key={i} className="text-sm p-2 bg-muted/50 rounded">
                          <span className="font-medium">{rep.name}</span>
                          <span className="text-muted-foreground"> - {rep.position}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Financial History */}
                {selectedCompany.finances && selectedCompany.finances.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Euro className="h-4 w-4 text-muted-foreground" />
                      Historique financier
                    </p>
                    <div className="grid gap-2">
                      {selectedCompany.finances.map((fin, i) => (
                        <div key={i} className="text-sm p-2 bg-muted/50 rounded flex justify-between">
                          <span className="font-medium">{fin.annee}</span>
                          <span className="text-muted-foreground">
                            CA: {formatCurrency(fin.chiffre_affaires)} | Résultat: {formatCurrency(fin.resultat)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <Separator className="my-4" />

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => {
                setView('search');
                setSelectedCompany(null);
              }}>
                Retour
              </Button>
              <Button onClick={handleEnrich} disabled={isLoading} className="gap-2">
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Appliquer au lead
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Direct SIRET Lookup */}
            <div className="space-y-2">
              <Label>Recherche par SIRET</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Entrez un SIRET (14 chiffres)..."
                  value={siretInput}
                  onChange={(e) => setSiretInput(e.target.value.replace(/\s/g, ''))}
                  className="font-mono"
                />
                <Button 
                  onClick={handleDirectSiretLookup} 
                  disabled={isLoading || !siretInput}
                  size="icon"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">ou</span>
              <Separator className="flex-1" />
            </div>

            {/* Search by Company Name */}
            <div className="space-y-2">
              <Label>Recherche par nom d'entreprise</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nom de l'entreprise..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button 
                  onClick={handleSearch} 
                  disabled={isSearching || !searchQuery}
                  size="icon"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Résultats ({searchResults.length})</Label>
                <ScrollArea className="h-[200px] border rounded-md">
                  <div className="p-2 space-y-1">
                    {searchResults.map((company) => (
                      <div
                        key={company.siret}
                        className={cn(
                          "p-3 rounded-md cursor-pointer hover:bg-muted transition-colors",
                          "border border-transparent hover:border-border"
                        )}
                        onClick={() => handleSelectCompany(company)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{company.nom_entreprise}</p>
                            <p className="text-xs text-muted-foreground">
                              {[company.code_postal, company.ville].filter(Boolean).join(' ')}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs font-mono">
                            {company.siret}
                          </Badge>
                        </div>
                        {company.libelle_naf && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {company.libelle_naf}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
