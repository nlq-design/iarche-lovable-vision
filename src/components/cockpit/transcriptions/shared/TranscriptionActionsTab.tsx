import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { User, Calendar, ListTodo, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ActionItem {
  task?: string;
  step?: string;
  owner?: string;
  due_date?: string;
  due?: string;
  priority?: string;
  category?: string;
  [key: string]: unknown;
}

interface TranscriptionActionsTabProps {
  actionItems: (ActionItem | string)[];
  transcriptionId: string;
  leadId?: string | null;
  projectId?: string | null;
  onCreateTask: (task: {
    title: string;
    task_type: string;
    priority: 'low' | 'medium' | 'high';
    lead_id: string | null;
    project_id: string | null;
    due_date: string | null;
    ai_generated: boolean;
    ai_metadata: Record<string, unknown>;
  }) => void;
}

// Safe string converter
const safeStr = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

// Parse due_date string (YYYY-MM-DD or various French formats)
const parseDueDate = (raw: string): string | null => {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const isoMatch = raw.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  const frMatch = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (frMatch) {
    const [, d, m, y] = frMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
};

export function TranscriptionActionsTab({
  actionItems,
  transcriptionId,
  leadId,
  projectId,
  onCreateTask,
}: TranscriptionActionsTabProps) {
  const [creatingTaskIndex, setCreatingTaskIndex] = useState<number | null>(null);
  const [creatingAll, setCreatingAll] = useState(false);

  const handleCreateAllTasks = () => {
    setCreatingAll(true);
    actionItems.forEach((action) => {
      const actionObj = action as Record<string, unknown>;
      const taskText = typeof action === 'string' ? action : safeStr(actionObj.task || actionObj.step || '');
      const priorityRaw = safeStr(actionObj.priority) || 'medium';
      const dueDateParsed = parseDueDate(safeStr(actionObj.due_date || actionObj.due));

      if (taskText) {
        onCreateTask({
          title: taskText.slice(0, 200),
          task_type: 'follow_up',
          priority: (['low', 'medium', 'high'].includes(priorityRaw) ? priorityRaw : 'medium') as 'low' | 'medium' | 'high',
          lead_id: leadId || null,
          project_id: projectId || null,
          due_date: dueDateParsed,
          ai_generated: true,
          ai_metadata: { source: 'transcription', transcription_id: transcriptionId },
        });
      }
    });
    toast.success(`${actionItems.length} tâches créées`);
    setCreatingAll(false);
  };

  const handleCreateSingleTask = (action: ActionItem | string, index: number) => {
    setCreatingTaskIndex(index);
    const actionObj = action as Record<string, unknown>;
    const taskText = typeof action === 'string' ? action : safeStr(actionObj.task || actionObj.step || '');
    const priorityRaw = safeStr(actionObj.priority) || 'medium';
    const dueDateParsed = parseDueDate(safeStr(actionObj.due_date || actionObj.due));

    if (taskText) {
      onCreateTask({
        title: taskText.slice(0, 200),
        task_type: 'follow_up',
        priority: (['low', 'medium', 'high'].includes(priorityRaw) ? priorityRaw : 'medium') as 'low' | 'medium' | 'high',
        lead_id: leadId || null,
        project_id: projectId || null,
        due_date: dueDateParsed,
        ai_generated: true,
        ai_metadata: { source: 'transcription', transcription_id: transcriptionId },
      });
    }
    setCreatingTaskIndex(null);
  };

  if (actionItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Aucune action identifiée</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk create button */}
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={handleCreateAllTasks}
          disabled={creatingAll}
        >
          {creatingAll ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <ListTodo className="h-4 w-4 mr-2" />
          )}
          Créer toutes les tâches
        </Button>
      </div>

      {actionItems.map((action, i) => {
        const actionObj = action as Record<string, unknown>;
        const taskText = typeof action === 'string' ? action : safeStr(actionObj.task || actionObj.step || '');
        const ownerText = typeof action === 'object' ? safeStr(actionObj.owner) : '';
        const dueText = typeof action === 'object' ? safeStr(actionObj.due_date || actionObj.due) : '';
        const priorityRaw = typeof action === 'object' ? safeStr(actionObj.priority) : 'medium';
        const priorityText = priorityRaw || 'medium';
        const categoryRaw = typeof action === 'object' ? safeStr(actionObj.category) : '';

        if (!taskText) return null;

        return (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-sm">{taskText}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                    {ownerText && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {ownerText}
                      </span>
                    )}
                    {dueText && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {dueText}
                      </span>
                    )}
                    {categoryRaw && (
                      <Badge variant="outline" className="text-xs h-5">
                        {categoryRaw}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      priorityText === 'high' ? 'destructive' :
                      priorityText === 'medium' ? 'default' : 'secondary'
                    }
                  >
                    {priorityText}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={creatingTaskIndex === i}
                    onClick={() => handleCreateSingleTask(action, i)}
                    title="Créer une tâche"
                  >
                    {creatingTaskIndex === i ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ListTodo className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
