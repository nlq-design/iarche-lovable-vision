import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Clock, CheckCircle2, AlertCircle, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const CockpitProjects = () => {
  const projectStats = [
    { label: "En cours", value: 0, icon: Clock, color: "text-blue-600" },
    { label: "Terminés", value: 0, icon: CheckCircle2, color: "text-green-600" },
    { label: "En pause", value: 0, icon: PauseCircle, color: "text-amber-600" },
    { label: "À risque", value: 0, icon: AlertCircle, color: "text-red-600" },
  ];

  return (
    <CockpitLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projets</h1>
            <p className="text-muted-foreground">Suivi de vos projets clients</p>
          </div>
          <Button size="sm">
            + Nouveau projet
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {projectStats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Active Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Projets actifs</CardTitle>
            <Badge variant="secondary">0 projets</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <FolderKanban className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucun projet en cours</p>
              <p className="text-sm">Créez votre premier projet pour commencer</p>
              <Button className="mt-4">
                Créer un projet
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Budget Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Budget global</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Consommé</span>
                  <span className="font-medium">0 € / 0 €</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
              <p className="text-xs text-muted-foreground">
                Aucun budget alloué
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Échéances proches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
                <Clock className="h-6 w-6 mb-2 opacity-50" />
                <p className="text-sm">Aucune échéance à venir</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CockpitLayout>
  );
};

export default CockpitProjects;
