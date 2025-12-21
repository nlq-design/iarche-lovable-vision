import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ArrowRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

const CockpitPipeline = () => {
  return (
    <CockpitLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pipeline Commercial</h1>
            <p className="text-muted-foreground">Gérez vos opportunités par étape</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtrer
            </Button>
            <Button size="sm">
              + Nouvelle opportunité
            </Button>
          </div>
        </div>

        {/* Pipeline Kanban Placeholder */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {["Qualification", "Proposition", "Négociation", "Closing"].map((stage, index) => (
            <Card key={stage} className="min-h-[400px]">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>{stage}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    0
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Aucune opportunité</p>
                  <p className="text-xs">Glissez-déposez pour organiser</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">Total pipeline :</span>
                <span className="font-semibold">0 €</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">Pondéré :</span>
                <span className="font-semibold">0 €</span>
              </div>
              <Button variant="ghost" size="sm">
                Voir les analytics <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </CockpitLayout>
  );
};

export default CockpitPipeline;
