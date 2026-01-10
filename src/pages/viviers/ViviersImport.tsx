import { VivierLayout } from '@/components/viviers/VivierLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, FileSpreadsheet, ClipboardPaste, CheckCircle2, AlertCircle, ArrowRight, Loader2, AlertTriangle, Copy, RefreshCw } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import LogoArc from '@/components/ui/LogoArc';
import { useViviers, type Vivier } from '@/hooks/viviers';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';

type DuplicateAction = 'skip' | 'update';

interface ParsedVivier {
  data: Partial<Vivier>;
  isDuplicate: boolean;
  existingId?: string;
}

export default function ViviersImport() {
  const [pastedData, setPastedData] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedVivier[] | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<DuplicateAction>('skip');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { bulkCreateViviers } = useViviers();

  // Normalize header names to lowercase and remove special characters
  const normalizeHeader = (header: string): string => {
    return header
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  // Parse Excel file
  const parseExcel = (buffer: ArrayBuffer): Record<string, string>[] => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
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
    
    const numValue = Number(strValue);
    if (!isNaN(numValue) && numValue > 1000 && numValue < 100000) {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + numValue * 24 * 60 * 60 * 1000);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    const parsed = new Date(strValue);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    
    return null;
  };

  // Safe integer parser - returns null if out of range or invalid
  const safeParseInt = (value: string | undefined, maxValue: number = 2147483647): number | null => {
    if (!value) return null;
    const trimmed = String(value).trim().replace(/\s/g, '');
    if (!trimmed) return null;
    
    // Only parse if it looks like a reasonable number (not a SIRET/SIREN)
    if (trimmed.length > 9) return null; // Too long to be employee count
    
    const num = parseInt(trimmed, 10);
    if (isNaN(num) || num < 0 || num > maxValue) return null;
    return num;
  };

  // Safe string cleaner - ensures text doesn't exceed limits
  const safeString = (value: string | undefined, maxLength: number = 500): string | null => {
    if (!value) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    return trimmed.substring(0, maxLength);
  };

  // Safe SIRET/SIREN - keeps as string, validates format
  const safeSiret = (value: string | undefined): string | null => {
    if (!value) return null;
    const cleaned = String(value).trim().replace(/\s/g, '');
    if (!cleaned) return null;
    // SIRET is 14 digits, SIREN is 9 digits - keep as string
    if (!/^\d{9,14}$/.test(cleaned)) return null;
    return cleaned;
  };

  // Map row data to Vivier model with robust parsing
  const mapToVivier = (row: Record<string, string>): Partial<Vivier> => {
    const dirigeant = row.dirigeant || '';
    const nom = row.nom || '';
    const nameParts = dirigeant.split(' ').filter(Boolean);
    const lastName = nameParts[0] || '';
    const firstName = nameParts.slice(1).join(' ') || '';
    const fullAddress = row.adresse || '';
    const ca = row.ca || '';
    const effectifMin = row.effectif_min || '';
    const effectifMax = row.effectif_max || '';
    const companySize = effectifMin && effectifMax 
      ? `${effectifMin}-${effectifMax}` 
      : (row.effectif || effectifMin || effectifMax || '');
    const creationDate = parseExcelDate(row.immatriculation) || parseExcelDate(row.creation_date);

    // Get SIRET and derive SIREN from it
    const siret = safeSiret(row.siret);
    const siren = siret ? siret.substring(0, 9) : safeSiret(row.siren);

    return {
      email: safeString(row.adresse_e_mail || row.email || row.e_mail, 255),
      company_name: safeString(nom || row.company || row.company_name || row.entreprise || row.societe, 255),
      siret: siret,
      siren: siren,
      naf_code: safeString(row.naf_ape || row.naf || row.ape, 10),
      legal_form: safeString(row.forme_juridique || row.legal_form, 100),
      industry: safeString(row.activite || row.industry || row.secteur, 255),
      creation_date: creationDate,
      contact_name: safeString(dirigeant || row.contact || row.contact_name, 255),
      contact_first_name: safeString(firstName || row.first_name || row.firstname || row.prenom, 100),
      contact_last_name: safeString(lastName || row.last_name || row.lastname, 100),
      contact_position: safeString(row.position || row.poste || row.job_title || row.title, 100),
      phone: safeString(row.telephone || row.phone || row.tel, 50),
      address: safeString(fullAddress, 500),
      postal_code: safeString(row.code_postal || row.postal_code || row.zip, 20),
      city: safeString(row.ville || row.city, 100),
      region: safeString(row.region, 100),
      country: safeString(row.country || row.pays, 100) || 'France',
      website: safeString(row.website || row.site || row.url, 255),
      linkedin_url: safeString(row.linkedin || row.linkedin_url, 255),
      company_size: safeString(companySize, 50),
      revenue_range: safeString(ca, 50),
      employee_count: safeParseInt(effectifMin) || safeParseInt(row.effectif),
      raw_data: row as any,
      source: 'import',
    };
  };

  // Check for duplicates using RPC function - handles 30k+ emails without URL limits
  const checkDuplicates = async (viviers: Partial<Vivier>[]): Promise<ParsedVivier[]> => {
    const emails = viviers.map(v => v.email).filter(Boolean) as string[];
    
    if (emails.length === 0) return viviers.map(data => ({ data, isDuplicate: false }));

    // Use RPC function to check duplicates in batches of 5000 (POST body, no URL limit)
    const BATCH_SIZE = 5000;
    const existingEmailMap = new Map<string, string>();

    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      
      const { data: existingViviers, error } = await supabase
        .rpc('viviers_lookup_existing_by_email', { emails: batch });

      if (error) {
        console.error('Error checking duplicates:', error);
        continue;
      }

      (existingViviers || []).forEach((v: { id: string; email: string }) => {
        if (v.email) existingEmailMap.set(v.email.toLowerCase(), v.id);
      });
    }

    return viviers.map(data => {
      const emailLower = data.email?.toLowerCase();
      const existingId = emailLower ? existingEmailMap.get(emailLower) : undefined;
      return {
        data,
        isDuplicate: !!existingId,
        existingId,
      };
    });
  };

  // Analyze file and detect duplicates
  const handleAnalyze = async (rows: Record<string, string>[]) => {
    setIsAnalyzing(true);
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

      // Check for duplicates
      const analyzed = await checkDuplicates(viviers);
      setParsedData(analyzed);
      
      // Select all non-duplicates by default
      const nonDuplicateIndices = new Set(
        analyzed.map((p, i) => (!p.isDuplicate ? i : -1)).filter(i => i >= 0)
      );
      setSelectedRows(nonDuplicateIndices);
      
      const duplicateCount = analyzed.filter(p => p.isDuplicate).length;
      if (duplicateCount > 0) {
        toast.warning(`${duplicateCount} doublon${duplicateCount > 1 ? 's' : ''} détecté${duplicateCount > 1 ? 's' : ''} sur ${analyzed.length} leads`);
      } else {
        toast.success(`${analyzed.length} leads prêts à importer (aucun doublon)`);
      }
    } catch (error) {
      toast.error(`Erreur d'analyse: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Perform the actual import with batch processing
  const handleImport = async () => {
    if (!parsedData) return;
    
    setIsImporting(true);
    setImportProgress(0);
    
    try {
      const toImport: Partial<Vivier>[] = [];
      const toUpdate: { id: string; data: Partial<Vivier> }[] = [];

      parsedData.forEach((item, index) => {
        if (!selectedRows.has(index)) return;
        
        if (item.isDuplicate && duplicateAction === 'update' && item.existingId) {
          toUpdate.push({ id: item.existingId, data: item.data });
        } else if (!item.isDuplicate) {
          toImport.push(item.data);
        }
      });

      const totalOperations = toImport.length + toUpdate.length;
      setImportTotal(totalOperations);
      let processed = 0;

      // Bulk insert new entries in batches
      if (toImport.length > 0) {
        const BATCH_SIZE = 500;
        for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
          const batch = toImport.slice(i, i + BATCH_SIZE);
          const batchData = batch.map(v => {
            const { id, ...rest } = v;
            return { ...rest, source: v.source || 'import', status: 'new' };
          });
          
          const { error } = await supabase
            .from('viviers')
            .insert(batchData as any);

          if (error) throw error;
          
          processed += batch.length;
          setImportProgress(Math.round((processed / totalOperations) * 100));
        }
      }

      // Update existing entries in batches
      if (toUpdate.length > 0) {
        const UPDATE_BATCH_SIZE = 50;
        for (let i = 0; i < toUpdate.length; i += UPDATE_BATCH_SIZE) {
          const batch = toUpdate.slice(i, i + UPDATE_BATCH_SIZE);
          
          await Promise.all(
            batch.map(async ({ id, data }) => {
              const { id: _, ...updateData } = data;
              await supabase
                .from('viviers')
                .update({ ...updateData, updated_at: new Date().toISOString() })
                .eq('id', id);
            })
          );
          
          processed += batch.length;
          setImportProgress(Math.round((processed / totalOperations) * 100));
        }
      }

      toast.success(`${totalOperations} lead${totalOperations > 1 ? 's' : ''} importé${totalOperations > 1 ? 's' : ''}`);
      navigate('/viviers/leads');
    } catch (error) {
      toast.error(`Erreur d'import: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      setImportTotal(0);
    }
  };

  const handleFileUpload = async (file: File) => {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const buffer = await file.arrayBuffer();
      const rows = parseExcel(buffer);
      handleAnalyze(rows);
    } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      const text = await file.text();
      const rows = parseCSV(text);
      handleAnalyze(rows);
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

  const handlePasteAnalyze = () => {
    const rows = parseCSV(pastedData);
    handleAnalyze(rows);
  };

  const handleReset = () => {
    setParsedData(null);
    setSelectedRows(new Set());
    setPastedData('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleRowSelection = (index: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleAllRows = (selected: boolean) => {
    if (selected) {
      setSelectedRows(new Set(parsedData?.map((_, i) => i) || []));
    } else {
      setSelectedRows(new Set());
    }
  };

  const duplicateCount = parsedData?.filter(p => p.isDuplicate).length || 0;
  const newCount = parsedData?.filter(p => !p.isDuplicate).length || 0;
  const selectedCount = selectedRows.size;
  const selectedDuplicates = parsedData?.filter((p, i) => p.isDuplicate && selectedRows.has(i)).length || 0;

  return (
    <VivierLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Import de Leads</h1>
            <LogoArc size="sm" className="mt-2" />
            <p className="text-muted-foreground mt-2">Importez vos leads avec détection automatique des doublons</p>
          </div>
          {parsedData && (
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Nouveau fichier
            </Button>
          )}
        </div>

        {/* Preview & Import Section */}
        {parsedData ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-green-500/10">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{newCount}</p>
                      <p className="text-sm text-muted-foreground">Nouveaux leads</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-amber-500/10">
                      <Copy className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{duplicateCount}</p>
                      <p className="text-sm text-muted-foreground">Doublons détectés</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{selectedCount}</p>
                      <p className="text-sm text-muted-foreground">Sélectionnés</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Duplicate Action */}
            {duplicateCount > 0 && selectedDuplicates > 0 && (
              <Card className="border-amber-500/50 bg-amber-500/5">
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      <span className="font-medium">{selectedDuplicates} doublon{selectedDuplicates > 1 ? 's' : ''} sélectionné{selectedDuplicates > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="duplicateAction"
                          checked={duplicateAction === 'skip'}
                          onChange={() => setDuplicateAction('skip')}
                          className="accent-primary"
                        />
                        <span className="text-sm">Ignorer les doublons</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="duplicateAction"
                          checked={duplicateAction === 'update'}
                          onChange={() => setDuplicateAction('update')}
                          className="accent-primary"
                        />
                        <span className="text-sm">Mettre à jour les existants</span>
                      </label>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Preview Table */}
            <Card>
              <CardHeader>
                <CardTitle>Prévisualisation ({parsedData.length} lignes)</CardTitle>
                <CardDescription>Sélectionnez les leads à importer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedRows.size === parsedData.length}
                            onCheckedChange={(checked) => toggleAllRows(!!checked)}
                          />
                        </TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Entreprise</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Ville</TableHead>
                        <TableHead>Activité</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 100).map((item, index) => (
                        <TableRow 
                          key={index} 
                          className={`${item.isDuplicate ? 'bg-amber-500/5' : ''} ${!selectedRows.has(index) ? 'opacity-50' : ''}`}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedRows.has(index)}
                              onCheckedChange={() => toggleRowSelection(index)}
                            />
                          </TableCell>
                          <TableCell>
                            {item.isDuplicate ? (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                                <Copy className="w-3 h-3 mr-1" />
                                Doublon
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Nouveau
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs max-w-[200px] truncate">
                            {item.data.email}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {item.data.company_name || '-'}
                          </TableCell>
                          <TableCell className="max-w-[120px] truncate">
                            {item.data.contact_name || '-'}
                          </TableCell>
                          <TableCell className="max-w-[100px] truncate">
                            {item.data.city || '-'}
                          </TableCell>
                          <TableCell className="max-w-[120px] truncate">
                            {item.data.industry || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {parsedData.length > 100 && (
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Affichage des 100 premières lignes sur {parsedData.length}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Import Button with Progress */}
            <div className="flex flex-col gap-4">
              {isImporting && importTotal > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Import en cours...</span>
                    <span className="font-medium">{importProgress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {Math.round((importProgress / 100) * importTotal)} / {importTotal} traités
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleReset} disabled={isImporting}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={selectedCount === 0 || isImporting}
                  size="lg"
                >
                  {isImporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 mr-2" />
                  )}
                  {isImporting ? `Import... ${importProgress}%` : `Importer ${selectedCount} lead${selectedCount > 1 ? 's' : ''}`}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Upload Section */
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
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
                        <h3 className="text-lg font-semibold mb-2">Analyse des doublons...</h3>
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
                    <p className="text-xs text-muted-foreground mt-3">* Seul l'email est obligatoire. Les doublons sont détectés par email.</p>
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
                    <Button onClick={handlePasteAnalyze} disabled={!pastedData.trim() || isAnalyzing}>
                      {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                      {isAnalyzing ? 'Analyse...' : 'Analyser'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </VivierLayout>
  );
}
