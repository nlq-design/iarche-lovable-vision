import { useState } from 'react';
import { ChevronDown, ChevronUp, Building2, Mail, Phone, Calendar, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EditPartnerLeadDialog } from '@/components/partner/dialogs/EditPartnerLeadDialog';
import { DeletePartnerLeadDialog } from '@/components/partner/dialogs/DeletePartnerLeadDialog';
import { PartnerCommentsSection } from '@/components/partner/comments/PartnerCommentsSection';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const QUALIFICATION_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  new: { label: 'Nouveau', variant: 'secondary' },
  contacted: { label: 'Contacté', variant: 'outline' },
  qualified: { label: 'Qualifié', variant: 'default' },
  unqualified: { label: 'Non qualifié', variant: 'destructive' },
  converted: { label: 'Converti', variant: 'default' },
};

const SOURCE_LABELS: Record<string, string> = {
  contact: 'Formulaire contact',
  newsletter: 'Newsletter',
  'livre-blanc': 'Livre blanc',
  'atelier-webinaire': 'Atelier/Webinaire',
  referral: 'Recommandation',
  'partner-referral': 'Recommandation partenaire',
  networking: 'Réseau / Networking',
  direct: 'Contact direct',
  event: 'Événement',
  organic: 'Organique',
  other: 'Autre',
};

interface LeadCardProps {
  lead: {
    id: string;
    name: string;
    email: string;
    company?: string | null;
    phone?: string | null;
    source: string;
    qualification_status?: string | null;
    lead_score?: number | null;
    created_at: string;
    role?: string | null;
  };
}

export function LeadCard({ lead }: LeadCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const qualifInfo = lead.qualification_status 
    ? QUALIFICATION_LABELS[lead.qualification_status] 
    : null;
  const sourceLabel = SOURCE_LABELS[lead.source] || lead.source;
  const isCreator = lead.role === 'creator';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{lead.name}</h3>
                {qualifInfo && (
                  <Badge variant={qualifInfo.variant}>{qualifInfo.label}</Badge>
                )}
                {lead.lead_score != null && lead.lead_score > 0 && (
                  <Badge variant="outline" className="text-xs">
                    Score: {lead.lead_score}
                  </Badge>
                )}
              </div>
              
              {lead.company && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{lead.company}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  <span>{lead.email}</span>
                </div>
                {lead.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span>{lead.phone}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{sourceLabel}</Badge>
                {isCreator ? (
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    Créé par vous
                  </Badge>
                ) : lead.role && (
                  <Badge variant="secondary" className="capitalize">
                    {lead.role}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isCreator && (
                <div className="flex items-center gap-1">
                  <EditPartnerLeadDialog lead={lead} />
                  <DeletePartnerLeadDialog leadId={lead.id} leadName={lead.name} />
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(lead.created_at), 'dd MMM yyyy', { locale: fr })}
                </span>
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
              entityType="lead" 
              entityId={lead.id}
              entityName={lead.name}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
