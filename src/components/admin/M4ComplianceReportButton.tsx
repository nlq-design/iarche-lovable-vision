import { useState } from 'react';
import { Download, FileCheck2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { generateM4ComplianceReport } from '@/lib/m4ComplianceReport';

const M4ComplianceReportButton = () => {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      generateM4ComplianceReport();
      toast.success('Rapport M4 généré');
    } catch (err) {
      console.error('Error generating M4 report:', err);
      toast.error('Échec de la génération du rapport');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="bg-background/95 border-border">
      <CardHeader>
        <div className="flex items-start gap-3">
          <FileCheck2 className="h-6 w-6 text-accent mt-0.5 shrink-0" />
          <div className="flex-1">
            <CardTitle className="text-lg text-foreground">Rapport de conformité M4</CardTitle>
            <CardDescription>
              Synthèse des contrôles A1–A8 (backend / DB) et B1–B11 (frontend / auth) avec statuts
              CONFORME / ÉCART / BLOQUANT.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleDownload}
          disabled={generating}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Télécharger le rapport PDF
        </Button>
      </CardContent>
    </Card>
  );
};

export default M4ComplianceReportButton;
