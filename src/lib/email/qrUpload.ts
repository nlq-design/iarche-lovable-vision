/**
 * Génère un QR code PNG et l'upload dans le bucket Supabase `email-assets`
 * sous un chemin déterministe `qr-codes/{docId}.png`.
 *
 * Pourquoi : Brevo refuse les images Base64 inline à l'import HTML.
 * Solution : héberger le QR sur Storage et référencer l'URL publique.
 *
 * Idempotent (upsert: true) — re-générer écrase l'existant.
 */

import { supabase } from '@/integrations/supabase/client';
import QRCode from 'qrcode';

export async function generateAndUploadQr(
  docId: string,
  publicUrl: string,
): Promise<string> {
  // 1. Générer le QR code en data URL PNG
  const qrDataUrl = await QRCode.toDataURL(publicUrl, {
    width: 280,
    margin: 1,
    color: { dark: '#1A2B4A', light: '#FFFFFF' },
  });

  // 2. Convertir en Blob (pas de Base64 dans l'upload)
  const response = await fetch(qrDataUrl);
  const blob = await response.blob();

  // 3. Upload dans le bucket avec upsert (idempotence)
  const path = `qr-codes/${docId}.png`;
  const { error: uploadError } = await supabase.storage
    .from('email-assets')
    .upload(path, blob, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`QR upload failed: ${uploadError.message}`);
  }

  // 4. Récupérer l'URL publique
  const { data } = supabase.storage.from('email-assets').getPublicUrl(path);
  return data.publicUrl;
}
