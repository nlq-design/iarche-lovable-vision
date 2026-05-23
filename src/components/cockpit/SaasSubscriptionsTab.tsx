import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, TrendingUp, Users, AlertTriangle, Repeat, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Kpis {
  mrr_eur: number;
  arr_eur: number;
  active_count: number;
  trialing_count: number;
  churned_30d: number;
  trial_conversion_rate: number;
}

interface SubRow {
  subscription_id: string;
  workspace_id: string;
  workspace_name: string;
  plan_slug: string;
  plan_name: string;
  plan_price_monthly: number;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  canceled_at: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  owner_email: string | null;
  members_count: number;
  last_activity_at: string | null;
  ai_tokens_30d: number;
  leads_created_30d: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  trialing: "bg-blue-500/10 text-blue-700 border-blue-200",
  past_due: "bg-amber-500/10 text-amber-700 border-amber-200",
  canceled: "bg-muted text-muted-foreground border-border",
  paused: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  trialing: "Essai",
  past_due: "Impayé",
  canceled: "Annulé",
  paused: "Pausé",
  incomplete: "Incomplet",
  incomplete_expired: "Expiré",
};

export function SaasSubscriptionsTab() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [rows, setRows] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [kpisRes, listRes] = await Promise.all([
        supabase.rpc("get_cockpit_saas_kpis"),
        supabase.rpc("get_cockpit_saas_subscriptions"),
      ]);
      if (!mounted) return;
      if (kpisRes.error || listRes.error) {
        setError(kpisRes.error?.message || listRes.error?.message || "Erreur");
      } else {
        setKpis(kpisRes.data as unknown as Kpis);
        setRows((listRes.data as unknown as SubRow[]) || []);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (planFilter !== "all" && r.plan_slug !== planFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !r.workspace_name?.toLowerCase().includes(q) &&
        !r.owner_email?.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Accès réservé aux super administrateurs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={TrendingUp} label="MRR" value={`${(kpis?.mrr_eur ?? 0).toLocaleString("fr-FR")}€`} />
        <KpiCard icon={Repeat} label="ARR" value={`${(kpis?.arr_eur ?? 0).toLocaleString("fr-FR")}€`} />
        <KpiCard icon={Users} label="Actifs" value={String(kpis?.active_count ?? 0)} />
        <KpiCard icon={Activity} label="En essai" value={String(kpis?.trialing_count ?? 0)} />
        <KpiCard icon={AlertTriangle} label="Churn 30j" value={String(kpis?.churned_30d ?? 0)} />
        <KpiCard
          icon={TrendingUp}
          label="Conv. essai"
          value={`${kpis?.trial_conversion_rate ?? 0}%`}
        />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Rechercher workspace ou email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs h-9"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="trialing">Essai</SelectItem>
            <SelectItem value="past_due">Impayé</SelectItem>
            <SelectItem value="canceled">Annulé</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous plans</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} / {rows.length} abonnements
        </span>
      </div>

      {/* Tableau */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aucun abonnement à afficher.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                  <TableHead>Membres</TableHead>
                  <TableHead>Renouvellement</TableHead>
                  <TableHead>Dernière activité</TableHead>
                  <TableHead className="text-right">Tokens IA 30j</TableHead>
                  <TableHead className="text-right">Leads 30j</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.subscription_id}>
                    <TableCell>
                      <div className="font-medium text-sm">{r.workspace_name}</div>
                      {r.owner_email && (
                        <div className="text-xs text-muted-foreground">{r.owner_email}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{r.plan_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[r.status] ?? ""}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </Badge>
                      {r.cancel_at_period_end && (
                        <div className="text-[10px] text-amber-600 mt-0.5">
                          Annulation programmée
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {r.status === "active" ? `${r.plan_price_monthly}€` : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{r.members_count}</TableCell>
                    <TableCell className="text-sm">
                      {r.current_period_end
                        ? format(new Date(r.current_period_end), "dd MMM yyyy", { locale: fr })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.last_activity_at
                        ? formatDistanceToNow(new Date(r.last_activity_at), {
                            addSuffix: true,
                            locale: fr,
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {r.ai_tokens_30d.toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {r.leads_created_30d}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className="text-lg font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
