import { VivierLayout } from '@/components/viviers/VivierLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { 
  Upload, 
  FileSpreadsheet, 
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { useState } from 'react';
import LogoArc from '@/components/ui/LogoArc';

export default function ViviersImport() {
  const [pastedData, setPastedData] = useState('');

  return (
    <VivierLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import de Leads</h1>
          <LogoArc size="sm" className="mt-2" />
          <p className="text-muted-foreground mt-2">
            Importez vos leads froids depuis un fichier ou par copier-coller
          </p>
        </div>

        <Tabs defaultValue="file" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="file" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Fichier CSV/XLSX
            </TabsTrigger>
            <TabsTrigger value="paste" className="flex items-center gap-2">
              <ClipboardPaste className="w-4 h-4" />
              Copier-coller
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file">
            <Card>
              <CardHeader>
                <CardTitle>Import fichier</CardTitle>
                <CardDescription>
                  Formats supportés : CSV, XLSX, XLS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Glissez-déposez votre fichier ici
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    ou cliquez pour sélectionner
                  </p>
                  <Button variant="outline">
                    Sélectionner un fichier
                  </Button>
                </div>

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Colonnes requises :</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      email
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <AlertCircle className="w-3.5 h-3.5" />
                      first_name
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <AlertCircle className="w-3.5 h-3.5" />
                      last_name
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <AlertCircle className="w-3.5 h-3.5" />
                      company
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Seul l'email est obligatoire. Les autres champs sont optionnels.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="paste">
            <Card>
              <CardHeader>
                <CardTitle>Copier-coller</CardTitle>
                <CardDescription>
                  Collez vos données depuis Excel, Google Sheets ou un fichier texte (séparateur : tabulation ou virgule)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="email,first_name,last_name,company&#10;john@example.com,John,Doe,Acme Inc&#10;jane@example.com,Jane,Smith,Tech Corp"
                  className="min-h-[200px] font-mono text-sm"
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                />
                
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {pastedData ? `${pastedData.split('\n').length - 1} lignes détectées` : 'Aucune donnée'}
                  </p>
                  <Button 
                    disabled={!pastedData.trim()}
                  >
                    Analyser les données
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Import History */}
        <Card>
          <CardHeader>
            <CardTitle>Historique des imports</CardTitle>
            <CardDescription>
              Derniers fichiers importés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">
              Aucun import récent
            </p>
          </CardContent>
        </Card>
      </div>
    </VivierLayout>
  );
}
