import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingState } from '@/components/cockpit/common/LoadingState';
import { EmptyState } from '@/components/cockpit/common/EmptyState';
import { Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  provider: string;
  roles: string[];
  profile: { full_name: string | null; avatar_url: string | null; locale: string | null; timezone: string | null } | null;
  workspaces: Array<{ workspace_id: string; role: string }>;
}

const roleVariant = (role: string) => {
  if (role === 'super_admin') return 'default';
  if (role === 'admin' || role === 'cockpit_admin') return 'secondary';
  if (role === 'partner') return 'outline';
  return 'outline';
};

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('admin-list-users');
      if (error) {
        setError(error.message);
      } else {
        setUsers(data?.users ?? []);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingState message="Chargement des utilisateurs..." />;
  if (error) return <EmptyState title="Erreur" description={error} icon={Users} />;
  if (users.length === 0) return <EmptyState title="Aucun utilisateur" description="Aucun compte enregistré." icon={Users} />;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Utilisateurs</h1>
        <p className="text-muted-foreground mt-1">
          {users.length} compte{users.length > 1 ? 's' : ''} — rôles, dernière connexion, workspaces
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comptes authentifiés</CardTitle>
          <CardDescription>Source : auth.users + user_roles + profiles + workspace_members</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Rôles</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Workspaces</TableHead>
                <TableHead>Dernière connexion</TableHead>
                <TableHead>Créé</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">
                    {u.email}
                    {!u.email_confirmed_at && (
                      <Badge variant="outline" className="ml-2 text-xs">Non confirmé</Badge>
                    )}
                  </TableCell>
                  <TableCell>{u.profile?.full_name ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {u.roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground">aucun</span>
                      ) : (
                        u.roles.map((r) => (
                          <Badge key={r} variant={roleVariant(r) as any} className="text-xs">
                            {r}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.provider}</TableCell>
                  <TableCell className="text-xs">{u.workspaces.length}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.last_sign_in_at
                      ? formatDistanceToNow(new Date(u.last_sign_in_at), { addSuffix: true, locale: fr })
                      : 'jamais'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(u.created_at), { addSuffix: true, locale: fr })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
