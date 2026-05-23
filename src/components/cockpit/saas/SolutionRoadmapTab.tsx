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
import { Plus, ThumbsUp, Sparkles, Rocket, Hammer, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props { solutionId: string }

const COLUMNS = [
  { key: "backlog", label: "Backlog", icon: Sparkles },
  { key: "planned", label: "Planifié", icon: Rocket },
  { key: "in_progress", label: "En cours", icon: Hammer },
  { key: "shipped", label: "Livré", icon: CheckCircle2 },
] as const;

export function SolutionRoadmapTab({ solutionId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", impact: 3, effort: 3, status: "backlog" });

  const { data, isLoading } = useQuery({
    queryKey: ["solution-roadmap", solutionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_solution_roadmap", { p_solution_id: solutionId });
      if (error) throw error;
      return data as any;
    },
  });

  const createFeature = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_features").insert({
        solution_id: solutionId,
        title: form.title,
        description: form.description,
        impact: form.impact,
        effort: form.effort,
        status: form.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feature créée");
      setOpen(false);
      setForm({ title: "", description: "", impact: 3, effort: 3, status: "backlog" });
      qc.invalidateQueries({ queryKey: ["solution-roadmap", solutionId] });
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("product_features").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["solution-roadmap", solutionId] }),
  });

  const upvote = useMutation({
    mutationFn: async (featureId: string) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) throw new Error("Connexion requise");
      const { error } = await supabase.from("feature_votes").insert({
        feature_id: featureId, user_id: u.user.id, weight: 1,
      });
      if (error && !error.message.includes("duplicate")) throw error;
    },
    onSuccess: () => {
      toast.success("Vote enregistré");
      qc.invalidateQueries({ queryKey: ["solution-roadmap", solutionId] });
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  if (isLoading) return <LoadingState message="Chargement de la roadmap..." />;

  const features: any[] = data?.features ?? [];
  const counts = data?.counts ?? {};
  const totalVotes = data?.total_votes ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {features.length} features · {totalVotes} votes cumulés
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Nouvelle feature</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer une feature</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Titre</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Impact (1-5)</Label>
                  <Input type="number" min={1} max={5} value={form.impact} onChange={(e) => setForm({ ...form, impact: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Effort (1-5)</Label>
                  <Input type="number" min={1} max={5} value={form.effort} onChange={(e) => setForm({ ...form, effort: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Statut</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COLUMNS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button disabled={!form.title || createFeature.isPending} onClick={() => createFeature.mutate()}>Créer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {COLUMNS.map(col => {
          const Icon = col.icon;
          const items = features.filter((f: any) => f.status === col.key);
          return (
            <Card key={col.key} className="border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {col.label}
                  <Badge variant="secondary" className="ml-auto">{counts[col.key] ?? 0}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">Vide</p>
                ) : items.map((f: any) => (
                  <div key={f.id} className="border rounded p-2 space-y-1.5 bg-card">
                    <p className="text-sm font-medium leading-tight">{f.title}</p>
                    {f.description && <p className="text-xs text-muted-foreground line-clamp-2">{f.description}</p>}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex gap-1.5">
                        <Badge variant="outline" className="text-[10px] h-4 px-1">I{f.impact}/E{f.effort}</Badge>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">P {f.priority_score}</Badge>
                      </div>
                      <button
                        onClick={() => upvote.mutate(f.id)}
                        className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        {f.vote_score}
                      </button>
                    </div>
                    {col.key !== "shipped" && (
                      <Select value={f.status} onValueChange={(v) => updateStatus.mutate({ id: f.id, status: v })}>
                        <SelectTrigger className="h-6 text-[11px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {COLUMNS.map(c => <SelectItem key={c.key} value={c.key} className="text-xs">{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
