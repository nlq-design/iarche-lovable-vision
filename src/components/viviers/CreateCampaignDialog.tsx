import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail, ListPlus } from 'lucide-react';
import { useVivierCampaigns } from '@/hooks/viviers/useVivierCampaigns';
import { useVivierLists } from '@/hooks/viviers/useVivierLists';

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedListId?: string;
  preselectedListName?: string;
}

export function CreateCampaignDialog({
  open,
  onOpenChange,
  preselectedListId,
  preselectedListName,
}: CreateCampaignDialogProps) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [selectedListId, setSelectedListId] = useState<string>(preselectedListId || '');
  const [dailyLimit, setDailyLimit] = useState('50');
  const [isSaving, setIsSaving] = useState(false);

  const { createCampaign } = useVivierCampaigns();
  const { lists } = useVivierLists();

  // Update selected list when preselected changes
  useEffect(() => {
    if (preselectedListId) {
      setSelectedListId(preselectedListId);
      if (preselectedListName) {
        setName(`Campagne - ${preselectedListName}`);
      }
    }
  }, [preselectedListId, preselectedListName]);

  const selectedList = lists.find(l => l.id === selectedListId);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await createCampaign.mutateAsync({
        name: name.trim(),
        subject: subject.trim() || undefined,
        body_text: bodyText.trim() || undefined,
        list_id: selectedListId || undefined,
        daily_limit: parseInt(dailyLimit) || 50,
      });

      onOpenChange(false);
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setSubject('');
    setBodyText('');
    setSelectedListId('');
    setDailyLimit('50');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Nouvelle campagne
          </DialogTitle>
          <DialogDescription>
            Créez une campagne email pour contacter vos leads
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Campaign Name */}
          <div className="space-y-2">
            <Label htmlFor="campaign-name">Nom de la campagne *</Label>
            <Input
              id="campaign-name"
              placeholder="Ex: Prospection PME Tech Q1 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Select List */}
          <div className="space-y-2">
            <Label>Liste de leads</Label>
            <Select value={selectedListId} onValueChange={setSelectedListId}>
              <SelectTrigger>
                <ListPlus className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Sélectionner une liste" />
              </SelectTrigger>
              <SelectContent>
                {lists.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Aucune liste disponible
                  </div>
                ) : (
                  lists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      <span>{list.name}</span>
                      <span className="text-muted-foreground ml-2">
                        ({list.lead_count.toLocaleString('fr-FR')} leads)
                      </span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {selectedList && (
              <p className="text-xs text-muted-foreground">
                {selectedList.lead_count.toLocaleString('fr-FR')} leads ciblés • 
                Liste {selectedList.list_type === 'dynamic' ? 'dynamique' : 'statique'}
              </p>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Objet de l'email</Label>
            <Input
              id="subject"
              placeholder="Ex: Question rapide concernant {{company_name}}"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Variables: {'{{company_name}}'}, {'{{contact_name}}'}, {'{{city}}'}
            </p>
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Contenu (aperçu)</Label>
            <Textarea
              id="body"
              placeholder="Bonjour {{contact_name}},&#10;&#10;Je me permets de vous contacter..."
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              rows={4}
            />
          </div>

          {/* Daily Limit */}
          <div className="space-y-2">
            <Label htmlFor="daily-limit">Limite journalière</Label>
            <div className="flex items-center gap-2">
              <Input
                id="daily-limit"
                type="number"
                min="1"
                max="500"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">emails / jour</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Créer la campagne
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
