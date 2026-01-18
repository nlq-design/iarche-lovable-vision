import { PartnerLayout } from '@/components/partner/PartnerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderKanban } from 'lucide-react';
import { usePartnerProjects } from '@/hooks/partner/usePartnerProjects';
import { CreatePartnerProjectDialog } from '@/components/partner/dialogs/CreatePartnerProjectDialog';
import { ProjectCard } from '@/components/partner/cards/ProjectCard';

export default function PartnerMissions() {
  const { data: projects, isLoading, error } = usePartnerProjects();

  return (
    <PartnerLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mes Missions</h1>
            <p className="text-muted-foreground">
              Projets auxquels vous êtes assigné
            </p>
          </div>
          <CreatePartnerProjectDialog />
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
              <p className="text-destructive">Erreur lors du chargement des missions</p>
            </CardContent>
          </Card>
        ) : !projects || projects.length === 0 ? (
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
                <p className="text-sm max-w-md mb-4">
                  Créez votre premier projet ou attendez qu'on vous en assigne.
                </p>
                <CreatePartnerProjectDialog />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </PartnerLayout>
  );
}
