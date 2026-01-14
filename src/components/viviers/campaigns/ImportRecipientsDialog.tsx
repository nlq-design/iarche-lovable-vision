import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Upload, ClipboardList, CheckCircle, FileSpreadsheet, Loader2 } from 'lucide-react';
import { parseExcelBuffer, normalizeHeader as normalizeHeaderUtil } from '@/utils/excelUtils';

interface RecipientData {
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  variables_data?: Record<string, unknown>;
}

interface ParsedRecipient extends RecipientData {
  isValid: boolean;
  error?: string;
}

interface ImportRecipientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (recipients: RecipientData[]) => Promise<number>;
  existingEmails?: string[];
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Normalize header names for flexible mapping
const normalizeHeader = (header: string): string => {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

// Find value by multiple possible column names
const findValue = (row: Record<string, string>, ...keys: string[]): string => {
  for (const key of keys) {
    if (row[key] && row[key].trim()) return row[key].trim();
  }
  return '';
};

export function ImportRecipientsDialog({
  open,
  onOpenChange,
  onImport,
  existingEmails = [],
}: ImportRecipientsDialogProps) {
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [pastedData, setPastedData] = useState('');
  const [parsedRecipients, setParsedRecipients] = useState<ParsedRecipient[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  const existingEmailsSet = new Set(existingEmails.map(e => e.toLowerCase()));

  // Parse Excel file (async with ExcelJS)
  const parseExcel = async (buffer: ArrayBuffer): Promise<Record<string, string>[]> => {
    return parseExcelBuffer(buffer);
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

  // Map raw row to RecipientData
  const mapToRecipient = (row: Record<string, string>): ParsedRecipient => {
    const email = findValue(row, 'email', 'mail', 'e_mail', 'courriel', 'adresse_email');
    const firstName = findValue(row, 'first_name', 'firstname', 'prenom', 'first');
    const lastName = findValue(row, 'last_name', 'lastname', 'nom', 'last', 'nom_famille');
    const name = findValue(row, 'name', 'nom_complet', 'full_name', 'fullname') || 
                 (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName);
    const company = findValue(row, 'company', 'entreprise', 'societe', 'company_name', 'organisation');

    // Validation
    if (!email) {
      return { email: '', isValid: false, error: 'Email manquant' };
    }
    if (!EMAIL_REGEX.test(email)) {
      return { email, isValid: false, error: 'Email invalide' };
    }
    if (existingEmailsSet.has(email.toLowerCase())) {
      return { email, name, company, isValid: false, error: 'Déjà dans la campagne' };
    }

    return {
      email: email.toLowerCase(),
      name: name || undefined,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      company: company || undefined,
      isValid: true,
    };
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      let rawData: Record<string, string>[];

      if (file.name.endsWith('.csv') || file.name.endsWith('.tsv') || file.name.endsWith('.txt')) {
        const text = new TextDecoder().decode(buffer);
        rawData = parseCSV(text);
      } else {
        rawData = await parseExcel(buffer);
      }

      const recipients = rawData.map(mapToRecipient);
      setParsedRecipients(recipients);
    } catch (error) {
      console.error('Error parsing file:', error);
      setParsedRecipients([]);
    } finally {
      setIsProcessing(false);
    }
  }, [existingEmailsSet]);

  // Handle paste data
  const handlePasteProcess = useCallback(() => {
    if (!pastedData.trim()) return;

    setIsProcessing(true);

    try {
      const rawData = parseCSV(pastedData);
      const recipients = rawData.map(mapToRecipient);
      setParsedRecipients(recipients);
    } catch (error) {
      console.error('Error parsing pasted data:', error);
      setParsedRecipients([]);
    } finally {
      setIsProcessing(false);
    }
  }, [pastedData, existingEmailsSet]);

  // Import valid recipients
  const handleImport = async () => {
    const validRecipients = parsedRecipients.filter(r => r.isValid);
    if (validRecipients.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      const count = await onImport(validRecipients);
      setImportProgress(100);
      
      // Reset and close
      setTimeout(() => {
        setParsedRecipients([]);
        setPastedData('');
        setFileName(null);
        onOpenChange(false);
      }, 500);
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedRecipients.filter(r => r.isValid).length;
  const invalidCount = parsedRecipients.filter(r => !r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Importer des recipients</DialogTitle>
          <DialogDescription>
            Importez des contacts depuis un fichier CSV/Excel ou collez directement les données.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file" className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Fichier CSV/Excel
            </TabsTrigger>
            <TabsTrigger value="paste" className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Coller les données
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="mt-4 flex-1 overflow-hidden flex flex-col">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <span className="text-primary font-medium">Cliquez pour sélectionner</span>
                {' '}ou glissez un fichier ici
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls,.tsv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Formats supportés : CSV, Excel (.xlsx, .xls), TSV
              </p>
              {fileName && (
                <Badge variant="secondary" className="mt-2">
                  {fileName}
                </Badge>
              )}
            </div>
          </TabsContent>

          <TabsContent value="paste" className="mt-4 flex-1 overflow-hidden flex flex-col">
            <div className="space-y-2 flex-1 flex flex-col">
              <Label>Collez vos données (format CSV avec en-têtes)</Label>
              <Textarea
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                placeholder="email,name,company&#10;john@example.com,John Doe,Acme Inc&#10;jane@example.com,Jane Smith,Tech Corp"
                className="flex-1 min-h-[150px] font-mono text-sm"
              />
              <Button 
                variant="outline" 
                onClick={handlePasteProcess}
                disabled={!pastedData.trim() || isProcessing}
              >
                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Analyser les données
              </Button>
            </div>
          </TabsContent>

          {/* Results preview */}
          {parsedRecipients.length > 0 && (
            <div className="mt-4 border rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
              <div className="p-3 bg-muted flex items-center justify-between">
                <div className="flex gap-3">
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {validCount} valides
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge variant="destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {invalidCount} invalides
                    </Badge>
                  )}
                </div>
              </div>
              <div className="overflow-auto flex-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Statut</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Entreprise</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRecipients.slice(0, 100).map((r, i) => (
                      <TableRow key={i} className={!r.isValid ? 'bg-red-50' : ''}>
                        <TableCell>
                          {r.isValid ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <span className="text-xs text-destructive">{r.error}</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{r.email || '-'}</TableCell>
                        <TableCell>{r.name || r.first_name || '-'}</TableCell>
                        <TableCell>{r.company || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedRecipients.length > 100 && (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    +{parsedRecipients.length - 100} autres lignes
                  </p>
                )}
              </div>
            </div>
          )}
        </Tabs>

        {isImporting && (
          <div className="mt-4">
            <Progress value={importProgress} />
            <p className="text-sm text-muted-foreground text-center mt-2">
              Import en cours...
            </p>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Annuler
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={validCount === 0 || isImporting}
          >
            {isImporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Importer {validCount} contacts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
