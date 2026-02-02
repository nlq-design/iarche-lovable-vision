import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Gauge, Building2, AlertTriangle, Shield, Edit2, Plus,
  Loader2, TrendingUp, Coins, Zap, RefreshCw, Bell, BellOff,
  Activity, DollarSign, Clock, CheckCircle, XCircle, BarChart3,
  Users, Settings2, Eye, Trash2, Mail, Send
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

// Types
interface APIUsageMetric {
  id: string;
  created_at: string;
  api_name: string;
  api_category: string;
  provider_name: string;
  workspace_id: string;
  operation_type: string;
  model_id: string | null;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  latency_ms: number | null;
  estimated_cost_cents: number;
  success: boolean;
  error_code: string | null;
}

interface APIQuota {
  id: string;
  workspace_id: string | null;
  user_role: string | null;
  billing_entity_id: string | null;
  api_name: string | null;
  api_category: string | null;
  provider_name: string | null;
  monthly_requests_limit: number | null;
  monthly_tokens_limit: number | null;
  monthly_cost_limit_cents: number | null;
  daily_requests_limit: number | null;
  requests_per_minute: number;
  alert_threshold_warning: number;
  alert_threshold_critical: number;
  block_at_limit: boolean;
  alert_channels: string[];
  alert_emails: string[] | null;
  is_active: boolean;
  priority: number;
}

interface APIQuotaAlert {
  id: string;
  created_at: string;
  workspace_id: string;
  alert_type: string;
  api_name: string | null;
  api_category: string | null;
  current_usage_percent: number;
  metric_type: string;
  acknowledged_at: string | null;
}

interface APIPricing {
  id: string;
  api_name: string;
  provider_name: string;
  model_id: string | null;
  cost_per_request_cents: number;
  cost_per_1k_input_tokens: number | null;
  cost_per_1k_output_tokens: number | null;
  free_tier_requests: number;
  is_active: boolean;
}

interface Workspace {
  id: string;
  name: string;
  type: string;
}

// Category labels
const CATEGORY_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  ai: { label: "Intelligence Artificielle", icon: <Zap className="h-4 w-4" />, color: "text-purple-500" },
  enrichment: { label: "Enrichissement", icon: <TrendingUp className="h-4 w-4" />, color: "text-blue-500" },
  email: { label: "Email Marketing", icon: <Mail className="h-4 w-4" />, color: "text-green-500" },
  calendar: { label: "Calendrier", icon: <Clock className="h-4 w-4" />, color: "text-orange-500" },
  messaging: { label: "Messagerie", icon: <Send className="h-4 w-4" />, color: "text-cyan-500" },
};

