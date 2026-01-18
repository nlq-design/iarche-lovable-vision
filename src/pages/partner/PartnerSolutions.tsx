import { useState } from 'react';
import { PartnerLayout } from '@/components/partner/PartnerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Lightbulb, Calendar, ExternalLink, Search, UserPlus, Tag } from 'lucide-react';
import { usePartnerSolutions, PartnerSolution } from '@/hooks/partner/usePartnerSolutions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { SolutionInterestDialog } from '@/components/partner/SolutionInterestDialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export default function PartnerSolutions() {
  const { data: solutions, isLoading, error } = usePartnerSolutions();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSolution, setSelectedSolution] = useState<PartnerSolution | null>(null);
  const [interestDialog, setInterestDialog] = useState<{ open: boolean; solutionId: string; title: string }>({
    open: false,
    solutionId: '',
    title: '',
  });

  // Filter solutions by search
  const filteredSolutions = solutions?.filter((solution) => {
    const query = searchQuery.toLowerCase();
    return (
      solution.title.toLowerCase().includes(query) ||
      solution.excerpt?.toLowerCase().includes(query) ||
      solution.tags?.some(tag => tag.toLowerCase().includes(query)) ||
      solution.thematiques?.some(t => t.toLowerCase().includes(query))
    );
  });

  const openInterestDialog = (solution: PartnerSolution) => {
    setInterestDialog({ open: true, solutionId: solution.id, title: solution.title });
  };

  return (
    <PartnerLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Lightbulb className="h-6 w-6" />
              Solutions
            </h1>
            <p className="text-muted-foreground">
              Offres et solutions auxquelles vous êtes associé
            </p>
          </div>
          
          {solutions && solutions.length > 0 && (
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-0">
                  <Skeleton className="h-32 w-full rounded-t-lg" />
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
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
        ) : !filteredSolutions || filteredSolutions.length === 0 ? (
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
                <p className="text-lg font-medium">
                  {searchQuery ? 'Aucune solution trouvée' : 'Aucune solution liée pour le moment'}
                </p>
                <p className="text-sm max-w-md">
                  {searchQuery
                    ? 'Essayez avec d\'autres termes de recherche.'
                    : 'Les solutions sur lesquelles vous intervenez apparaîtront ici.'}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSolutions.map((solution) => (
              <Card
                key={solution.id}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => setSelectedSolution(solution as PartnerSolution)}
              >
                <CardContent className="p-0">
                  {solution.cover_image_url ? (
                    <div className="h-32 overflow-hidden rounded-t-lg">
                      <img 
                        src={solution.cover_image_url} 
                        alt={solution.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="h-32 bg-muted rounded-t-lg flex items-center justify-center">
                      <Lightbulb className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold line-clamp-2">{solution.title}</h3>
                      <Badge variant={solution.published ? 'default' : 'secondary'} className="shrink-0">
                        {solution.published ? 'Publié' : 'Brouillon'}
                      </Badge>
                    </div>
                    
                    {solution.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {solution.excerpt}
                      </p>
                    )}

                    {solution.tags && solution.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {solution.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="h-2.5 w-2.5 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                        {solution.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{solution.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(solution.created_at), 'dd MMM yyyy', { locale: fr })}
                      </span>
                      {solution.role && (
                        <Badge variant="outline" className="capitalize text-xs">
                          {solution.role}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Solution Detail Sheet */}
      <Sheet open={!!selectedSolution} onOpenChange={(open) => !open && setSelectedSolution(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedSolution && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedSolution.title}</SheetTitle>
                <SheetDescription>
                  {selectedSolution.role && (
                    <Badge variant="outline" className="capitalize mt-1">
                      Rôle: {selectedSolution.role}
                    </Badge>
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {selectedSolution.cover_image_url && (
                  <img
                    src={selectedSolution.cover_image_url}
                    alt={selectedSolution.title}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}

                {selectedSolution.excerpt && (
                  <div>
                    <h4 className="font-medium mb-2">Résumé</h4>
                    <p className="text-sm text-muted-foreground">{selectedSolution.excerpt}</p>
                  </div>
                )}

                {selectedSolution.tags && selectedSolution.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSolution.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSolution.thematiques && selectedSolution.thematiques.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Thématiques</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSolution.thematiques.map((theme) => (
                        <Badge key={theme} variant="outline">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-4">
                  <Button onClick={() => openInterestDialog(selectedSolution)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Signaler un intérêt client
                  </Button>
                  {selectedSolution.published && (
                    <Button variant="outline" asChild>
                      <a
                        href={`/solutions/${selectedSolution.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Voir la page publique
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Interest Dialog */}
      <SolutionInterestDialog
        open={interestDialog.open}
        onOpenChange={(open) => setInterestDialog((prev) => ({ ...prev, open }))}
        solutionId={interestDialog.solutionId}
        solutionTitle={interestDialog.title}
      />
    </PartnerLayout>
  );
}
