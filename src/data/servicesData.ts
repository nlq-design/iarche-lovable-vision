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
        titre: 'Automatisation de la relation client',
        description: 'Mise en place d\'un assistant IA pour gérer les demandes récurrentes et libérer du temps aux équipes commerciales.'
      },
      {
        titre: 'Optimisation des processus métier',
        description: 'Identification des tâches répétitives automatisables par IA pour gagner en productivité.'
      },
      {
        titre: 'Analyse prédictive',
        description: 'Exploitation des données historiques pour anticiper les besoins clients ou optimiser les stocks.'
      }
    ],
    faq: [
      {
        question: 'Quelle est la durée moyenne d\'un audit ?',
        answer: 'Un audit complet dure entre 2 et 4 semaines selon la taille de votre organisation et la complexité de vos processus. Nous adaptons le périmètre en fonction de vos besoins et contraintes.'
      },
      {
        question: 'Dois-je avoir des compétences techniques en interne ?',
        answer: 'Non, notre audit s\'adresse justement aux dirigeants sans expertise IA préalable. Nous vulgarisons les concepts techniques et vous accompagnons dans la compréhension des enjeux.'
      },
      {
        question: 'Quel est le coût d\'un audit ?',
        answer: 'Le tarif varie selon le périmètre et la profondeur de l\'analyse. Contactez-nous pour un devis personnalisé adapté à votre contexte.'
      },
      {
        question: 'L\'audit inclut-il des recommandations d\'outils ?',
        answer: 'Oui, nous vous conseillons sur les solutions techniques adaptées à vos cas d\'usage identifiés, qu\'il s\'agisse d\'outils no-code ou de développements sur-mesure.'
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
      'Architecture scalable et maintenable',
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
    casUsage: [
      {
        titre: 'Chatbot métier sur-mesure',
        description: 'Développement d\'un assistant conversationnel spécialisé pour votre secteur d\'activité, intégré à vos bases de connaissances.'
      },
      {
        titre: 'Système de recommandation',
        description: 'Moteur IA pour personnaliser l\'expérience utilisateur et optimiser les conversions.'
      },
      {
        titre: 'Analyse documentaire automatisée',
        description: 'Extraction et classification intelligente d\'informations dans vos documents métier.'
      }
    ],
    faq: [
      {
        question: 'Travaillez-vous avec des technologies open-source ?',
        answer: 'Oui, nous privilégions les solutions open-source éprouvées (LangChain, Hugging Face, etc.) pour garantir votre autonomie et éviter le vendor lock-in. Nous utilisons aussi des APIs propriétaires (OpenAI, Anthropic) si elles correspondent mieux à vos besoins.'
      },
      {
        question: 'Combien de temps dure un projet de développement ?',
        answer: 'Une maquette prend 2-4 semaines. L\'industrialisation complète varie de 2 à 6 mois selon la complexité. Nous travaillons en mode agile avec des livraisons itératives.'
      },
      {
        question: 'Assurez-vous l\'accompagnement après livraison ?',
        answer: 'Oui, nous proposons des contrats de suivi évolutif et correctif. Nous pouvons aussi former vos équipes pour qu\'elles gagnent en autonomie.'
      },
      {
        question: 'Peut-on commencer par une maquette avant de s\'engager ?',
        answer: 'Absolument, c\'est même notre approche recommandée. La maquette permet de valider la faisabilité technique et l\'adéquation avec vos besoins avant tout investissement conséquent.'
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
      'Coaching individuel ou collectif',
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