import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, TrendingDown, Target, Euro, Users, Calendar, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCockpitLeads, useCockpitOpportunities, useCockpitProjects, useCockpitBookings } from "@/hooks/cockpit";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const CockpitAnalytics = () => {
  const { stats: leadStats, isLoading: loadingLeads } = useCockpitLeads();
  const { stats: opportunityStats, isLoading: loadingOpportunities, PIPELINE_STAGES } = useCockpitOpportunities();
  const { stats: projectStats, isLoading: loadingProjects } = useCockpitProjects();
  const { stats: bookingStats, isLoading: loadingBookings } = useCockpitBookings();

  const isLoading = loadingLeads || loadingOpportunities || loadingProjects || loadingBookings;

  const kpis = [
    { 
      label: "Pipeline Total", 
      value: opportunityStats.totalValue.toLocaleString("fr-FR") + " €", 
      change: "+0%", 
      trend: "neutral", 
      icon: Euro 
    },
    { 
      label: "Leads générés", 
      value: leadStats.total.toString(), 
      change: `${leadStats.new} nouveaux`, 
      trend: leadStats.new > 0 ? "up" : "neutral", 
      icon: Users 
    },
    { 
      label: "Taux conversion", 
      value: leadStats.total > 0 
        ? Math.round((leadStats.converted / leadStats.total) * 100) + "%" 
        : "0%", 
      change: "", 
      trend: "neutral", 
      icon: Target 
    },
    { 
      label: "RDV à venir", 
      value: bookingStats.upcoming.toString(), 
      change: `${bookingStats.thisWeek} cette semaine`, 
      trend: bookingStats.upcoming > 0 ? "up" : "neutral", 
      icon: Calendar 
    },
  ];

  // Pipeline data for chart
  const pipelineData = PIPELINE_STAGES.map(stage => ({
    name: stage.charAt(0).toUpperCase() + stage.slice(1).replace("_", " "),
    count: opportunityStats.byStage[stage]?.count || 0,
    value: opportunityStats.byStage[stage]?.value || 0,
  }));

  // Project status data for pie chart
  const projectData = [
    { name: "Actifs", value: projectStats.active, color: "#22c55e" },
    { name: "Terminés", value: projectStats.completed, color: "#3b82f6" },
    { name: "En pause", value: projectStats.onHold, color: "#94a3b8" },
    { name: "À risque", value: projectStats.atRisk, color: "#ef4444" },
  ].filter(d => d.value > 0);

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
                    {isLoading ? (
                      <Skeleton className="h-8 w-20 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                    )}
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

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pipeline par étape</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : pipelineData.some(d => d.count > 0) ? (
                <ResponsiveContainer width="100%" height={264}>
                  <BarChart data={pipelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === "count" ? `${value} opportunités` : `${value.toLocaleString("fr-FR")} €`,
                        name === "count" ? "Nombre" : "Valeur"
                      ]}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg">
                  <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm font-medium">Aucune donnée</p>
                  <p className="text-xs">Créez des opportunités pour voir le graphique</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Projets par statut
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : projectData.length > 0 ? (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie
                        data={projectData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {projectData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {projectData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">{item.name}</span>
                        <span className="text-sm font-bold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Briefcase className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm font-medium">Aucun projet</p>
                  <p className="text-xs">Créez des projets pour voir le graphique</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pipeline pondéré</p>
                  <p className="text-xl font-bold">
                    {opportunityStats.weightedValue.toLocaleString("fr-FR")} €
                  </p>
                </div>
                <Target className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Budget projets total</p>
                  <p className="text-xl font-bold">
                    {projectStats.totalBudget.toLocaleString("fr-FR")} €
                  </p>
                </div>
                <Euro className="h-8 w-8 text-green-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Budget consommé</p>
                  <p className="text-xl font-bold">
                    {projectStats.consumedBudget.toLocaleString("fr-FR")} €
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-amber-600 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </CockpitLayout>
  );
};

export default CockpitAnalytics;
