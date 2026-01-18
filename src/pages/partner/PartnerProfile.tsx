import { PartnerLayout } from '@/components/partner/PartnerLayout';
import { usePartnerAuth } from '@/hooks/partner/usePartnerAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  User, 
  Mail, 
  Building2, 
  Calendar 
} from 'lucide-react';

export default function PartnerProfile() {
  const { partnerData, user } = usePartnerAuth();

  return (
    <PartnerLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mon Profil</h1>
          <p className="text-muted-foreground">
            Vos informations partenaire
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <Card className="lg:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={partnerData?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {partnerData?.name?.charAt(0) || 'P'}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-semibold">{partnerData?.name || 'Partenaire'}</h2>
                <Badge variant="secondary" className="mt-2 capitalize">
                  {partnerData?.partner_type?.replace('_', ' ') || 'Partenaire'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Informations du compte</CardTitle>
              <CardDescription>
                Détails de votre profil partenaire
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Nom</p>
                  <p className="font-medium">{partnerData?.name || '—'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{partnerData?.email || user?.email || '—'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Type de partenariat</p>
                  <p className="font-medium capitalize">
                    {partnerData?.partner_type?.replace('_', ' ') || '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Membre depuis</p>
                  <p className="font-medium">
                    {user?.created_at 
                      ? new Date(user.created_at).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PartnerLayout>
  );
}
