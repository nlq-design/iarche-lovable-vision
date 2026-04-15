import { useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { COLORS } from '@/components/admin/medias/shared/tokens';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';

interface Props {
  url: string;
  title?: string;
  description?: string;
}

const EventQRCode = ({ url, title, description }: Props) => {
  const qrRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(async () => {
    if (!qrRef.current) return;
    try {
      const dataUrl = await toPng(qrRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 3,
      });
      const link = document.createElement('a');
      link.download = 'qr-inscription.png';
      link.href = dataUrl;
      link.click();
      toast.success('QR Code téléchargé');
    } catch {
      toast.error('Erreur lors du téléchargement');
    }
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <div
        ref={qrRef}
        className="bg-white rounded-xl p-6 inline-flex flex-col items-center gap-3"
      >
        <QRCodeSVG
          value={url}
          size={180}
          level="H"
          fgColor={COLORS.bleuNuit}
          includeMargin={false}
        />
        {title && (
          <p className="text-xs text-center font-medium" style={{ color: COLORS.bleuNuit, maxWidth: 180 }}>
            {title}
          </p>
        )}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          {description}
        </p>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Télécharger le QR Code
      </Button>
    </div>
  );
};

export default EventQRCode;
