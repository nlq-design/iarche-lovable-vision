import { PartnerLayout } from '@/components/partner/PartnerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, Calendar, ExternalLink } from 'lucide-react';
import { usePartnerSolutions } from '@/hooks/partner/usePartnerSolutions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

export default function PartnerSolutions() {
  const { data: solutions, isLoading, error } = usePartnerSolutions();

  return (
    <PartnerLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Solutions</h1>
          <p className="text-muted-foreground">
            Offres et solutions auxquelles vous êtes associé
          </p>
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
              <p className="text-destructive">Erreur lors du chargement des solutions</p>
            </CardContent>
          </Card>
        ) : !solutions || solutions.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Solutions associées</CardTitle>
              <CardDescription>
                Les solutions et offres auxquelles vous contribuez
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <Lightbulb className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Aucune solution liée pour le moment</p>
                <p className="text-sm max-w-md">
                  Les solutions sur lesquelles vous intervenez apparaîtront ici.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {solutions.map((solution) => (
              <Card key={solution.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  {solution.cover_image_url && (
                    <div className="h-32 overflow-hidden rounded-t-lg">
                      <img 
                        src={solution.cover_image_url} 
                        alt={solution.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-lg line-clamp-2">{solution.title}</h3>
                      <Badge variant={solution.published ? 'default' : 'secondary'}>
                        {solution.published ? 'Publié' : 'Brouillon'}
                      </Badge>
                    </div>
                    
                    {solution.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {solution.excerpt}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                      <div className="flex items-center gap-2">
                        {solution.role && (
                          <Badge variant="outline" className="capitalize">
                            {solution.role}
                          </Badge>
                        )}
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(solution.created_at), 'dd MMM yyyy', { locale: fr })}
                        </span>
                      </div>
                      
                      {solution.published && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          asChild
                        >
                          <a 
                            href={`/solutions/${solution.slug}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Voir
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PartnerLayout>
  );
}
