import { useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import { User, FolderOpen, Package, FileText, UserCircle, Plus, X, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EntitySelection {
  leadId: string | null;
  leadContactId: string | null;
  projectId: string | null;
  solutionId: string | null;
  meetingNoteId: string | null;
}

interface EntityOption {
  id: string;
  label: string;
  subtitle?: string;
}

interface EntityConfig {
  key: keyof EntitySelection;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  options: EntityOption[];
}

interface TranscriptionEntityLinkerProps {
  value: EntitySelection;
  onChange: (value: EntitySelection) => void;
  leads: Array<{ id: string; name: string; company?: string | null }>;
  leadContacts: Array<{ id: string; name: string; email?: string | null; position?: string | null }>;
  projects: Array<{ id: string; name: string }>;
  solutions: Array<{ id: string; title: string }>;
  meetingNotes: Array<{ id: string; objectives?: string | null; created_at?: string | null }>;
}

function EntityCombobox({
  config,
  selectedId,
  onSelect,
  onClear,
}: {
  config: EntityConfig;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = config.options.find(o => o.id === selectedId);

  if (selectedId && selected) {
    return (
      <div className="flex items-center gap-1.5">
        <Badge variant="secondary" className="flex items-center gap-1 pr-1 text-xs">
          {config.icon}
          <span className="max-w-[180px] truncate">{selected.label}</span>
          <button onClick={onClear} className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5">
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
          {config.icon}
          {config.placeholder}
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Rechercher..." className="h-8" />
          <CommandList>
            <CommandEmpty>Aucun résultat</CommandEmpty>
            <CommandGroup>
              {config.options.map(option => (
                <CommandItem
                  key={option.id}
                  value={option.label}
                  onSelect={() => {
                    onSelect(option.id);
                    setOpen(false);
                  }}
                  className="text-xs"
                >
                  <Check className={cn("mr-1.5 h-3 w-3", selectedId === option.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex-1 min-w-0">
                    <span className="truncate block">{option.label}</span>
                    {option.subtitle && <span className="text-[10px] text-muted-foreground truncate block">{option.subtitle}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function TranscriptionEntityLinker({
  value,
  onChange,
  leads,
  leadContacts,
  projects,
  solutions,
  meetingNotes,
}: TranscriptionEntityLinkerProps) {
  const configs: EntityConfig[] = [
    {
      key: 'leadId',
      label: 'Lead',
      icon: <User className="h-3 w-3" />,
      placeholder: '+ Lead',
      options: leads.map(l => ({
        id: l.id,
        label: `${l.name}${l.company ? ` — ${l.company}` : ''}`,
      })),
    },
    {
      key: 'leadContactId',
      label: 'Contact',
      icon: <UserCircle className="h-3 w-3" />,
      placeholder: '+ Contact',
      options: leadContacts.map(c => ({
        id: c.id,
        label: c.name,
        subtitle: c.email || c.position || undefined,
      })),
    },
    {
      key: 'projectId',
      label: 'Projet',
      icon: <FolderOpen className="h-3 w-3" />,
      placeholder: '+ Projet',
      options: projects.map(p => ({ id: p.id, label: p.name })),
    },
    {
      key: 'solutionId',
      label: 'Solution',
      icon: <Package className="h-3 w-3" />,
      placeholder: '+ Solution',
      options: solutions.map(s => ({ id: s.id, label: s.title })),
    },
    {
      key: 'meetingNoteId',
      label: 'CR',
      icon: <FileText className="h-3 w-3" />,
      placeholder: '+ CR',
      options: meetingNotes.map(m => ({
        id: m.id,
        label: m.objectives
          ? m.objectives.substring(0, 50) + (m.objectives.length > 50 ? '...' : '')
          : `CR du ${m.created_at ? new Date(m.created_at).toLocaleDateString('fr-FR') : '?'}`,
      })),
    },
  ];

  const hasAny = Object.values(value).some(Boolean);

  return (
    <div className="space-y-2">
      <Label className="text-sm">Lier à des entités (optionnel)</Label>
      <div className="flex flex-wrap gap-1.5">
        {configs.map(config => {
          const selectedId = value[config.key];
          return (
            <EntityCombobox
              key={config.key}
              config={config}
              selectedId={selectedId}
              onSelect={(id) => onChange({ ...value, [config.key]: id })}
              onClear={() => onChange({ ...value, [config.key]: null })}
            />
          );
        })}
      </div>
      {hasAny && (
        <p className="text-[10px] text-muted-foreground">
          La transcription sera liée à toutes les entités sélectionnées.
        </p>
      )}
    </div>
  );
}
