import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Mail, Phone, Globe, Building2, MapPin, Calendar, Euro, TrendingUp } from 'lucide-react';
import { formatCurrency, entityRoute, STAGE_LABELS, STAGE_COLORS } from './helpers';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EntityQuickViewDrawerProps {
  entityType: string | null;
  entityId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (path: string) => void;
}

type EntityRow = Record<string, unknown> & { id: string };

const TABLE_BY_TYPE: Record<string, { table: string; select: string }> = {
  lead: {
    table: 'leads',
    select: 'id,name,email,phone,company,industry,city,country,website,linkedin_url,position,status,qualification_status,lead_score,budget,source,last_contacted_at,created_at',
  },
  opportunity: {
    table: 'opportunities',
    select: 'id,title,description,stage,value_amount,probability,expected_revenue,expected_close_date,stage_entered_at,source,created_at,lead_id',
  },
  partner: {
    table: 'partners',
    select: 'id,name,email,phone,company,partner_type,partner_subtype,bio,expertise,specialties,website,linkedin_url,status,is_active,created_at',
  },
};

function Field({ icon: Icon, label, value, href }: { icon?: React.ComponentType<{ className?: string }>; label: string; value?: React.ReactNode; href?: string }) {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return null;
  const content = (
    <div className="flex items-start gap-2 py-1.5 text-sm">
      {Icon && <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-foreground break-words">{value}</div>
      </div>
    </div>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="block hover:bg-muted/40 rounded -mx-1 px-1 transition-colors">
      {content}
    </a>
  ) : content;
}

function formatDate(v: unknown): string | null {
  if (!v || typeof v !== 'string') return null;
  try {
    return format(new Date(v), 'dd MMM yyyy', { locale: fr });
  } catch {
    return null;
  }
}

export function EntityQuickViewDrawer({ entityType, entityId, open, onOpenChange, onNavigate }: EntityQuickViewDrawerProps) {
  const cfg = entityType ? TABLE_BY_TYPE[entityType] : null;

  const { data, isLoading } = useQuery({
    queryKey: ['entity-quickview', entityType, entityId],
    queryFn: async (): Promise<EntityRow | null> => {
      if (!cfg || !entityId) return null;
      const { data, error } = await supabase
        .from(cfg.table as 'leads' | 'opportunities' | 'partners')
        .select(cfg.select)
        .eq('id', entityId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as EntityRow | null;
    },
    enabled: open && !!cfg && !!entityId,
    staleTime: 60_000,
  });

  const title = (() => {
    if (!data) return '';
    if (entityType === 'opportunity') return (data.title as string) || 'Opportunité';
    return (data.name as string) || 'Sans nom';
  })();

  const goFull = () => {
    if (!entityType || !entityId) return;
    onOpenChange(false);
    onNavigate?.(entityRoute(entityType, entityId));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] capitalize">{entityType}</Badge>
            {entityType === 'opportunity' && data?.stage && (
              <Badge className={STAGE_COLORS[data.stage as string] || ''}>
                {STAGE_LABELS[data.stage as string] || (data.stage as string)}
              </Badge>
            )}
            {entityType === 'lead' && data?.qualification_status && (
              <Badge variant="secondary" className="text-[10px]">{String(data.qualification_status)}</Badge>
            )}
            {entityType === 'partner' && data?.partner_type && (
              <Badge variant="secondary" className="text-[10px]">{String(data.partner_type)}</Badge>
            )}
          </div>
          <SheetTitle className="text-lg">{isLoading ? <Skeleton className="h-6 w-48" /> : title}</SheetTitle>
          {entityType === 'opportunity' && data?.description && (
            <SheetDescription className="text-xs line-clamp-3">{String(data.description)}</SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-4 space-y-1 divide-y divide-border/50">
          {isLoading && (
            <div className="space-y-2 py-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}

          {!isLoading && !data && (
            <p className="text-sm text-muted-foreground py-4">Entité introuvable ou supprimée.</p>
          )}

          {data && entityType === 'lead' && (
            <>
              <Field icon={Mail} label="Email" value={data.email as string} href={data.email ? `mailto:${data.email}` : undefined} />
              <Field icon={Phone} label="Téléphone" value={data.phone as string} href={data.phone ? `tel:${data.phone}` : undefined} />
              <Field icon={Building2} label="Société" value={data.company as string} />
              <Field label="Poste" value={data.position as string} />
              <Field label="Secteur" value={data.industry as string} />
              <Field icon={MapPin} label="Ville" value={[data.city, data.country].filter(Boolean).join(', ') || null} />
              <Field icon={Globe} label="Site" value={data.website as string} href={data.website ? String(data.website) : undefined} />
              <Field label="LinkedIn" value={data.linkedin_url as string} href={data.linkedin_url ? String(data.linkedin_url) : undefined} />
              <Field icon={TrendingUp} label="Score" value={data.lead_score != null ? `${data.lead_score}/100` : null} />
              <Field icon={Euro} label="Budget" value={data.budget as string} />
              <Field label="Source" value={data.source as string} />
              <Field icon={Calendar} label="Dernier contact" value={formatDate(data.last_contacted_at)} />
              <Field icon={Calendar} label="Créé le" value={formatDate(data.created_at)} />
            </>
          )}

          {data && entityType === 'opportunity' && (
            <>
              <Field icon={Euro} label="Montant" value={data.value_amount != null ? formatCurrency(Number(data.value_amount)) : null} />
              <Field icon={TrendingUp} label="Probabilité" value={data.probability != null ? `${data.probability}%` : null} />
              <Field icon={Euro} label="CA pondéré" value={data.expected_revenue != null ? formatCurrency(Number(data.expected_revenue)) : null} />
              <Field icon={Calendar} label="Closing prévu" value={formatDate(data.expected_close_date)} />
              <Field icon={Calendar} label="Entrée dans l'étape" value={formatDate(data.stage_entered_at)} />
              <Field label="Source" value={data.source as string} />
              <Field icon={Calendar} label="Créée le" value={formatDate(data.created_at)} />
            </>
          )}

          {data && entityType === 'partner' && (
            <>
              <Field icon={Mail} label="Email" value={data.email as string} href={data.email ? `mailto:${data.email}` : undefined} />
              <Field icon={Phone} label="Téléphone" value={data.phone as string} href={data.phone ? `tel:${data.phone}` : undefined} />
              <Field icon={Building2} label="Société" value={data.company as string} />
              <Field label="Sous-type" value={data.partner_subtype as string} />
              <Field label="Expertise" value={data.expertise as string} />
              <Field
                label="Spécialités"
                value={
                  Array.isArray(data.specialties) && data.specialties.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {(data.specialties as string[]).map((s, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  ) : null
                }
              />
              <Field label="Bio" value={data.bio ? <span className="text-xs leading-relaxed">{String(data.bio)}</span> : null} />
              <Field icon={Globe} label="Site" value={data.website as string} href={data.website ? String(data.website) : undefined} />
              <Field label="LinkedIn" value={data.linkedin_url as string} href={data.linkedin_url ? String(data.linkedin_url) : undefined} />
              <Field label="Statut" value={data.is_active ? 'Actif' : 'Inactif'} />
              <Field icon={Calendar} label="Créé le" value={formatDate(data.created_at)} />
            </>
          )}
        </div>

        {data && (
          <div className="mt-6 flex gap-2">
            <Button onClick={goFull} className="flex-1">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Ouvrir la fiche complète
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
