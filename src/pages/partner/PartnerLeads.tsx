import { PartnerLayout } from '@/components/partner/PartnerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import { usePartnerLeads } from '@/hooks/partner/usePartnerLeads';
import { CreatePartnerLeadDialog } from '@/components/partner/dialogs/CreatePartnerLeadDialog';
import { LeadCard } from '@/components/partner/cards/LeadCard';

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
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        )}
      </div>
    </PartnerLayout>
  );
}
