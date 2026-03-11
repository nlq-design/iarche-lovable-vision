import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOwnerProfile } from '@/hooks/cockpit/useOwnerProfile';

interface OwnerBadgeProps {
  userId: string | null | undefined;
  size?: 'sm' | 'md';
}

export function OwnerBadge({ userId, size = 'md' }: OwnerBadgeProps) {
  const { resolveOwner } = useOwnerProfile();
  const owner = resolveOwner(userId);

  if (!owner) return null;

  const initials = owner.display_name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (size === 'sm') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Avatar className="h-5 w-5">
            <AvatarImage src={owner.avatar_url || undefined} alt={owner.display_name} />
            <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-medium">{owner.display_name}</p>
          {owner.role_label && <p className="text-muted-foreground">{owner.role_label}</p>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-7 w-7">
        <AvatarImage src={owner.avatar_url || undefined} alt={owner.display_name} />
        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{owner.display_name}</p>
        {owner.role_label && (
          <p className="text-[11px] text-muted-foreground truncate">{owner.role_label}</p>
        )}
      </div>
    </div>
  );
}
