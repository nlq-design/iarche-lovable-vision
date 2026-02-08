import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  Loader2,
  HardDrive,
  Clock,
  FileAudio,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface TranscriptionAudioPlayerProps {
  audioUrl: string | null;
  originalFilename?: string;
  source?: 'upload' | 'recording';
  fileSizeBytes?: number | null;
  durationSeconds?: number | null;
  audioFormat?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  onRetry: () => void;
  onReanalyze: () => void;
  isProcessing: boolean;
}

// Helper to format file size
const formatFileSize = (bytes: number | null) => {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

// Helper to format duration
const formatDuration = (seconds: number | null) => {
  if (!seconds) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}min ${secs}s`;
};

export function TranscriptionAudioPlayer({
  audioUrl,
  originalFilename,
  source,
  fileSizeBytes,
  durationSeconds,
  audioFormat,
  status,
  createdAt,
  updatedAt,
  onRetry,
  onReanalyze,
  isProcessing,
}: TranscriptionAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
      }
    };
  }, [audioElement]);

  const handlePlayPause = () => {
    if (!audioUrl) {
      toast.error('Fichier audio non disponible');
      return;
    }

    if (!audioElement) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        toast.error('Erreur de lecture audio');
        setIsPlaying(false);
      };
      setAudioElement(audio);
      audio.play().catch(() => toast.error('Impossible de lire l\'audio'));
      setIsPlaying(true);
    } else if (isPlaying) {
      audioElement.pause();
      setIsPlaying(false);
    } else {
      audioElement.play().catch(() => {
        setAudioElement(null);
        handlePlayPause();
      });
      setIsPlaying(true);
    }
  };

  // Check if stuck — different thresholds per status
  const isStuck = (() => {
    if (status !== 'analyzing' && status !== 'transcribing') return false;
    const referenceTime = updatedAt || createdAt;
    if (!referenceTime) return false;
    const diffMinutes = (Date.now() - new Date(referenceTime).getTime()) / (1000 * 60);
    // Transcribing can take 15+ min for long files (async polling by worker)
    // Analyzing (LLM) shouldn't take >10 min
    const threshold = status === 'transcribing' ? 30 : 10;
    return diffMinutes > threshold;
  })();

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-4">
          <Button size="icon" variant="outline" onClick={handlePlayPause} disabled={!audioUrl}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <div className="flex-1">
            <p className="text-sm font-medium">{originalFilename || 'Audio original'}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
              {source === 'upload' ? 'Fichier importé' : 'Enregistrement'}
              {fileSizeBytes && (
                <span className="flex items-center gap-1">
                  <HardDrive className="h-3 w-3" />
                  {formatFileSize(fileSizeBytes)}
                </span>
              )}
              {durationSeconds && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDuration(durationSeconds)}
                </span>
              )}
              {audioFormat ? (
                <span className="flex items-center gap-1">
                  <FileAudio className="h-3 w-3" />
                  {audioFormat.toUpperCase()}
                </span>
              ) : originalFilename ? (
                <span className="flex items-center gap-1">
                  <FileAudio className="h-3 w-3" />
                  {(originalFilename.split('.').pop() || '').toUpperCase()}
                </span>
              ) : null}
            </div>
          </div>

          {status === 'error' && (
            <Button size="sm" variant="outline" onClick={onRetry} disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Réessayer
            </Button>
          )}

          {isStuck && (
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Bloqué
              </Badge>
              <Button size="sm" variant="outline" onClick={onRetry} disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Relancer
              </Button>
            </div>
          )}

          {status === 'done' && (
            <Button size="sm" variant="outline" onClick={onReanalyze} disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Ré-analyser
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
