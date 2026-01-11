import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Scale, Users, TrendingUp, Calendar, Building2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PappersData {
  // Identifiants
  siren?: string;
  siret?: string;
  tva_intracommunautaire?: string;
  
  // Entreprise
  company_name?: string;
  legal_form?: string;
  category?: string;
  
  // Dates
  creation_date?: string;
  rcs_date?: string;
  
  // Finances
  capital?: number;
  capital_formatted?: string;
  revenue?: number;
  profit?: number;
  
  // Effectifs
  employees?: string | number;
  employees_range?: string;
  employees_min?: number;
  employees_max?: number;
  
  // Activité
  naf_code?: string;
  naf_label?: string;
  object_social?: string;
  convention_collective?: string;
  
  // Dirigeants
  representatives?: Array<{
    name: string;
    position: string;
    since?: string;
    nationality?: string;
  }>;
  
  // Historique financier
  finances?: Array<{
    annee: number;
    chiffre_affaires?: number;
    resultat?: number;
    effectif?: number;
  }>;
  
  // Localisation
  region?: string;
  departement?: string;
}

interface VivierLegalDataCardProps {
  rawData?: {
    pappers_enriched_at?: string;
    pappers_data?: PappersData;
  } | null;
}

const formatCurrency = (value?: number) => {
  if (!value) return '-';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
};

const formatNumber = (value?: number) => {
  if (!value) return '-';
  return new Intl.NumberFormat('fr-FR').format(value);
};

export function VivierLegalDataCard({ rawData }: VivierLegalDataCardProps) {
  const pappers = rawData?.pappers_data;
  const enrichedAt = rawData?.pappers_enriched_at;

  if (!pappers) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Scale className="w-5 h-5" />
            Données légales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Cliquez sur "Enrichir" à côté du SIRET pour récupérer les données légales via Pappers.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Scale className="w-5 h-5" />
            Données légales
          </CardTitle>
          {enrichedAt && (
            <Badge variant="outline" className="text-xs">
              Pappers • {format(new Date(enrichedAt), 'dd/MM/yyyy', { locale: fr })}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Identifiants fiscaux */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Identifiants
          </h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">SIREN</p>
              <p className="text-sm font-mono">{pappers.siren || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">SIRET</p>
              <p className="text-sm font-mono">{pappers.siret || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">TVA Intracommunautaire</p>
              <p className="text-sm font-mono">{pappers.tva_intracommunautaire || '-'}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Finances */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Données financières
          </h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Capital social</p>
              <p className="text-sm font-semibold">{pappers.capital_formatted || formatCurrency(pappers.capital)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Chiffre d'affaires</p>
              <p className="text-sm font-semibold text-green-600">{formatCurrency(pappers.revenue)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Résultat net</p>
              <p className={`text-sm font-semibold ${pappers.profit && pappers.profit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(pappers.profit)}
              </p>
            </div>
          </div>

          {/* Historique financier */}
          {pappers.finances && pappers.finances.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Historique</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {pappers.finances.slice(0, 5).map((f, i) => (
                  <div key={i} className="flex-shrink-0 p-2 border rounded text-center min-w-[80px]">
                    <p className="text-xs font-semibold">{f.annee}</p>
                    {f.chiffre_affaires && (
                      <p className="text-xs text-muted-foreground">{formatNumber(f.chiffre_affaires / 1000)}k€</p>
                    )}
                    {f.effectif && (
                      <p className="text-xs">{f.effectif} emp.</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Effectifs & Dates */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Infos complémentaires
          </h4>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Effectif</p>
              <p className="text-sm">{pappers.employees_range || pappers.employees || '-'}</p>
              {pappers.employees_min && pappers.employees_max && (
                <p className="text-xs text-muted-foreground">{pappers.employees_min} - {pappers.employees_max} salariés</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date de création</p>
              <p className="text-sm">{pappers.creation_date || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Catégorie</p>
              <p className="text-sm">{pappers.category || '-'}</p>
            </div>
          </div>
          {pappers.convention_collective && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground">Convention collective</p>
              <p className="text-sm">{pappers.convention_collective}</p>
            </div>
          )}
        </div>

        {/* Dirigeants */}
        {pappers.representatives && pappers.representatives.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Dirigeants ({pappers.representatives.length})
              </h4>
              <div className="space-y-2">
                {pappers.representatives.map((rep, i) => (
                  <div key={i} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="text-sm font-medium">{rep.name}</p>
                      <p className="text-xs text-muted-foreground">{rep.position}</p>
                    </div>
                    {rep.since && (
                      <Badge variant="outline" className="text-xs">
                        Depuis {rep.since}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Objet social */}
        {pappers.object_social && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Objet social
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {pappers.object_social}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
