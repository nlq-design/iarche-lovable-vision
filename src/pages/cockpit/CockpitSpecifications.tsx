import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, CheckCircle2, Clock, AlertCircle, Sparkles, ExternalLink, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCockpitSpecifications } from "@/hooks/cockpit";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const CockpitSpecifications = () => {
  const { specifications, isLoading, stats } = useCockpitSpecifications();

  const statusCards = [
    { label: "Brouillons", value: stats.draft, icon: Clock, color: "text-muted-foreground" },
    { label: "En revue", value: stats.inReview, icon: AlertCircle, color: "text-amber-600" },
    { label: "Approuvés", value: stats.approved, icon: CheckCircle2, color: "text-green-600" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Brouillon</Badge>;
      case "in_review":
        return <Badge className="bg-amber-100 text-amber-800">En revue</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approuvé</Badge>;
      case "archived":
        return <Badge variant="outline">Archivé</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <CockpitLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cahiers des charges</h1>
            <p className="text-muted-foreground">Spécifications et documentation projet</p>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau CDC
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statusCards.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{isLoading ? "-" : stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Specifications List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Tous les cahiers des charges</CardTitle>
            <Badge variant="secondary">{specifications.length} document{specifications.length !== 1 ? "s" : ""}</Badge>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : specifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Aucun cahier des charges</p>
                <p className="text-sm text-center">Créez votre premier CDC pour un projet</p>
                <Button className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un CDC
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {specifications.map((spec) => (
                  <div
                    key={spec.id}
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{spec.title}</h3>
                            {spec.ai_generated && (
                              <Badge variant="outline" className="gap-1">
                                <Sparkles className="h-3 w-3" />
                                IA
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {spec.project && (
                              <span className="flex items-center gap-1">
                                <FolderOpen className="h-3 w-3" />
                                {(spec.project as any).name}
                              </span>
                            )}
                            {spec.version && (
                              <span>v{spec.version}</span>
                            )}
                            <span>
                              Modifié {format(new Date(spec.updated_at!), "d MMM yyyy", { locale: fr })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(spec.status)}
                        <Button variant="ghost" size="icon">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Generation Info */}
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-1">Génération IA</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Les cahiers des charges peuvent être générés automatiquement par l'IA 
                  à partir des notes de réunion et des informations projet.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Niveau N1 - Brouillon IA</Badge>
                  <Badge variant="outline">Niveau N2 - Revue humaine</Badge>
                  <Badge variant="outline">Niveau N3 - Approuvé</Badge>
                </div>
                {stats.aiGenerated > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {stats.aiGenerated} document{stats.aiGenerated !== 1 ? "s" : ""} généré{stats.aiGenerated !== 1 ? "s" : ""} par IA
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CockpitLayout>
  );
};

export default CockpitSpecifications;
