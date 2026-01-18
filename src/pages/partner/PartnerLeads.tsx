import { PartnerLayout } from '@/components/partner/PartnerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Building2, Mail, Phone, Calendar } from 'lucide-react';
import { usePartnerLeads } from '@/hooks/partner/usePartnerLeads';
import { CreatePartnerLeadDialog } from '@/components/partner/dialogs/CreatePartnerLeadDialog';
import { EditPartnerLeadDialog } from '@/components/partner/dialogs/EditPartnerLeadDialog';
import { DeletePartnerLeadDialog } from '@/components/partner/dialogs/DeletePartnerLeadDialog';
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

export default function PartnerLeads() {
  const { data: leads, isLoading, error } = usePartnerLeads();

  return (
    <PartnerLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Leads</h1>
            <p className="text-muted-foreground">
              Contacts et prospects associés à vos missions
            </p>
          </div>
          <CreatePartnerLeadDialog />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-destructive">Erreur lors du chargement des leads</p>
            </CardContent>
          </Card>
        ) : !leads || leads.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Contacts associés</CardTitle>
              <CardDescription>
                Les leads et prospects liés à vos projets apparaîtront ici
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Users className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Aucun lead pour le moment</p>
                <p className="text-sm max-w-md mb-4">
                  Créez votre premier lead ou attendez qu'on vous en assigne.
                </p>
                <CreatePartnerLeadDialog />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {leads.map((lead) => {
              const qualifInfo = lead.qualification_status 
                ? QUALIFICATION_LABELS[lead.qualification_status] 
                : null;
              const sourceLabel = SOURCE_LABELS[lead.source] || lead.source;
              const isCreator = lead.role === 'creator';

              return (
                <Card key={lead.id} className="hover:shadow-md transition-shadow">
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PartnerLayout>
  );
}
