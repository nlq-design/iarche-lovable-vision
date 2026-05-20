/**
 * VoiceNoteInput — Dictée vocale pour enrichir une note CRM dans AIActionDrawer.
 *
 * Pipeline :
 *  1. Hold-to-talk via MediaRecorder (audio/webm)
 *  2. POST vers transcribe-audio-chunk (AssemblyAI best, FR, word_boost vocabulaire)
 *  3. onTranscript(text) → setNoteText côté drawer
 *  4. (optionnel) Bouton "Structurer" → mode parse-voice-note du copilot
 *     pour extraire montant/échéance/contact automatiquement.
 */
import { useCallback, useRef, useState } from 'react';
import { Mic, MicOff, Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface VoiceParsedResult {
  note: string;
  structured_updates: {
    new_amount?: number;
    new_deadline?: string;
    new_contact?: string;
  };
  confidence: number;
}

interface VoiceNoteInputProps {
  /** Appelé avec le transcript brut concaténé après chaque commit */
  onTranscript: (text: string) => void;
  /** Appelé quand l'utilisateur clique "Structurer" et que le copilot renvoie un résultat */
  onParsed?: (result: VoiceParsedResult) => void;
  /** Contexte entité (pour le mode parse-voice-note) */
  entityType?: string | null;
  entityId?: string | null;
  /** Transcript courant (pour activer le bouton "Structurer") */
  currentText?: string;
  disabled?: boolean;
}

export function VoiceNoteInput({
  onTranscript,
  onParsed,
  entityType,
  entityId,
  currentText,
  disabled,
}: VoiceNoteInputProps) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [parsing, setParsing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stopStream();
        const blob = new Blob(chunksRef.current, { type: mime });
        if (blob.size < 1000) {
          toast.error('Enregistrement trop court');
          setTranscribing(false);
          return;
        }
        try {
          setTranscribing(true);
          const form = new FormData();
          form.append('file', blob, 'voice-note.webm');
          form.append('language', 'fr');
          form.append('chunk_index', '0');
          const { data, error } = await supabase.functions.invoke('transcribe-audio-chunk', {
            body: form,
          });
          if (error) throw error;
          const transcript = (data?.transcript ?? '').trim();
          if (!transcript) {
            toast.error('Aucune transcription obtenue');
            return;
          }
          onTranscript(transcript);
          toast.success('Note dictée transcrite');
        } catch (e) {
          console.error('[VoiceNoteInput] transcription failed:', e);
          toast.error(`Transcription échouée : ${e instanceof Error ? e.message : 'erreur inconnue'}`);
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (e) {
      console.error('[VoiceNoteInput] mic access failed:', e);
      toast.error('Accès micro refusé');
      stopStream();
    }
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    setRecording(false);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
  }, []);

  const handleToggle = () => {
    if (recording) stopRecording();
    else startRecording();
  };

  const handleParse = async () => {
    const transcript = (currentText ?? '').trim();
    if (!transcript) {
      toast.error('Aucun texte à structurer');
      return;
    }
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('cockpit-ai-copilot', {
        body: {
          mode: 'parse-voice-note',
          transcript,
          entityType,
          entityId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const result = data as VoiceParsedResult;
      onParsed?.(result);
      const updates = result.structured_updates ?? {};
      const fieldsCount = Object.keys(updates).length;
      if (fieldsCount > 0) {
        toast.success(`${fieldsCount} champ${fieldsCount > 1 ? 's' : ''} pré-rempli${fieldsCount > 1 ? 's' : ''} (confiance ${Math.round((result.confidence ?? 0) * 100)}%)`);
      } else {
        toast.success(`Note nettoyée (confiance ${Math.round((result.confidence ?? 0) * 100)}%)`);
      }
    } catch (e) {
      console.error('[VoiceNoteInput] parse failed:', e);
      toast.error(`Analyse échouée : ${e instanceof Error ? e.message : 'erreur inconnue'}`);
    } finally {
      setParsing(false);
    }
  };

  const busy = disabled || transcribing || parsing;
  const canParse = !!currentText?.trim() && !!onParsed && !busy && !recording;

  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        size="sm"
        variant={recording ? 'destructive' : 'outline'}
        className={cn('h-7 px-2 text-[11px]', recording && 'animate-pulse')}
        onClick={handleToggle}
        disabled={busy}
        title={recording ? 'Cliquer pour arrêter' : 'Dicter une note'}
      >
        {transcribing ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : recording ? (
          <>
            <MicOff className="h-3 w-3 mr-1" /> Arrêter
          </>
        ) : (
          <>
            <Mic className="h-3 w-3 mr-1" /> Dicter
          </>
        )}
      </Button>
      {onParsed && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-[11px]"
          onClick={handleParse}
          disabled={!canParse}
          title="Extraire montant / échéance / contact depuis le texte"
        >
          {parsing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Wand2 className="h-3 w-3 mr-1" /> Structurer
            </>
          )}
        </Button>
      )}
    </div>
  );
}
