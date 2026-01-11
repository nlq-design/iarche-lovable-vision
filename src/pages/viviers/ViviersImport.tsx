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

interface FileQueueItem {
  file: File;
  status: 'pending' | 'processing' | 'done' | 'error';
  rowCount?: number;
  error?: string;
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
  
  // Multi-file queue state
  const [fileQueue, setFileQueue] = useState<FileQueueItem[]>([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [allParsedRows, setAllParsedRows] = useState<Record<string, string>[]>([]);

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

  // Safe email - validates email format
  const safeEmail = (value: string | undefined): string | null => {
    if (!value) return null;
    const trimmed = String(value).trim().toLowerCase();
    if (!trimmed) return null;
    // Basic email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return null;
    return trimmed;
  };

  // Helper to find first non-empty value from multiple possible column names
  const findValue = (row: Record<string, string>, ...keys: string[]): string => {
    for (const key of keys) {
      const val = row[key]?.trim();
      if (val) return val;
    }
    return '';
  };

  // Normalize French phone number
  const normalizePhone = (phone: string): string => {
    if (!phone) return '';
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    // Add leading 0 if French number (9 digits without 0)
    if (cleaned.length === 9 && !cleaned.startsWith('0')) {
      cleaned = '0' + cleaned;
    }
    // Format: 01 23 45 67 89
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    return cleaned || phone; // Return original if can't normalize
  };

  // Map row data to Vivier model with robust parsing - handles ALL CSV column variations regardless of order
  const mapToVivier = (row: Record<string, string>): Partial<Vivier> => {
    // ========== COMPANY NAME ==========
    // Possible columns: NOM, COMPANY, COMPANY_NAME, ENTREPRISE, SOCIETE, RAISON_SOCIALE, DENOMINATION
    const companyName = findValue(row, 
      'nom', 'company', 'company_name', 'entreprise', 'societe', 
      'raison_sociale', 'denomination', 'nom_entreprise', 'nom_societe'
    );

    // ========== SIRET / SIREN ==========
    // Possible columns: SIRET, SIREN, N_SIRET, NUMERO_SIRET
    const siretRaw = findValue(row, 'siret', 'n_siret', 'numero_siret', 'num_siret');
    const siret = safeSiret(siretRaw);
    const sirenRaw = findValue(row, 'siren', 'n_siren', 'numero_siren');
    const siren = siret ? siret.substring(0, 9) : safeSiret(sirenRaw);

    // ========== NAF / APE CODE ==========
    // Possible columns: NAF, APE, NAF_APE, CODE_NAF, CODE_APE, NAF_REV2
    const nafCode = findValue(row, 
      'naf_ape', 'naf', 'ape', 'code_naf', 'code_ape', 
      'naf_rev2', 'activite_principale'
    );

    // ========== LEGAL FORM ==========
    // Possible columns: FORME_JURIDIQUE, LEGAL_FORM, STATUT_JURIDIQUE, FORME_JURID, NATURE_JURIDIQUE
    const legalForm = findValue(row, 
      'forme_juridique', 'legal_form', 'statut_juridique', 
      'forme_jurid', 'nature_juridique', 'type_societe'
    );

    // ========== ACTIVITY / INDUSTRY ==========
    // Possible columns: ACTIVITE, ACTIVITY, INDUSTRY, SECTEUR, SECTEUR_ACTIVITE, LIBELLE_NAF
    const industry = findValue(row, 
      'activite', 'activity', 'industry', 'secteur', 
      'secteur_activite', 'libelle_naf', 'libelle_activite', 'metier'
    );

    // ========== CONTACT / DIRIGEANT ==========
    // Possible columns: DIRIGEANT, CONTACT, CONTACT_NAME, NOM_CONTACT, RESPONSABLE, GERANT
    const dirigeant = findValue(row, 
      'dirigeant', 'contact', 'contact_name', 'nom_contact', 
      'responsable', 'gerant', 'representant', 'interlocuteur'
    );
    
    // Parse first/last name from dirigeant if present
    let firstName = '';
    let lastName = '';
    if (dirigeant) {
      const nameParts = dirigeant.split(/[,\s]+/).filter(Boolean);
      lastName = nameParts[0] || '';
      firstName = nameParts.slice(1).join(' ') || '';
    }
    
    // Override with explicit first/last name columns if present
    firstName = findValue(row, 'prenom', 'firstname', 'first_name', 'contact_prenom') || firstName;
    lastName = findValue(row, 'nom_contact', 'lastname', 'last_name', 'contact_nom', 'nom_dirigeant') || lastName;

    // ========== CONTACT POSITION ==========
    // Possible columns: POSITION, POSTE, JOB_TITLE, TITLE, FONCTION, QUALITE
    const contactPosition = findValue(row, 
      'position', 'poste', 'job_title', 'title', 
      'fonction', 'qualite', 'role'
    );

    // ========== EMAIL ==========
    // Possible columns: EMAIL, E_MAIL, MAIL, ADRESSE_E_MAIL, ADRESSE_MAIL, COURRIEL
    const emailRaw = findValue(row, 
      'email', 'e_mail', 'mail', 'adresse_e_mail', 
      'adresse_mail', 'courriel', 'adresse_email', 'contact_email'
    );
    const email = safeEmail(emailRaw);

    // ========== PHONE ==========
    // Possible columns: TELEPHONE, PHONE, TEL, NUMERO_TELEPHONE, MOBILE, PORTABLE
    const phoneRaw = findValue(row, 
      'telephone', 'phone', 'tel', 'numero_telephone', 
      'mobile', 'portable', 'tel_fixe', 'tel_mobile', 'contact_tel'
    );
    const phone = normalizePhone(phoneRaw);

    // ========== ADDRESS ==========
    // Possible columns: ADRESSE, ADDRESS, ADRESSE_1, ADRESSE_COMPLETE, RUE, VOIE
    const address = findValue(row, 
      'adresse', 'address', 'adresse_1', 'adresse_complete', 
      'rue', 'voie', 'adresse_siege', 'adresse_postale'
    );

    // ========== POSTAL CODE ==========
    // Possible columns: CODE_POSTAL, POSTAL_CODE, CP, ZIP, CODE_POST
    const postalCode = findValue(row, 
      'code_postal', 'postal_code', 'cp', 'zip', 
      'code_post', 'code_postale'
    );

    // ========== CITY ==========
    // Possible columns: VILLE, CITY, COMMUNE, LOCALITE
    const city = findValue(row, 
      'ville', 'city', 'commune', 'localite', 
      'ville_siege', 'lieu'
    );

    // ========== REGION / DEPARTMENT ==========
    // Possible columns: DEPARTEMENT, DEPT, REGION, DEP
    const region = findValue(row, 
      'departement', 'dept', 'region', 'dep', 
      'nom_departement', 'libelle_departement'
    );

    // ========== COUNTRY ==========
    const country = findValue(row, 'pays', 'country') || 'France';

    // ========== WEBSITE ==========
    // Possible columns: WEBSITE, SITE, URL, SITE_WEB, SITE_INTERNET
    const website = findValue(row, 
      'website', 'site', 'url', 'site_web', 
      'site_internet', 'web'
    );

    // ========== LINKEDIN ==========
    const linkedinUrl = findValue(row, 
      'linkedin', 'linkedin_url', 'profil_linkedin', 'url_linkedin'
    );

    // ========== EMPLOYEE COUNT / COMPANY SIZE ==========
    // Possible columns: EFFECTIF, EFFECTIF_MIN, EFFECTIF_MAX, EMPLOYEES, NB_SALARIES, TRANCHE_EFFECTIF
    const effectifMin = findValue(row, 'effectif_min', 'effectif_minimum');
    const effectifMax = findValue(row, 'effectif_max', 'effectif_maximum');
    const effectif = findValue(row, 'effectif', 'employees', 'nb_salaries', 'nombre_salaries', 'salaries');
    const trancheEffectif = findValue(row, 'tranche_effectif', 'taille_entreprise', 'taille');
    
    let companySize = '';
    if (trancheEffectif) {
      companySize = trancheEffectif;
    } else if (effectifMin && effectifMax) {
      companySize = `${effectifMin}-${effectifMax}`;
    } else {
      companySize = effectif || effectifMin || effectifMax || '';
    }
    
    const employeeCount = safeParseInt(effectifMin) || safeParseInt(effectif);

    // ========== REVENUE / CA ==========
    // Possible columns: CA, CHIFFRE_AFFAIRES, REVENUE, CA_ANNUEL
    const caRaw = findValue(row, 
      'ca', 'chiffre_affaires', 'revenue', 'ca_annuel', 
      'chiffre_d_affaires', 'revenus'
    );
    const revenueRange = caRaw ? safeString(caRaw.replace(/[€\s]/g, '').trim(), 50) : null;

    // ========== CREATION DATE ==========
    // Possible columns: IMMATRICULATION, CREATION_DATE, DATE_CREATION, DATE_IMMATRICULATION
    const creationDateRaw = findValue(row, 
      'immatriculation', 'creation_date', 'date_creation', 
      'date_immatriculation', 'annee_creation', 'date_debut_activite'
    );
    
    let creationDate = parseExcelDate(creationDateRaw);
    if (!creationDate && creationDateRaw) {
      // Try to parse French date format "17 novembre 1999"
      const frenchMonths: Record<string, string> = {
        'janvier': '01', 'février': '02', 'fevrier': '02', 'mars': '03', 'avril': '04',
        'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08', 'aout': '08',
        'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12', 'decembre': '12'
      };
      const match = creationDateRaw.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
      if (match) {
        const [, day, monthName, year] = match;
        const month = frenchMonths[monthName.toLowerCase()];
        if (month) {
          creationDate = `${year}-${month}-${day.padStart(2, '0')}`;
        }
      }
    }

    return {
      email: email,
      company_name: safeString(companyName, 255),
      siret: siret,
      siren: siren,
      naf_code: safeString(nafCode, 10),
      legal_form: safeString(legalForm, 100),
      industry: safeString(industry, 255),
      creation_date: creationDate,
      contact_name: safeString(dirigeant, 255),
      contact_first_name: safeString(firstName, 100),
      contact_last_name: safeString(lastName, 100),
      contact_position: safeString(contactPosition, 100),
      phone: safeString(phone, 50),
      address: safeString(address, 500),
      postal_code: safeString(postalCode, 20),
      city: safeString(city, 100),
      region: safeString(region, 100),
      country: safeString(country, 100),
      website: safeString(website, 255),
      linkedin_url: safeString(linkedinUrl, 255),
      company_size: safeString(companySize, 50),
      revenue_range: revenueRange,
      employee_count: employeeCount,
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

  // Parse a single file and return rows
  const parseFile = async (file: File): Promise<Record<string, string>[]> => {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const buffer = await file.arrayBuffer();
      return parseExcel(buffer);
    } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      const text = await file.text();
      return parseCSV(text);
    }
    throw new Error('Format non supporté');
  };

  // Process the file queue sequentially
  const processFileQueue = async (files: File[]) => {
    setIsProcessingQueue(true);
    setIsAnalyzing(true);
    
    const queue: FileQueueItem[] = files.map(file => ({
      file,
      status: 'pending' as const,
    }));
    setFileQueue(queue);
    
    let allRows: Record<string, string>[] = [];
    
    for (let i = 0; i < queue.length; i++) {
      setCurrentFileIndex(i);
      setFileQueue(prev => prev.map((item, idx) => 
        idx === i ? { ...item, status: 'processing' } : item
      ));
      
      try {
        const rows = await parseFile(queue[i].file);
        allRows = [...allRows, ...rows];
        
        setFileQueue(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'done', rowCount: rows.length } : item
        ));
        
        toast.success(`${queue[i].file.name}: ${rows.length} lignes`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        setFileQueue(prev => prev.map((item, idx) => 
          idx === i ? { ...item, status: 'error', error: errorMessage } : item
        ));
        toast.error(`${queue[i].file.name}: ${errorMessage}`);
      }
      
      // Small delay to allow UI updates
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    setAllParsedRows(allRows);
    setIsProcessingQueue(false);
    
    // Now analyze all collected rows
    if (allRows.length > 0) {
      await handleAnalyze(allRows);
    } else {
      setIsAnalyzing(false);
      toast.error('Aucune donnée valide trouvée dans les fichiers');
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

  // Handle multiple file selection
  const handleMultipleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const name = file.name.toLowerCase();
      return name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv') || name.endsWith('.txt');
    });
    
    if (validFiles.length === 0) {
      toast.error('Aucun fichier valide sélectionné');
      return;
    }
    
    if (validFiles.length === 1) {
      await handleFileUpload(validFiles[0]);
    } else {
      await processFileQueue(validFiles);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await handleMultipleFiles(files);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleMultipleFiles(files);
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
    setFileQueue([]);
    setAllParsedRows([]);
    setCurrentFileIndex(0);
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
                      multiple
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                    {isAnalyzing ? (
                      <div className="space-y-4">
                        <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
                        <h3 className="text-lg font-semibold">
                          {isProcessingQueue ? 'Lecture des fichiers...' : 'Analyse des doublons...'}
                        </h3>
                        
                        {/* File Queue Progress */}
                        {fileQueue.length > 0 && (
                          <div className="text-left max-w-md mx-auto space-y-2">
                            {fileQueue.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                {item.status === 'pending' && (
                                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                                )}
                                {item.status === 'processing' && (
                                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                                )}
                                {item.status === 'done' && (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                )}
                                {item.status === 'error' && (
                                  <AlertCircle className="w-4 h-4 text-destructive" />
                                )}
                                <span className={item.status === 'processing' ? 'font-medium' : 'text-muted-foreground'}>
                                  {item.file.name}
                                </span>
                                {item.rowCount !== undefined && (
                                  <Badge variant="secondary" className="ml-auto">{item.rowCount} lignes</Badge>
                                )}
                                {item.error && (
                                  <span className="text-destructive text-xs ml-auto">{item.error}</span>
                                )}
                              </div>
                            ))}
                            <div className="text-xs text-muted-foreground mt-2 text-center">
                              Fichier {currentFileIndex + 1} / {fileQueue.length}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Glissez-déposez vos fichiers ici</h3>
                        <p className="text-muted-foreground mb-4">ou cliquez pour sélectionner (multi-fichiers supporté)</p>
                        <Button variant="outline">Sélectionner des fichiers</Button>
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
