import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOwnerProfile } from '@/hooks/cockpit/useOwnerProfile';
import { OwnerBadge } from './OwnerBadge';

interface OwnerAssignFieldProps {
  assignedTo: string | null | undefined;
  onAssign: (userId: string) => void;
  onUnassign: () => void;
  label?: string;
}

export function OwnerAssignField({ assignedTo, onAssign, onUnassign, label = 'Responsable' }: OwnerAssignFieldProps) {
  const { user } = useAuth();
  const { isOwner } = useOwnerProfile();
  const isMine = assignedTo && user?.id && assignedTo === user.id;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-medium text-muted-foreground shrink-0">{label}</span>
        {assignedTo ? (
          <OwnerBadge userId={assignedTo} size="md" />
        ) : (
          <span className="text-xs text-muted-foreground italic">Non assigné</span>
        )}
      </div>
      {!assignedTo && user?.id && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 shrink-0"
          onClick={() => onAssign(user.id)}
        >
          <UserPlus className="h-3 w-3" />
          M'assigner
        </Button>
      )}
      {isMine && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1 text-muted-foreground shrink-0"
          onClick={onUnassign}
        >
          <UserMinus className="h-3 w-3" />
          Retirer
        </Button>
      )}
    </div>
  );
}
