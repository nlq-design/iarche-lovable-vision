import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User,
  FolderOpen,
  Package,
  FileText,
  UserPlus,
  X,
  Users,
  FolderPlus,
  PackagePlus,
  Plus,
  Loader2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWorkspaceId } from '@/contexts/WorkspaceContext';
import { DEFAULT_WORKSPACE_ID } from '@/lib/constants/workspace';

interface Lead {
  id: string;
  name: string;
  company?: string | null;
}

interface Project {
  id: string;
  name: string;
}

interface Solution {
  id: string;
  title: string;
}

interface Contact {
  id: string;
  name: string;
  position?: string | null;
}

interface MeetingNote {
  id: string;
  objectives?: string | null;
}

interface TranscriptionEntityLinksProps {
  transcriptionId: string;
  lead?: Lead | null;
  leadContact?: Contact | null;
  project?: Project | null;
  solution?: Solution | null;
  meetingNote?: MeetingNote | null;
  leads: Lead[];
  projects: Project[];
  solutions: Solution[];
  leadContacts: Contact[];
  onUpdate: (updates: Record<string, string | null>) => void;
  onNavigate: (path: string) => void;
  onClose?: () => void;
}

export function TranscriptionEntityLinks({
  transcriptionId,
  lead,
  leadContact,
  project,
  solution,
  meetingNote,
  leads,
  projects,
  solutions,
  leadContacts,
  onUpdate,
  onNavigate,
  onClose,
}: TranscriptionEntityLinksProps) {
  const [showLeadSelector, setShowLeadSelector] = useState(false);
  const [showContactSelector, setShowContactSelector] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showSolutionSelector, setShowSolutionSelector] = useState(false);

  const handleNavigate = (path: string) => {
    onClose?.();
    onNavigate(path);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {/* Lead Link */}
      {lead ? (
        <Badge 
          variant="secondary" 
          className="cursor-pointer group" 
          onClick={() => handleNavigate(`/cockpit/leads/${lead.id}`)}
        >
          <User className="h-3 w-3 mr-1" />
          {lead.name}
          <button 
            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ lead_id: null });
            }}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ) : showLeadSelector ? (
        <div className="flex items-center gap-2">
          <Select onValueChange={(leadId) => {
            onUpdate({ lead_id: leadId });
            setShowLeadSelector(false);
          }}>
            <SelectTrigger className="h-7 w-48 text-xs">
              <SelectValue placeholder="Sélectionner un lead..." />
            </SelectTrigger>
            <SelectContent>
              {leads.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name} {l.company && `(${l.company})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowLeadSelector(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Badge 
          variant="outline" 
          className="cursor-pointer hover:bg-muted"
          onClick={() => setShowLeadSelector(true)}
        >
          <UserPlus className="h-3 w-3 mr-1" />
          Lier à un lead
        </Badge>
      )}

      {/* Contact Link - Only show when lead is linked */}
      {lead && (
        leadContact ? (
          <Badge variant="outline" className="group">
            <Users className="h-3 w-3 mr-1" />
            {leadContact.name}
            {leadContact.position && (
              <span className="text-muted-foreground ml-1">({leadContact.position})</span>
            )}
            <button 
              className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ lead_contact_id: null });
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ) : showContactSelector ? (
          <div className="flex items-center gap-2">
            <Select onValueChange={(contactId) => {
              onUpdate({ lead_contact_id: contactId });
              setShowContactSelector(false);
            }}>
              <SelectTrigger className="h-7 w-48 text-xs">
                <SelectValue placeholder="Sélectionner un contact..." />
              </SelectTrigger>
              <SelectContent>
                {leadContacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.position && `(${c.position})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowContactSelector(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : leadContacts.length > 0 ? (
          <Badge 
            variant="outline" 
            className="cursor-pointer hover:bg-muted"
            onClick={() => setShowContactSelector(true)}
          >
            <Users className="h-3 w-3 mr-1" />
            Lier à un contact
          </Badge>
        ) : null
      )}

      {/* Project Link */}
      {project ? (
        <Badge 
          variant="secondary" 
          className="cursor-pointer group" 
          onClick={() => handleNavigate(`/cockpit/projects/${project.id}`)}
        >
          <FolderOpen className="h-3 w-3 mr-1" />
          {project.name}
          <button 
            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ project_id: null });
            }}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ) : showProjectSelector ? (
        <div className="flex items-center gap-2">
          <Select onValueChange={(projectId) => {
            onUpdate({ project_id: projectId });
            setShowProjectSelector(false);
          }}>
            <SelectTrigger className="h-7 w-48 text-xs">
              <SelectValue placeholder="Sélectionner un projet..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowProjectSelector(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Badge 
          variant="outline" 
          className="cursor-pointer hover:bg-muted"
          onClick={() => setShowProjectSelector(true)}
        >
          <FolderPlus className="h-3 w-3 mr-1" />
          Lier à un projet
        </Badge>
      )}

      {/* Solution Link */}
      {solution ? (
        <Badge 
          variant="secondary" 
          className="cursor-pointer group" 
          onClick={() => handleNavigate(`/cockpit/solutions/${solution.id}`)}
        >
          <Package className="h-3 w-3 mr-1" />
          {solution.title}
          <button 
            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({ solution_id: null });
            }}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ) : showSolutionSelector ? (
        <div className="flex items-center gap-2">
          <Select onValueChange={(solutionId) => {
            onUpdate({ solution_id: solutionId });
            setShowSolutionSelector(false);
          }}>
            <SelectTrigger className="h-7 w-48 text-xs">
              <SelectValue placeholder="Sélectionner une solution..." />
            </SelectTrigger>
            <SelectContent>
              {solutions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowSolutionSelector(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Badge 
          variant="outline" 
          className="cursor-pointer hover:bg-muted"
          onClick={() => setShowSolutionSelector(true)}
        >
          <PackagePlus className="h-3 w-3 mr-1" />
          Lier à une solution
        </Badge>
      )}

      {/* Meeting Note Link (read only) */}
      {meetingNote && (
        <Badge 
          variant="secondary" 
          className="cursor-pointer" 
          onClick={() => handleNavigate(`/cockpit/agenda`)}
        >
          <FileText className="h-3 w-3 mr-1" />
          {meetingNote.objectives 
            ? meetingNote.objectives.substring(0, 30) + '...'
            : 'Compte-rendu'
          }
        </Badge>
      )}
    </div>
  );
}
