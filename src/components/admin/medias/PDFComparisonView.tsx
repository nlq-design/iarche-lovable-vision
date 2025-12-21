import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, RefreshCw, Download, Maximize2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface PDFComparisonViewProps {
  htmlPreviewRef: React.RefObject<HTMLDivElement>;
  pdfDocument: React.ReactElement;
  title?: string;
}

/**
 * PDFComparisonView - v4.3
 * Composant de comparaison côte-à-côte entre l'aperçu HTML et le PDF basique
 * Utile pour identifier les écarts visuels entre les deux rendus
 */
export const PDFComparisonView = ({ 
  htmlPreviewRef, 
  pdfDocument,
  title = 'Comparaison HTML vs PDF'
}: PDFComparisonViewProps) => {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [differences, setDifferences] = useState<string[]>([]);
  
  const generatePdfPreview = async () => {
    setIsLoading(true);
    try {
      const blob = await pdf(pdfDocument).toBlob();
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      
      // Analyse des différences connues
      analyzeDifferences();
    } catch (error) {
      console.error('Erreur génération PDF:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeDifferences = () => {
    const knownDifferences = [
      'Gradients CSS → couleur unie en PDF basique',
      'Polices web → Helvetica par défaut',
      'Ombres/effets → non supportés en PDF basique',
      'Opacités complexes → approximées',
      'Arcs SVG → rendu simplifié',
    ];
    setDifferences(knownDifferences);
  };

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Eye className="h-4 w-4" />
          Comparer HTML vs PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            <Badge variant="secondary" className="text-xs">v4.3</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                onClick={generatePdfPreview} 
                disabled={isLoading}
                size="sm"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Générer aperçu PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowOverlay(!showOverlay)}
                disabled={!pdfBlobUrl}
              >
                {showOverlay ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showOverlay ? 'Masquer superposition' : 'Superposer'}
              </Button>
            </div>
            
            {pdfBlobUrl && (
              <a href={pdfBlobUrl} download="preview.pdf">
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger PDF
                </Button>
              </a>
            )}
          </div>

          {/* Comparaison côte-à-côte */}
          <div className="grid grid-cols-2 gap-4 h-[60vh] overflow-auto">
            {/* HTML Preview */}
            <Card className="overflow-hidden">
              <CardHeader className="py-2 px-4 bg-muted/50">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">HTML</Badge>
                  Aperçu Web (Haute-Fidélité)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 h-full overflow-auto bg-muted/20">
                <div className="relative">
                  {htmlPreviewRef.current && (
                    <div 
                      className="border rounded overflow-hidden shadow-sm"
                      dangerouslySetInnerHTML={{ 
                        __html: htmlPreviewRef.current.outerHTML 
                      }}
                    />
                  )}
                  {!htmlPreviewRef.current && (
                    <div className="flex items-center justify-center h-40 text-muted-foreground">
                      Aucun aperçu HTML disponible
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* PDF Preview */}
            <Card className="overflow-hidden">
              <CardHeader className="py-2 px-4 bg-muted/50">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Badge variant="secondary" className="bg-orange-600 text-white">PDF</Badge>
                  Rendu PDF Basique (@react-pdf)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 h-full overflow-auto bg-muted/20">
                {pdfBlobUrl ? (
                  <iframe 
                    src={pdfBlobUrl} 
                    className="w-full h-full min-h-[400px] border rounded"
                    title="Aperçu PDF"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                    <p>Cliquez sur "Générer aperçu PDF"</p>
                    <p className="text-xs">pour comparer les deux rendus</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Liste des différences connues */}
          {differences.length > 0 && (
            <Card>
              <CardHeader className="py-2 px-4">
                <CardTitle className="text-sm">Différences connues (PDF basique vs HTML)</CardTitle>
              </CardHeader>
              <CardContent className="py-2 px-4">
                <ul className="text-sm space-y-1">
                  {differences.map((diff, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-muted-foreground">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      {diff}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground mt-3 pt-2 border-t">
                  💡 <strong>Recommandation :</strong> Utilisez le "PDF Haute-Fidélité" pour un rendu fidèle à l'aperçu web.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PDFComparisonView;
