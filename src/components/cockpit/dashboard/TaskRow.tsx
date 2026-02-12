import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TaskRowProps {
  task: any;
  showDate?: boolean;
  navigate: (path: string) => void;
}

export function TaskRow({ task, showDate, navigate }: TaskRowProps) {
  const provenance = task.leads?.name || task.leads?.company || task.projects?.name || '';
  const handleClick = () => {
    if (task.entity_type === 'lead' && task.entity_id) navigate(`/cockpit/leads/${task.entity_id}`);
    else if (task.entity_type === 'project' && task.entity_id) navigate(`/cockpit/projects/${task.entity_id}`);
    else if (task.lead_id) navigate(`/cockpit/leads/${task.lead_id}`);
    else if (task.project_id) navigate(`/cockpit/projects/${task.project_id}`);
  };

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer" onClick={handleClick}>
      <div className="flex-shrink-0">
        {task.priority === 'high' || task.priority === 'urgent' ? (
          <div className="h-2 w-2 rounded-full bg-destructive" />
        ) : (
          <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate">{task.title}</p>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {showDate && task.due_date && <span className="font-medium">{format(new Date(task.due_date), 'd MMM', { locale: fr })}</span>}
          {provenance && <span className="truncate">{provenance}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {task.due_time && <span className="text-[10px] text-muted-foreground font-mono">{task.due_time.slice(0, 5)}</span>}
        {task.ai_generated && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="text-[9px] px-1 py-0 cursor-help">IA</Badge>
            </TooltipTrigger>
            <TooltipContent className="text-xs max-w-[200px]">
              Tâche IA{task.entity_type && <span> · {task.entity_type}</span>}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
