import ExcelJS from 'exceljs';

/**
 * Utility functions for Excel operations using ExcelJS
 * Replaces xlsx package which has known security vulnerabilities
 */

export interface ExcelRow {
  [key: string]: string;
}

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
 * Parse an Excel file buffer and return normalized rows
 */
export async function parseExcelBuffer(buffer: ArrayBuffer): Promise<ExcelRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const rows: ExcelRow[] = [];
  const headers: string[] = [];
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // First row is headers
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = normalizeHeader(String(cell.value || ''));
      });
    } else {
      // Data rows
      const normalizedRow: ExcelRow = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          let value = '';
          if (cell.value !== null && cell.value !== undefined) {
            if (typeof cell.value === 'object' && 'text' in cell.value) {
              // Rich text
              value = cell.value.text || '';
            } else if (typeof cell.value === 'object' && 'result' in cell.value) {
              // Formula result
              value = String(cell.value.result || '');
            } else {
              value = String(cell.value);
            }
          }
          normalizedRow[header] = value.trim();
        }
      });
      // Also add empty values for headers not in this row
      headers.forEach(header => {
        if (!(header in normalizedRow)) {
          normalizedRow[header] = '';
        }
      });
      rows.push(normalizedRow);
    }
  });

  return rows;
}

/**
 * Create and download an Excel file from data
 */
export async function createAndDownloadExcel(
  data: Record<string, unknown>[],
  filename: string,
  sheetName: string = 'Sheet1'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (data.length === 0) {
    throw new Error('No data to export');
  }

  // Add headers
  const headers = Object.keys(data[0]);
  worksheet.addRow(headers);
  
  // Style header row
  worksheet.getRow(1).font = { bold: true };
  
  // Add data rows
  data.forEach(row => {
    const values = headers.map(header => row[header] ?? '');
    worksheet.addRow(values);
  });

  // Auto-size columns
  worksheet.columns.forEach((column, index) => {
    const header = headers[index];
    let maxLength = header.length;
    data.forEach(row => {
      const value = String(row[header] || '');
      maxLength = Math.max(maxLength, value.length);
    });
    column.width = Math.min(Math.max(maxLength + 2, 10), 50);
  });

  // Generate buffer and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Create and download an Excel file with multiple sheets
 */
export async function createMultiSheetExcel(
  sheets: Array<{ name: string; data: Record<string, unknown>[] }>,
  filename: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  sheets.forEach(({ name, data }) => {
    const worksheet = workbook.addWorksheet(name);
    
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };

    data.forEach(row => {
      const values = headers.map(header => row[header] ?? '');
      worksheet.addRow(values);
    });

    worksheet.columns.forEach((column, index) => {
      const header = headers[index];
      let maxLength = header.length;
      data.forEach(row => {
        const value = String(row[header] || '');
        maxLength = Math.max(maxLength, value.length);
      });
      column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
