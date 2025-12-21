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
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground">Tableaux de bord et KPIs</p>
          </div>
          <div className="flex gap-2">
            <Select defaultValue="30d">
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 derniers jours</SelectItem>
                <SelectItem value="30d">30 derniers jours</SelectItem>
                <SelectItem value="90d">90 derniers jours</SelectItem>
                <SelectItem value="12m">12 derniers mois</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 text-sm">
              Exporter
            </Button>
          </div>
        </div>

        {/* KPI inline stats */}
        <div className="flex items-center gap-6 p-3 bg-muted/40 rounded-lg border text-sm flex-wrap">
          {kpis.map((kpi, idx) => (
            <div key={kpi.label} className="flex items-center gap-2">
              {idx > 0 && <div className="h-4 w-px bg-border -ml-4 mr-2 hidden sm:block" />}
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{kpi.label}</span>
              {isLoading ? (
                <Skeleton className="h-5 w-12" />
              ) : (
                <span className="font-semibold">{kpi.value}</span>
              )}
              {kpi.change && kpi.trend !== "neutral" && (
                <span className={`text-xs ${kpi.trend === "up" ? "text-emerald-600" : "text-red-500"}`}>
                  {kpi.change}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pipeline par étape</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-56 w-full" />
              ) : pipelineData.some(d => d.count > 0) ? (
                <ResponsiveContainer width="100%" height={224}>
                  <BarChart data={pipelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
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
                <div className="flex flex-col items-center justify-center h-56 text-muted-foreground border border-dashed rounded-lg">
                  <BarChart3 className="h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">Aucune donnée</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Projets par statut
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-56 w-full" />
              ) : projectData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie
                        data={projectData}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={70}
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
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                        <span className="font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-56 text-muted-foreground border border-dashed rounded-lg">
                  <Briefcase className="h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">Aucun projet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <Card className="bg-muted/30 border">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between text-sm flex-wrap gap-4">
              <div className="flex items-center gap-5">
                <div>
                  <span className="text-muted-foreground text-xs">Pipeline pondéré</span>
                  <p className="font-semibold">{opportunityStats.weightedValue.toLocaleString("fr-FR")} €</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <span className="text-muted-foreground text-xs">Budget projets</span>
                  <p className="font-semibold">{projectStats.totalBudget.toLocaleString("fr-FR")} €</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <span className="text-muted-foreground text-xs">Consommé</span>
                  <p className="font-semibold">{projectStats.consumedBudget.toLocaleString("fr-FR")} €</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CockpitLayout>
  );
};

export default CockpitAnalytics;
