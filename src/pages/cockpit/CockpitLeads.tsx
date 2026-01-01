import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Search, Download, Mail, Building2, Trash2, TrendingUp, TrendingDown, Minus, Mic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useCockpitLeads } from '@/hooks/cockpit';
import { useLeads } from '@/hooks/shared/useLeads';
import { useCockpitVoiceTranscriptions } from '@/hooks/cockpit/useCockpitVoiceTranscriptions';
import { CreateLeadDialog } from '@/components/cockpit/dialogs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SOURCE_LABELS: Record<string, string> = {
  'contact': 'Contact',
  'newsletter': 'Newsletter',
  'atelier-webinaire': 'Atelier/Webinaire',
  'livre-blanc': 'Livre blanc',
  'formulaire': 'Formulaire',
};

// Score visual helpers
const getScoreColor = (score: number) => {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-muted-foreground';
};

const getScoreProgressColor = (score: number) => {
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-slate-400';
};

const getScoreIcon = (score: number) => {
  if (score >= 70) return <TrendingUp className="h-3 w-3 text-emerald-600" />;
  if (score >= 40) return <Minus className="h-3 w-3 text-amber-600" />;
  return <TrendingDown className="h-3 w-3 text-muted-foreground" />;
};

const SCORE_FILTERS = [
  { value: 'all', label: 'Tous scores' },
  { value: 'high', label: 'Élevé (70+)' },
  { value: 'medium', label: 'Moyen (40-69)' },
  { value: 'low', label: 'Faible (<40)' },
];

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  company_size?: string | null;
  industry?: string | null;
  source: string;
  source_context?: string | null;
  message?: string | null;
  qualification_status?: string | null;
  lead_score?: number | null;
  consent_marketing?: boolean | null;
  created_at?: string | null;
  last_contacted_at?: string | null;
}

