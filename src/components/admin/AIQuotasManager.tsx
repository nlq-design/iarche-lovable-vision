import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { toast } from "sonner";
import {
  Gauge, Building2, AlertTriangle, Shield, Edit2, Plus,
  Loader2, TrendingUp, Coins, Zap, RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Workspace {
  id: string;
  name: string;
  type: string;
}

interface WorkspaceQuota {
  id: string;
  workspace_id: string;
  monthly_token_limit: number | null;
  monthly_cost_limit_cents: number | null;
  alert_threshold_percent: number | null;
  hard_limit_enabled: boolean | null;
  current_period_start: string | null;
  created_at: string;
  updated_at: string;
}

interface WorkspaceUsage {
  id: string;
  workspace_id: string;
  total_tokens: number | null;
  total_cost_cents: number | null;
  request_count: number | null;
  period_start: string;
  period_end: string;
}

interface QuotaFormData {
  monthly_token_limit: string;
  monthly_cost_limit_cents: string;
  alert_threshold_percent: string;
  hard_limit_enabled: boolean;
}

export default function AIQuotasManager() {
  const queryClient = useQueryClient();
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [formData, setFormData] = useState<QuotaFormData>({
    monthly_token_limit: "",
    monthly_cost_limit_cents: "",
    alert_threshold_percent: "80",
    hard_limit_enabled: true,
  });

  // Fetch workspaces
  const { data: workspaces, isLoading: loadingWorkspaces } = useQuery({
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

  // Fetch quotas
  const { data: quotas, isLoading: loadingQuotas } = useQuery({
    queryKey: ["workspace-ai-quotas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspace_ai_quotas")
        .select("*");
      if (error) throw error;
      return data as WorkspaceQuota[];
    },
  });

  // Fetch current usage
  const { data: usage, isLoading: loadingUsage, refetch: refetchUsage } = useQuery({
    queryKey: ["workspace-ai-usage"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("workspace_ai_usage")
        .select("*")
        .lte("period_start", today)
        .gte("period_end", today);
      if (error) throw error;
      return data as WorkspaceUsage[];
    },
  });

  // Upsert quota mutation
  const upsertQuotaMutation = useMutation({
    mutationFn: async ({
      workspace_id,
      data,
    }: {
      workspace_id: string;
      data: Partial<WorkspaceQuota>;
    }) => {
      const existing = quotas?.find((q) => q.workspace_id === workspace_id);
      
      if (existing) {
        const { error } = await supabase
          .from("workspace_ai_quotas")
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workspace_ai_quotas")
          .insert({
            workspace_id,
            ...data,
            current_period_start: new Date().toISOString().split("T")[0],
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-ai-quotas"] });
      toast.success("Quotas mis à jour");
      setEditingWorkspace(null);
    },
    onError: (error) => {
      console.error("Error updating quota:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });

  const handleEdit = (workspace: Workspace) => {
    const quota = quotas?.find((q) => q.workspace_id === workspace.id);
    setFormData({
      monthly_token_limit: quota?.monthly_token_limit?.toString() || "",
      monthly_cost_limit_cents: quota?.monthly_cost_limit_cents?.toString() || "",
      alert_threshold_percent: quota?.alert_threshold_percent?.toString() || "80",
      hard_limit_enabled: quota?.hard_limit_enabled ?? true,
    });
    setEditingWorkspace(workspace);
  };

  const handleSave = () => {
    if (!editingWorkspace) return;

    const data: Partial<WorkspaceQuota> = {
      monthly_token_limit: formData.monthly_token_limit
        ? parseInt(formData.monthly_token_limit)
        : null,
      monthly_cost_limit_cents: formData.monthly_cost_limit_cents
        ? parseInt(formData.monthly_cost_limit_cents)
        : null,
      alert_threshold_percent: formData.alert_threshold_percent
        ? parseInt(formData.alert_threshold_percent)
        : 80,
      hard_limit_enabled: formData.hard_limit_enabled,
    };

    upsertQuotaMutation.mutate({
      workspace_id: editingWorkspace.id,
      data,
    });
  };

  const getUsageForWorkspace = (workspaceId: string) => {
    return usage?.find((u) => u.workspace_id === workspaceId);
  };

  const getQuotaForWorkspace = (workspaceId: string) => {
    return quotas?.find((q) => q.workspace_id === workspaceId);
  };

  const calculateUsagePercent = (
    current: number | null | undefined,
    limit: number | null | undefined
  ): number => {
    if (!current || !limit) return 0;
    return Math.min(100, Math.round((current / limit) * 100));
  };

  const getUsageStatus = (percent: number, alertThreshold: number = 80) => {
    if (percent >= 100) return { color: "bg-destructive", label: "Bloqué", variant: "destructive" as const };
    if (percent >= 90) return { color: "bg-red-500", label: "Critique", variant: "destructive" as const };
    if (percent >= alertThreshold) return { color: "bg-yellow-500", label: "Alerte", variant: "secondary" as const };
    return { color: "bg-green-500", label: "OK", variant: "outline" as const };
  };

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

  const isLoading = loadingWorkspaces || loadingQuotas || loadingUsage;

  // Calculate global stats
  const globalStats = {
    totalWorkspaces: workspaces?.length || 0,
    configuredQuotas: quotas?.length || 0,
    totalTokensUsed: usage?.reduce((acc, u) => acc + (u.total_tokens || 0), 0) || 0,
    totalCostCents: usage?.reduce((acc, u) => acc + (u.total_cost_cents || 0), 0) || 0,
    totalRequests: usage?.reduce((acc, u) => acc + (u.request_count || 0), 0) || 0,
  };

  return (
    <div className="space-y-6">
      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{globalStats.configuredQuotas}/{globalStats.totalWorkspaces}</p>
                <p className="text-sm text-muted-foreground">Workspaces configurés</p>
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
                <p className="text-2xl font-bold">{formatTokens(globalStats.totalTokensUsed)}</p>
                <p className="text-sm text-muted-foreground">Tokens ce mois</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Coins className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCost(globalStats.totalCostCents)}</p>
                <p className="text-sm text-muted-foreground">Coût estimé</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{globalStats.totalRequests.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Requêtes ce mois</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workspaces Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" />
              Quotas par Workspace
            </CardTitle>
            <CardDescription>
              Gérez les limites de tokens et de coûts par organisation
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchUsage()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Coût</TableHead>
                  <TableHead>Requêtes</TableHead>
                  <TableHead>Limite</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workspaces?.map((workspace) => {
                  const quota = getQuotaForWorkspace(workspace.id);
                  const currentUsage = getUsageForWorkspace(workspace.id);
                  const tokenPercent = calculateUsagePercent(
                    currentUsage?.total_tokens,
                    quota?.monthly_token_limit
                  );
                  const costPercent = calculateUsagePercent(
                    currentUsage?.total_cost_cents,
                    quota?.monthly_cost_limit_cents
                  );
                  const maxPercent = Math.max(tokenPercent, costPercent);
                  const status = getUsageStatus(maxPercent, quota?.alert_threshold_percent || 80);

                  return (
                    <TableRow key={workspace.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{workspace.name}</p>
                            <p className="text-xs text-muted-foreground">{workspace.type}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {formatTokens(currentUsage?.total_tokens)}
                            </span>
                            {quota?.monthly_token_limit && (
                              <span className="text-xs text-muted-foreground">
                                / {formatTokens(quota.monthly_token_limit)}
                              </span>
                            )}
                          </div>
                          {quota?.monthly_token_limit && (
                            <Progress value={tokenPercent} className="h-1.5" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {formatCost(currentUsage?.total_cost_cents)}
                            </span>
                            {quota?.monthly_cost_limit_cents && (
                              <span className="text-xs text-muted-foreground">
                                / {formatCost(quota.monthly_cost_limit_cents)}
                              </span>
                            )}
                          </div>
                          {quota?.monthly_cost_limit_cents && (
                            <Progress value={costPercent} className="h-1.5" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {currentUsage?.request_count?.toLocaleString() || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        {quota?.hard_limit_enabled ? (
                          <Badge variant="secondary" className="gap-1">
                            <Shield className="h-3 w-3" />
                            Strict
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Souple
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {quota ? (
                          <Badge variant={status.variant}>
                            {maxPercent > 0 ? `${maxPercent}%` : status.label}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Non configuré
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(workspace)}
                        >
                          {quota ? (
                            <Edit2 className="h-4 w-4" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingWorkspace} onOpenChange={() => setEditingWorkspace(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Quotas IA - {editingWorkspace?.name}
            </DialogTitle>
            <DialogDescription>
              Définissez les limites mensuelles pour ce workspace
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="token-limit">Limite de tokens mensuelle</Label>
              <Input
                id="token-limit"
                type="number"
                placeholder="Ex: 1000000 (1M tokens)"
                value={formData.monthly_token_limit}
                onChange={(e) =>
                  setFormData({ ...formData, monthly_token_limit: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Laissez vide pour illimité
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost-limit">Limite de coût mensuelle (centimes)</Label>
              <Input
                id="cost-limit"
                type="number"
                placeholder="Ex: 5000 (50€)"
                value={formData.monthly_cost_limit_cents}
                onChange={(e) =>
                  setFormData({ ...formData, monthly_cost_limit_cents: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Laissez vide pour illimité
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alert-threshold">Seuil d'alerte (%)</Label>
              <Input
                id="alert-threshold"
                type="number"
                min="50"
                max="95"
                placeholder="80"
                value={formData.alert_threshold_percent}
                onChange={(e) =>
                  setFormData({ ...formData, alert_threshold_percent: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Déclenche une alerte à ce pourcentage d'utilisation
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Limite stricte</Label>
                <p className="text-sm text-muted-foreground">
                  Bloque les requêtes au-delà de la limite
                </p>
              </div>
              <Switch
                checked={formData.hard_limit_enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, hard_limit_enabled: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingWorkspace(null)}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={upsertQuotaMutation.isPending}
            >
              {upsertQuotaMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
