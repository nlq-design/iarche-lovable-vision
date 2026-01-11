import { VivierLayout } from '@/components/viviers/VivierLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

// Mapping preview interface
interface MappingPreview {
  field: string;
  label: string;
  detectedColumn: string | null;
  manualColumn: string | null; // User-selected override
  sampleValues: string[];
  confidence: 'high' | 'medium' | 'low' | 'none';
  keys: string[]; // Original keys for fallback matching
}

interface MappingPreviewState {
  mappings: MappingPreview[];
  rawRows: Record<string, string>[];
  originalHeaders: string[];
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
  
  // Mapping preview state
  const [mappingPreview, setMappingPreview] = useState<MappingPreviewState | null>(null);

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

  // ========== DATA TYPE VALIDATORS ==========
  // Check if value looks like a valid postal code (French: 5 digits)
  const isValidPostalCode = (value: string): boolean => {
    if (!value) return false;
    const cleaned = value.replace(/\s/g, '');
    return /^\d{5}$/.test(cleaned);
  };

  // Check if value looks like a date (contains month names or date patterns)
  const looksLikeDate = (value: string): boolean => {
    if (!value) return false;
    const lower = value.toLowerCase();
    const frenchMonths = ['janvier', 'février', 'fevrier', 'mars', 'avril', 'mai', 'juin', 
                          'juillet', 'août', 'aout', 'septembre', 'octobre', 'novembre', 'décembre', 'decembre'];
    return frenchMonths.some(m => lower.includes(m)) || /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(value);
  };

  // Check if value looks like a SIRET/SIREN (9-14 digits)
  const looksLikeSiret = (value: string): boolean => {
    if (!value) return false;
    const cleaned = value.replace(/\s/g, '');
    return /^\d{9,14}$/.test(cleaned);
  };

  // Check if value looks like a phone number
  const looksLikePhone = (value: string): boolean => {
    if (!value) return false;
    const digitsOnly = value.replace(/\D/g, '');
    return digitsOnly.length >= 9 && digitsOnly.length <= 14;
  };