const CockpitLeads = () => {
  const navigate = useNavigate();
  const { leads, stats, isLoading } = useCockpitLeads();
  const { bulkDeleteLeads } = useLeads();
  const { transcriptions } = useCockpitVoiceTranscriptions();
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [scoreFilter, setScoreFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  // Get lead IDs that have transcriptions
  const leadsWithTranscriptions = new Set(
    transcriptions?.filter(t => t.lead_id).map(t => t.lead_id) || []
  );

  // Filter leads
  const filteredLeads = leads?.filter(lead => {
    const matchesSearch = searchQuery === '' || 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.company?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
    
    const score = lead.lead_score || 0;
    const matchesScore = 
      scoreFilter === 'all' ||
      (scoreFilter === 'high' && score >= 70) ||
      (scoreFilter === 'medium' && score >= 40 && score < 70) ||
      (scoreFilter === 'low' && score < 40);
    
    return matchesSearch && matchesSource && matchesScore;
  }) || [];

  const handleRowClick = (lead: Lead) => {
    navigate(`/cockpit/leads/${lead.id}`);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLeads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLeads.map(l => l.id));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleBulkDelete = () => {
    setIsDeleting(true);
    bulkDeleteLeads.mutate(selectedIds, {
      onSuccess: () => {
        setSelectedIds([]);
        setShowBulkDeleteDialog(false);
        setIsDeleting(false);
      },
      onError: () => {
        setIsDeleting(false);
      }
    });
  };

  return (
    <CockpitLayout>
      <div className="p-5 space-y-4">
        {/* Header compact */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Leads</h1>
            <p className="text-sm text-muted-foreground">Base de données prospects</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {selectedIds.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                className="h-8 text-sm"
                onClick={() => setShowBulkDeleteDialog(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Supprimer ({selectedIds.length})
              </Button>
            )}
            <Button variant="outline" size="sm" className="h-8 text-sm">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Exporter</span>
            </Button>
            <CreateLeadDialog />
          </div>
        </div>

        {/* Stats inline + Search */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-3 bg-muted/40 rounded-lg border">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{stats.total}</span>
            </div>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Contact</span>
              <span className="font-medium text-blue-600">{stats.bySource?.contact || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Newsletter</span>
              <span className="font-medium text-emerald-600">{stats.bySource?.newsletter || 0}</span>
            </div>
          </div>
          
          <div className="flex-1" />
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                placeholder="Rechercher..." 
                className="pl-8 h-8 w-full sm:w-[200px] text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full sm:w-[130px] h-8 text-sm">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="contact">Contact</SelectItem>
                <SelectItem value="newsletter">Newsletter</SelectItem>
                <SelectItem value="atelier-webinaire">Atelier</SelectItem>
                <SelectItem value="livre-blanc">Livre blanc</SelectItem>
                <SelectItem value="formulaire">Formulaire</SelectItem>
              </SelectContent>
            </Select>
            <Select value={scoreFilter} onValueChange={setScoreFilter}>
              <SelectTrigger className="w-full sm:w-[120px] h-8 text-sm">
                <SelectValue placeholder="Score" />
              </SelectTrigger>
              <SelectContent>
                {SCORE_FILTERS.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Leads Table */}
        <Card className="border shadow-sm">
          <CardHeader className="py-3 px-4 border-b bg-muted/30">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {filteredLeads.length} lead{filteredLeads.length > 1 ? 's' : ''}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Users className="h-10 w-10 mb-3 opacity-40" />
                <p className="font-medium">Aucun lead trouvé</p>
                <p className="text-sm">
                  {searchQuery || sourceFilter !== 'all' 
                    ? "Modifiez vos filtres"
                    : "Les leads apparaîtront ici"
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-10 sticky left-0 bg-card z-10">
                        <Checkbox
                          checked={selectedIds.length === filteredLeads.length && filteredLeads.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="text-xs min-w-[180px]">Contact</TableHead>
                      <TableHead className="text-xs min-w-[140px]">Entreprise</TableHead>
                      <TableHead className="text-xs min-w-[120px]">Source</TableHead>
                      <TableHead className="text-xs w-16 min-w-[70px]">Score</TableHead>
                      <TableHead className="text-xs w-24 min-w-[80px]">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow 
                      key={lead.id} 
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => handleRowClick(lead)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()} className="py-2">
                        <Checkbox
                          checked={selectedIds.includes(lead.id)}
                          onCheckedChange={() => {}}
                          onClick={(e) => toggleSelect(lead.id, e)}
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <div>
                          <p className="font-medium text-sm">{lead.name}</p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        {lead.company ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{lead.company}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-xs font-normal">
                            {SOURCE_LABELS[lead.source] || lead.source}
                          </Badge>
                          {leadsWithTranscriptions.has(lead.id) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge variant="outline" className="text-xs px-1 py-0 h-5 bg-primary/10 border-primary/30">
                                    <Mic className="h-3 w-3 text-primary" />
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Transcription disponible</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5 min-w-[60px]">
                                {getScoreIcon(lead.lead_score || 0)}
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className={`text-xs font-semibold ${getScoreColor(lead.lead_score || 0)}`}>
                                      {lead.lead_score || 0}
                                    </span>
                                  </div>
                                  <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all ${getScoreProgressColor(lead.lead_score || 0)}`}
                                      style={{ width: `${lead.lead_score || 0}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                Score: {lead.lead_score || 0}/100
                                {(lead.lead_score || 0) >= 70 && ' (Chaud)'}
                                {(lead.lead_score || 0) >= 40 && (lead.lead_score || 0) < 70 && ' (Tiède)'}
                                {(lead.lead_score || 0) < 40 && ' (Froid)'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground py-2">
                        {lead.created_at && format(new Date(lead.created_at), 'dd/MM/yy', { locale: fr })}
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
    </div>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {selectedIds.length} lead(s) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les leads sélectionnés seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CockpitLayout>
  );
};

export default CockpitLeads;
