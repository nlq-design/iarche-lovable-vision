/**
 * Validation utilities for vivier lead import.
 * Centralized here to avoid duplication and ensure consistent data quality.
 */

// ========== DATA TYPE VALIDATORS ==========

/**
 * Check if value looks like a valid French postal code (5 digits)
 */
export const isValidPostalCode = (value: string): boolean => {
  if (!value) return false;
  const cleaned = value.replace(/\s/g, '');
  return /^\d{5}$/.test(cleaned);
};

/**
 * Check if value looks like a date (contains month names or date patterns)
 */
export const looksLikeDate = (value: string): boolean => {
  if (!value) return false;
  const lower = value.toLowerCase();
  const frenchMonths = [
    'janvier', 'février', 'fevrier', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'aout', 'septembre', 'octobre', 'novembre', 'décembre', 'decembre'
  ];
  return frenchMonths.some(m => lower.includes(m)) || /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(value);
};

/**
 * Check if value looks like a SIRET/SIREN (9-14 digits).
 * IMPORTANT: Must NOT look like a French phone number (starting with 01-09)
 */
export const looksLikeSiret = (value: string): boolean => {
  if (!value) return false;
  const cleaned = value.replace(/\s/g, '');
  // Must be 9 (SIREN) or 14 (SIRET) digits
  if (!/^\d{9}$|^\d{14}$/.test(cleaned)) return false;
  // French phone numbers start with 0[1-9], SIRET/SIREN never starts with 0
  const firstTwoDigits = cleaned.substring(0, 2);
  const phonePatterns = ['01', '02', '03', '04', '05', '06', '07', '08', '09'];
  if (phonePatterns.includes(firstTwoDigits)) return false;
  return true;
};

/**
 * Check if value looks like a French phone number (10 digits starting with 0)
 */
export const looksLikePhone = (value: string): boolean => {
  if (!value) return false;
  const digitsOnly = value.replace(/\D/g, '');
  // French phone: 10 digits starting with 0
  if (digitsOnly.length === 10 && digitsOnly.startsWith('0')) return true;
  // International format with country code (e.g., +33)
  if (digitsOnly.length >= 11 && digitsOnly.length <= 13 && digitsOnly.startsWith('33')) return true;
  return false;
};

/**
 * Check if value looks like an email
 */
export const looksLikeEmail = (value: string): boolean => {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
};

/**
 * Check if value is mostly text (letters, not digits/dates)
 */
export const isMostlyText = (value: string): boolean => {
  if (!value) return false;
  const letterCount = (value.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
  const totalChars = value.replace(/\s/g, '').length;
  return totalChars > 0 && letterCount / totalChars > 0.5;
};

/**
 * Check if value looks like a NAF/APE code (4 digits + 1 letter)
 */
export const looksLikeNafCode = (value: string): boolean => {
  if (!value) return false;
  const cleaned = value.replace(/\s/g, '').toUpperCase();
  return /^\d{2,4}[A-Z]?$/.test(cleaned) || /^\d{4}[A-Z]$/.test(cleaned);
};

/**
 * Parse Excel serial date to ISO string
 */
export const parseExcelDate = (value: string | number | undefined): string | null => {
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

// ========== SAFE VALUE EXTRACTORS ==========

/**
 * Safe string with length limit
 */
export const safeString = (value: string | undefined, maxLength: number): string | null => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.substring(0, maxLength);
};

/**
 * Safe email validation with enhanced checks
 */
export const safeEmail = (value: string | undefined): string | null => {
  if (!value) return null;
  const trimmed = String(value).trim().toLowerCase();
  if (!trimmed) return null;
  // Basic email regex
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  // Reject common placeholder/test emails
  const invalidDomains = ['example.com', 'test.com', 'email.com', 'mail.com', 'xxx.com', 'abc.com'];
  const invalidPatterns = ['test@', 'admin@', 'info@test', 'noreply@', 'no-reply@'];
  if (invalidDomains.some(d => trimmed.endsWith(`@${d}`))) return null;
  if (invalidPatterns.some(p => trimmed.includes(p))) return null;
  // Length check
  if (trimmed.length > 254 || trimmed.length < 5) return null;
  return trimmed;
};

/**
 * Safe SIRET validation - must be exactly 9 or 14 digits and NOT a phone number
 */
export const safeSiret = (value: string | undefined): string | null => {
  if (!value) return null;
  const cleaned = String(value).replace(/\s/g, '').trim();
  if (!cleaned) return null;
  // Strict validation: 9 or 14 digits only
  if (!/^\d{9}$|^\d{14}$/.test(cleaned)) return null;
  // Reject if it looks like a phone number (starts with 01-09)
  const firstTwoDigits = cleaned.substring(0, 2);
  const phonePatterns = ['01', '02', '03', '04', '05', '06', '07', '08', '09'];
  if (phonePatterns.includes(firstTwoDigits)) return null;
  return cleaned;
};

/**
 * Safe phone number extraction - must look like a valid French phone
 */
export const safePhone = (value: string | undefined): string | null => {
  if (!value) return null;
  const cleaned = String(value).replace(/\D/g, '').trim();
  if (!cleaned) return null;
  // French phone: 10 digits starting with 0
  if (cleaned.length === 10 && cleaned.startsWith('0')) return cleaned;
  // International format: convert +33 to 0
  if (cleaned.length === 11 && cleaned.startsWith('33')) return '0' + cleaned.substring(2);
  if (cleaned.length === 12 && cleaned.startsWith('033')) return '0' + cleaned.substring(3);
  return null;
};

/**
 * Safe integer parsing with max value protection
 */
export const safeParseInt = (value: string | undefined, maxValue = 999999999): number | null => {
  if (!value) return null;
  const num = parseInt(String(value).replace(/\D/g, ''), 10);
  if (isNaN(num) || num > maxValue || num < 0) return null;
  return num;
};

// ========== CSV/HEADER UTILITIES ==========

/**
 * Normalize header names to lowercase and remove special characters
 */
export const normalizeHeader = (header: string): string => {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

/**
 * Parse CSV/TSV text with robust handling of edge cases
 */
export const parseCSV = (text: string): Record<string, string>[] => {
  // Remove BOM if present and normalize line endings
  const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanText.trim().split('\n').filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Detect delimiter: prioritize tab, then semicolon (common in FR exports), then comma
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : (firstLine.includes(';') ? ';' : ',');

  // Parse headers with deduplication
  const rawHeaders = firstLine.split(delimiter).map(h => normalizeHeader(h.trim().replace(/['"]/g, '')));
  const headers: string[] = [];
  const headerCounts: Record<string, number> = {};
  rawHeaders.forEach(h => {
    if (!h) {
      headers.push(`_col_${headers.length}`);
    } else if (headerCounts[h]) {
      headerCounts[h]++;
      headers.push(`${h}_${headerCounts[h]}`);
    } else {
      headerCounts[h] = 1;
      headers.push(h);
    }
  });

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = line.split(delimiter).map(v => v.trim().replace(/['"]/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    const hasAnyValue = Object.values(row).some(v => v.length > 0);
    if (hasAnyValue) {
      rows.push(row);
    }
  }

  return rows;
};
