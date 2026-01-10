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
import * as XLSX from 'xlsx';

export default function ViviersImport() {
  const [pastedData, setPastedData] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, string>[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { bulkCreateViviers } = useViviers();

  // Normalize header names to lowercase and remove special characters
  const normalizeHeader = (header: string): string => {
    return header
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9_]/g, '_') // Replace special chars with underscore
      .replace(/_+/g, '_') // Remove multiple underscores
      .replace(/^_|_$/g, ''); // Trim underscores
  };

  // Parse Excel file
  const parseExcel = (buffer: ArrayBuffer): Record<string, string>[] => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON with header normalization
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
    
    return rawData.map(row => {
      const normalizedRow: Record<string, string> = {};
      Object.entries(row).forEach(([key, value]) => {
        const normalizedKey = normalizeHeader(key);
        normalizedRow[normalizedKey] = String(value || '').trim();
      });
      return normalizedRow;
    });
  };

  // Parse CSV/TSV text
  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const delimiter = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
    const headers = lines[0].split(delimiter).map(h => normalizeHeader(h.trim().replace(/['"]/g, '')));
    
    return lines.slice(1).map(line => {
      const values = line.split(delimiter).map(v => v.trim().replace(/['"]/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((header, i) => {
        row[header] = values[i] || '';
      });
      return row;
    });
  };

  // Parse Excel serial date to ISO string
  const parseExcelDate = (value: string | number | undefined): string | null => {
    if (!value) return null;
    
    const strValue = String(value).trim();
    if (!strValue) return null;
    
    // Check if it's an Excel serial number (numeric)
    const numValue = Number(strValue);
    if (!isNaN(numValue) && numValue > 1000 && numValue < 100000) {
      // Excel serial date: days since 1900-01-01 (with Excel's leap year bug)
      const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
      const date = new Date(excelEpoch.getTime() + numValue * 24 * 60 * 60 * 1000);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    // Try parsing as regular date string (e.g., "7 February 1995")
    const parsed = new Date(strValue);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    
    return null; // Return null if unparseable
  };

  // Map row data to Vivier model - adapted for your Excel format
  const mapToVivier = (row: Record<string, string>) => {
    // Handle name: either use DIRIGEANT or NOM
    const dirigeant = row.dirigeant || '';
    const nom = row.nom || '';
    
    // Try to split dirigeant name (format: "LASTNAME FIRSTNAME")
    const nameParts = dirigeant.split(' ').filter(Boolean);
    const lastName = nameParts[0] || '';
    const firstName = nameParts.slice(1).join(' ') || '';

    // Build address from components
    const fullAddress = row.adresse || '';

    // Parse revenue/CA
    const ca = row.ca || '';
    
    // Parse effectif range
    const effectifMin = row.effectif_min || '';
    const effectifMax = row.effectif_max || '';
    const companySize = effectifMin && effectifMax 
      ? `${effectifMin}-${effectifMax}` 
      : (row.effectif || effectifMin || effectifMax || '');

    // Parse creation date safely
    const creationDate = parseExcelDate(row.immatriculation) || parseExcelDate(row.creation_date);

    return {
      // Email (required)
      email: row.adresse_e_mail || row.email || row.e_mail,
      
      // Company info
      company_name: nom || row.company || row.company_name || row.entreprise || row.societe,
      siret: row.siret || null,
      siren: row.siret ? row.siret.substring(0, 9) : (row.siren || null),
      naf_code: row.naf_ape || row.naf || row.ape || null,
      legal_form: row.forme_juridique || row.legal_form || null,
      industry: row.activite || row.industry || row.secteur || null,
      creation_date: creationDate,
      
      // Contact info
      contact_name: dirigeant || row.contact || row.contact_name || null,
      contact_first_name: firstName || row.first_name || row.firstname || row.prenom || null,
      contact_last_name: lastName || row.last_name || row.lastname || null,
      contact_position: row.position || row.poste || row.job_title || row.title || null,
      
      // Phone
      phone: row.telephone || row.phone || row.tel || null,
      
      // Address
      address: fullAddress || null,
      postal_code: row.code_postal || row.postal_code || row.zip || null,
      city: row.ville || row.city || null,
      region: row.region || null,
      country: row.country || row.pays || 'France',
      
      // Website/LinkedIn
      website: row.website || row.site || row.url || null,
      linkedin_url: row.linkedin || row.linkedin_url || null,
      
      // Company metrics
      company_size: companySize || null,
      revenue_range: ca || null,
      employee_count: effectifMin ? parseInt(effectifMin, 10) || null : null,
      
      // Store original data for reference
      raw_data: row,
      
      // Source info
      source: 'import',
    };
  };

  const handleImport = async (rows: Record<string, string>[]) => {
    setIsImporting(true);
    try {
      if (rows.length === 0) {
        toast.error('Aucune donnée valide trouvée');
        return;
      }

      const viviers = rows.map(mapToVivier).filter(v => v.email);
      
      if (viviers.length === 0) {
        toast.error('Aucun email valide trouvé. Assurez-vous que la colonne email existe.');
        return;
      }

      // Show preview first
      setPreviewData(rows.slice(0, 5));
      
      // Actually import
      await bulkCreateViviers.mutateAsync(viviers);
      toast.success(`${viviers.length} leads importés avec succès`);
      navigate('/viviers/leads');
    } catch (error) {
      toast.error(`Erreur d'import: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Excel file
      const buffer = await file.arrayBuffer();
      const rows = parseExcel(buffer);
      console.log('Parsed Excel rows:', rows.slice(0, 3));
      handleImport(rows);
    } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      // CSV/TXT file
      const text = await file.text();
      const rows = parseCSV(text);
      console.log('Parsed CSV rows:', rows.slice(0, 3));
      handleImport(rows);
    } else {
      toast.error('Format non supporté. Utilisez Excel (.xlsx), CSV ou TXT.');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileUpload(file);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFileUpload(file);
    }
  }, []);

  const handlePasteImport = () => {
    const rows = parseCSV(pastedData);
    handleImport(rows);
  };

  return (
    <VivierLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import de Leads</h1>
          <LogoArc size="sm" className="mt-2" />
          <p className="text-muted-foreground mt-2">Importez vos leads froids depuis un fichier Excel, CSV ou par copier-coller</p>
        </div>

        <Tabs defaultValue="file" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="file" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Fichier Excel/CSV
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
                <CardDescription>Formats supportés : Excel (.xlsx, .xls), CSV, TXT</CardDescription>
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
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept=".xlsx,.xls,.csv,.txt" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
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
                  <h4 className="font-medium mb-3">Colonnes reconnues automatiquement :</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                    <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-success" />ADRESSE E-MAIL *</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><AlertCircle className="w-3.5 h-3.5" />NOM (société)</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><AlertCircle className="w-3.5 h-3.5" />DIRIGEANT</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><AlertCircle className="w-3.5 h-3.5" />TELEPHONE</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><AlertCircle className="w-3.5 h-3.5" />ADRESSE</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><AlertCircle className="w-3.5 h-3.5" />VILLE</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><AlertCircle className="w-3.5 h-3.5" />CODE POSTAL</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><AlertCircle className="w-3.5 h-3.5" />ACTIVITE</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><AlertCircle className="w-3.5 h-3.5" />SIRET</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><AlertCircle className="w-3.5 h-3.5" />NAF APE</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><AlertCircle className="w-3.5 h-3.5" />FORME_JURIDIQUE</span>
                    <span className="flex items-center gap-1.5 text-muted-foreground"><AlertCircle className="w-3.5 h-3.5" />CA / EFFECTIF</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">* Seul l'email (ADRESSE E-MAIL) est obligatoire.</p>
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
                  placeholder="email;nom;telephone;ville&#10;john@example.com;Acme Inc;05 59 00 00 00;Pau&#10;jane@example.com;Tech Corp;05 59 11 11 11;Bayonne"
                  className="min-h-[200px] font-mono text-sm"
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                />
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {pastedData ? `${pastedData.split('\n').filter(l => l.trim()).length - 1} lignes détectées` : 'Aucune donnée'}
                  </p>
                  <Button onClick={handlePasteImport} disabled={!pastedData.trim() || isImporting}>
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
