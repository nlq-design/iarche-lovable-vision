import { PartnerLayout } from '@/components/partner/PartnerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function PartnerDocuments() {
  return (
    <PartnerLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            Ressources et documents partagés
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Documents accessibles</CardTitle>
            <CardDescription>
              Devis, cahiers des charges, et autres documents liés à vos missions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <FileText className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucun document disponible</p>
              <p className="text-sm max-w-md">
                Les documents partagés avec vous apparaîtront ici.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PartnerLayout>
  );
}
