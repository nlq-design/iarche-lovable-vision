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
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const ctxWorkspaceId = useWorkspaceId();
  const workspaceId = ctxWorkspaceId ?? DEFAULT_WORKSPACE_ID;

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
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowLeadSelector(false); setCreateLeadOpen(true); }}>
            <Plus className="h-3 w-3 mr-1" />
            Nouveau
          </Button>
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
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowProjectSelector(false); setCreateProjectOpen(true); }}>
            <Plus className="h-3 w-3 mr-1" />
            Nouveau
          </Button>
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

      <QuickCreateLeadDialog
        open={createLeadOpen}
        onOpenChange={setCreateLeadOpen}
        workspaceId={workspaceId}
        onCreated={(id) => onUpdate({ lead_id: id })}
      />
      <QuickCreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        workspaceId={workspaceId}
        leadId={lead?.id ?? null}
        onCreated={(id) => onUpdate({ project_id: id })}
      />
    </div>
  );
}

// ============= QUICK CREATE LEAD DIALOG =============

function QuickCreateLeadDialog({
  open,
  onOpenChange,
  workspaceId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setEmail('');
      setCompany('');
      setPhone('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          workspace_id: workspaceId,
          name: name.trim(),
          email: email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, '.')}@inconnu.local`,
          phone: phone.trim() || null,
          company: company.trim() || null,
          source: 'contact',
          qualification_status: 'new',
        })
        .select('id, name')
        .single();
      if (error) throw error;
      toast.success(`Lead "${data.name}" créé et lié`);
      onCreated(data.id);
      onOpenChange(false);
    } catch (err) {
      toast.error('Erreur lors de la création', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nouveau lead</DialogTitle>
            <DialogDescription>
              Le lead sera créé et automatiquement lié à cette transcription.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="ql-name">Nom *</Label>
              <Input id="ql-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ql-email">Email</Label>
                <Input id="ql-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ql-phone">Téléphone</Label>
                <Input id="ql-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ql-company">Entreprise</Label>
              <Input id="ql-company" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer et lier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============= QUICK CREATE PROJECT DIALOG =============

function QuickCreateProjectDialog({
  open,
  onOpenChange,
  workspaceId,
  leadId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  leadId: string | null;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        workspace_id: workspaceId,
        name: name.trim(),
        description: description.trim() || null,
        status: 'active',
        health_status: 'on_track',
      };
      if (leadId) payload.lead_id = leadId;
      const { data, error } = await supabase
        .from('projects')
        .insert(payload as never)
        .select('id, name')
        .single();
      if (error) throw error;
      toast.success(`Projet "${data.name}" créé et lié`);
      onCreated(data.id);
      onOpenChange(false);
    } catch (err) {
      toast.error('Erreur lors de la création', { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nouveau projet</DialogTitle>
            <DialogDescription>
              {leadId
                ? 'Le projet sera créé, rattaché au lead courant, et lié à cette transcription.'
                : 'Le projet sera créé et lié à cette transcription.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="qp-name">Nom *</Label>
              <Input id="qp-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: Refonte site web" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qp-desc">Description</Label>
              <Input id="qp-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer et lier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
