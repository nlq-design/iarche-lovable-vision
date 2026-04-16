import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Users, 
  Plus, 
  X, 
  Brain, 
  UserCheck, 
  Handshake,
  Link2,
  Building2
} from "lucide-react";
import { useCockpitPartners, PartnerType } from '@/hooks/cockpit/useCockpitPartners';
import { useEntityPartners, PartnerLinkType } from '@/hooks/cockpit/usePartnerLinks';

interface LinkedPartnersSectionProps {
  entityType: PartnerLinkType;
  entityId: string | undefined;
  compact?: boolean;
}

const PARTNER_TYPE_CONFIG: Record<PartnerType, { label: string; icon: React.ReactNode; color: string }> = {
  client: { label: "Client", icon: <UserCheck className="h-3 w-3" />, color: "text-emerald-600" },
  partenaire: { label: "Partenaire", icon: <Brain className="h-3 w-3" />, color: "text-purple-600" },
  affilie: { label: "Affilié", icon: <Link2 className="h-3 w-3" />, color: "text-blue-600" },
  apporteur_affaires: { label: "Apporteur", icon: <Handshake className="h-3 w-3" />, color: "text-amber-600" },
};

export function LinkedPartnersSection({ entityType, entityId, compact = false }: LinkedPartnersSectionProps) {
  const { partners: allPartners, isLoading: loadingAll } = useCockpitPartners();
  const { partners: linkedPartners, isLoading, linkPartner, unlinkPartner } = useEntityPartners(entityType, entityId);
  const [linkOpen, setLinkOpen] = useState(false);

  if (!entityId) return null;

  const linkedPartnerIds = linkedPartners?.map((lp: any) => lp.partner_id) || [];
  const availablePartners = allPartners?.filter(p => !linkedPartnerIds.includes(p.id) && p.is_active) || [];

  const handleLink = async (partnerId: string) => {
    await linkPartner.mutateAsync({ partnerId });
    setLinkOpen(false);
  };

  const handleUnlink = async (partnerId: string) => {
    await unlinkPartner.mutateAsync(partnerId);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {isLoading ? (
          <span className="text-xs text-muted-foreground">...</span>
        ) : linkedPartners?.length === 0 ? (
          <span className="text-xs text-muted-foreground">Aucun partenaire</span>
        ) : (
          linkedPartners?.slice(0, 3).map((lp: any) => (
            <Badge key={lp.id} variant="secondary" className="text-xs h-5 gap-1 pr-1">
              {lp.partner?.name || 'Partenaire'}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnlink(lp.partner_id);
                }}
                className="hover:text-destructive ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        )}
        {(linkedPartners?.length || 0) > 3 && (
          <Badge variant="outline" className="text-xs h-5">
            +{linkedPartners.length - 3}
          </Badge>
        )}
        <Popover open={linkOpen} onOpenChange={setLinkOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0" type="button">
              <Plus className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-64 p-0"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <Command>
              <CommandInput placeholder="Rechercher..." className="h-8 text-sm" />
              <CommandList>
                <CommandEmpty>Aucun partenaire disponible</CommandEmpty>
                <CommandGroup>
                  {availablePartners.map(partner => {
                    const config = PARTNER_TYPE_CONFIG[partner.partner_type];
                    return (
                      <CommandItem
                        key={partner.id}
                        value={partner.name}
                        onSelect={() => handleLink(partner.id)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className={config.color}>{config.icon}</span>
                          <span className="text-sm">{partner.name}</span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <Users className="h-4 w-4" />
          Partenaires liés
        </h3>
        <Popover open={linkOpen} onOpenChange={setLinkOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={loadingAll} type="button">
              <Plus className="h-3 w-3 mr-1" />
              Ajouter
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-72 p-0"
            align="end"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <Command>
              <CommandInput placeholder="Rechercher un partenaire..." className="h-9" />
              <CommandList>
                <CommandEmpty>Aucun partenaire disponible</CommandEmpty>
                <CommandGroup heading="Partenaires actifs">
                  {availablePartners.map(partner => {
                    const config = PARTNER_TYPE_CONFIG[partner.partner_type];
                    return (
                      <CommandItem
                        key={partner.id}
                        value={partner.name}
                        onSelect={() => handleLink(partner.id)}
                        className="cursor-pointer"
                      >
                        <div className="flex items-center gap-3 w-full">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={partner.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{partner.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{partner.name}</p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className={config.color}>{config.icon}</span>
                              <span>{config.label}</span>
                            </div>
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement...</div>
      ) : linkedPartners?.length === 0 ? (
        <div className="text-sm text-muted-foreground py-3 text-center bg-muted/30 rounded-lg">
          Aucun partenaire lié
        </div>
      ) : (
        <div className="space-y-2">
          {linkedPartners?.map((lp: any) => {
            const partner = lp.partner;
            if (!partner) return null;
            const config = PARTNER_TYPE_CONFIG[partner.partner_type as PartnerType];
            return (
              <div 
                key={lp.id} 
                className="flex items-center gap-3 p-2 border rounded-lg hover:bg-muted/30 transition-colors group"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={partner.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{partner.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{partner.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={`flex items-center gap-1 ${config?.color || ''}`}>
                      {config?.icon}
                      {config?.label}
                    </span>
                    {partner.company && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 truncate">
                          <Building2 className="h-3 w-3" />
                          {partner.company}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {lp.role && (
                  <Badge variant="outline" className="text-xs h-5 shrink-0">
                    {lp.role}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={() => handleUnlink(lp.partner_id)}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
