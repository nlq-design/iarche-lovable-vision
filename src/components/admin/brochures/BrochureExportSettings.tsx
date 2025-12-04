import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { BrochureExportSettings as ExportSettingsType, WebScrollDirection, PDFOrientation } from '@/types/brochure';
import { Monitor, FileText, ArrowDownUp, ArrowLeftRight } from 'lucide-react';

interface BrochureExportSettingsProps {
  settings: ExportSettingsType;
  onChange: (settings: ExportSettingsType) => void;
}

const BrochureExportSettings = ({ settings, onChange }: BrochureExportSettingsProps) => {
  const updateSetting = <K extends keyof ExportSettingsType>(key: K, value: ExportSettingsType[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-4">
      {/* Web Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Monitor className="h-4 w-4" />
            Affichage Web
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Direction du défilement</Label>
            <RadioGroup 
              value={settings.web_scroll} 
              onValueChange={(v) => updateSetting('web_scroll', v as WebScrollDirection)}
            >
              <div className="grid grid-cols-2 gap-4">
                <label 
                  htmlFor="vertical" 
                  className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    settings.web_scroll === 'vertical' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                  }`}
                >
                  <RadioGroupItem value="vertical" id="vertical" className="sr-only" />
                  <ArrowDownUp className="h-8 w-8 text-muted-foreground" />
                  <span className="font-medium">Vertical</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Défilement classique de haut en bas
                  </span>
                </label>
                <label 
                  htmlFor="horizontal" 
                  className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    settings.web_scroll === 'horizontal' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                  }`}
                >
                  <RadioGroupItem value="horizontal" id="horizontal" className="sr-only" />
                  <ArrowLeftRight className="h-8 w-8 text-muted-foreground" />
                  <span className="font-medium">Horizontal</span>
                  <span className="text-xs text-muted-foreground text-center">
                    Présentation type diaporama
                  </span>
                </label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* PDF Export Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Export PDF
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Orientation par défaut</Label>
            <RadioGroup 
              value={settings.pdf_orientation} 
              onValueChange={(v) => updateSetting('pdf_orientation', v as PDFOrientation)}
            >
              <div className="grid grid-cols-2 gap-4">
                <label 
                  htmlFor="portrait" 
                  className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    settings.pdf_orientation === 'portrait' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                  }`}
                >
                  <RadioGroupItem value="portrait" id="portrait" className="sr-only" />
                  <div className="w-8 h-12 border-2 border-current rounded" />
                  <span className="font-medium">Portrait</span>
                  <span className="text-xs text-muted-foreground">210 × 297 mm</span>
                </label>
                <label 
                  htmlFor="landscape" 
                  className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    settings.pdf_orientation === 'landscape' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'
                  }`}
                >
                  <RadioGroupItem value="landscape" id="landscape" className="sr-only" />
                  <div className="w-12 h-8 border-2 border-current rounded" />
                  <span className="font-medium">Paysage</span>
                  <span className="text-xs text-muted-foreground">297 × 210 mm</span>
                </label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label className="text-sm font-medium">Pagination automatique</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Répartir intelligemment les sections sur plusieurs pages
              </p>
            </div>
            <Switch
              checked={settings.pdf_auto_pagination}
              onCheckedChange={(checked) => updateSetting('pdf_auto_pagination', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview info */}
      <div className="bg-secondary/50 rounded-lg p-4 text-sm">
        <p className="text-muted-foreground">
          <strong className="text-foreground">Aperçu web</strong> : {settings.web_scroll === 'vertical' ? 'Défilement vertical classique' : 'Navigation horizontale par slides'}
        </p>
        <p className="text-muted-foreground mt-1">
          <strong className="text-foreground">Export PDF</strong> : Format A4 {settings.pdf_orientation === 'portrait' ? 'portrait' : 'paysage'}{settings.pdf_auto_pagination ? ', pagination auto' : ''}
        </p>
      </div>
    </div>
  );
};

export default BrochureExportSettings;
