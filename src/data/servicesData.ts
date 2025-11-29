export interface ServiceDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  descriptionLongue: string;
  livrables: string[];
  pourQui: string;
  methodologie: {
    etape: string;
    description: string;
  }[];
  casUsage: {
    titre: string;
    description: string;
  }[];
  faq: {
    question: string;
    answer: string;
  }[];
}

export const servicesData: ServiceDetail[] = [
  {
    id: 'audit',
    slug: 'audit',
    title: 'Audit & Conseil',
    description: 'Comprendre où vous en êtes et définir par où commencer.',
    descriptionLongue: 'Vous voulez intégrer l\'IA mais vous ne savez pas par où commencer. On analyse votre activité, vos outils, vos équipes. On identifie où l\'IA a du sens — et où elle n\'en a pas. Résultat : une roadmap claire, chiffrée, priorisée.',
    livrables: [
      'Cartographie des cas d\'usage prioritaires',
      'Évaluation de la maturité technologique',
      'Plan d\'action chiffré et priorisé',
      'Recommandations d\'outils et partenaires'
    ],
    pourQui: 'Pour ceux qui veulent avancer sur l\'IA sans partir dans tous les sens.',
    methodologie: [
      {
        etape: '1. Comprendre',
        description: 'Quels sont vos process, vos outils, vos besoins, vos points de friction ?'
      },
      {
        etape: '2. Analyser',
        description: 'Quelles données avez-vous ? Quelles compétences en interne ?'
      },
      {
        etape: '3. Identifier',
        description: 'Où l\'IA peut vraiment vous aider — avec l\'humain dans la boucle ?'
      },
      {
        etape: '4. Livrer',
        description: 'Quelle roadmap pour avancer concrètement ?'
      }
    ],
    casUsage: [
      {
        titre: 'Relation client',
        description: 'Vos équipes passent du temps à répondre aux mêmes questions ? On identifie ce qui peut être automatisé.'
      },
      {
        titre: 'Optimisation des process',
        description: 'Des tâches répétitives qui ralentissent vos équipes ? On repère lesquelles sont automatisables.'
      },
      {
        titre: 'Analyse prédictive',
        description: 'Vous avez des données mais vous n\'en faites rien ? On évalue ce qu\'elles peuvent vous apporter.'
      }
    ],
    faq: [
      {
        question: 'Quelle est la durée moyenne d\'un audit ?',
        answer: 'Entre une demi-journée et quelques jours selon la taille de votre structure et la complexité de vos process.'
      },
      {
        question: 'Pourquoi commencer par un audit ?',
        answer: 'Pour éviter de partir dans la mauvaise direction. L\'audit permet d\'identifier ce qui a vraiment du sens pour votre activité — et ce qui n\'en a pas.'
      },
      {
        question: 'Quel est le coût d\'un audit ?',
        answer: 'Sur devis. Ça dépend du projet. On en discute ensemble avant de s\'engager.'
      }
    ]
  },
  {
    id: 'developpement',
    slug: 'developpement',
    title: 'Développement & Intégration',
    description: 'Construire et déployer des solutions qui marchent dans votre contexte.',
    descriptionLongue: 'Des solutions IA conçues pour votre métier, connectées à vos outils. Du prototype à la production.',
    livrables: [
      'Prototypage rapide (maquette en 2-4 semaines)',
      'Architecture adaptée à vos besoins',
      'Intégration avec vos outils existants',
      'Documentation technique et transfert de compétences'
    ],
    pourQui: 'TPE, PME, indépendants, collectivités — l\'IA s\'adresse à tous.',
    methodologie: [
      {
        etape: '1. Cadrage technique',
        description: 'Analyse des besoins, définition de l\'architecture et validation de la faisabilité.'
      },
      {
        etape: '2. Maquette',
        description: 'Une première version fonctionnelle pour valider l\'approche.'
      },
      {
        etape: '3. Développement',
        description: 'La solution complète, testée, prête à être déployée.'
      },
      {
        etape: '4. Déploiement & accompagnement',
        description: 'Mise en production, suivi et ajustements.'
      }
    ],
    casUsage: [],
    faq: [
      {
        question: 'Combien de temps dure un projet ?',
        answer: 'Ça dépend du projet — un agent IA, un chatbot, un logiciel métier complet, ce n\'est pas le même travail. On en discute ensemble.'
      },
      {
        question: 'Travaillez-vous avec des technologies open-source ?',
        answer: 'Oui, quand c\'est pertinent. Le choix technologique dépend de votre contexte et de vos contraintes.'
      },
      {
        question: 'Y a-t-il un accompagnement après la mise en production ?',
        answer: 'Oui. Suivi, ajustements, évolutions — on reste disponibles.'
      }
    ]
  },
  {
    id: 'accompagnement',
    slug: 'accompagnement',
    title: 'Accompagnement & Autonomie',
    description: 'Rendre vos équipes capables de continuer sans nous.',
    descriptionLongue: 'Notre mission : vous rendre autonomes, vous et vos équipes. Une utilisation de l\'IA maîtrisée, conforme, éthique et sécurisée.',
    livrables: [
      'Sessions techniques (prompting, fine-tuning, RAG)',
      'Ateliers métier (cas d\'usage, ROI, éthique)',
      'Accompagnement individuel ou collectif',
      'Documentation et guides internes personnalisés'
    ],
    pourQui: 'Acculturer, accompagner, rendre autonome — pour tous ceux qui veulent intégrer l\'IA durablement.',
    methodologie: [
      {
        etape: '1. Comprendre',
        description: 'Où en sont vos équipes ? Quels sont les besoins ?'
      },
      {
        etape: '2. Construire',
        description: 'Un programme adapté à votre contexte et vos enjeux.'
      },
      {
        etape: '3. Pratiquer',
        description: 'Des sessions concrètes, sur vos cas réels.'
      },
      {
        etape: '4. Accompagnement',
        description: 'Un suivi pour ancrer les usages dans le quotidien.'
      }
    ],
    casUsage: [
      {
        titre: 'Adoption Collaboria',
        description: 'Accompagnement d\'une entreprise de 45 salariés à la prise en main de l\'outil.'
      },
      {
        titre: 'Bureau d\'études',
        description: 'Prise en main d\'un logiciel métier IA déployé en interne.'
      },
      {
        titre: 'Secteur sanitaire',
        description: 'Montée en compétences des collaborateurs sur l\'interrogation de bases de données pour des process complexes.'
      }
    ],
    faq: [
      {
        question: 'Quels formats proposez-vous ?',
        answer: 'Sessions individuelles, collectives, en présentiel ou à distance — on s\'adapte à vos contraintes.'
      },
      {
        question: 'Faut-il des prérequis techniques ?',
        answer: 'Non. On part de votre niveau, quel qu\'il soit.'
      },
      {
        question: 'Y a-t-il un suivi après les sessions ?',
        answer: 'Oui. Accompagnement continu pour ancrer les usages.'
      }
    ]
  },
  {
    id: 'conformite',
    slug: 'conformite',
    title: 'Conformité & Réglementation',
    description: 'S\'assurer que vos projets IA respectent les règles du jeu.',
    descriptionLongue: 'AI Act, RGPD : de nouvelles obligations pour les entreprises qui utilisent l\'IA. On vous aide à comprendre ce qui s\'applique à vous, à auditer vos systèmes et à documenter votre conformité.',
    livrables: [
      'Audit de conformité RGPD et AI Act',
      'Documentation réglementaire (registres, impacts)',
      'Recommandations d\'implémentation',
      'Veille réglementaire continue'
    ],
    pourQui: 'Entreprises soumises aux obligations réglementaires et/ou anticipant les futures exigences de l\'AI Act.',
    methodologie: [
      {
        etape: '1. Auditer',
        description: 'Quels systèmes IA utilisez-vous ? Quelles données sont traitées ?'
      },
      {
        etape: '2. Analyser',
        description: 'Quels risques ? Quelle classification AI Act ?'
      },
      {
        etape: '3. Documenter',
        description: 'Quelles procédures mettre en place pour être conforme ?'
      },
      {
        etape: '4. Accompagner',
        description: 'Comment rester à jour face aux évolutions réglementaires ?'
      }
    ],
    casUsage: [
      {
        titre: 'Mise en conformité RGPD d\'un chatbot',
        description: 'Audit des données traitées, rédaction des mentions d\'information, mise en place du consentement et des droits utilisateurs.'
      },
      {
        titre: 'Classification AI Act d\'un système de scoring',
        description: 'Évaluation du niveau de risque, documentation des impacts, recommandations pour sortir de la catégorie "haut risque".'
      },
      {
        titre: 'Audit de conformité globale',
        description: 'Revue complète de l\'ensemble des systèmes IA déployés, identification des zones de risque, plan d\'action priorisé.'
      }
    ],
    faq: [
      {
        question: 'L\'AI Act s\'applique-t-il à toutes les entreprises ?',
        answer: 'À toute entreprise qui développe, déploie ou utilise un système IA dans l\'UE. Les obligations varient selon le niveau de risque.'
      },
      {
        question: 'Comment savoir si mon système IA est conforme au RGPD ?',
        answer: 'Ça dépend des données traitées, des finalités, du consentement. Un audit permet de faire le point.'
      },
      {
        question: 'Quelle est la durée d\'un audit de conformité ?',
        answer: 'Variable selon le nombre de systèmes à analyser. On en discute ensemble.'
      },
      {
        question: 'Proposez-vous de la veille réglementaire ?',
        answer: 'Oui. Les textes évoluent, c\'est important de rester à jour.'
      }
    ]
  }
];

export const getServiceBySlug = (slug: string): ServiceDetail | undefined => {
  return servicesData.find(service => service.slug === slug);
};