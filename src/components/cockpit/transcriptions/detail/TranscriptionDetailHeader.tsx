import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ArrowLeft, Calendar, Check, X, Mail, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TranscriptionDetailHeaderProps {
  displayTitle: string;
  transcriptionDate: string | null;
  createdAt: string | null;
  statusConfig: { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } | undefined;
  onSaveTitle: (title: string) => void;
  onSaveDate: (date: Date) => void;
  onEmailClick: () => void;
  onDeleteClick: () => void;
}

export function TranscriptionDetailHeader({
  displayTitle,
  transcriptionDate,
  createdAt,
  statusConfig,
  onSaveTitle,
  onSaveDate,
  onEmailClick,
  onDeleteClick,
}: TranscriptionDetailHeaderProps) {
  const navigate = useNavigate();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(displayTitle);
  const [editingDate, setEditingDate] = useState(false);

  const handleSaveTitle = () => {
    if (titleDraft.trim()) {
      onSaveTitle(titleDraft.trim());
      setEditingTitle(false);
    }
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate('/cockpit/transcriptions')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="h-8 text-lg font-semibold"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveTitle}>
                <Check className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingTitle(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <h1
              className="text-xl font-semibold cursor-pointer hover:text-primary transition-colors"
              onClick={() => { setTitleDraft(displayTitle); setEditingTitle(true); }}
              title="Cliquer pour modifier"
            >
              {displayTitle}
            </h1>
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            {editingDate ? (
              <Popover open={editingDate} onOpenChange={setEditingDate}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-6 text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {transcriptionDate
                      ? format(new Date(transcriptionDate), 'dd MMM yyyy', { locale: fr })
                      : 'Sélectionner une date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={transcriptionDate ? new Date(transcriptionDate) : undefined}
                    onSelect={(d) => { if (d) { onSaveDate(d); setEditingDate(false); } }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <span
                className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
                onClick={() => setEditingDate(true)}
                title="Cliquer pour modifier la date"
              >
                <Calendar className="h-3 w-3" />
                {transcriptionDate
                  ? format(new Date(transcriptionDate), 'dd MMMM yyyy', { locale: fr })
                  : createdAt && format(new Date(createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {statusConfig && <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>}
        <Button variant="outline" size="sm" onClick={onEmailClick}>
          <Mail className="h-4 w-4 mr-2" />
          Email
        </Button>
        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={onDeleteClick}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
