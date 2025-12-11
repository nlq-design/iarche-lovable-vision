import React, { useState } from 'react';
import { Download, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { exportToPNG, exportToWebP, uploadToMediaLibrary, ExportFormat, PngQuality } from '@/lib/mediaExport';

interface ExportActionsProps {
  elementRef: React.RefObject<HTMLDivElement>;
  filename: string;
  quality: PngQuality;
  backgroundColor?: string;
  width?: number;
  height?: number;
  onUploadComplete?: (url: string) => void;
}

export default function ExportActions({
  elementRef,
  filename,
  quality,
  backgroundColor,
  width,
  height,
  onUploadComplete,
}: ExportActionsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleExportPNG = async () => {
    setIsExporting(true);
    try {
      await exportToPNG(elementRef, filename, {
        pixelRatio: quality,
        backgroundColor,
        width,
        height,
      });
      const exportWidth = (width || 1200) * quality;
      const exportHeight = (height || 630) * quality;
      toast.success(`PNG exporté (${exportWidth}×${exportHeight}px)`);
    } catch (error) {
      toast.error('Erreur lors de l\'export PNG');
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
      toast.error('Erreur lors de l\'export WebP');
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
      toast.error('Erreur lors de l\'upload');
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
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleExportPNG}>
            <Download className="h-4 w-4 mr-2" />
            PNG (haute qualité)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportWebP}>
            <Download className="h-4 w-4 mr-2" />
            WebP (compressé ~50%)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleUpload('png')} disabled={isUploading}>
            {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload PNG vers bibliothèque
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleUpload('webp')} disabled={isUploading}>
            {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload WebP vers bibliothèque
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