// Helpers
const formatTokens = (tokens: number | null | undefined): string => {
  if (!tokens) return "0";
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}k`;
  return tokens.toString();
};

const formatCost = (cents: number | null | undefined): string => {
  if (!cents) return "0€";
  return `${(cents / 100).toFixed(2)}€`;
};

const getStatusBadge = (percent: number, alertThreshold: number = 80, criticalThreshold: number = 95) => {
  if (percent >= 100) return { label: "Bloqué", variant: "destructive" as const, color: "bg-red-500" };
  if (percent >= criticalThreshold) return { label: "Critique", variant: "destructive" as const, color: "bg-red-400" };
  if (percent >= alertThreshold) return { label: "Alerte", variant: "secondary" as const, color: "bg-yellow-500" };
  return { label: "OK", variant: "outline" as const, color: "bg-green-500" };
};

export default function APIGovernanceManager() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [editingQuota, setEditingQuota] = useState<APIQuota | null>(null);
  const [showNewQuotaDialog, setShowNewQuotaDialog] = useState(false);
  const [quotaFormData, setQuotaFormData] = useState({
    scope_type: "workspace",
    scope_value: "",
    api_category: "all",
    monthly_requests_limit: "",
    monthly_tokens_limit: "",
    monthly_cost_limit_cents: "",
    alert_threshold_warning: "80",
    alert_threshold_critical: "95",
    block_at_limit: true,
    alert_channels: ["in_app"],
  });

  // Fetch workspaces
  const { data: workspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name, type")
        .order("name");
      if (error) throw error;
      return data as Workspace[];
    },
  });

  // Fetch usage metrics (current month)
  const { data: usageMetrics, isLoading: loadingUsage, refetch: refetchUsage } = useQuery({
    queryKey: ["api-usage-metrics"],
    queryFn: async () => {
      const monthStart = startOfMonth(new Date()).toISOString();
      const { data, error } = await supabase
        .from("api_usage_metrics")
        .select("*")
        .gte("created_at", monthStart)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data as APIUsageMetric[];
    },
  });

  // Fetch quotas
  const { data: quotas, isLoading: loadingQuotas } = useQuery({
    queryKey: ["api-quotas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_quotas")
        .select("*")
        .order("priority", { ascending: false });
      if (error) throw error;
      return data as APIQuota[];
    },
  });

  // Fetch alerts
  const { data: alerts } = useQuery({
    queryKey: ["api-quota-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_quota_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as APIQuotaAlert[];
    },
  });

  // Fetch pricing
  const { data: pricing } = useQuery({
    queryKey: ["api-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_pricing")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data as APIPricing[];
    },
  });

  // Upsert quota mutation
  const upsertQuotaMutation = useMutation({
    mutationFn: async (data: Partial<APIQuota>) => {
      if (editingQuota) {
        const { error } = await supabase
          .from("api_quotas")
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq("id", editingQuota.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("api_quotas")
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-quotas"] });
      toast.success(editingQuota ? "Quota mis à jour" : "Quota créé");
      setEditingQuota(null);
      setShowNewQuotaDialog(false);
    },
    onError: (error) => {
      console.error("Error saving quota:", error);
      toast.error("Erreur lors de la sauvegarde");
    },
  });

  // Delete quota mutation
  const deleteQuotaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("api_quotas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-quotas"] });
      toast.success("Quota supprimé");
    },
  });

  // Acknowledge alert mutation
  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("api_quota_alerts")
        .update({ acknowledged_at: new Date().toISOString() })
        .eq("id", alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-quota-alerts"] });
      toast.success("Alerte acquittée");
    },
  });

  // Computed stats
  const stats = useMemo(() => {
    if (!usageMetrics) return null;

    const byCategory: Record<string, { requests: number; tokens: number; cost: number; errors: number }> = {};
    const byProvider: Record<string, { requests: number; tokens: number; cost: number }> = {};
    const byAPI: Record<string, { requests: number; tokens: number; cost: number; avgLatency: number }> = {};
    
    let totalRequests = 0;
    let totalTokens = 0;
    let totalCost = 0;
    let totalErrors = 0;
    let totalLatency = 0;
    let latencyCount = 0;

    usageMetrics.forEach((m) => {
      totalRequests++;
      totalTokens += m.total_tokens || 0;
      totalCost += m.estimated_cost_cents || 0;
      if (!m.success) totalErrors++;
      if (m.latency_ms) {
        totalLatency += m.latency_ms;
        latencyCount++;
      }

      // By category
      if (!byCategory[m.api_category]) {
        byCategory[m.api_category] = { requests: 0, tokens: 0, cost: 0, errors: 0 };
      }
      byCategory[m.api_category].requests++;
      byCategory[m.api_category].tokens += m.total_tokens || 0;
      byCategory[m.api_category].cost += m.estimated_cost_cents || 0;
      if (!m.success) byCategory[m.api_category].errors++;

      // By provider
      if (!byProvider[m.provider_name]) {
        byProvider[m.provider_name] = { requests: 0, tokens: 0, cost: 0 };
      }
      byProvider[m.provider_name].requests++;
      byProvider[m.provider_name].tokens += m.total_tokens || 0;
      byProvider[m.provider_name].cost += m.estimated_cost_cents || 0;

      // By API
      if (!byAPI[m.api_name]) {
        byAPI[m.api_name] = { requests: 0, tokens: 0, cost: 0, avgLatency: 0 };
      }
      byAPI[m.api_name].requests++;
      byAPI[m.api_name].tokens += m.total_tokens || 0;
      byAPI[m.api_name].cost += m.estimated_cost_cents || 0;
    });

    // Calculate avg latency per API
    Object.keys(byAPI).forEach((api) => {
      const apiMetrics = usageMetrics.filter((m) => m.api_name === api && m.latency_ms);
      if (apiMetrics.length > 0) {
        byAPI[api].avgLatency = Math.round(
          apiMetrics.reduce((acc, m) => acc + (m.latency_ms || 0), 0) / apiMetrics.length
        );
      }
    });

    return {
      totalRequests,
      totalTokens,
      totalCost,
      totalErrors,
      successRate: totalRequests > 0 ? Math.round(((totalRequests - totalErrors) / totalRequests) * 100) : 100,
      avgLatency: latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0,
      byCategory,
      byProvider,
      byAPI,
    };
  }, [usageMetrics]);

  const unacknowledgedAlerts = alerts?.filter((a) => !a.acknowledged_at) || [];

  const isLoading = loadingUsage || loadingQuotas;

  const handleSaveQuota = () => {
    const data: Partial<APIQuota> = {
      monthly_requests_limit: quotaFormData.monthly_requests_limit ? parseInt(quotaFormData.monthly_requests_limit) : null,
      monthly_tokens_limit: quotaFormData.monthly_tokens_limit ? parseInt(quotaFormData.monthly_tokens_limit) : null,
      monthly_cost_limit_cents: quotaFormData.monthly_cost_limit_cents ? parseInt(quotaFormData.monthly_cost_limit_cents) : null,
      alert_threshold_warning: parseInt(quotaFormData.alert_threshold_warning),
      alert_threshold_critical: parseInt(quotaFormData.alert_threshold_critical),
      block_at_limit: quotaFormData.block_at_limit,
      alert_channels: quotaFormData.alert_channels,
      api_category: quotaFormData.api_category === "all" ? null : quotaFormData.api_category,
      is_active: true,
    };

    // Set scope based on type
    if (quotaFormData.scope_type === "workspace" && quotaFormData.scope_value) {
      data.workspace_id = quotaFormData.scope_value;
    } else if (quotaFormData.scope_type === "role" && quotaFormData.scope_value) {
      data.user_role = quotaFormData.scope_value;
    }

    upsertQuotaMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header with alerts indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            Gouvernance API
          </h2>
          <p className="text-sm text-muted-foreground">
            Consommation, quotas et alertes pour toutes les APIs
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unacknowledgedAlerts.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <Bell className="h-3 w-3" />
              {unacknowledgedAlerts.length} alerte{unacknowledgedAlerts.length > 1 ? "s" : ""}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => refetchUsage()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="quotas">Quotas</TabsTrigger>
          <TabsTrigger value="alerts">
            Alertes
            {unacknowledgedAlerts.length > 0 && (
              <span className="ml-1 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5">
                {unacknowledgedAlerts.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pricing">Tarification</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          {/* Global Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalRequests.toLocaleString() || 0}</p>
                    <p className="text-xs text-muted-foreground">Requêtes ce mois</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Zap className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatTokens(stats?.totalTokens)}</p>
                    <p className="text-xs text-muted-foreground">Tokens</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <DollarSign className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCost(stats?.totalCost)}</p>
                    <p className="text-xs text-muted-foreground">Coût estimé</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Clock className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.avgLatency || 0}ms</p>
                    <p className="text-xs text-muted-foreground">Latence moy.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.successRate || 100}%</p>
                    <p className="text-xs text-muted-foreground">Taux succès</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <XCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalErrors || 0}</p>
                    <p className="text-xs text-muted-foreground">Erreurs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage by Category */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Par Catégorie</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats?.byCategory || {}).map(([category, data]) => {
                    const config = CATEGORY_LABELS[category] || { label: category, icon: <Activity className="h-4 w-4" />, color: "text-gray-500" };
                    return (
                      <div key={category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={config.color}>{config.icon}</span>
                          <span className="font-medium">{config.label}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span>{data.requests.toLocaleString()} req</span>
                          <span className="text-muted-foreground">{formatTokens(data.tokens)} tok</span>
                          <Badge variant="secondary">{formatCost(data.cost)}</Badge>
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(stats?.byCategory || {}).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée ce mois</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top APIs</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {Object.entries(stats?.byAPI || {})
                      .sort((a, b) => b[1].requests - a[1].requests)
                      .slice(0, 10)
                      .map(([api, data]) => (
                        <div key={api} className="flex items-center justify-between text-sm">
                          <span className="font-mono text-xs truncate max-w-[180px]">{api}</span>
                          <div className="flex items-center gap-3">
                            <span>{data.requests} req</span>
                            <span className="text-muted-foreground">{data.avgLatency}ms</span>
                            <Badge variant="outline">{formatCost(data.cost)}</Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* QUOTAS TAB */}
        <TabsContent value="quotas" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Gérez les limites par workspace, rôle ou catégorie d'API
            </p>
            <Button onClick={() => setShowNewQuotaDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau quota
            </Button>
          </div>

          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scope</TableHead>
                    <TableHead>Catégorie API</TableHead>
                    <TableHead>Requêtes/mois</TableHead>
                    <TableHead>Tokens/mois</TableHead>
                    <TableHead>Coût/mois</TableHead>
                    <TableHead>Seuils</TableHead>
                    <TableHead>Blocage</TableHead>
                    <TableHead>Alertes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotas?.map((quota) => {
                    const scopeLabel = quota.workspace_id
                      ? workspaces?.find((w) => w.id === quota.workspace_id)?.name || "Workspace"
                      : quota.user_role
                      ? `Rôle: ${quota.user_role}`
                      : "Global";
                    
                    return (
                      <TableRow key={quota.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {quota.workspace_id ? (
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Users className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-medium">{scopeLabel}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {quota.api_category ? (
                            <Badge variant="outline">{CATEGORY_LABELS[quota.api_category]?.label || quota.api_category}</Badge>
                          ) : (
                            <span className="text-muted-foreground">Toutes</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {quota.monthly_requests_limit?.toLocaleString() || "∞"}
                        </TableCell>
                        <TableCell>
                          {quota.monthly_tokens_limit ? formatTokens(quota.monthly_tokens_limit) : "∞"}
                        </TableCell>
                        <TableCell>
                          {quota.monthly_cost_limit_cents ? formatCost(quota.monthly_cost_limit_cents) : "∞"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Badge variant="secondary" className="text-xs">{quota.alert_threshold_warning}%</Badge>
                            <Badge variant="destructive" className="text-xs">{quota.alert_threshold_critical}%</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {quota.block_at_limit ? (
                            <Badge variant="destructive" className="gap-1">
                              <Shield className="h-3 w-3" />
                              Strict
                            </Badge>
                          ) : (
                            <Badge variant="outline">Souple</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {quota.alert_channels.includes("in_app") && <Eye className="h-4 w-4 text-muted-foreground" />}
                            {quota.alert_channels.includes("email") && <Mail className="h-4 w-4 text-blue-500" />}
                            {quota.alert_channels.includes("telegram") && <Send className="h-4 w-4 text-cyan-500" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingQuota(quota);
                                setQuotaFormData({
                                  scope_type: quota.workspace_id ? "workspace" : "role",
                                  scope_value: quota.workspace_id || quota.user_role || "",
                                  api_category: quota.api_category || "all",
                                  monthly_requests_limit: quota.monthly_requests_limit?.toString() || "",
                                  monthly_tokens_limit: quota.monthly_tokens_limit?.toString() || "",
                                  monthly_cost_limit_cents: quota.monthly_cost_limit_cents?.toString() || "",
                                  alert_threshold_warning: quota.alert_threshold_warning.toString(),
                                  alert_threshold_critical: quota.alert_threshold_critical.toString(),
                                  block_at_limit: quota.block_at_limit,
                                  alert_channels: quota.alert_channels,
                                });
                                setShowNewQuotaDialog(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Supprimer ce quota ?")) {
                                  deleteQuotaMutation.mutate(quota.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!quotas || quotas.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Aucun quota configuré
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ALERTS TAB */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Historique des alertes
              </CardTitle>
              <CardDescription>
                Alertes déclenchées lors du dépassement des seuils
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>API/Catégorie</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Métrique</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts?.map((alert) => (
                      <TableRow key={alert.id} className={!alert.acknowledged_at ? "bg-destructive/5" : ""}>
                        <TableCell className="text-sm">
                          {format(new Date(alert.created_at), "dd MMM HH:mm", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              alert.alert_type === "blocked"
                                ? "destructive"
                                : alert.alert_type === "critical"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {alert.alert_type === "blocked" ? "Bloqué" : alert.alert_type === "critical" ? "Critique" : "Warning"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {alert.api_name || alert.api_category || "Global"}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{alert.current_usage_percent}%</span>
                        </TableCell>
                        <TableCell className="capitalize">{alert.metric_type}</TableCell>
                        <TableCell>
                          {alert.acknowledged_at ? (
                            <Badge variant="outline" className="gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Acquitté
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Actif
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!alert.acknowledged_at && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                            >
                              <BellOff className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!alerts || alerts.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          Aucune alerte
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRICING TAB */}
        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Grille tarifaire
              </CardTitle>
              <CardDescription>
                Coûts de référence pour le calcul des dépenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>API</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Modèle</TableHead>
                    <TableHead>Coût/requête</TableHead>
                    <TableHead>Coût/1k tokens (in)</TableHead>
                    <TableHead>Coût/1k tokens (out)</TableHead>
                    <TableHead>Forfait inclus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pricing?.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-sm">{p.api_name}</TableCell>
                      <TableCell>{p.provider_name}</TableCell>
                      <TableCell>{p.model_id || "-"}</TableCell>
                      <TableCell>
                        {p.cost_per_request_cents > 0 ? `${p.cost_per_request_cents}¢` : "-"}
                      </TableCell>
                      <TableCell>
                        {p.cost_per_1k_input_tokens ? `${p.cost_per_1k_input_tokens}¢` : "-"}
                      </TableCell>
                      <TableCell>
                        {p.cost_per_1k_output_tokens ? `${p.cost_per_1k_output_tokens}¢` : "-"}
                      </TableCell>
                      <TableCell>
                        {p.free_tier_requests > 0 ? `${p.free_tier_requests} req` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quota Dialog */}
      <Dialog open={showNewQuotaDialog} onOpenChange={(open) => {
        setShowNewQuotaDialog(open);
        if (!open) setEditingQuota(null);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingQuota ? "Modifier le quota" : "Nouveau quota"}</DialogTitle>
            <DialogDescription>
              Définissez les limites et seuils d'alerte
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de scope</Label>
                <Select
                  value={quotaFormData.scope_type}
                  onValueChange={(v) => setQuotaFormData({ ...quotaFormData, scope_type: v, scope_value: "" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workspace">Workspace</SelectItem>
                    <SelectItem value="role">Rôle utilisateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valeur</Label>
                {quotaFormData.scope_type === "workspace" ? (
                  <Select
                    value={quotaFormData.scope_value}
                    onValueChange={(v) => setQuotaFormData({ ...quotaFormData, scope_value: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces?.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={quotaFormData.scope_value}
                    onValueChange={(v) => setQuotaFormData({ ...quotaFormData, scope_value: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="partner">Partner</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Catégorie d'API</Label>
              <Select
                value={quotaFormData.api_category}
                onValueChange={(v) => setQuotaFormData({ ...quotaFormData, api_category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les APIs</SelectItem>
                  <SelectItem value="ai">IA uniquement</SelectItem>
                  <SelectItem value="enrichment">Enrichissement</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Requêtes/mois</Label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={quotaFormData.monthly_requests_limit}
                  onChange={(e) => setQuotaFormData({ ...quotaFormData, monthly_requests_limit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tokens/mois</Label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={quotaFormData.monthly_tokens_limit}
                  onChange={(e) => setQuotaFormData({ ...quotaFormData, monthly_tokens_limit: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Coût max (cents)</Label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={quotaFormData.monthly_cost_limit_cents}
                  onChange={(e) => setQuotaFormData({ ...quotaFormData, monthly_cost_limit_cents: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Seuil warning (%)</Label>
                <Input
                  type="number"
                  value={quotaFormData.alert_threshold_warning}
                  onChange={(e) => setQuotaFormData({ ...quotaFormData, alert_threshold_warning: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Seuil critique (%)</Label>
                <Input
                  type="number"
                  value={quotaFormData.alert_threshold_critical}
                  onChange={(e) => setQuotaFormData({ ...quotaFormData, alert_threshold_critical: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Bloquer à la limite</Label>
              <Switch
                checked={quotaFormData.block_at_limit}
                onCheckedChange={(v) => setQuotaFormData({ ...quotaFormData, block_at_limit: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewQuotaDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveQuota} disabled={upsertQuotaMutation.isPending}>
              {upsertQuotaMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingQuota ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
