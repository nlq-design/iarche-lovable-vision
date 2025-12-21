import React, { useState } from 'react';
import { Download, Upload, Loader2, Image, FileType } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { exportToPNG, exportToWebP, exportToSVG, uploadToMediaLibrary, ExportFormat, PngQuality } from '@/lib/mediaExport';

interface ExportActionsProps {
  elementRef: React.RefObject<HTMLDivElement>;
  filename: string;
  quality: PngQuality;
  backgroundColor?: string;
  width?: number;
  height?: number;
  onUploadComplete?: (url: string) => void;
  showSVG?: boolean; // Option pour afficher/masquer l'export SVG
}

export default function ExportActions({
  elementRef,
  filename,
  quality,
  backgroundColor,
  width,
  height,
  onUploadComplete,
  showSVG = true,
}: ExportActionsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleExportPNG = async () => {
    setIsExporting(true);
    try {
      await exportToPNG(elementRef, filename, {
        pixelRatio: quality,
        backgroundColor,
      });
      toast.success(`PNG exporté (qualité ${quality}x)`);
    } catch (error) {
      toast.error("Erreur lors de l'export PNG");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportWebP = async () => {
    setIsExporting(true);
    try {
      await exportToWebP(elementRef, filename, {
        pixelRatio: quality,
        backgroundColor,
        width,
        height,
        quality: 0.9,
      });
      toast.success('WebP exporté (compression ~50%)');
    } catch (error) {
      toast.error("Erreur lors de l'export WebP");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSVG = async () => {
    setIsExporting(true);
    try {
      await exportToSVG(elementRef, filename, {
        backgroundColor,
        width,
        height,
      });
      toast.success('SVG exporté (vectoriel)');
    } catch (error) {
      toast.error("Erreur lors de l'export SVG");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleUpload = async (format: ExportFormat) => {
    setIsUploading(true);
    try {
      const url = await uploadToMediaLibrary(elementRef, filename, format, {
        pixelRatio: quality,
        backgroundColor,
        width,
        height,
      });
      toast.success(`Image uploadée vers la bibliothèque`);
      onUploadComplete?.(url);
      
      // Copy URL to clipboard
      await navigator.clipboard.writeText(url);
      toast.success('URL copiée dans le presse-papier');
    } catch (error) {
      toast.error("Erreur lors de l'upload");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button disabled={isExporting || isUploading} className="gap-2">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exporter
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Téléchargement direct
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={handleExportPNG}>
            <Image className="h-4 w-4 mr-2" />
            PNG (haute qualité {quality}x)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportWebP}>
            <Image className="h-4 w-4 mr-2" />
            WebP (compressé ~50%)
          </DropdownMenuItem>
          {showSVG && (
            <DropdownMenuItem onClick={handleExportSVG}>
              <FileType className="h-4 w-4 mr-2" />
              SVG (vectoriel)
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Upload bibliothèque
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleUpload('png')} disabled={isUploading}>
            {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload PNG
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleUpload('webp')} disabled={isUploading}>
            {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload WebP
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
