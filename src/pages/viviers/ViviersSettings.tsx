import { VivierLayout } from '@/components/viviers/VivierLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Key, 
  Mail,
  Shield,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export default function ViviersSettings() {
  return (
    <VivierLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Paramètres Viviers</h1>
          <p className="text-muted-foreground">
            Configuration des intégrations et options du module
          </p>
        </div>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-orange-500" />
              Clés API
            </CardTitle>
            <CardDescription>
              Configuration des services externes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="instantly-key">Instantly API Key</Label>
                <Badge variant="outline" className="text-emerald-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Configurée
                </Badge>
              </div>
              <Input 
                id="instantly-key"
                type="password" 
                value="••••••••••••••••" 
                disabled
                className="font-mono"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="brevo-key">Brevo API Key</Label>
                <Badge variant="outline" className="text-emerald-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Configurée
                </Badge>
              </div>
              <Input 
                id="brevo-key"
                type="password" 
                value="••••••••••••••••" 
                disabled
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Domains */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-orange-500" />
              Domaines email
            </CardTitle>
            <CardDescription>
              Gestion des domaines d'envoi et leur état
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">contact-iarche.fr</p>
                  <p className="text-sm text-muted-foreground">Brevo - Transactionnel</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700">SPF ✓</Badge>
                  <Badge className="bg-emerald-100 text-emerald-700">DKIM ✓</Badge>
                  <Badge className="bg-emerald-100 text-emerald-700">DMARC ✓</Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">13 domaines satellites</p>
                  <p className="text-sm text-muted-foreground">Instantly - Cold email</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-amber-600">
                    Warm-up J15
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-orange-500" />
              Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Scoring automatique à l'import</Label>
                <p className="text-sm text-muted-foreground">
                  Lancer le scoring IA automatiquement après chaque import
                </p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Nettoyage des emails</Label>
                <p className="text-sm text-muted-foreground">
                  Valider les emails et supprimer les invalides à l'import
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Détection des doublons CRM</Label>
                <p className="text-sm text-muted-foreground">
                  Exclure les emails déjà présents dans le CRM principal
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Promotion automatique</Label>
                <p className="text-sm text-muted-foreground">
                  Transférer automatiquement les leads qui répondent vers le CRM
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>
      </div>
    </VivierLayout>
  );
}
