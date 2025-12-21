import { useState } from 'react';
import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ArrowRight, Filter, GripVertical, Building2, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCockpitOpportunities } from '@/hooks/cockpit';
import { useCockpitLeads } from '@/hooks/cockpit';
import { CreateOpportunityDialog } from '@/components/cockpit/dialogs';
import { LeadDetailSheet } from '@/components/cockpit/LeadDetailSheet';
import { Link } from 'react-router-dom';

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  lead: { label: 'Lead', color: 'bg-slate-500' },
  qualification: { label: 'Qualification', color: 'bg-blue-500' },
  proposal: { label: 'Proposition', color: 'bg-yellow-500' },
  negotiation: { label: 'Négociation', color: 'bg-orange-500' },
  closed_won: { label: 'Gagné', color: 'bg-green-500' },
  closed_lost: { label: 'Perdu', color: 'bg-red-500' },
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
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

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
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pipeline Commercial</h1>
            <p className="text-muted-foreground">Gérez vos opportunités par étape</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtrer
            </Button>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle opportunité
            </Button>
          </div>
        </div>

        <CreateOpportunityDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />

        {/* Pipeline Kanban */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-[400px]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {activeStages.map((stage) => {
              const stageOpps = opportunitiesByStage[stage] || [];
              const stageValue = stageOpps.reduce((sum, o) => sum + (Number(o.value_amount) || 0), 0);
              const config = STAGE_CONFIG[stage] || { label: stage, color: 'bg-gray-500' };

              return (
                <Card 
                  key={stage} 
                  className="min-h-[400px]"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${config.color}`} />
                        <span>{config.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {stageOpps.length}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(stageValue)}
                        </span>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stageOpps.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground border-2 border-dashed rounded-lg">
                        <TrendingUp className="h-6 w-6 mb-2 opacity-50" />
                        <p className="text-xs">Glissez-déposez ici</p>
                      </div>
                    ) : (
                      stageOpps.map((opp) => {
                        const linkedLead = opp.lead_id ? leads?.find(l => l.id === opp.lead_id) : null;
                        
                        return (
                          <div
                            key={opp.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, opp.id)}
                            onClick={() => handleCardClick(opp)}
                            className="p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer active:cursor-grabbing transition-all hover:shadow-md"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5 cursor-grab" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{opp.title}</p>
                                {linkedLead ? (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                    <Building2 className="h-3 w-3" />
                                    <span className="truncate">{linkedLead.company || linkedLead.name}</span>
                                  </div>
                                ) : (opp as any).leads ? (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                    <Building2 className="h-3 w-3" />
                                    <span className="truncate">{(opp as any).leads?.company || (opp as any).leads?.name}</span>
                                  </div>
                                ) : null}
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-sm font-semibold">
                                    {formatCurrency(Number(opp.value_amount) || 0)}
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {opp.probability}%
                                  </Badge>
                                </div>
                                {linkedLead && (
                                  <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                                    <User className="h-3 w-3" />
                                    <span>Voir la fiche lead</span>
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
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-muted-foreground">Total pipeline : </span>
                  <span className="font-semibold">{formatCurrency(stats.totalValue)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Pondéré : </span>
                  <span className="font-semibold">{formatCurrency(stats.weightedValue)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Opportunités : </span>
                  <span className="font-semibold">{stats.total}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/cockpit/analytics">
                  Voir les analytics <ArrowRight className="h-4 w-4 ml-1" />
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
