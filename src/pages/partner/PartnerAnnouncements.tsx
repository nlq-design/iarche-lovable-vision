import { PartnerLayout } from '@/components/partner/PartnerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell } from 'lucide-react';

export default function PartnerAnnouncements() {
  return (
    <PartnerLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Annonces</h1>
          <p className="text-muted-foreground">
            Communications de l'équipe IArche
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dernières annonces</CardTitle>
            <CardDescription>
              Actualités, mises à jour et informations importantes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Bell className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucune annonce pour le moment</p>
              <p className="text-sm max-w-md">
                Les communications de l'équipe apparaîtront ici.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  );
}
