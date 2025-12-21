import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CockpitSpecifications = () => {
  const statusCards = [
    { label: "Brouillons", value: 0, icon: Clock, color: "text-muted-foreground" },
    { label: "En revue", value: 0, icon: AlertCircle, color: "text-amber-600" },
    { label: "Approuvés", value: 0, icon: CheckCircle2, color: "text-green-600" },
  ];

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
                    <p className="text-2xl font-bold">{stat.value}</p>
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
            <Badge variant="secondary">0 documents</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Aucun cahier des charges</p>
              <p className="text-sm text-center">Créez votre premier CDC pour un projet</p>
              <Button className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Créer un CDC
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Generation Info */}
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium mb-1">Génération IA</h3>
                <p className="text-sm text-muted-foreground">
                  Les cahiers des charges peuvent être générés automatiquement par l'IA 
                  à partir des notes de réunion et des informations projet.
                </p>
                <Badge variant="outline" className="mt-2">Niveau N1 - Brouillon IA</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CockpitLayout>
  );
};

export default CockpitSpecifications;
