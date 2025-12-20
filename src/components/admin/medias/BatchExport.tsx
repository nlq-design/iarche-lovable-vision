/**
 * Export Batch Multi-Formats v4.1
 * Génère plusieurs formats en un clic
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface ExportFormatOption {
  id: string;
  label: string;
  width: number;
  height: number;
  category: string;
}

const LINKEDIN_FORMATS: ExportFormatOption[] = [
  { id: 'linkedin-square', label: 'LinkedIn Carré', width: 1200, height: 1200, category: 'LinkedIn' },
  { id: 'linkedin-landscape', label: 'LinkedIn Paysage', width: 1200, height: 627, category: 'LinkedIn' },
  { id: 'linkedin-banner', label: 'LinkedIn Bannière', width: 1584, height: 396, category: 'LinkedIn' },
];

const INSTAGRAM_FORMATS: ExportFormatOption[] = [
  { id: 'instagram-square', label: 'Instagram Carré', width: 1080, height: 1080, category: 'Instagram' },
  { id: 'instagram-story', label: 'Instagram Story', width: 1080, height: 1920, category: 'Instagram' },
  { id: 'instagram-portrait', label: 'Instagram Portrait', width: 1080, height: 1350, category: 'Instagram' },
];

const VIDEO_FORMATS: ExportFormatOption[] = [
  { id: 'youtube-thumbnail', label: 'YouTube Miniature', width: 1280, height: 720, category: 'YouTube' },
  { id: 'youtube-cover', label: 'YouTube Bannière', width: 2560, height: 1440, category: 'YouTube' },
  { id: 'youtube-shorts', label: 'YouTube Shorts', width: 1080, height: 1920, category: 'YouTube' },
];

// v4.2 - Formats verticaux séparés
const VERTICAL_FORMATS: ExportFormatOption[] = [
  { id: 'tiktok', label: 'TikTok', width: 1080, height: 1920, category: 'Vidéo verticale' },
  { id: 'reels', label: 'Instagram Reels', width: 1080, height: 1920, category: 'Vidéo verticale' },
  { id: 'pinterest', label: 'Pinterest', width: 1000, height: 1500, category: 'Pinterest' },
];

const ALL_FORMATS = [...LINKEDIN_FORMATS, ...INSTAGRAM_FORMATS, ...VIDEO_FORMATS, ...VERTICAL_FORMATS];

// Presets rapides - v4.2 amélioré
const QUICK_PRESETS = {
  linkedin: ['linkedin-square', 'linkedin-landscape'],
  social: ['linkedin-square', 'instagram-square', 'instagram-story'],
  video: ['youtube-thumbnail', 'youtube-shorts'],
  vertical: ['instagram-story', 'tiktok', 'reels', 'pinterest'],
  all: ALL_FORMATS.map(f => f.id),
};

interface BatchExportProps {
  elementRef: React.RefObject<HTMLDivElement>;
  baseFilename: string;
  quality?: number;
  onExportStart?: () => void;
  onExportComplete?: () => void;
}

export default function BatchExport({
  elementRef,
  baseFilename,
  quality = 6,
  onExportStart,
  onExportComplete,
}: BatchExportProps) {
  const [selectedFormats, setSelectedFormats] = useState<string[]>(['linkedin-square', 'linkedin-landscape']);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFormat, setCurrentFormat] = useState('');

  const toggleFormat = (formatId: string) => {
    setSelectedFormats(prev =>
      prev.includes(formatId)
        ? prev.filter(id => id !== formatId)
        : [...prev, formatId]
    );
  };

  const applyPreset = (presetKey: keyof typeof QUICK_PRESETS) => {
    setSelectedFormats(QUICK_PRESETS[presetKey]);
  };

  const handleBatchExport = async () => {
    if (!elementRef.current || selectedFormats.length === 0) {
      toast.error('Sélectionnez au moins un format');
      return;
    }

    setIsExporting(true);
    setProgress(0);
    onExportStart?.();

    const zip = new JSZip();
    const formatsToExport = ALL_FORMATS.filter(f => selectedFormats.includes(f.id));
    
    try {
      for (let i = 0; i < formatsToExport.length; i++) {
        const format = formatsToExport[i];
        setCurrentFormat(format.label);
        setProgress(((i) / formatsToExport.length) * 100);

        // Clone l'élément pour le redimensionner
        const clone = elementRef.current.cloneNode(true) as HTMLDivElement;
        clone.style.width = `${format.width}px`;
        clone.style.height = `${format.height}px`;
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.top = '0';
        document.body.appendChild(clone);

        // Attendre le rendu
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
          const dataUrl = await toPng(clone, {
            width: format.width,
            height: format.height,
            pixelRatio: quality,
            cacheBust: true,
          });

          // Convertir en blob et ajouter au zip
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          zip.file(`${baseFilename}-${format.id}.png`, blob);
        } catch (error) {
          console.error(`Erreur export ${format.label}:`, error);
        } finally {
          document.body.removeChild(clone);
        }
      }

      setProgress(100);
      setCurrentFormat('Finalisation...');

      // Générer et télécharger le ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `${baseFilename}-batch-export.zip`);

      toast.success(`${formatsToExport.length} formats exportés avec succès !`);
    } catch (error) {
      console.error('Erreur batch export:', error);
      toast.error('Erreur lors de l\'export batch');
    } finally {
      setIsExporting(false);
      setProgress(0);
      setCurrentFormat('');
      onExportComplete?.();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Export Multi-Formats
        </Label>
        <Badge variant="secondary">{selectedFormats.length} sélectionnés</Badge>
      </div>

      {/* Presets rapides - v4.2 */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={JSON.stringify(selectedFormats.sort()) === JSON.stringify(QUICK_PRESETS.linkedin.sort()) ? 'default' : 'outline'}
          onClick={() => applyPreset('linkedin')}
        >
          LinkedIn
        </Button>
        <Button
          size="sm"
          variant={JSON.stringify(selectedFormats.sort()) === JSON.stringify(QUICK_PRESETS.social.sort()) ? 'default' : 'outline'}
          onClick={() => applyPreset('social')}
        >
          Social
        </Button>
        <Button
          size="sm"
          variant={JSON.stringify(selectedFormats.sort()) === JSON.stringify(QUICK_PRESETS.video.sort()) ? 'default' : 'outline'}
          onClick={() => applyPreset('video')}
        >
          Vidéo
        </Button>
        <Button
          size="sm"
          variant={JSON.stringify(selectedFormats.sort()) === JSON.stringify(QUICK_PRESETS.vertical.sort()) ? 'default' : 'outline'}
          onClick={() => applyPreset('vertical')}
        >
          Vertical
        </Button>
        <Button
          size="sm"
          variant={selectedFormats.length === ALL_FORMATS.length ? 'default' : 'outline'}
          onClick={() => applyPreset('all')}
        >
          Tout
        </Button>
      </div>

      {/* Liste des formats */}
      <div className="grid grid-cols-2 gap-2">
        {ALL_FORMATS.map((format) => (
          <label
            key={format.id}
            className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
              selectedFormats.includes(format.id)
                ? 'bg-primary/10 border-primary'
                : 'hover:bg-muted'
            }`}
          >
            <Checkbox
              checked={selectedFormats.includes(format.id)}
              onCheckedChange={() => toggleFormat(format.id)}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{format.label}</p>
              <p className="text-xs text-muted-foreground">{format.width}×{format.height}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Progress */}
      {isExporting && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground text-center">{currentFormat}</p>
        </div>
      )}

      {/* Bouton export */}
      <Button
        className="w-full"
        onClick={handleBatchExport}
        disabled={isExporting || selectedFormats.length === 0}
      >
        {isExporting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Export en cours...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Exporter {selectedFormats.length} formats (ZIP)
          </>
        )}
      </Button>
    </div>
  );
}