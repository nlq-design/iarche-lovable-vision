import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TimeEntryExport {
  id: string;
  date: string;
  hours: number;
  description: string | null;
  status: string;
  project_name: string | null;
  lead_name: string | null;
}

interface ExportFilters {
  startDate?: Date;
  endDate?: Date;
  projectId?: string;
  status?: string;
}

export function useTimeEntriesExport() {
  const [isExporting, setIsExporting] = useState(false);

  const fetchEntries = async (filters: ExportFilters): Promise<TimeEntryExport[]> => {
    let query = supabase
      .from('partner_time_entries')
      .select(`
        id,
        date,
        hours,
        description,
        status,
        projects:project_id(name),
        leads:lead_id(name, company)
      `)
      .order('date', { ascending: false });

    if (filters.startDate) {
      query = query.gte('date', format(filters.startDate, 'yyyy-MM-dd'));
    }
    if (filters.endDate) {
      query = query.lte('date', format(filters.endDate, 'yyyy-MM-dd'));
    }
    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((entry: any) => ({
      id: entry.id,
      date: entry.date,
      hours: entry.hours,
      description: entry.description,
      status: entry.status,
      project_name: entry.projects?.name || null,
      lead_name: entry.leads ? (entry.leads.company || entry.leads.name) : null,
    }));
  };

  const exportToPdf = async (filters: ExportFilters, partnerName: string) => {
    setIsExporting(true);
    try {
      const entries = await fetchEntries(filters);
      const pdf = new jsPDF();

      // Header
      pdf.setFontSize(18);
      pdf.text('Relevé des heures', 20, 20);
      
      pdf.setFontSize(11);
      pdf.text(`Partenaire: ${partnerName}`, 20, 30);
      pdf.text(`Généré le: ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`, 20, 37);
      
      if (filters.startDate || filters.endDate) {
        const period = [
          filters.startDate ? format(filters.startDate, 'dd/MM/yyyy') : '...',
          filters.endDate ? format(filters.endDate, 'dd/MM/yyyy') : '...',
        ].join(' - ');
        pdf.text(`Période: ${period}`, 20, 44);
      }

      // Summary
      const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
      const validatedHours = entries.filter(e => e.status === 'validated').reduce((sum, e) => sum + e.hours, 0);
      const pendingHours = entries.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.hours, 0);

      pdf.setFontSize(10);
      pdf.text(`Total: ${totalHours}h | Validées: ${validatedHours}h | En attente: ${pendingHours}h`, 20, 55);

      // Table headers
      let y = 70;
      pdf.setFillColor(240, 240, 240);
      pdf.rect(20, y - 5, 170, 8, 'F');
      pdf.setFontSize(9);
      pdf.text('Date', 22, y);
      pdf.text('Heures', 50, y);
      pdf.text('Projet/Lead', 70, y);
      pdf.text('Description', 110, y);
      pdf.text('Statut', 170, y);

      // Table rows
      y += 10;
      entries.forEach((entry, index) => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }

        const statusLabels: Record<string, string> = {
          pending: 'En attente',
          validated: 'Validé',
          rejected: 'Refusé',
        };

        pdf.setFontSize(8);
        pdf.text(format(new Date(entry.date), 'dd/MM/yyyy'), 22, y);
        pdf.text(`${entry.hours}h`, 50, y);
        pdf.text((entry.project_name || entry.lead_name || '—').substring(0, 25), 70, y);
        pdf.text((entry.description || '—').substring(0, 35), 110, y);
        pdf.text(statusLabels[entry.status] || entry.status, 170, y);

        y += 7;
      });

      pdf.save(`releve-heures-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async (filters: ExportFilters, partnerName: string) => {
    setIsExporting(true);
    try {
      const entries = await fetchEntries(filters);
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Relevé des heures');

      // Header info
      worksheet.mergeCells('A1:E1');
      worksheet.getCell('A1').value = `Relevé des heures - ${partnerName}`;
      worksheet.getCell('A1').font = { bold: true, size: 14 };

      worksheet.mergeCells('A2:E2');
      worksheet.getCell('A2').value = `Généré le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`;

      // Table headers
      worksheet.getRow(4).values = ['Date', 'Heures', 'Projet/Lead', 'Description', 'Statut'];
      worksheet.getRow(4).font = { bold: true };
      worksheet.getRow(4).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      // Data rows
      const statusLabels: Record<string, string> = {
        pending: 'En attente',
        validated: 'Validé',
        rejected: 'Refusé',
      };

      entries.forEach((entry, index) => {
        worksheet.getRow(5 + index).values = [
          format(new Date(entry.date), 'dd/MM/yyyy'),
          entry.hours,
          entry.project_name || entry.lead_name || '—',
          entry.description || '—',
          statusLabels[entry.status] || entry.status,
        ];
      });

      // Summary row
      const summaryRow = 5 + entries.length + 1;
      const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
      worksheet.getCell(`A${summaryRow}`).value = 'TOTAL';
      worksheet.getCell(`A${summaryRow}`).font = { bold: true };
      worksheet.getCell(`B${summaryRow}`).value = totalHours;
      worksheet.getCell(`B${summaryRow}`).font = { bold: true };

      // Column widths
      worksheet.columns = [
        { width: 12 },
        { width: 10 },
        { width: 25 },
        { width: 40 },
        { width: 12 },
      ];

      // Export
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `releve-heures-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportToPdf,
    exportToExcel,
    isExporting,
  };
}
