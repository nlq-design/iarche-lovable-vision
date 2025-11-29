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
    description: 'Diagnostic personnalisé de votre maturité IA et définition d\'une feuille de route adaptée à vos enjeux métier.',
    descriptionLongue: 'Notre service d\'audit et conseil vous accompagne dans la structuration de votre démarche IA. Nous analysons votre contexte métier, vos processus existants et vos objectifs pour établir un diagnostic précis de votre maturité IA. À partir de cette analyse, nous co-construisons une feuille de route pragmatique et chiffrée, priorisant les cas d\'usage à fort impact business.',
    livrables: [
      'Cartographie des cas d\'usage prioritaires',
      'Évaluation de la maturité technologique',
      'Plan d\'action chiffré et priorisé',
      'Recommandations d\'outils et partenaires'
    ],
    pourQui: 'Dirigeants de PME souhaitant structurer leur démarche IA sans partir d\'une page blanche.',
    methodologie: [
      {
        etape: '1. Diagnostic initial',
        description: 'Entretiens avec les parties prenantes, analyse des processus métier et identification des points de friction.'
      },
      {
        etape: '2. Évaluation de la maturité',
        description: 'Audit technique de votre infrastructure, évaluation de la qualité des données et des compétences internes.'
      },
      {
        etape: '3. Identification des cas d\'usage',
        description: 'Cartographie des opportunités IA en fonction de leur faisabilité technique et de leur impact business.'
      },
      {
        etape: '4. Feuille de route',
        description: 'Plan d\'action priorisé avec estimation budgétaire, timeline et KPIs de suivi.'
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
    description: 'Conception et déploiement de solutions IA sur-mesure, du POC à la production, avec accompagnement technique complet.',
    descriptionLongue: 'Nous concevons et développons des solutions IA sur-mesure, parfaitement intégrées à votre écosystème technique existant. Du prototypage rapide (POC) à la mise en production scalable, nous vous accompagnons à chaque étape avec rigueur et pragmatisme. Notre approche combine expertise technique pointue et compréhension fine des enjeux métier.',
    livrables: [
      'Prototypage rapide (POC en 2-4 semaines)',
      'Architecture scalable et maintenable',
      'Intégration avec vos outils existants',
      'Documentation technique et transfert de compétences'
    ],
    pourQui: 'Entreprises prêtes à industrialiser un cas d\'usage métier concret nécessitant une expertise technique pointue.',
    methodologie: [
      {
        etape: '1. Cadrage technique',
        description: 'Analyse des besoins, définition de l\'architecture cible et validation de la faisabilité technique.'
      },
      {
        etape: '2. Prototypage (POC)',
        description: 'Développement d\'une preuve de concept fonctionnelle en 2-4 semaines pour valider l\'approche.'
      },
      {
        etape: '3. Développement',
        description: 'Industrialisation du POC avec architecture scalable, tests automatisés et intégration continue.'
      },
      {
        etape: '4. Déploiement & maintenance',
        description: 'Mise en production progressive, monitoring et accompagnement post-lancement.'
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
        answer: 'Un POC prend 2-4 semaines. L\'industrialisation complète varie de 2 à 6 mois selon la complexité. Nous travaillons en mode agile avec des livraisons itératives.'
      },
      {
        question: 'Assurez-vous la maintenance après livraison ?',
        answer: 'Oui, nous proposons des contrats de maintenance évolutive et corrective. Nous pouvons aussi former vos équipes pour qu\'elles gagnent en autonomie.'
      },
      {
        question: 'Peut-on commencer par un POC avant de s\'engager ?',
        answer: 'Absolument, c\'est même notre approche recommandée. Le POC permet de valider la faisabilité technique et l\'adéquation avec vos besoins avant tout investissement conséquent.'
      }
    ]
  },
  {
    id: 'accompagnement',
    slug: 'accompagnement',
    title: 'Accompagnement & Autonomie',
    description: 'Montée en compétences de vos équipes via formations pratiques, coaching et transfert de connaissances opérantes.',
    descriptionLongue: 'Notre mission : rendre vos équipes autonomes sur l\'IA. Nous proposons des formations techniques et métier adaptées à votre niveau, du prompting avancé aux techniques de fine-tuning, en passant par les enjeux éthiques et réglementaires. Notre approche pédagogique privilégie la pratique et les cas concrets issus de votre activité.',
    livrables: [
      'Formations techniques (prompting, fine-tuning, RAG)',
      'Ateliers métier (cas d\'usage, ROI, éthique)',
      'Coaching individuel ou collectif',
      'Documentation et guides internes personnalisés'
    ],
    pourQui: 'Organisations visant l\'autonomie et l\'acculturation IA de leurs collaborateurs sans dépendance à un prestataire.',
    methodologie: [
      {
        etape: '1. Audit des compétences',
        description: 'Évaluation du niveau de maturité IA de vos équipes et identification des besoins de formation.'
      },
      {
        etape: '2. Programme sur-mesure',
        description: 'Conception d\'un parcours pédagogique adapté à vos enjeux métier et à votre niveau.'
      },
      {
        etape: '3. Sessions pratiques',
        description: 'Formations interactives avec exercices sur vos données et cas d\'usage réels.'
      },
      {
        etape: '4. Suivi post-formation',
        description: 'Coaching et support continu pour accompagner la mise en pratique dans votre quotidien.'
      }
    ],
    casUsage: [
      {
        titre: 'Formation prompting pour équipes marketing',
        description: 'Maîtrise de ChatGPT et Claude pour la création de contenus, briefs créatifs et automatisation des tâches répétitives.'
      },
      {
        titre: 'Atelier IA pour dirigeants',
        description: 'Sensibilisation aux enjeux stratégiques de l\'IA : opportunités, risques, ROI et transformation organisationnelle.'
      },
      {
        titre: 'Formation technique RAG pour développeurs',
        description: 'Implémentation de systèmes de recherche sémantique et génération augmentée par récupération.'
      }
    ],
    faq: [
      {
        question: 'Quels formats de formation proposez-vous ?',
        answer: 'Nous proposons des formations inter-entreprises (groupes de 8-12 personnes) ou intra-entreprise (sur-mesure pour vos équipes), en présentiel à Bayonne ou en distanciel. Durée : de 2h (atelier découverte) à 3 jours (formation technique complète).'
      },
      {
        question: 'Faut-il des prérequis techniques ?',
        answer: 'Non pour les formations métier (prompting, cas d\'usage). Oui pour les formations techniques avancées (fine-tuning, RAG) : nous recommandons une maîtrise de Python et des bases en machine learning.'
      },
      {
        question: 'Proposez-vous des certifications ?',
        answer: 'Nous délivrons une attestation de formation à l\'issue de chaque session. Pour les formations longues, nous pouvons intégrer une évaluation finale avec certification interne.'
      },
      {
        question: 'Peut-on avoir un suivi après la formation ?',
        answer: 'Oui, nous proposons du coaching post-formation (sessions individuelles ou collectives) pour accompagner la mise en pratique et répondre à vos questions terrain.'
      }
    ]
  },
  {
    id: 'conformite',
    slug: 'conformite',
    title: 'Conformité & Réglementation',
    description: 'Mise en conformité RGPD et AI Act, audit de vos systèmes IA et accompagnement juridique adapté.',
    descriptionLongue: 'L\'IA soulève des enjeux juridiques et éthiques majeurs. Nous vous accompagnons dans la mise en conformité RGPD et AI Act, l\'audit de vos systèmes IA existants et la documentation réglementaire. Notre approche combine expertise technique et veille juridique pour sécuriser vos projets IA face aux obligations légales actuelles et futures.',
    livrables: [
      'Audit de conformité RGPD et AI Act',
      'Documentation réglementaire (registres, impacts)',
      'Recommandations d\'implémentation',
      'Veille réglementaire continue'
    ],
    pourQui: 'Entreprises soumises aux obligations réglementaires ou anticipant les futures exigences de l\'AI Act.',
    methodologie: [
      {
        etape: '1. Audit des systèmes IA',
        description: 'Cartographie des traitements IA, identification des risques RGPD et AI Act, analyse des données utilisées.'
      },
      {
        etape: '2. Analyse des risques',
        description: 'Évaluation des impacts (DPIA), classification des systèmes selon l\'AI Act, identification des non-conformités.'
      },
      {
        etape: '3. Plan de mise en conformité',
        description: 'Recommandations techniques et organisationnelles, documentation réglementaire, procédures internes.'
      },
      {
        etape: '4. Accompagnement continu',
        description: 'Veille réglementaire, mise à jour de la documentation, support pour les audits officiels.'
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
        answer: 'L\'AI Act européen s\'applique progressivement selon le niveau de risque de vos systèmes IA. Les systèmes à "haut risque" (recrutement, scoring crédit, etc.) sont les plus encadrés. Nous vous aidons à classifier vos usages et anticiper les obligations.'
      },
      {
        question: 'Comment savoir si mon système IA est conforme au RGPD ?',
        answer: 'Un audit RGPD spécifique IA est nécessaire : nous vérifions la licéité des traitements, la minimisation des données, les mesures de sécurité et les droits des personnes concernées.'
      },
      {
        question: 'Quelle est la durée d\'un audit de conformité ?',
        answer: 'Entre 1 et 3 semaines selon le nombre de systèmes IA audités et leur complexité. Nous livrons un rapport détaillé avec plan d\'action priorisé.'
      },
      {
        question: 'Proposez-vous de la veille réglementaire ?',
        answer: 'Oui, nous proposons un service de veille continue pour vous tenir informé des évolutions législatives (AI Act, RGPD, directives sectorielles) et adapter votre conformité.'
      }
    ]
  }
];

export const getServiceBySlug = (slug: string): ServiceDetail | undefined => {
  return servicesData.find(service => service.slug === slug);
};
