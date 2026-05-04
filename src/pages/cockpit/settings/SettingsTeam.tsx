import { useMemo, useState } from 'react';
import { CockpitLayout } from '@/components/cockpit/CockpitLayout';
import { useWorkspaceId, useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useWorkspaceMembers, type WorkspaceMember } from '@/hooks/useWorkspaceMembers';
import { useTeamInvitations } from '@/hooks/useTeamInvitations';
import { useTeamMutations } from '@/hooks/useTeamMutations';
import { LoadingState } from '@/components/cockpit/common/LoadingState';
import { EmptyState } from '@/components/cockpit/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, MoreHorizontal, UserPlus, Mail, ShieldOff, ShieldCheck, Trash2 } from 'lucide-react';

type Role = 'owner' | 'editor' | 'viewer';
const ROLE_LABEL: Record<Role, string> = { owner: 'Propriétaire', editor: 'Éditeur', viewer: 'Lecteur' };

function daysUntil(date: string): number {
  const diff = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function SettingsTeam() {
  const workspaceId = useWorkspaceId();
  const { workspaces } = useWorkspace();
  const { user } = useAuth();
  const { plan } = useSubscription();
  const membersQ = useWorkspaceMembers(workspaceId);
  const invitationsQ = useTeamInvitations(workspaceId);
  const mut = useTeamMutations(workspaceId);

  const myRole = workspaces.find((w) => w.workspace_id === workspaceId)?.role;
  const isOwner = myRole === 'owner';

  const maxSeats = useMemo(() => {
    const v = (plan?.limits as any)?.max_users;
    if (v === null || v === undefined) return Infinity;
    return Number(v) || 1;
  }, [plan]);

  const members = membersQ.data ?? [];
  const invitations = invitationsQ.data ?? [];
  const seatsUsed = members.length + invitations.length;
  const seatsFull = seatsUsed >= maxSeats;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('editor');

  const [removeTarget, setRemoveTarget] = useState<WorkspaceMember | null>(null);

  const submitInvite = async () => {
    if (!inviteEmail.trim()) return;
    await mut.inviteTeamMember.mutateAsync({ email: inviteEmail.trim(), role: inviteRole });
    setInviteEmail('');
    setInviteRole('editor');
    setInviteOpen(false);
  };

  return (
    <CockpitLayout>
      <TooltipProvider>
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Membres de votre espace</h1>
                <p className="text-muted-foreground text-sm">
                  {seatsUsed} membre{seatsUsed > 1 ? 's' : ''}
                  {Number.isFinite(maxSeats) ? ` / ${maxSeats} sièges` : ' / illimité'}
                </p>
              </div>
            </div>
            {isOwner && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      onClick={() => setInviteOpen(true)}
                      disabled={seatsFull}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Inviter un membre
                    </Button>
                  </span>
                </TooltipTrigger>
                {seatsFull && (
                  <TooltipContent>
                    Limite atteinte — mettez à jour votre plan
                  </TooltipContent>
                )}
              </Tooltip>
            )}
          </div>

          {/* Members card */}
          <Card>
            <CardHeader>
              <CardTitle>Membres actifs</CardTitle>
            </CardHeader>
            <CardContent>
              {membersQ.isLoading ? (
                <LoadingState message="Chargement des membres..." inline />
              ) : members.length === 0 ? (
                <EmptyState message="Aucun membre" inline />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Membre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((m) => {
                      const isSelf = m.user_id === user?.id;
                      const initial = (m.display_name ?? m.email ?? '?').slice(0, 2).toUpperCase();
                      return (
                        <TableRow key={m.user_id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                {m.avatar_url && <AvatarImage src={m.avatar_url} />}
                                <AvatarFallback>{initial}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{m.display_name ?? '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{m.email ?? '—'}</TableCell>
                          <TableCell>
                            {isOwner && !isSelf ? (
                              <Select
                                value={m.role}
                                onValueChange={(v) =>
                                  mut.changeMemberRole.mutate({ user_id: m.user_id, role: v as Role })
                                }
                              >
                                <SelectTrigger className="w-32 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="owner">Propriétaire</SelectItem>
                                  <SelectItem value="editor">Éditeur</SelectItem>
                                  <SelectItem value="viewer">Lecteur</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="secondary">{ROLE_LABEL[m.role]}</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {m.status === 'active' ? (
                              <Badge variant="outline" className="border-primary/30 text-primary">Actif</Badge>
                            ) : (
                              <Badge variant="destructive">Suspendu</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {isOwner && !isSelf && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {m.status === 'active' ? (
                                    <DropdownMenuItem onClick={() => mut.suspendMember.mutate(m.user_id)}>
                                      <ShieldOff className="h-4 w-4 mr-2" />
                                      Suspendre
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => mut.reactivateMember.mutate(m.user_id)}>
                                      <ShieldCheck className="h-4 w-4 mr-2" />
                                      Réactiver
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setRemoveTarget(m)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Retirer du workspace
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Invitations card */}
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
                      <TableHead>Rôle</TableHead>
                      <TableHead>Expire dans</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>{inv.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{ROLE_LABEL[inv.role]}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {daysUntil(inv.expires_at)} j
                        </TableCell>
                        <TableCell>
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => mut.revokeInvitation.mutate(inv.id)}
                            >
                              Révoquer
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Invite Dialog */}
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inviter un membre</DialogTitle>
              <DialogDescription>
                Un email d'invitation sera envoyé à cette adresse.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="prenom.nom@exemple.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Rôle</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Propriétaire</SelectItem>
                    <SelectItem value="editor">Éditeur</SelectItem>
                    <SelectItem value="viewer">Lecteur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                Annuler
              </Button>
              <Button onClick={submitInvite} disabled={mut.inviteTeamMember.isPending}>
                {mut.inviteTeamMember.isPending ? 'Envoi...' : 'Envoyer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove confirmation */}
        <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
              <AlertDialogDescription>
                {removeTarget?.display_name ?? removeTarget?.email} perdra l'accès à ce workspace.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (removeTarget) {
                    mut.removeMember.mutate(removeTarget.user_id);
                    setRemoveTarget(null);
                  }
                }}
              >
                Retirer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TooltipProvider>
    </CockpitLayout>
  );
}
