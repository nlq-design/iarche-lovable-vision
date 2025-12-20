/**
 * Presets Services IArche v4.1
 * 4 types de services avec contenus pré-remplis pour tous les éditeurs médias
 */

export interface ServicePreset {
  id: string;
  label: string;
  serviceId: 'audit' | 'developpement' | 'accompagnement' | 'conformite';
  badge: string;
  titre: string;
  description: string;
  ctaText: string;
  chiffre: string;
  contexte: string;
  source: string;
  // Pour témoignages
  citation?: string;
  temoinNom?: string;
  temoinFonction?: string;
  // Pour conseils
  conseilNumero?: string;
  conseilTitre?: string;
  conseilContenu?: string;
  // Pour bannières/thumbnails
  tagline?: string;
  sousTitre?: string;
}

export const SERVICE_PRESETS: ServicePreset[] = [
  // ============= AUDIT & CONSEIL =============
  {
    id: 'service-audit',
    label: '🔍 Audit & Conseil',
    serviceId: 'audit',
    badge: 'Audit IA',
    titre: 'Par où commencer avec l\'IA ?',
    description: 'Cartographiez vos opportunités et définissez une roadmap claire.',
    ctaText: 'Demander un audit →',
    chiffre: '1 jour',
    contexte: 'pour identifier vos cas d\'usage prioritaires',
    source: 'Audit IArche',
    tagline: 'Comprendre où vous en êtes',
    sousTitre: 'Analyse, roadmap, priorisation',
    citation: '"L\'audit IArche nous a permis de clarifier notre stratégie IA en une journée."',
    temoinNom: 'Marie Dubois',
    temoinFonction: 'DG, PME Services',
    conseilNumero: '01',
    conseilTitre: 'Cartographiez avant d\'agir',
    conseilContenu: 'Un audit permet d\'identifier ce qui a vraiment du sens pour votre activité.',
  },
  // ============= DÉVELOPPEMENT & INTÉGRATION =============
  {
    id: 'service-developpement',
    label: '⚙️ Développement',
    serviceId: 'developpement',
    badge: 'Solution IA',
    titre: 'Du prototype à la production',
    description: 'Des solutions IA conçues pour votre métier, connectées à vos outils.',
    ctaText: 'Voir nos solutions →',
    chiffre: '2-4 sem.',
    contexte: 'pour un premier prototype fonctionnel',
    source: 'Méthode IArche',
    tagline: 'Construire et déployer',
    sousTitre: 'Prototypage rapide, intégration, production',
    citation: '"En 3 semaines, IArche a développé un chatbot parfaitement adapté à notre métier."',
    temoinNom: 'Pierre Leroy',
    temoinFonction: 'DSI, Groupe Industriel',
    conseilNumero: '02',
    conseilTitre: 'Commencez par un prototype',
    conseilContenu: 'Validez l\'approche sur un cas simple avant de généraliser.',
  },
  // ============= ACCOMPAGNEMENT & AUTONOMIE =============
  {
    id: 'service-accompagnement',
    label: '🎓 Accompagnement',
    serviceId: 'accompagnement',
    badge: 'Formation',
    titre: 'Rendez vos équipes autonomes',
    description: 'Sessions pratiques pour maîtriser l\'IA au quotidien.',
    ctaText: 'Nos formations →',
    chiffre: '100%',
    contexte: 'de nos clients recommandent nos formations',
    source: 'Satisfaction IArche 2024',
    tagline: 'Acculturer et rendre autonome',
    sousTitre: 'Sessions techniques, ateliers métier, suivi',
    citation: '"Nos équipes utilisent maintenant l\'IA au quotidien, de manière autonome."',
    temoinNom: 'Sophie Martin',
    temoinFonction: 'RH, ETI 150 salariés',
    conseilNumero: '03',
    conseilTitre: 'Impliquez vos équipes',
    conseilContenu: 'L\'adoption est la clé du succès. Formez, accompagnez, itérez.',
  },
  // ============= CONFORMITÉ & RÉGLEMENTATION =============
  {
    id: 'service-conformite',
    label: '🛡️ Conformité',
    serviceId: 'conformite',
    badge: 'Réglementation',
    titre: 'AI Act & RGPD : êtes-vous prêt ?',
    description: 'Audit de conformité, documentation, veille réglementaire.',
    ctaText: 'Vérifier ma conformité →',
    chiffre: 'Fév. 2025',
    contexte: 'entrée en vigueur des premières obligations AI Act',
    source: 'Réglementation UE',
    tagline: 'Respecter les règles du jeu',
    sousTitre: 'Audit, documentation, veille continue',
    citation: '"IArche nous a permis d\'anticiper l\'AI Act et d\'être prêts à temps."',
    temoinNom: 'Laurent Blanc',
    temoinFonction: 'DPO, Groupe Finance',
    conseilNumero: '04',
    conseilTitre: 'Anticipez la réglementation',
    conseilContenu: 'Les obligations arrivent. Mieux vaut auditer maintenant que subir plus tard.',
  },
];

// Export groupé par catégorie pour les selects
export const SERVICE_PRESETS_BY_CATEGORY = {
  audit: SERVICE_PRESETS.filter(p => p.serviceId === 'audit'),
  developpement: SERVICE_PRESETS.filter(p => p.serviceId === 'developpement'),
  accompagnement: SERVICE_PRESETS.filter(p => p.serviceId === 'accompagnement'),
  conformite: SERVICE_PRESETS.filter(p => p.serviceId === 'conformite'),
};

export const getServicePresetById = (id: string): ServicePreset | undefined => {
  return SERVICE_PRESETS.find(p => p.id === id);
};
