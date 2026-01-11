import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { List, RefreshCw, Trash2, ChevronRight, Loader2, FolderOpen } from 'lucide-react';
import { useVivierLists, type VivierList } from '@/hooks/viviers/useVivierLists';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface VivierListsPanelProps {
  onSelectList?: (list: VivierList) => void;
}

export function VivierListsPanel({ onSelectList }: VivierListsPanelProps) {
  const { lists, isLoading, syncList, deleteList } = useVivierLists();
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSync = async (list: VivierList) => {
    setSyncingId(list.id);
    try {
      await syncList.mutateAsync(list);
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Supprimer cette liste ?')) {
      await deleteList.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <List className="w-5 h-5" />
          Listes sauvegardées
        </CardTitle>
        <CardDescription>
          Segments de leads pour campagnes ou exports
        </CardDescription>
      </CardHeader>
      <CardContent>
        {lists.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucune liste sauvegardée</p>
            <p className="text-xs mt-1">Utilisez la recherche IA pour créer des listes</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {lists.map((list) => (
                <div
                  key={list.id}
                  className="group flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{list.name}</h4>
                      <Badge variant={list.list_type === 'dynamic' ? 'default' : 'secondary'} className="text-xs">
                        {list.list_type === 'dynamic' ? 'Dynamique' : 'Statique'}
                      </Badge>
                    </div>
                    {list.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {list.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {list.lead_count.toLocaleString('fr-FR')} leads
                      </span>
                      {list.last_sync_at && (
                        <>
                          <span>•</span>
                          <span>
                            Màj {formatDistanceToNow(new Date(list.last_sync_at), { addSuffix: true, locale: fr })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {list.list_type === 'dynamic' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleSync(list)}
                        disabled={syncingId === list.id}
                      >
                        {syncingId === list.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(list.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onSelectList?.(list)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
