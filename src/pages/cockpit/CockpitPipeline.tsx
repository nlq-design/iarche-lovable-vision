import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ArrowRight, Filter, GripVertical, Building2, Plus, User, AlertTriangle, Clock } from "lucide-react";
import { OwnerBadge } from '@/components/cockpit/shared/OwnerBadge';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCockpitOpportunities } from '@/hooks/cockpit';
import { useCockpitLeads } from '@/hooks/cockpit';
import { useCockpitActivityLog } from '@/hooks/cockpit';
import { CreateOpportunityDialog } from '@/components/cockpit/dialogs';
import { LeadDetailSheet } from '@/components/cockpit/LeadDetailSheet';
import { Link } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { useEntityCompleteness } from '@/hooks/cockpit/useEntityCompleteness';
import { CompletenessIndicator } from '@/components/cockpit/CompletenessIndicator';

// Small wrapper component so useEntityCompleteness hook can be called per-card
function OppCompleteness({ data }: { data: Record<string, unknown> }) {
  const completeness = useEntityCompleteness('opportunity', data);
  if (completeness.severity === 'good') return null;
  return <CompletenessIndicator completeness={completeness} compact />;
}

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  lead: { label: 'Lead', color: 'bg-slate-500' },
  r1: { label: 'R1', color: 'bg-blue-500' },
  r2: { label: 'R2', color: 'bg-amber-500' },
  pause: { label: 'Pause', color: 'bg-orange-500' },
  closed_won: { label: 'Gagné', color: 'bg-emerald-500' },
  closed_lost: { label: 'Non', color: 'bg-red-500' },
};

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

const CockpitPipeline = () => {
  const { opportunities, stats, isLoading, moveToStage, PIPELINE_STAGES } = useCockpitOpportunities();
  const { leads } = useCockpitLeads();
  const { activities } = useCockpitActivityLog();
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Check stagnation: opportunity without activity for >7 days
  const getStagnationDays = (oppId: string, oppUpdatedAt: string | null): number => {
    const oppActivities = activities?.filter(a => 
      a.entity_type === 'opportunity' && a.entity_id === oppId
    ) || [];
    
    const lastActivityDate = oppActivities.length > 0 
      ? new Date(oppActivities[0].created_at || '')
      : oppUpdatedAt 
        ? new Date(oppUpdatedAt) 
        : null;
    
    if (!lastActivityDate) return 0;
    return differenceInDays(new Date(), lastActivityDate);
  };

  // Group opportunities by stage
  const opportunitiesByStage = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = opportunities?.filter(o => o.stage === stage) || [];
    return acc;
  }, {} as Record<string, typeof opportunities>);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    if (draggedId) {
      moveToStage.mutate({ id: draggedId, stage });
      setDraggedId(null);
    }
  };

  const handleCardClick = (opp: any) => {
    // Find the linked lead
    if (opp.lead_id) {
      const lead = leads?.find(l => l.id === opp.lead_id);
      if (lead) {
        setSelectedLead(lead);
        setSheetOpen(true);
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Only show active stages in kanban (not closed)
  const activeStages = PIPELINE_STAGES.filter(s => !s.startsWith('closed_'));

  return (
    <CockpitLayout>
      <div className="p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Pipeline</h1>
            <p className="text-sm text-muted-foreground">Gestion des opportunités commerciales</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-sm">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Filtrer</span>
            </Button>
            <Button size="sm" className="h-8 text-sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Nouvelle opportunité</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          </div>
        </div>

        <CreateOpportunityDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />

        {/* Pipeline Kanban */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-[300px] sm:h-[400px]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {activeStages.map((stage) => {
              const stageOpps = opportunitiesByStage[stage] || [];
              const stageValue = stageOpps.reduce((sum, o) => sum + (Number(o.value_amount) || 0), 0);
              const config = STAGE_CONFIG[stage] || { label: stage, color: 'bg-gray-500' };

              return (
                <Card 
                  key={stage} 
                  className="min-h-[280px] sm:min-h-[400px] bg-card border touch-manipulation"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage)}
                >
                  <CardHeader className="pb-2 px-3 pt-3">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${config.color}`} />
                        <span>{config.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-medium h-5 px-1.5">
                          {stageOpps.length}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-normal">
                          {formatCurrency(stageValue)}
                        </span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 space-y-2">
                    {stageOpps.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-28 text-muted-foreground border border-dashed rounded-md">
                        <TrendingUp className="h-5 w-5 mb-1.5 opacity-40" />
                        <p className="text-xs">Glissez-déposez ici</p>
                      </div>
                    ) : (
                      stageOpps.map((opp) => {
                        const linkedLead = opp.lead_id ? leads?.find(l => l.id === opp.lead_id) : null;
                        const stagnationDays = getStagnationDays(opp.id, opp.updated_at);
                        const isStagnant = stagnationDays >= 7;
                        
                        return (
                          <div
                            key={opp.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, opp.id)}
                            onClick={() => handleCardClick(opp)}
                            className={`p-2.5 rounded-md border bg-background hover:bg-muted/50 cursor-pointer active:cursor-grabbing transition-colors ${
                              isStagnant ? 'border-amber-400 bg-amber-50/30 dark:bg-amber-950/20' : ''
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-0.5 cursor-grab" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-medium text-sm truncate flex-1">{opp.title}</p>
                                  {isStagnant && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="text-xs">Sans activité depuis {stagnationDays} jours</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                {linkedLead ? (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                    <Building2 className="h-3 w-3" />
                                    <span className="truncate">{linkedLead.company || linkedLead.name}</span>
                                  </div>
                                ) : (opp as any).leads ? (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                    <Building2 className="h-3 w-3" />
                                    <span className="truncate">{(opp as any).leads?.company || (opp as any).leads?.name}</span>
                                  </div>
                                ) : null}
                                <div className="flex items-center justify-between mt-1.5">
                                  <div className="flex items-center gap-1.5">
                                    <OwnerBadge userId={opp.assigned_to} size="sm" />
                                    <span className="text-sm font-semibold">
                                      {formatCurrency(Number(opp.value_amount) || 0)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <OppCompleteness data={opp} />
                                    <Badge variant="outline" className="text-xs h-5 px-1.5">
                                      {opp.probability}%
                                    </Badge>
                                  </div>
                                </div>
                                {isStagnant && (
                                  <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-600">
                                    <Clock className="h-3 w-3" />
                                    <span>{stagnationDays}j sans activité</span>
                                  </div>
                                )}
                                {linkedLead && !isStagnant && (
                                  <div className="flex items-center gap-1 mt-1.5 text-xs text-primary">
                                    <User className="h-3 w-3" />
                                    <span>Voir fiche</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Summary */}
        <Card className="bg-muted/30 border">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-5">
                <div>
                  <span className="text-muted-foreground text-xs">Total</span>
                  <p className="font-semibold">{formatCurrency(stats.totalValue)}</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <span className="text-muted-foreground text-xs">Pondéré</span>
                  <p className="font-semibold">{formatCurrency(stats.weightedValue)}</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <span className="text-muted-foreground text-xs">Opportunités</span>
                  <p className="font-semibold">{stats.total}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-8 text-sm" asChild>
                <Link to="/cockpit/analytics">
                  Analytics <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Detail Sheet */}
      <LeadDetailSheet 
        lead={selectedLead}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </CockpitLayout>
  );
};

export default CockpitPipeline;
