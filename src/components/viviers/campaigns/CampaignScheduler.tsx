import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, Save, RefreshCw } from 'lucide-react';

interface ScheduleDay {
  enabled: boolean;
  label: string;
}

interface CampaignSchedule {
  days: Record<number, boolean>;
  timezone: string;
  timing: {
    from: string;
    to: string;
  };
}

interface CampaignSchedulerProps {
  schedule?: CampaignSchedule;
  onSave: (schedule: CampaignSchedule) => Promise<void>;
  disabled?: boolean;
}

const DEFAULT_SCHEDULE: CampaignSchedule = {
  days: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: false, 0: false },
  timezone: 'Europe/Paris',
  timing: { from: '09:00', to: '18:00' },
};

const DAY_LABELS: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Jeu',
  5: 'Ven',
  6: 'Sam',
  0: 'Dim',
};

const TIMEZONES = [
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/London', label: 'Londres (GMT)' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
];

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
];

export function CampaignScheduler({ 
  schedule: initialSchedule, 
  onSave,
  disabled = false,
}: CampaignSchedulerProps) {
  const [schedule, setSchedule] = useState<CampaignSchedule>(initialSchedule || DEFAULT_SCHEDULE);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (initialSchedule) {
      setSchedule(initialSchedule);
    }
  }, [initialSchedule]);

  const toggleDay = (day: number) => {
    const newDays = { ...schedule.days, [day]: !schedule.days[day] };
    setSchedule({ ...schedule, days: newDays });
    setHasChanges(true);
  };

  const updateTimezone = (timezone: string) => {
    setSchedule({ ...schedule, timezone });
    setHasChanges(true);
  };

  const updateTiming = (field: 'from' | 'to', value: string) => {
    setSchedule({ 
      ...schedule, 
      timing: { ...schedule.timing, [field]: value } 
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(schedule);
      setHasChanges(false);
    } finally {
      setIsSaving(false);
    }
  };

  const activeDaysCount = Object.values(schedule.days).filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <CardTitle>Planning d'envoi</CardTitle>
              <CardDescription>
                Configurez les jours et horaires d'envoi de la campagne
              </CardDescription>
            </div>
          </div>
          {hasChanges && (
            <Button onClick={handleSave} disabled={isSaving || disabled}>
              {isSaving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Enregistrer
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Days Selection */}
        <div>
          <Label className="text-sm font-medium mb-3 block">
            Jours d'envoi
            <Badge variant="secondary" className="ml-2">
              {activeDaysCount} jour{activeDaysCount > 1 ? 's' : ''} actif{activeDaysCount > 1 ? 's' : ''}
            </Badge>
          </Label>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => (
              <Button
                key={day}
                type="button"
                variant={schedule.days[day] ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleDay(day)}
                disabled={disabled}
                className="min-w-[50px]"
              >
                {DAY_LABELS[day]}
              </Button>
            ))}
          </div>
        </div>

        {/* Time Range */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Début
            </Label>
            <Select 
              value={schedule.timing.from} 
              onValueChange={(v) => updateTiming('from', v)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Fin
            </Label>
            <Select 
              value={schedule.timing.to} 
              onValueChange={(v) => updateTiming('to', v)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.filter(t => t > schedule.timing.from).map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Fuseau horaire</Label>
            <Select 
              value={schedule.timezone} 
              onValueChange={updateTimezone}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Résumé :</strong> Envoi du {DAY_LABELS[Object.entries(schedule.days).find(([_, v]) => v)?.[0] as unknown as number] || 'Lun'} au {DAY_LABELS[Object.entries(schedule.days).reverse().find(([_, v]) => v)?.[0] as unknown as number] || 'Ven'}, 
            de {schedule.timing.from} à {schedule.timing.to} ({schedule.timezone.replace('_', ' ')})
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
