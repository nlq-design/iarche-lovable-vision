import { PartnerLayout } from '@/components/partner/PartnerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, FolderKanban, Clock, Upload } from 'lucide-react';
import { usePartnerDocuments } from '@/hooks/partner/usePartnerDocuments';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PersonalDocumentsList } from '@/components/partner/documents/PersonalDocumentsList';
import { UploadDocumentDialog } from '@/components/partner/documents/UploadDocumentDialog';

const DOC_TYPE_LABELS: Record<string, string> = {
  quote: 'Devis',
  proposal: 'Proposition',
  specification: 'Cahier des charges',
  contract: 'Contrat',
  invoice: 'Facture',
  report: 'Rapport',
  other: 'Autre',
};

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Brouillon', variant: 'secondary' },
  pending: { label: 'En attente', variant: 'outline' },
  approved: { label: 'Approuvé', variant: 'default' },
  sent: { label: 'Envoyé', variant: 'default' },
  signed: { label: 'Signé', variant: 'default' },
  rejected: { label: 'Refusé', variant: 'destructive' },
};

function SharedDocumentsList() {
  const { data: documents, isLoading, error } = usePartnerDocuments();

  if (isLoading) {
    return (
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
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Erreur lors du chargement des documents</p>
        </CardContent>
      </Card>
    );
  }

  if (!documents || documents.length === 0) {
    return (
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
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => {
        const statusInfo = STATUS_LABELS[doc.status] || { label: doc.status, variant: 'outline' as const };
        const docTypeLabel = DOC_TYPE_LABELS[doc.document_type] || doc.document_type;

        return (
          <Card key={doc.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">{doc.title}</h3>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{docTypeLabel}</Badge>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    {doc.role && (
                      <Badge variant="secondary" className="capitalize">
                        {doc.role}
                      </Badge>
                    )}
                  </div>

                  {doc.project && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FolderKanban className="h-4 w-4" />
                      <span>{doc.project.name}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function PartnerDocuments() {
  return (
    <PartnerLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Documents</h1>
            <p className="text-muted-foreground">
              Gérez vos documents et accédez aux ressources partagées
            </p>
          </div>
          <UploadDocumentDialog />
        </div>

        <Tabs defaultValue="personal" className="space-y-4">
          <TabsList>
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Mes documents
            </TabsTrigger>
            <TabsTrigger value="shared" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents partagés
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <PersonalDocumentsList />
          </TabsContent>

          <TabsContent value="shared">
            <SharedDocumentsList />
          </TabsContent>
        </Tabs>
      </div>
    </PartnerLayout>
  );
}
