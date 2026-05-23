import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import BackgroundLayout from "@/components/layouts/BackgroundLayout";
import GradientDivider from "@/components/ui/GradientDivider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqData = [
  {
    question: "Qu'est-ce qu'un architecte IA et en quoi diffère-t-il d'un développeur classique ?",
    answer:
      "Un architecte IA conçoit la stratégie d'ensemble de votre transformation numérique par l'intelligence artificielle. Il ne se contente pas de coder : il audite vos processus, identifie les cas d'usage à fort ROI, choisit les modèles et outils adaptés, et supervise leur intégration dans votre système d'information. C'est un rôle à la croisée de la technique, du business et de la conformité.",
  },
  {
    question: "Quelles sont les étapes d'une mission d'accompagnement IA chez IArche ?",
    answer:
      "Notre méthodologie se décompose en 5 phases : (1) Immersion et audit de maturité IA, (2) Construction d'une roadmap priorisée avec estimation ROI, (3) Prototypage rapide (Proof of Concept), (4) Intégration et déploiement en production, (5) Accompagnement au changement et montée en compétence de vos équipes. Chaque phase est adaptée à votre contexte et à vos contraintes.",
  },
  {
    question: "Combien coûte en moyenne un projet d'intégration IA pour une PME ?",
    answer:
      "Le budget varie selon la complexité et l'ambition du projet. Un audit de maturité IA démarre à 2 500 € HT. Un prototype fonctionnel (PoC) sur un cas d'usage précis est généralement compris entre 8 000 € et 15 000 € HT. Pour une intégration complète avec formation des équipes, il faut compter entre 25 000 € et 60 000 € HT. Nous proposons systématiquement un devis détaillé avant tout engagement.",
  },
  {
    question: "L'IA est-elle accessible aux PME ou réservée aux grands groupes ?",
    answer:
      "L'IA est aujourd'hui plus accessible que jamais aux PME. Grâce aux modèles open source, aux API cloud et aux outils no-code/low-code, une petite structure peut obtenir des gains de productivité significatifs avec un investissement maîtrisé. Notre rôle est justement de démystifier l'IA et de proposer des solutions proportionnées à votre taille et à vos enjeux.",
  },
  {
    question: "Comment garantissez-vous la souveraineté et la confidentialité des données ?",
    answer:
      "La souveraineté est au cœur de notre approche. Nous privilégions les modèles open source déployables on-premise ou sur des clouds souverains français (OVHcloud, Scaleway, Outscale). Nous concevons les architectures pour minimiser les données envoyées à des tiers, et nous vous accompagnons dans la mise en conformité RGPD. Chaque projet intègre une analyse de risques data dès la phase de design.",
  },
  {
    question: "Quels types de cas d'usage IA pouvez-vous implémenter ?",
    answer:
      "Nous couvrons un spectre large : automatisation documentaire (extraction, classification, résumé), assistants conversationnels et chatbots RAG, analyse prédictive et scoring, génération de contenu marketing, optimisation de processus métier, vision par ordinateur pour le contrôle qualité, et bien sûr l'intégration d'agents IA autonomes. Chaque cas d'usage est validé par une preuve de valeur (PoV) avant industrialisation.",
  },
  {
    question: "Proposez-vous des formations pour nos équipes ?",
    answer:
      "Oui, la montée en compétence est un pilier de notre accompagnement. Nous proposons des ateliers de sensibilisation (demi-journée), des formations techniques pour vos équipes IT ou data (1 à 3 jours), et un programme de transfert de compétences tout au long du projet. L'objectif est que vous deveniez autonome dans la gouvernance de vos solutions IA.",
  },
  {
    question: "Intervenez-vous uniquement sur Bayonne et le Sud-Ouest ?",
    answer:
      "Notre siège est à Bayonne dans les Pyrénées-Atlantiques, mais nous intervenons sur toute la France. Nous combinons des missions en présentiel (idéales pour l'immersion et les workshops) avec un accompagnement à distance fluide. Notre clientèle s'étend de la Nouvelle-Aquitaine à l'Île-de-France, en passant par l'Occitanie et la région Auvergne-Rhône-Alpes.",
  },
  {
    question: "Qu'est-ce que la garantie de résultat 'Zero Friction' ?",
    audit:
      "Notre engagement 'Zero Friction' signifie que nous concevons des solutions qui s'intègrent naturellement dans vos habitudes de travail existantes. Pas de disruption inutile, pas de changement de processus pour le plaisir. Si un outil IA crée plus de friction qu'il n'en résout, nous le reconfigurons ou proposons une alternative. Votre satisfaction opérationnelle est notre critère de succès premier.",
  },
  {
    question: "Comment démarrer une collaboration avec IArche ?",
    answer:
      "La première étape est un rendez-vous de découverte gratuit de 30 minutes. Nous échangeons sur vos enjeux, votre contexte technique et vos objectifs. Suite à cet échange, nous vous remettons un diagnostic de maturité IA et une feuille de route préliminaire sans engagement. Vous pouvez prendre rendez-vous directement sur notre page Contact ou par email à nlq@iarche.fr.",
  },
];

