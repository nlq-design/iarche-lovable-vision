import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { QrCode, Link2, Image, ExternalLink, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';

interface SavedQRCode {
  name: string;
  url: string;
  created_at: string;
}

interface QuoteQRCodeSelectorProps {
  paymentLink: string;
  onPaymentLinkChange: (link: string) => void;
  onQRCodeSave?: () => void;
}

export const QuoteQRCodeSelector: React.FC<QuoteQRCodeSelectorProps> = ({
  paymentLink,
  onPaymentLinkChange,
  onQRCodeSave,
}) => {
  const [savedQRCodes, setSavedQRCodes] = useState<SavedQRCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedQR, setSelectedQR] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'url' | 'library'>('url');

  // Load saved QR codes from storage
  useEffect(() => {
    loadSavedQRCodes();
  }, []);

  const loadSavedQRCodes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('qr-codes')
        .list('', { limit: 20, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) throw error;

      const qrCodes: SavedQRCode[] = (data || [])
        .filter(file => file.name.endsWith('.png'))
        .map(file => {
          const { data: urlData } = supabase.storage.from('qr-codes').getPublicUrl(file.name);
          return {
            name: file.name,
            url: urlData.publicUrl,
            created_at: file.created_at || '',
          };
        });

      setSavedQRCodes(qrCodes);
    } catch (error) {
      console.error('Error loading QR codes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save current QR code to storage
  const handleSaveQRCode = async () => {
    if (!paymentLink.trim()) {
      toast.error('Veuillez entrer un lien de paiement');
      return;
    }

    setIsLoading(true);
    try {
      // Create a canvas to render the QR code
      const svg = document.querySelector('#quote-qr-preview svg');
      if (!svg) throw new Error('QR code not found');

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      canvas.width = 500;
      canvas.height = 500;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 500, 500);

      // Draw SVG
      const img = new window.Image();
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });
      ctx.drawImage(img, 25, 25, 450, 450);
      // Convert to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png', 1.0);
      });

      if (!blob) throw new Error('Failed to create blob');

      const timestamp = Date.now();
      const fileName = `devis-qr-${timestamp}.png`;

      const { error: uploadError } = await supabase.storage
        .from('qr-codes')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      toast.success('QR Code sauvegardé dans la bibliothèque');
      loadSavedQRCodes();
      onQRCodeSave?.();
    } catch (error) {
      console.error('Error saving QR code:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFromLibrary = (qrUrl: string) => {
    setSelectedQR(qrUrl);
    // Extract the original URL from metadata if available, or use a placeholder
    toast.success('QR Code sélectionné depuis la bibliothèque');
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <QrCode className="h-4 w-4" />
          QR Code de paiement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'url' | 'library')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" className="text-xs gap-1">
              <Link2 className="h-3 w-3" />
              Lien URL
            </TabsTrigger>
            <TabsTrigger value="library" className="text-xs gap-1">
              <Image className="h-3 w-3" />
              Bibliothèque
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-3 mt-3">
            <div>
              <Label htmlFor="paymentLink">Lien de paiement</Label>
              <Input
                id="paymentLink"
                type="url"
                placeholder="https://pay.stripe.com/..."
                value={paymentLink}
                onChange={(e) => onPaymentLinkChange(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Stripe, PayPal, SumUp, etc.
              </p>
            </div>

            {paymentLink && (
              <div className="space-y-3">
                <div id="quote-qr-preview" className="flex justify-center p-4 bg-white rounded-lg border">
                  <QRCode
                    value={paymentLink}
                    size={120}
                    level="M"
                    bgColor="#FFFFFF"
                    fgColor="#1A2B4A"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveQRCode}
                    disabled={isLoading}
                    className="flex-1 text-xs"
                  >
                    <Image className="h-3 w-3 mr-1" />
                    Sauvegarder dans la bibliothèque
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a href="/admin/medias/qr-code" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="library" className="mt-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            ) : savedQRCodes.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <QrCode className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun QR code sauvegardé</p>
                <Button
                  variant="link"
                  size="sm"
                  asChild
                  className="mt-2"
                >
                  <a href="/admin/medias/qr-code" target="_blank" rel="noopener noreferrer">
                    Créer un QR code
                  </a>
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-48">
                <div className="grid grid-cols-3 gap-2">
                  {savedQRCodes.map((qr) => (
                    <button
                      key={qr.name}
                      onClick={() => handleSelectFromLibrary(qr.url)}
                      className={`relative p-2 rounded-lg border bg-white hover:border-primary transition-colors ${
                        selectedQR === qr.url ? 'border-primary ring-2 ring-primary/20' : ''
                      }`}
                    >
                      <img
                        src={qr.url}
                        alt={qr.name}
                        className="w-full aspect-square object-contain"
                      />
                      {selectedQR === qr.url && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">
                        {qr.created_at && format(new Date(qr.created_at), 'dd/MM', { locale: fr })}
                      </p>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default QuoteQRCodeSelector;
