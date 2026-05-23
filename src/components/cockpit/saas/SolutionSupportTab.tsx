import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { LoadingState } from "@/components/cockpit/common/LoadingState";
import { LifeBuoy, AlertTriangle, CheckCircle2, Smile, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Props { solutionId: string }

const PRIORITY_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline", normal: "secondary", high: "default", urgent: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Ouvert", in_progress: "En cours", waiting: "En attente", resolved: "Résolu", closed: "Fermé",
};

export function SolutionSupportTab({ solutionId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", priority: "normal" as "low"|"normal"|"high"|"urgent" });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["solution-support", solutionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_solution_support", { p_solution_id: solutionId });
      if (error) throw error;
      return data as any;
    },
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ["solution-tickets", solutionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("solution_id", solutionId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tickets").insert({
        solution_id: solutionId,
        subject: form.subject,
        description: form.description,
        priority: form.priority,
        status: "open",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ticket créé");
      setOpen(false);
      setForm({ subject: "", description: "", priority: "normal" });
      qc.invalidateQueries({ queryKey: ["solution-tickets", solutionId] });
      qc.invalidateQueries({ queryKey: ["solution-support", solutionId] });
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("tickets").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solution-tickets", solutionId] });
      qc.invalidateQueries({ queryKey: ["solution-support", solutionId] });
    },
  });

  if (statsLoading) return <LoadingState message="Chargement du support..." />;

  const t = stats?.tickets ?? {};
  const nps = stats?.nps ?? {};

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <LifeBuoy className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Tickets ouverts</p>
              <p className="text-lg font-semibold">{t.open ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Urgents</p>
              <p className="text-lg font-semibold">{t.urgent_open ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Temps résolution</p>
              <p className="text-lg font-semibold">{t.avg_resolution_hours ?? 0}h</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <Smile className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">NPS 90j</p>
              <p className="text-lg font-semibold">
                {nps.score !== null && nps.score !== undefined ? nps.score : "—"}
                {nps.responses ? <span className="text-xs text-muted-foreground ml-1">({nps.responses})</span> : null}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {nps.responses > 0 && (
        <Card className="border">
          <CardHeader className="pb-2"><CardTitle className="text-base">Répartition NPS</CardTitle></CardHeader>
          <CardContent>
            <div className="flex h-6 rounded overflow-hidden text-xs">
              {nps.promoters > 0 && (
                <div className="bg-green-500 flex items-center justify-center text-white" style={{ flex: nps.promoters }}>
                  {nps.promoters} promoteurs
                </div>
              )}
              {nps.passives > 0 && (
                <div className="bg-yellow-400 flex items-center justify-center" style={{ flex: nps.passives }}>
                  {nps.passives} passifs
                </div>
              )}
              {nps.detractors > 0 && (
                <div className="bg-red-500 flex items-center justify-center text-white" style={{ flex: nps.detractors }}>
                  {nps.detractors} détracteurs
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Tickets récents</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Nouveau ticket</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Créer un ticket</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Sujet</Label>
                  <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
                </div>
                <div>
                  <Label>Priorité</Label>
                  <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Basse</SelectItem>
                      <SelectItem value="normal">Normale</SelectItem>
                      <SelectItem value="high">Haute</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                <Button disabled={!form.subject || createTicket.isPending} onClick={() => createTicket.mutate()}>Créer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {ticketsLoading ? (
            <p className="text-sm text-muted-foreground py-2">Chargement...</p>
          ) : !tickets || tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Aucun ticket.</p>
          ) : (
            <div className="space-y-2">
              {tickets.map((tk: any) => (
                <div key={tk.id} className="flex items-start justify-between gap-3 border-b last:border-0 pb-2 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-sm truncate">{tk.subject}</p>
                      <Badge variant={PRIORITY_BADGE[tk.priority] ?? "secondary"} className="text-xs">{tk.priority}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tk.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                      {tk.reporter_email ? ` · ${tk.reporter_email}` : ""}
                    </p>
                  </div>
                  <Select value={tk.status} onValueChange={(v) => updateStatus.mutate({ id: tk.id, status: v })}>
                    <SelectTrigger className="w-[130px] h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
