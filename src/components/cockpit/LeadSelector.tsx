import React, { useState } from 'react';
import { Check, ChevronsUpDown, User, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useCockpitLeads } from '@/hooks/cockpit/useCockpitLeads';
import type { Database } from '@/integrations/supabase/types';

type Lead = Database['public']['Tables']['leads']['Row'];

interface LeadSelectorProps {
  value: string | null;
  onChange: (leadId: string | null) => void;
  className?: string;
}

export const LeadSelector = ({ value, onChange, className }: LeadSelectorProps) => {
  const [open, setOpen] = useState(false);
  const { leads, isLoading } = useCockpitLeads();

  const selectedLead = leads?.find(lead => lead.id === value);

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedLead ? (
              <div className="flex items-center gap-2 truncate">
                <User className="h-4 w-4 shrink-0" />
                <span className="truncate">{selectedLead.name}</span>
                {selectedLead.company && (
                  <span className="text-muted-foreground text-xs truncate">
                    ({selectedLead.company})
                  </span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">Sélectionner un contact...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Rechercher un contact..." />
            <CommandList>
              <CommandEmpty>Aucun contact trouvé.</CommandEmpty>
              <CommandGroup>
                {isLoading ? (
                  <CommandItem disabled>Chargement...</CommandItem>
                ) : (
                  leads?.map((lead) => (
                    <CommandItem
                      key={lead.id}
                      value={`${lead.name} ${lead.email} ${lead.company || ''}`}
                      onSelect={() => {
                        onChange(lead.id === value ? null : lead.id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === lead.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{lead.name}</span>
                          {lead.company && (
                            <span className="text-xs text-muted-foreground">
                              {lead.company}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {lead.email}
                        </p>
                      </div>
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selectedLead && (
        <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{selectedLead.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedLead.email}
                  {selectedLead.company && ` • ${selectedLead.company}`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onChange(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
