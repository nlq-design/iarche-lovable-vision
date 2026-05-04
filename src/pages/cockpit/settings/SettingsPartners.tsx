import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CockpitLayout } from '@/components/cockpit/CockpitLayout';
import { useWorkspaceId } from '@/contexts/WorkspaceContext';
import { useWorkspacePartners, type WorkspacePartner } from '@/hooks/useWorkspacePartners';
import { usePartnerInvitations } from '@/hooks/usePartnerInvitations';
import { usePartnerMutations } from '@/hooks/usePartnerMutations';
import { useWorkspacePartnerSettings, type DigestDay } from '@/hooks/useWorkspacePartnerSettings';
import { LoadingState } from '@/components/cockpit/common/LoadingState';
import { EmptyState } from '@/components/cockpit/common/EmptyState';
import { InvitePartnerDialog } from '@/components/cockpit/InvitePartnerDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Handshake, MoreHorizontal, ShieldOff, ShieldCheck, Mail, Eye, ExternalLink } from 'lucide-react';

const SCOPE_KEYS: { key: string; label: string }[] = [
  { key: 'leads', label: 'Leads' },
  { key: 'projets', label: 'Projets' },
  { key: 'documents', label: 'Documents' },
  { key: 'transcriptions', label: 'Transcriptions' },
  { key: 'digest', label: 'Digest hebdo IA' },
];

const DAYS: { value: DigestDay; label: string }[] = [
  { value: 'monday', label: 'Lundi' },
  { value: 'tuesday', label: 'Mardi' },
  { value: 'wednesday', label: 'Mercredi' },
  { value: 'thursday', label: 'Jeudi' },
  { value: 'friday', label: 'Vendredi' },
  { value: 'saturday', label: 'Samedi' },
  { value: 'sunday', label: 'Dimanche' },
];

function daysUntil(date: string): number {
  const diff = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function SettingsPartners() {
  const workspaceId = useWorkspaceId();
  const partnersQ = useWorkspacePartners(workspaceId);
  const invitationsQ = usePartnerInvitations(workspaceId);
  const mut = usePartnerMutations(workspaceId);
  const settings = useWorkspacePartnerSettings(workspaceId);

  const [inviteTarget, setInviteTarget] = useState<WorkspacePartner | null>(null);
  const [digestEnabled, setDigestEnabled] = useState<boolean | null>(null);
  const [digestDay, setDigestDay] = useState<DigestDay | null>(null);

  const partners = partnersQ.data ?? [];
  const invitations = invitationsQ.data ?? [];

  const activeCount = useMemo(
    () => partners.filter((p) => p.status === 'active').length,
    [partners],
  );

  const effEnabled = digestEnabled ?? settings.data?.digest_enabled ?? false;
  const effDay = digestDay ?? settings.data?.digest_day ?? 'monday';

  return (
    <CockpitLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Handshake className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Partenaires de votre espace</h1>
              <p className="text-muted-foreground text-sm">
                {activeCount} partenaire{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}
                {' · '}
                {partners.length} au total
              </p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link to="/cockpit/partenaires">
              <ExternalLink className="h-4 w-4 mr-2" />
              Gérer l'annuaire
            </Link>
          </Button>
        </div>

        {/* Digest settings */}
        <Card>
          <CardHeader>
            <CardTitle>Digest IA hebdomadaire</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Envoie automatiquement chaque semaine un résumé d'activité aux partenaires concernés.
              La génération réelle sera disponible prochainement.
            </p>
            <div className="flex items-center gap-3">
              <Switch
                id="digest-enabled"
                checked={effEnabled}
                onCheckedChange={(v) => setDigestEnabled(v)}
              />
              <Label htmlFor="digest-enabled">Activer le digest hebdomadaire</Label>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="digest-day" className="min-w-32">Jour d'envoi</Label>
              <Select value={effDay} onValueChange={(v) => setDigestDay(v as DigestDay)}>
                <SelectTrigger id="digest-day" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => settings.upsert.mutate({ digest_enabled: effEnabled, digest_day: effDay })}
              disabled={settings.upsert.isPending}
            >
              {settings.upsert.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </CardContent>
        </Card>

        {/* Active partners */}
        <Card>
          <CardHeader>
            <CardTitle>Partenaires actifs</CardTitle>
          </CardHeader>
          <CardContent>
            {partnersQ.isLoading ? (
              <LoadingState message="Chargement des partenaires..." inline />
            ) : partners.length === 0 ? (
              <EmptyState
                icon={Handshake}
                message="Aucun partenaire dans cet espace"
                inline
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partenaire</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Visibilité</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map((p) => {
                    const initial = (p.name ?? '?').slice(0, 2).toUpperCase();
                    const scope = (p.scope ?? {}) as Record<string, boolean>;
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Link
                            to={`/cockpit/partenaires/${p.slug}`}
                            className="flex items-center gap-3 hover:underline"
                          >
                            <Avatar className="h-8 w-8">
                              {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                              <AvatarFallback>{initial}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{p.name}</span>
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.email ?? '—'}</TableCell>
                        <TableCell>
                          {p.status === 'active' ? (
                            <Badge variant="outline" className="border-primary/30 text-primary">Actif</Badge>
                          ) : (
                            <Badge variant="destructive">Suspendu</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Configurer
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 space-y-3">
                              <p className="text-sm font-medium">Ce que voit ce partenaire</p>
                              {SCOPE_KEYS.map((s) => (
                                <div key={s.key} className="flex items-center justify-between">
                                  <Label htmlFor={`scope-${p.id}-${s.key}`} className="text-sm">
                                    {s.label}
                                  </Label>
                                  <Switch
                                    id={`scope-${p.id}-${s.key}`}
                                    checked={Boolean(scope[s.key])}
                                    onCheckedChange={(v) =>
                                      mut.updatePartnerScope.mutate({
                                        partner_id: p.id,
                                        scope: { ...scope, [s.key]: v },
                                      })
                                    }
                                  />
                                </div>
                              ))}
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!p.user_id && (
                                <DropdownMenuItem onClick={() => setInviteTarget(p)}>
                                  <Mail className="h-4 w-4 mr-2" />
                                  Inviter au portail
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {p.status === 'active' ? (
                                <DropdownMenuItem onClick={() => mut.suspendPartner.mutate(p.id)}>
                                  <ShieldOff className="h-4 w-4 mr-2" />
                                  Suspendre
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => mut.reactivatePartner.mutate(p.id)}>
                                  <ShieldCheck className="h-4 w-4 mr-2" />
                                  Réactiver
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pending invitations */}
        <Card>
          <CardHeader>
            <CardTitle>Invitations en attente</CardTitle>
          </CardHeader>
          <CardContent>
            {invitationsQ.isLoading ? (
              <LoadingState message="Chargement..." inline />
            ) : invitations.length === 0 ? (
              <EmptyState icon={Mail} message="Aucune invitation en attente" inline />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Partenaire</TableHead>
                    <TableHead>Expire dans</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.email}</TableCell>
                      <TableCell className="text-muted-foreground">{inv.partner_name ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{daysUntil(inv.expires_at)} j</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => mut.revokePartnerInvitation.mutate(inv.id)}
                        >
                          Révoquer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {inviteTarget && (
        <InvitePartnerDialog
          open={!!inviteTarget}
          onOpenChange={(o) => !o && setInviteTarget(null)}
          partnerId={inviteTarget.id}
          partnerName={inviteTarget.name}
          partnerEmail={inviteTarget.email ?? undefined}
        />
      )}
    </CockpitLayout>
  );
}
