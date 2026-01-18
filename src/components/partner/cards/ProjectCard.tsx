import { useState } from 'react';
import { ChevronDown, ChevronUp, Building2, Calendar, TrendingUp, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EditPartnerProjectDialog } from '@/components/partner/dialogs/EditPartnerProjectDialog';
import { DeletePartnerProjectDialog } from '@/components/partner/dialogs/DeletePartnerProjectDialog';
import { PartnerCommentsSection } from '@/components/partner/comments/PartnerCommentsSection';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  scoping: { label: 'Cadrage', variant: 'outline' },
  planning: { label: 'Planification', variant: 'outline' },
  active: { label: 'En cours', variant: 'default' },
  in_progress: { label: 'En cours', variant: 'default' },
  review: { label: 'Revue', variant: 'secondary' },
  on_hold: { label: 'En pause', variant: 'outline' },
  completed: { label: 'Terminé', variant: 'secondary' },
  cancelled: { label: 'Annulé', variant: 'destructive' },
};

const HEALTH_LABELS: Record<string, { label: string; color: string }> = {
  on_track: { label: 'Sur les rails', color: 'text-green-600' },
  at_risk: { label: 'À risque', color: 'text-orange-600' },
  off_track: { label: 'En difficulté', color: 'text-red-600' },
};

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
    health_status?: string | null;
    start_date?: string | null;
    target_end_date?: string | null;
    budget_amount?: number | null;
    consumed_amount?: number | null;
    role?: string | null;
    opportunity?: {
      id: string;
      title: string;
      lead?: {
        id: string;
        name: string;
        company?: string | null;
      } | null;
    } | null;
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const statusInfo = STATUS_LABELS[project.status] || { label: project.status, variant: 'outline' as const };
  const healthInfo = project.health_status ? HEALTH_LABELS[project.health_status] : null;
  const isCreator = project.role === 'creator';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{project.name}</h3>
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                {healthInfo && (
                  <span className={`text-sm font-medium ${healthInfo.color}`}>
                    {healthInfo.label}
                  </span>
                )}
              </div>
              
              {project.opportunity?.lead && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>
                    {project.opportunity.lead.company || project.opportunity.lead.name}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                {isCreator ? (
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    Créé par vous
                  </Badge>
                ) : project.role && (
                  <Badge variant="outline" className="capitalize">
                    {project.role}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isCreator && (
                <div className="flex items-center gap-1">
                  <EditPartnerProjectDialog project={project} />
                  <DeletePartnerProjectDialog projectId={project.id} projectName={project.name} />
                </div>
              )}
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                {project.start_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Début: {format(new Date(project.start_date), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                )}
                {project.budget_amount && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>
                      Budget: {project.budget_amount.toLocaleString('fr-FR')} €
                      {project.consumed_amount != null && (
                        <span className="text-xs ml-1">
                          ({Math.round((project.consumed_amount / project.budget_amount) * 100)}% consommé)
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <MessageSquare className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardContent>

        <CollapsibleContent>
          <div className="px-6 pb-6 pt-0">
            <PartnerCommentsSection 
              entityType="project" 
              entityId={project.id}
              entityName={project.name}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
