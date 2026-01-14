import { useCallback } from 'react';
import { format } from 'date-fns';
import { createMultiSheetExcel } from '@/utils/excelUtils';
import type { CampaignRecipient, CampaignStats, VivierCampaign } from '@/hooks/useVivierCampaignDetail';

export function useCampaignExport() {
  
  const exportRecipientsCsv = useCallback(async (
    recipients: CampaignRecipient[],
    campaign: VivierCampaign,
    stats: CampaignStats
  ) => {
    // Prepare data for export
    const exportData = recipients.map(r => ({
      'Email': r.email,
      'Nom': r.name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || '-',
      'Entreprise': r.company || r.company_name || '-',
      'Statut': r.status || 'pending',
      'Envoyé le': r.sent_at ? format(new Date(r.sent_at), 'dd/MM/yyyy HH:mm') : '-',
      'Ouvert le': r.opened_at ? format(new Date(r.opened_at), 'dd/MM/yyyy HH:mm') : '-',
      'Cliqué le': r.clicked_at ? format(new Date(r.clicked_at), 'dd/MM/yyyy HH:mm') : '-',
      'Répondu le': r.replied_at ? format(new Date(r.replied_at), 'dd/MM/yyyy HH:mm') : '-',
      'Bounce': r.bounced_at ? 'Oui' : 'Non',
      'Nb Ouvertures': r.open_count || 0,
      'Nb Clics': r.click_count || 0,
    }));

    // Summary sheet
    const summaryData = [
      { 'Métrique': 'Campagne', 'Valeur': campaign.name },
      { 'Métrique': 'Sujet', 'Valeur': campaign.subject || '-' },
      { 'Métrique': 'Statut', 'Valeur': campaign.status },
      { 'Métrique': 'Total destinataires', 'Valeur': stats.total },
      { 'Métrique': 'Envoyés', 'Valeur': stats.sent },
      { 'Métrique': 'Ouverts', 'Valeur': stats.opened },
      { 'Métrique': 'Cliqués', 'Valeur': stats.clicked },
      { 'Métrique': 'Réponses', 'Valeur': stats.replied },
      { 'Métrique': 'Bounces', 'Valeur': stats.bounced },
      { 'Métrique': 'Taux d\'ouverture', 'Valeur': `${stats.openRate}%` },
      { 'Métrique': 'Taux de clic', 'Valeur': `${stats.clickRate}%` },
      { 'Métrique': 'Taux de réponse', 'Valeur': `${stats.replyRate}%` },
      { 'Métrique': 'Taux de bounce', 'Valeur': `${stats.bounceRate}%` },
      { 'Métrique': 'Exporté le', 'Valeur': format(new Date(), 'dd/MM/yyyy HH:mm') },
    ];

    // Generate filename and download
    const filename = `campagne_${campaign.slug || campaign.id}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
    
    await createMultiSheetExcel([
      { name: 'Destinataires', data: exportData },
      { name: 'Résumé', data: summaryData }
    ], filename);
  }, []);

  return { exportRecipientsCsv };
}
