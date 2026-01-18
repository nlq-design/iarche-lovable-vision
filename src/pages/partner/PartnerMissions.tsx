import { PartnerLayout } from '@/components/partner/PartnerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban } from 'lucide-react';

export default function PartnerMissions() {
  return (
    <PartnerLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mes Missions</h1>
          <p className="text-muted-foreground">
            Projets auxquels vous êtes assigné
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Projets en cours</CardTitle>
            <CardDescription>
              Retrouvez ici tous les projets sur lesquels vous intervenez
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <FolderKanban className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucune mission pour le moment</p>
              <p className="text-sm max-w-md">
                Lorsque vous serez assigné à des projets, ils apparaîtront ici avec tous les détails nécessaires.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  );
}