  // Check if value looks like an email
  const looksLikeEmail = (value: string): boolean => {
    if (!value) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  // Check if value is mostly text (letters, not digits/dates)
  const isMostlyText = (value: string): boolean => {
    if (!value) return false;
    const letterCount = (value.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
    const totalChars = value.replace(/\s/g, '').length;
    return totalChars > 0 && letterCount / totalChars > 0.5;
  };

  // Check if value looks like a NAF/APE code (4 digits + 1 letter or similar)
  const looksLikeNafCode = (value: string): boolean => {
    if (!value) return false;
    const cleaned = value.replace(/\s/g, '').toUpperCase();
    return /^\d{2,4}[A-Z]?$/.test(cleaned) || /^\d{4}[A-Z]$/.test(cleaned);
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

  // Safe string with length limit
  const safeString = (value: string | undefined, maxLength: number): string | null => {
    if (!value) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    return trimmed.substring(0, maxLength);
  };

  // Safe email validation
  const safeEmail = (value: string | undefined): string | null => {
    if (!value) return null;
    const trimmed = String(value).trim().toLowerCase();
    if (!trimmed) return null;
    // Basic email regex
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
    return trimmed;
  };

  // Safe integer parsing (avoid overflow)
  const safeParseInt = (value: string | undefined): number | null => {
    if (!value) return null;
    const trimmed = String(value).trim();
    if (!trimmed) return null;
    const num = parseInt(trimmed.replace(/\s/g, ''), 10);
    if (isNaN(num) || num > 999999999) return null; // Max 9 digits to avoid overflow
    return num;
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

  // Helper to find first non-empty value from multiple possible column names
  const findValue = (row: Record<string, string>, ...keys: string[]): string => {
    for (const key of keys) {
      const val = row[key]?.trim();
      if (val) return val;
    }
    return '';
  };

  // Smart find: find value with type validation
  const findValueValidated = (
    row: Record<string, string>, 
    validator: (val: string) => boolean, 
    ...keys: string[]
  ): string => {
    for (const key of keys) {
      const val = row[key]?.trim();
      if (val && validator(val)) return val;
    }
    return '';
  };

  // Smart fallback: scan ALL columns to find a value matching a pattern
  const findByPattern = (row: Record<string, string>, validator: (val: string) => boolean): string => {
    for (const [, value] of Object.entries(row)) {
      const val = value?.trim();
      if (val && validator(val)) return val;
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
  // ENHANCED: Adds data validation to prevent mis-mapping (e.g., date in postal_code field)
  const mapToVivier = (row: Record<string, string>): Partial<Vivier> => {
    // ========== COMPANY NAME ==========
    // Possible columns: NOM, COMPANY, COMPANY_NAME, ENTREPRISE, SOCIETE, RAISON_SOCIALE, DENOMINATION
    const companyName = findValue(row, 
      'nom', 'company', 'company_name', 'entreprise', 'societe', 
      'raison_sociale', 'denomination', 'nom_entreprise', 'nom_societe'
    );

    // ========== SIRET / SIREN ==========
    // Possible columns: SIRET, SIREN, N_SIRET, NUMERO_SIRET
    // ENHANCED: Validate that value looks like SIRET, else search all columns
    let siretRaw = findValueValidated(row, looksLikeSiret, 
      'siret', 'n_siret', 'numero_siret', 'num_siret'
    );
    // Fallback: if column "siret" doesn't contain valid SIRET, scan all values for 14-digit number
    if (!siretRaw) {
      siretRaw = findByPattern(row, looksLikeSiret);
    }
    const siret = safeSiret(siretRaw);
    
    let sirenRaw = findValueValidated(row, looksLikeSiret, 'siren', 'n_siren', 'numero_siren');
    const siren = siret ? siret.substring(0, 9) : safeSiret(sirenRaw);

    // ========== NAF / APE CODE ==========
    // Possible columns: NAF, APE, NAF_APE, CODE_NAF, CODE_APE, NAF_REV2
    // ENHANCED: Validate format (4 digits + letter)
    let nafCode = findValueValidated(row, looksLikeNafCode,
      'naf_ape', 'naf', 'ape', 'code_naf', 'code_ape', 
      'naf_rev2', 'activite_principale', 'code_activite'
    );
    // Fallback: scan all columns for NAF code pattern
    if (!nafCode) {
      nafCode = findByPattern(row, looksLikeNafCode);
    }

    // ========== LEGAL FORM ==========
    // Possible columns: FORME_JURIDIQUE, LEGAL_FORM, STATUT_JURIDIQUE
    // Must be text, not a number or date
    const legalFormRaw = findValue(row, 
      'forme_juridique', 'legal_form', 'statut_juridique', 
      'forme_jurid', 'nature_juridique', 'type_societe', 'forme_jur'
    );
    // Only accept if it's mostly text (avoid mismatched columns)
    const legalForm = (legalFormRaw && (isMostlyText(legalFormRaw) || /^(SARL|SAS|EURL|SA|EI|EIRL|SNC|SCI|SASU|GIE)$/i.test(legalFormRaw))) 
      ? legalFormRaw 
      : null;

    // ========== ACTIVITY / INDUSTRY ==========
    // Possible columns: ACTIVITE, ACTIVITY, INDUSTRY, SECTEUR
    const industry = findValue(row, 
      'activite', 'activity', 'industry', 'secteur', 
      'secteur_activite', 'libelle_naf', 'libelle_activite', 'metier',
      'objet_social', 'description_activite'
    );

    // ========== CONTACT / DIRIGEANT ==========
    // Possible columns: DIRIGEANT, CONTACT, CONTACT_NAME
    const dirigeant = findValue(row, 
      'dirigeant', 'contact', 'contact_name', 'nom_contact', 
      'responsable', 'gerant', 'representant', 'interlocuteur',
      'nom_dirigeant', 'representant_legal'
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
    const contactPosition = findValue(row, 
      'position', 'poste', 'job_title', 'title', 
      'fonction', 'qualite', 'role'
    );

    // ========== EMAIL ==========
    // ENHANCED: First try named columns, then scan for email pattern
    let emailRaw = findValueValidated(row, looksLikeEmail,
      'email', 'e_mail', 'mail', 'adresse_e_mail', 
      'adresse_mail', 'courriel', 'adresse_email', 'contact_email'
    );
    // Fallback: scan all columns for email pattern
    if (!emailRaw) {
      emailRaw = findByPattern(row, looksLikeEmail);
    }
    const email = safeEmail(emailRaw);

    // ========== PHONE ==========
    // ENHANCED: Validate that value looks like a phone number
    let phoneRaw = findValueValidated(row, looksLikePhone,
      'telephone', 'phone', 'tel', 'numero_telephone', 
      'mobile', 'portable', 'tel_fixe', 'tel_mobile', 'contact_tel'
    );
    // Fallback: scan all columns for phone pattern (but avoid SIRET)
    if (!phoneRaw) {
      phoneRaw = findByPattern(row, (val) => looksLikePhone(val) && !looksLikeSiret(val));
    }
    const phone = normalizePhone(phoneRaw);

    // ========== ADDRESS ==========
    const address = findValue(row, 
      'adresse', 'address', 'adresse_1', 'adresse_complete', 
      'rue', 'voie', 'adresse_siege', 'adresse_postale',
      'adresse_ligne1', 'num_voie'
    );

    // ========== POSTAL CODE ==========
    // ENHANCED: Must be valid postal code (5 digits for France)
    let postalCode = findValueValidated(row, isValidPostalCode,
      'code_postal', 'postal_code', 'cp', 'zip', 
      'code_post', 'code_postale'
    );
    // Fallback: scan for 5-digit postal code pattern
    if (!postalCode) {
      postalCode = findByPattern(row, isValidPostalCode);
    }

    // ========== CITY ==========
    // Must be text, not date or number
    const cityRaw = findValue(row, 
      'ville', 'city', 'commune', 'localite', 
      'ville_siege', 'lieu'
    );
    // Validate: city should be text, not a date or number
    const city = (cityRaw && isMostlyText(cityRaw) && !looksLikeDate(cityRaw)) ? cityRaw : null;

    // ========== REGION / DEPARTMENT ==========
    const region = findValue(row, 
      'departement', 'dept', 'region', 'dep', 
      'nom_departement', 'libelle_departement'
    );

    // ========== COUNTRY ==========
    const country = findValue(row, 'pays', 'country') || 'France';

    // ========== WEBSITE ==========
    const website = findValue(row, 
      'website', 'site', 'url', 'site_web', 
      'site_internet', 'web'
    );

    // ========== LINKEDIN ==========
    const linkedinUrl = findValue(row, 
      'linkedin', 'linkedin_url', 'profil_linkedin', 'url_linkedin'
    );

    // ========== EMPLOYEE COUNT / COMPANY SIZE ==========
    const effectifMin = findValue(row, 'effectif_min', 'effectif_minimum');
    const effectifMax = findValue(row, 'effectif_max', 'effectif_maximum');
    const effectif = findValue(row, 'effectif', 'employees', 'nb_salaries', 'nombre_salaries', 'salaries');
    const trancheEffectif = findValue(row, 'tranche_effectif', 'taille_entreprise', 'taille');
    
    let companySize = '';
    if (trancheEffectif && isMostlyText(trancheEffectif)) {
      companySize = trancheEffectif;
    } else if (effectifMin && effectifMax) {
      companySize = `${effectifMin}-${effectifMax}`;
    } else {
      companySize = effectif || effectifMin || effectifMax || '';
    }
    
    // Only parse if it looks like a number (not SIRET)
    const employeeCount = (effectifMin && !looksLikeSiret(effectifMin)) 
      ? safeParseInt(effectifMin) 
      : (effectif && !looksLikeSiret(effectif)) 
        ? safeParseInt(effectif) 
        : null;

    // ========== REVENUE / CA ==========
    const caRaw = findValue(row, 
      'ca', 'chiffre_affaires', 'revenue', 'ca_annuel', 
      'chiffre_d_affaires', 'revenus', 'resultat'
    );
    // Only accept if it looks like a number (avoid text)
    const revenueRange = (caRaw && /\d/.test(caRaw)) 
      ? safeString(caRaw.replace(/[€\s]/g, '').trim(), 50) 
      : null;

    // ========== CREATION DATE ==========
    // ENHANCED: First look in named columns, then scan for date patterns
    let creationDateRaw = findValueValidated(row, looksLikeDate,
      'immatriculation', 'creation_date', 'date_creation', 
      'date_immatriculation', 'annee_creation', 'date_debut_activite'
    );
    // Also check columns that might contain date even without proper header
    if (!creationDateRaw) {
      creationDateRaw = findValue(row, 
        'immatriculation', 'creation_date', 'date_creation', 
        'date_immatriculation', 'annee_creation', 'date_debut_activite'
      );
    }
    
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
    
    // ENHANCED: If postal_code got a date, try to recover it
    const postalCodeFromHeader = row['code_postal'] || row['cp'] || row['postal_code'];
    if (postalCodeFromHeader && looksLikeDate(postalCodeFromHeader) && !creationDate) {
      // The date was put in postal_code field by mistake, use it as creation date
      const recoveredDate = parseExcelDate(postalCodeFromHeader);
      if (recoveredDate) {
        creationDate = recoveredDate;
      } else {
        // Try French format
        const frenchMonths: Record<string, string> = {
          'janvier': '01', 'février': '02', 'fevrier': '02', 'mars': '03', 'avril': '04',
          'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08', 'aout': '08',
          'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12', 'decembre': '12'
        };
        const match = postalCodeFromHeader.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
        if (match) {
          const [, day, monthName, year] = match;
          const month = frenchMonths[monthName.toLowerCase()];
          if (month) {
            creationDate = `${year}-${month}-${day.padStart(2, '0')}`;
          }
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

  // Generate mapping preview before full analysis
  const generateMappingPreview = (rows: Record<string, string>[]): MappingPreviewState => {
    if (rows.length === 0) return { mappings: [], rawRows: [], originalHeaders: [] };
    
    const originalHeaders = Object.keys(rows[0]);
    const sampleRows = rows.slice(0, 5); // Take first 5 rows for samples
    
    // Define fields to check
    const fieldDefinitions: { field: string; label: string; validator?: (v: string) => boolean; keys: string[] }[] = [
      { field: 'email', label: 'Email', validator: looksLikeEmail, keys: ['email', 'e_mail', 'mail', 'adresse_e_mail', 'adresse_mail', 'courriel', 'adresse_email', 'contact_email'] },
      { field: 'company_name', label: 'Entreprise', keys: ['nom', 'company', 'company_name', 'entreprise', 'societe', 'raison_sociale', 'denomination', 'nom_entreprise', 'nom_societe'] },
      { field: 'siret', label: 'SIRET', validator: looksLikeSiret, keys: ['siret', 'n_siret', 'numero_siret', 'num_siret'] },
      { field: 'contact_name', label: 'Contact/Dirigeant', keys: ['dirigeant', 'contact', 'contact_name', 'nom_contact', 'responsable', 'gerant', 'representant', 'interlocuteur', 'nom_dirigeant', 'representant_legal'] },
      { field: 'phone', label: 'Téléphone', validator: looksLikePhone, keys: ['telephone', 'phone', 'tel', 'numero_telephone', 'mobile', 'portable', 'tel_fixe', 'tel_mobile', 'contact_tel'] },
      { field: 'postal_code', label: 'Code Postal', validator: isValidPostalCode, keys: ['code_postal', 'postal_code', 'cp', 'zip', 'code_post', 'code_postale'] },
      { field: 'city', label: 'Ville', keys: ['ville', 'city', 'commune', 'localite', 'ville_siege', 'lieu'] },
      { field: 'industry', label: 'Secteur/Activité', keys: ['activite', 'activity', 'industry', 'secteur', 'secteur_activite', 'libelle_naf', 'libelle_activite', 'metier', 'objet_social'] },
      { field: 'naf_code', label: 'Code NAF/APE', validator: looksLikeNafCode, keys: ['naf_ape', 'naf', 'ape', 'code_naf', 'code_ape', 'naf_rev2', 'activite_principale'] },
      { field: 'address', label: 'Adresse', keys: ['adresse', 'address', 'adresse_1', 'adresse_complete', 'rue', 'voie', 'adresse_siege'] },
      { field: 'website', label: 'Site Web', keys: ['website', 'site_web', 'url', 'site', 'site_internet'] },
    ];
    
    const mappings: MappingPreview[] = fieldDefinitions.map(def => {
      let detectedColumn: string | null = null;
      let sampleValues: string[] = [];
      let confidence: 'high' | 'medium' | 'low' | 'none' = 'none';
      
      // First try: find by column name
      for (const key of def.keys) {
        if (originalHeaders.some(h => normalizeHeader(h) === key)) {
          const matchedHeader = originalHeaders.find(h => normalizeHeader(h) === key)!;
          detectedColumn = matchedHeader;
          sampleValues = sampleRows.map(r => r[normalizeHeader(matchedHeader)] || '').filter(Boolean).slice(0, 3);
          
          // Validate if validator exists
          if (def.validator) {
            const validCount = sampleValues.filter(v => def.validator!(v)).length;
            confidence = validCount === sampleValues.length ? 'high' : validCount > 0 ? 'medium' : 'low';
          } else {
            confidence = sampleValues.length > 0 ? 'high' : 'low';
          }
          break;
        }
      }
      
      // Second try: pattern detection if no column name match but has validator
      if (!detectedColumn && def.validator) {
        for (const header of originalHeaders) {
          const normalizedHeader = normalizeHeader(header);
          const values = sampleRows.map(r => r[normalizedHeader] || '').filter(Boolean);
          const validCount = values.filter(v => def.validator!(v)).length;
          
          if (validCount >= Math.ceil(values.length * 0.7)) {
            detectedColumn = `${header} (auto-détecté)`;
            sampleValues = values.filter(v => def.validator!(v)).slice(0, 3);
            confidence = 'medium';
            break;
          }
        }
      }
      
      return { field: def.field, label: def.label, detectedColumn, manualColumn: null, sampleValues, confidence, keys: def.keys };
    });
    
    return { mappings, rawRows: rows, originalHeaders };
  };
  
  // Update manual column mapping
  const handleUpdateManualMapping = (fieldIndex: number, columnName: string | null) => {
    if (!mappingPreview) return;
    
    const updatedMappings = [...mappingPreview.mappings];
    const mapping = updatedMappings[fieldIndex];
    
    // Update manual column
    mapping.manualColumn = columnName;
    
    // Update sample values based on new column
    if (columnName) {
      const sampleRows = mappingPreview.rawRows.slice(0, 5);
      const normalizedCol = normalizeHeader(columnName);
      mapping.sampleValues = sampleRows.map(r => r[normalizedCol] || '').filter(Boolean).slice(0, 3);
      mapping.confidence = mapping.sampleValues.length > 0 ? 'high' : 'low';
    } else {
      // Revert to auto-detected
      mapping.sampleValues = [];
      mapping.confidence = 'none';
    }
    
    setMappingPreview({
      ...mappingPreview,
      mappings: updatedMappings
    });
  };
  
  // Show mapping preview instead of directly analyzing
  const handleShowMappingPreview = async (rows: Record<string, string>[]) => {
    if (rows.length === 0) {
      toast.error('Aucune donnée valide trouvée');
      return;
    }
    
    const preview = generateMappingPreview(rows);
    setMappingPreview(preview);
    toast.success(`${rows.length} lignes détectées - Vérifiez le mapping`);
  };
  
  // Confirm mapping and proceed to full analysis with manual overrides
  const handleConfirmMapping = async () => {
    if (!mappingPreview) return;
    
    // Build custom column mapping from manual overrides
    const columnOverrides: Record<string, string> = {};
    mappingPreview.mappings.forEach(m => {
      if (m.manualColumn) {
        columnOverrides[m.field] = normalizeHeader(m.manualColumn);
      }
    });
    
    setMappingPreview(null);
    await handleAnalyze(mappingPreview.rawRows, columnOverrides);
  };
  
  // Cancel mapping preview
  const handleCancelMapping = () => {
    setMappingPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Analyze file and detect duplicates
  const handleAnalyze = async (rows: Record<string, string>[], columnOverrides?: Record<string, string>) => {
    setIsAnalyzing(true);
    try {
      if (rows.length === 0) {
        toast.error('Aucune donnée valide trouvée');
        return;
      }

      // Apply column overrides if provided
      const processedRows = columnOverrides ? rows.map(row => {
        const newRow = { ...row };
        Object.entries(columnOverrides).forEach(([field, column]) => {
          // Add the overridden column value to a standardized key
          if (row[column]) {
            newRow[field] = row[column];
          }
        });
        return newRow;
      }) : rows;

      const viviers = processedRows.map(mapToVivier).filter(v => v.email);
      
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
    
    // Now show mapping preview for all collected rows
    if (allRows.length > 0) {
      await handleShowMappingPreview(allRows);
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
      handleShowMappingPreview(rows);
    } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
      const text = await file.text();
      const rows = parseCSV(text);
      handleShowMappingPreview(rows);
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
    handleShowMappingPreview(rows);
  };

  const handleReset = () => {
    setParsedData(null);
    setSelectedRows(new Set());
    setPastedData('');
    setFileQueue([]);
    setAllParsedRows([]);
    setCurrentFileIndex(0);
    setMappingPreview(null);
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
          {(parsedData || mappingPreview) && (
            <Button variant="outline" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Nouveau fichier
            </Button>
          )}
        </div>

        {/* Mapping Preview Step */}
        {mappingPreview && !parsedData ? (
          <div className="space-y-6">
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  Prévisualisation du Mapping
                </CardTitle>
                <CardDescription>
                  Vérifiez que les colonnes sont correctement associées aux champs avant d'importer ({mappingPreview.rawRows.length} lignes)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Original headers */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2">En-têtes détectés dans le fichier :</p>
                  <div className="flex flex-wrap gap-2">
                    {mappingPreview.originalHeaders.map((h, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {h}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Mapping table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[150px]">Champ cible</TableHead>
                        <TableHead className="w-[200px]">Colonne source</TableHead>
                        <TableHead>Exemples de valeurs</TableHead>
                        <TableHead className="w-[100px] text-center">Confiance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappingPreview.mappings.map((m, index) => (
                        <TableRow key={index} className={m.confidence === 'none' && !m.manualColumn ? 'opacity-50' : ''}>
                          <TableCell className="font-medium">{m.label}</TableCell>
                          <TableCell>
                            <Select
                              value={m.manualColumn || m.detectedColumn?.replace(' (auto-détecté)', '') || '_none_'}
                              onValueChange={(value) => handleUpdateManualMapping(index, value === '_none_' ? null : value)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Sélectionner..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="_none_" className="text-muted-foreground italic">
                                  Non mappé
                                </SelectItem>
                                {mappingPreview.originalHeaders
                                  .filter((header) => header && header.trim() !== '')
                                  .map((header) => (
                                    <SelectItem key={header} value={header} className="font-mono text-xs">
                                      {header}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            {m.detectedColumn && !m.manualColumn && (
                              <span className="text-xs text-muted-foreground mt-1 block">
                                Auto-détecté
                              </span>
                            )}
                            {m.manualColumn && (
                              <span className="text-xs text-primary mt-1 block">
                                Manuel
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {m.sampleValues.length > 0 ? (
                                m.sampleValues.map((v, i) => (
                                  <span key={i} className="text-xs bg-background border px-2 py-0.5 rounded truncate max-w-[150px]">
                                    {v}
                                  </span>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {m.confidence === 'high' && (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                OK
                              </Badge>
                            )}
                            {m.confidence === 'medium' && (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Partiel
                              </Badge>
                            )}
                            {m.confidence === 'low' && (
                              <Badge className="bg-red-500/10 text-red-600 border-red-500/30">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Faible
                              </Badge>
                            )}
                            {m.confidence === 'none' && (
                              <Badge variant="outline" className="text-muted-foreground">
                                -
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Action buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={handleCancelMapping}>
                    Annuler
                  </Button>
                  <Button onClick={handleConfirmMapping} disabled={isAnalyzing}>
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyse en cours...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4 mr-2" />
                        Confirmer et analyser
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : parsedData ? (
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
