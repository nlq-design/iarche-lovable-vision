import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, TrendingDown, Target, Euro, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CockpitAnalytics = () => {
  const kpis = [
    { label: "CA Total", value: "0 €", change: "+0%", trend: "up", icon: Euro },
    { label: "Leads générés", value: "0", change: "+0%", trend: "neutral", icon: Users },
    { label: "Taux conversion", value: "0%", change: "+0%", trend: "neutral", icon: Target },
    { label: "RDV réalisés", value: "0", change: "+0%", trend: "neutral", icon: Calendar },
  ];

  return (
    <CockpitLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
            <p className="text-muted-foreground">Tableaux de bord et KPIs commerciaux</p>
          </div>
          <div className="flex gap-2">
            <Select defaultValue="30d">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 derniers jours</SelectItem>
                <SelectItem value="30d">30 derniers jours</SelectItem>
                <SelectItem value="90d">90 derniers jours</SelectItem>
                <SelectItem value="12m">12 derniers mois</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              Exporter
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {kpi.trend === "up" ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : kpi.trend === "down" ? (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      ) : null}
                      <span className={`text-xs ${
                        kpi.trend === "up" ? "text-green-600" : 
                        kpi.trend === "down" ? "text-red-600" : 
                        "text-muted-foreground"
                      }`}>
                        {kpi.change}
                      </span>
                    </div>
                  </div>
                  <kpi.icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Évolution du CA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg">
                <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm font-medium">Graphique à venir</p>
                <p className="text-xs">Les données s'afficheront ici</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pipeline par étape</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg">
                <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm font-medium">Graphique à venir</p>
                <p className="text-xs">Les données s'afficheront ici</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <p className="text-sm">Aucune activité récente</p>
              <p className="text-xs">Les actions seront tracées ici</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </CockpitLayout>
  );
};

export default CockpitAnalytics;
