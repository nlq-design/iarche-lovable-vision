// Liste des codes pays ISO-3166-1 alpha-2 à bloquer
const BLOCKED_COUNTRIES: string[] = [
  // Exemple : bloquer certaines régions à haut risque
  // 'CN', // Chine
  // 'RU', // Russie
  // 'KP', // Corée du Nord
  // 'IR', // Iran
  // Ajoutez les codes pays selon vos besoins de sécurité
];

interface GeoCheckResult {
  allowed: boolean;
  country: string | null;
  reason?: string;
}

export async function checkGeoBlocking(req: Request): Promise<GeoCheckResult> {
  try {
    // Récupérer le code pays depuis les headers Cloudflare/proxy
    // Les headers courants : CF-IPCountry, X-Country-Code, etc.
    const countryCode = req.headers.get('CF-IPCountry') 
      || req.headers.get('X-Country-Code')
      || req.headers.get('CloudFront-Viewer-Country')
      || null;

    if (!countryCode) {
      // Si pas de code pays détecté, autoriser par défaut
      return { 
        allowed: true, 
        country: null 
      };
    }

    // Vérifier si le pays est bloqué
    if (BLOCKED_COUNTRIES.includes(countryCode.toUpperCase())) {
      return {
        allowed: false,
        country: countryCode,
        reason: `Access from ${countryCode} is not allowed`
      };
    }

    return {
      allowed: true,
      country: countryCode
    };

  } catch (error) {
    console.error('Geo-blocking check error:', error);
    // En cas d'erreur, autoriser par défaut (fail-open)
    return { allowed: true, country: null };
  }
}

export function getGeoBlockingHeaders(geoResult: GeoCheckResult) {
  return {
    'X-Country-Code': geoResult.country || 'unknown',
    'X-Geo-Allowed': geoResult.allowed.toString()
  };
}