// Schema.org FAQPage JSON-LD
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqData.map((item) => ({
    "@type": "Question",
    "name": item.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": (item as { answer?: string; audit?: string }).answer ?? (item as { answer?: string; audit?: string }).audit ?? "",
    },
  })),
};

const FAQ = () => {
  return (
    <>
      <Helmet>
        <html lang="fr" />
        <link rel="alternate" hrefLang="fr" href="https://iarche.fr/faq" />
        <title>FAQ · Questions fréquentes sur l'IA et IArche | Bayonne</title>
        <meta
          name="description"
          content="Trouvez les réponses à vos questions sur l'intelligence artificielle pour les PME, nos services, nos tarifs et notre méthodologie à Bayonne et en France."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://iarche.fr/faq" />

        <meta property="og:type" content="website" />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="IArche" />
        <meta property="og:title" content="FAQ · Questions fréquentes sur l'IA et IArche" />
        <meta
          property="og:description"
          content="Réponses aux questions sur l'IA pour les PME, nos services, tarifs et méthodologie."
        />
        <meta property="og:url" content="https://iarche.fr/faq" />
        <meta property="og:image" content="https://iarche.fr/og/faq.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="FAQ · Questions fréquentes sur l'IA et IArche" />
        <meta
          name="twitter:description"
          content="Réponses aux questions sur l'IA pour les PME, nos services, tarifs et méthodologie."
        />
        <meta name="twitter:image" content="https://iarche.fr/og/faq.png" />

        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <BackgroundLayout>
        <Header />

        <main className="pt-24 pb-16">
          <section className="container mx-auto px-4 md:px-6 max-w-4xl">
            <div className="text-center mb-12">
              <span className="text-xs font-semibold tracking-[0.2em] uppercase text-terracotta mb-3 block">
                FAQ
              </span>
              <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
                Questions fréquentes
              </h1>
              <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                Tout ce que vous devez savoir sur l'intelligence artificielle pour votre PME,
                nos services et notre méthodologie d'accompagnement.
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-4">
              {faqData.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`faq-${index}`}
                  className="bg-card border border-border rounded-xl px-6 data-[state=open]:shadow-sm transition-shadow"
                >
                  <AccordionTrigger className="text-left text-base md:text-lg font-medium text-foreground hover:no-underline py-5">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm md:text-base leading-relaxed pb-5">
                    {(item as { answer?: string; audit?: string }).answer ?? (item as { answer?: string; audit?: string }).audit ?? ""}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          <GradientDivider />

          <section className="container mx-auto px-4 md:px-6 max-w-3xl text-center mt-16">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Vous ne trouvez pas votre réponse ?
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Contactez-nous directement. Nous vous répondrons sous 24 heures ouvrées.
            </p>
            <a
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg bg-night-blue px-8 py-3 text-sm font-medium text-white shadow-sm hover:bg-night-blue/90 transition-colors"
            >
              Nous contacter
            </a>
          </section>
        </main>

        <Footer />
      </BackgroundLayout>
    </>
  );
};

export default FAQ;
