import { useEffect, useState } from "react";
import { CockpitLayout } from "@/components/cockpit/CockpitLayout";
import { useMyAccount } from "@/hooks/cockpit/useMyAccount";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Helmet } from "react-helmet-async";
import { UserCircle, Mail, ShieldCheck, Bell, Globe, LogOut, Sparkles } from "lucide-react";
import { LoadingState } from "@/components/common/LoadingState";

const LOCALES = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
];

const TIMEZONES = [
  "Europe/Paris", "Europe/London", "Europe/Madrid", "Europe/Berlin",
  "America/New_York", "America/Los_Angeles", "UTC",
];

export default function CockpitAccount() {
  const { user, profile, mfaFactors, thresholds, isLoading, update, signOutEverywhere } = useMyAccount();
  const [form, setForm] = useState({
    full_name: "",
    avatar_url: "",
    locale: "fr",
    timezone: "Europe/Paris",
    notif_email: true,
    notif_telegram: true,
    notif_daily: true,
    notif_sentinel: true,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        avatar_url: profile.avatar_url ?? "",
        locale: profile.locale,
        timezone: profile.timezone,
        notif_email: profile.notification_prefs?.email ?? true,
        notif_telegram: profile.notification_prefs?.telegram ?? true,
        notif_daily: profile.notification_prefs?.daily_brief ?? true,
        notif_sentinel: profile.notification_prefs?.sentinel_alerts ?? true,
      });
    }
  }, [profile]);

  const verifiedMfa = mfaFactors.filter((f) => f.status === "verified");
  const initials = (form.full_name || user?.email || "?").slice(0, 2).toUpperCase();

  const handleSave = () => {
    update.mutate({
      full_name: form.full_name.trim() || null,
      avatar_url: form.avatar_url.trim() || null,
      locale: form.locale,
      timezone: form.timezone,
      notification_prefs: {
        email: form.notif_email,
        telegram: form.notif_telegram,
        daily_brief: form.notif_daily,
        sentinel_alerts: form.notif_sentinel,
      } as any,
    });
  };

  return (
    <CockpitLayout>
      <Helmet><title>Mon compte | Cockpit IArche</title></Helmet>
      <div className="space-y-6 p-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <UserCircle className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mon compte</h1>
            <p className="text-muted-foreground text-sm">Profil personnel, sécurité et préférences IA.</p>
          </div>
        </div>

        {isLoading ? (
          <LoadingState message="Chargement du compte…" />
        ) : (
          <>
            {/* Identité */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCircle className="h-4 w-4" /> Identité
                </CardTitle>
                <CardDescription>Ces informations alimentent l'IA et les emails sortants.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={form.avatar_url || undefined} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="full_name">Nom complet</Label>
                      <Input id="full_name" value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="avatar_url">URL avatar</Label>
                      <Input id="avatar_url" value={form.avatar_url} placeholder="https://…"
                        onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{user?.email}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">vérifié</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Préférences */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Langue & fuseau
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Langue</Label>
                  <Select value={form.locale} onValueChange={(v) => setForm({ ...form, locale: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LOCALES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fuseau horaire</Label>
                  <Select value={form.timezone} onValueChange={(v) => setForm({ ...form, timezone: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4" /> Notifications
                </CardTitle>
                <CardDescription>Canaux d'alerte et briefs envoyés par l'IA.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: "notif_email", label: "Emails transactionnels", desc: "Confirmations RDV, relances, etc." },
                  { key: "notif_telegram", label: "Telegram", desc: "Alertes proactives et raccourcis IA." },
                  { key: "notif_daily", label: "Daily Brief", desc: "Synthèse quotidienne 07:00." },
                  { key: "notif_sentinel", label: "Alertes Sentinelle", desc: "Anomalies CRM, opportunités dormantes, churn." },
                ].map((p) => (
                  <div key={p.key} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{p.label}</p>
                      <p className="text-xs text-muted-foreground">{p.desc}</p>
                    </div>
                    <Switch
                      checked={(form as any)[p.key]}
                      onCheckedChange={(v) => setForm({ ...form, [p.key]: v } as any)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={update.isPending}>
                {update.isPending ? "Enregistrement…" : "Enregistrer les préférences"}
              </Button>
            </div>

            {/* Sécurité MFA */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Sécurité
                </CardTitle>
                <CardDescription>Authentification multi-facteurs et sessions actives.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Double authentification (TOTP)</p>
                    <p className="text-xs text-muted-foreground">
                      {verifiedMfa.length > 0
                        ? `Active — ${verifiedMfa.length} facteur(s) vérifié(s)`
                        : "Non configurée — requise pour accéder au Cockpit (Step-up MFA)"}
                    </p>
                  </div>
                  <Badge variant={verifiedMfa.length > 0 ? "default" : "destructive"}>
                    {verifiedMfa.length > 0 ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={() => signOutEverywhere.mutate()}
                    disabled={signOutEverywhere.isPending}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Déconnecter tous les appareils
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Seuils IA workspace (lecture seule) */}
            {thresholds.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Seuils IA de mes espaces
                  </CardTitle>
                  <CardDescription>
                    Recalculés automatiquement chaque semaine selon vos retours sur les auto-actions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {thresholds.map((t) => {
                    const lm = (t.last_metrics ?? {}) as Record<string, any>;
                    const cr = typeof lm.cancel_rate === "number" ? lm.cancel_rate : null;
                    return (
                      <div key={t.workspace_id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                        <div className="font-mono text-xs text-muted-foreground">{t.workspace_id.slice(0, 8)}…</div>
                        <div className="flex gap-4">
                          <span>Auto-action : <strong>{Number(t.auto_action_confidence_threshold).toFixed(2)}</strong></span>
                          <span>RAG : <strong>{Number(t.rag_similarity_threshold).toFixed(2)}</strong></span>
                          {cr !== null && <span className="text-muted-foreground">annul. {(cr * 100).toFixed(0)} %</span>}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </CockpitLayout>
  );
}
