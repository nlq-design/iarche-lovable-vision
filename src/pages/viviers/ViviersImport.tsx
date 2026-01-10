import { VivierLayout } from '@/components/viviers/VivierLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileSpreadsheet, ClipboardPaste, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import LogoArc from '@/components/ui/LogoArc';
import { useViviers } from '@/hooks/viviers';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function ViviersImport() {
  const [pastedData, setPastedData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { bulkCreateViviers } = useViviers();

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    
    return lines.slice(1).map(line => {
      const values = line.split(delimiter).map(v => v.trim().replace(/['"]/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      return row;
    }).filter(row => row.email);
  };

  const mapToVivier = (row: Record<string, string>) => ({
    email: row.email || row.e_mail || row['e-mail'],
    contact_first_name: row.first_name || row.firstname || row.prenom || row.prénom,
    contact_last_name: row.last_name || row.lastname || row.nom,
    contact_name: row.name || row.contact || row.contact_name,
    company_name: row.company || row.company_name || row.entreprise || row.societe || row.société,
    phone: row.phone || row.telephone || row.téléphone || row.tel,
    website: row.website || row.site || row.url,
    linkedin_url: row.linkedin || row.linkedin_url,
    industry: row.industry || row.secteur || row.sector,
    city: row.city || row.ville,
    postal_code: row.postal_code || row.zip || row.code_postal,
    region: row.region || row.région,
    country: row.country || row.pays,
    company_size: row.company_size || row.size || row.taille,
    siret: row.siret,
    siren: row.siren,
    contact_position: row.position || row.poste || row.job_title || row.title,
  });

  const handleImport = async (text: string) => {
    setIsImporting(true);
    try {
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast.error('Aucune donnée valide trouvée');
        return;
      }

      const viviers = rows.map(mapToVivier).filter(v => v.email);
      
      if (viviers.length === 0) {
        toast.error('Aucun email valide trouvé');
        return;
      }

      await bulkCreateViviers.mutateAsync(viviers);
      navigate('/viviers/leads');
    } catch (error) {
      toast.error(`Erreur d'import: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const text = await file.text();
    handleImport(text);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      const text = await file.text();
      handleImport(text);
    } else {
      toast.error('Format non supporté. Utilisez CSV ou TXT.');
    }
  }, []);

  return (
    <VivierLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import de Leads</h1>
          <LogoArc size="sm" className="mt-2" />
          <p className="text-muted-foreground mt-2">Importez vos leads froids depuis un fichier ou par copier-coller</p>
        </div>

        <Tabs defaultValue="file" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="file" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Fichier CSV
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
                <CardDescription>Formats supportés : CSV, TXT (séparateur virgule ou tabulation)</CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
                    dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileChange} className="hidden" />
                  {isImporting ? (
                    <>
                      <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
                      <h3 className="text-lg font-semibold mb-2">Import en cours...</h3>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Glissez-déposez votre fichier ici</h3>
                      <p className="text-muted-foreground mb-4">ou cliquez pour sélectionner</p>
                      <Button variant="outline">Sélectionner un fichier</Button>
                    </>
                  )}
                </div>

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Colonnes supportées :</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" />email *</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><AlertCircle className="w-3.5 h-3.5" />first_name</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><AlertCircle className="w-3.5 h-3.5" />last_name</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><AlertCircle className="w-3.5 h-3.5" />company</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">* Seul l'email est obligatoire.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="paste">
            <Card>
              <CardHeader>
                <CardTitle>Copier-coller</CardTitle>
                <CardDescription>Collez vos données depuis Excel, Google Sheets ou un fichier texte</CardDescription>
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
                    {pastedData ? `${pastedData.split('\n').filter(l => l.trim()).length - 1} lignes détectées` : 'Aucune donnée'}
                  </p>
                  <Button onClick={() => handleImport(pastedData)} disabled={!pastedData.trim() || isImporting}>
                    {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                    {isImporting ? 'Import...' : 'Importer'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </VivierLayout>
  );
}
