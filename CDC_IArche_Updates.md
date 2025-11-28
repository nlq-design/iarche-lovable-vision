# Cahier des Charges IArche - Mises à Jour

**Version mise à jour : V3.1**  
**Date : 28 Novembre 2025**  
**Basé sur : CDC_IArche_V3.docx**

---

## MODIFICATIONS MAJEURES

### 1. ARCHITECTURE DES PAGES

#### ✅ CONFIRMÉ - Structure simplifiée
- **Homepage** (/)
- **Hub Expertise** (/expertise)
- **4 sous-pages Expertise** :
  - /expertise/conseil-audit
  - /expertise/solutions-integration
  - /expertise/accompagnement-autonomie
  - /expertise/reglementation-conformite
- **Page Solutions unique** (/solutions) - **MODIFICATION**
- **À propos** (/a-propos)
- **Ressources/Blog** (/ressources)
- **Contact** (/contact)

**TOTAL : 10 pages (au lieu de 14)**

---

### 2. SOLUTIONS SAAS - CHANGEMENT MAJEUR ❗

#### ❌ ANNULÉ : Pages individuelles par solution
Le CDC V3 prévoyait 4 pages dédiées :
- /solutions/legal-tech
- /solutions/team5-connect
- /solutions/collaboration
- /solutions/conversationnelle

#### ✅ NOUVEAU : Page Solutions unique
**URL : /solutions**

**Structure :**
- Une seule page listant tous les projets/solutions
- Certains projets avec nom visible + description complète
- D'autres projets avec description uniquement (anonymisés)
- Les solutions accessibles publiquement auront un lien vers plus d'infos
- **Objectif : éviter le cannibalisme SEO entre solutions et agence**

**Rationale :**
- Pas de concurrence entre activité agence et activité éditeur
- Crédibilité via projets réels sans détourner les leads agence
- Plus de flexibilité pour communiquer sur projets confidentiels

---

### 3. PRISE DE CONTACT - CHANGEMENT MAJEUR ❗

#### ❌ ANNULÉ : Intégration Cal.com
Le CDC V3 prévoyait :
- Réservation de créneaux via Cal.com
- Intégration widget externe

#### ✅ NOUVEAU : Formulaire de contact maison
**Raison : Sortir des dépendances externes**

**Spécifications formulaire :**
- Formulaire custom développé en interne
- Champs requis : Nom, Email, Entreprise, Message
- Validation client-side avec Zod
- Envoi via edge function (Lovable Cloud)
- Notification email au fondateur
- Stockage en base de données (optionnel pour suivi)
- **IMPORTANT : Validation stricte pour sécurité (cf. input-validation-security)**

**CTA à modifier :**
- "Réserver un appel" → "Nous contacter"
- "Réserver un créneau" → "Envoyer un message"

---

### 4. SECTION FONDATEUR - MODIFICATION

#### ❌ RETIRÉ : Mise en avant du fondateur
Le CDC V3 incluait :
- Photo fondateur
- Bio 2-3 phrases
- Lien LinkedIn

#### ✅ NOUVEAU : Crédibilité par les projets
**Page À propos :**
- Focus sur la vision et le modèle IArche (agence + éditeur)
- Mention du fondateur minimale (nom + titre uniquement)
- **Pas de photo, pas de bio détaillée**
- La crédibilité vient des solutions en production

---

### 5. CONTENU VISUEL - MODIFICATION

#### ❌ ANNULÉ : Génération d'images IA
Pas de génération d'images conceptuelles via IA

#### ✅ NOUVEAU : Approche visuelle
- Intégration logo IArche fourni ultérieurement
- Utilisation d'espacements, typographie et couleurs pour créer l'impact visuel
- Composants 21st.dev comme base structurelle
- **Approche minimaliste et élégante sans dépendre des visuels**

---

### 6. BACK-OFFICE - AJOUT ✅

#### ✅ REQUIS dès V1 : CMS / Back-office
**Non mentionné clairement dans CDC V3, maintenant confirmé :**

**Solution : Lovable Cloud activé**
- Gestion du contenu blog/ressources
- Gestion des projets/solutions affichés
- Base de données pour formulaire contact
- Edge functions pour logique serveur

**Tables à prévoir :**
- `blog_posts` (titre, slug, contenu, date, auteur, statut)
- `projects` (nom, description, catégorie, statut, visibilité)
- `contact_submissions` (nom, email, entreprise, message, date, statut)

---

### 7. PLANNING - MODIFICATION

#### ❌ RETIRÉ : Délais fixes
Le CDC V3 mentionnait :
- Phase 1 : 1 sem
- Phase 2 : 2 sem
- Phase 3 : 1 sem
- etc.

#### ✅ NOUVEAU : Approche itérative sans deadline
**Principe : "On réalise tout ensemble, progressivement"**
- Pas de communication sur délais
- Avancement selon disponibilité et feedback
- Priorisation flexible selon besoins business

---

### 8. DOMAINES - REPORT

#### ⏸️ EN ATTENTE : Configuration domaines
- iarche.fr et iarche.io pas encore configurés
- Redirection entre domaines à définir ultérieurement
- **Ne pas traiter dans la V1**

---

## ÉLÉMENTS CONSERVÉS DU CDC V3

### ✅ Direction artistique intacte
- Palette couleurs (Bleu Nuit #1A2B4A, Terracotta #D15A3E, etc.)
- Typographie Inter
- Composants UI (border-radius, shadows, etc.)
- ADN visuel : sobre, chaleureux, professionnel, anti-template

### ✅ Positionnement conservé
- Baseline : "L'IA se construit avec vous"
- 4 pôles d'expertise maintenus
- Proposition de valeur inchangée
- Cible : PME françaises

### ✅ SEO et technique
- Architecture en silo
- Mots-clés identifiés conservés
- Performance Lighthouse > 90
- Stack : Lovable (React/Vite) + Tailwind + Lovable Cloud

### ✅ Intégration 21st.dev
- Composants proposés au fur et à mesure de la construction
- Adaptation obligatoire à la charte IArche
- Mapping couleurs conservé

---

## PROCHAINES ÉTAPES

1. **Validation de cette mise à jour CDC** par le client
2. **Définir la priorisation des pages** :
   - Option A : Homepage seule (validation identité visuelle)
   - Option B : Homepage + 2 hubs (structure navigable)
   - Option C : Toutes les pages d'un coup
3. **Activer Lovable Cloud** pour back-office
4. **Proposer composants 21st.dev** pertinents au fil du dev
5. **Développement itératif** avec feedback continu

---

## QUESTIONS EN SUSPENS

### Questions affinées post-clarifications :

**A. Structure du blog/ressources (/ressources)**
- Quel niveau de détail pour la V1 ?
  - Option 1 : Page vide "À venir" avec newsletter
  - Option 2 : Structure blog avec 2-3 articles exemples (lorem ou réels ?)
  - Option 3 : Uniquement formulaire newsletter sans section articles

**B. Page Solutions - Niveau de détail**
- Combien de projets à afficher dès la V1 ?
  - Les 4 mentionnés dans le CDC ?
  - Plus ? Moins ?
- Format des projets anonymisés : card avec description uniquement ?
- Projets nommés : besoin de CTA "En savoir plus" vers où ? (page externe ? modal ?)

**C. Navigation header - Dropdown ou pas ?**
Le CDC V3 mentionne :
- Expertise : Dropdown (hub + 4 sous-pages)
- Solutions : Dropdown (hub + 4 sous-pages) ← **obsolète**

**Nouveau :**
- Expertise : Dropdown avec 5 liens (hub + 4 sous-pages) ✅
- Solutions : Lien simple vers page unique ✅

**D. Formulaire contact - Notifications**
- Email de notification : quelle adresse recevoir les soumissions ?
- Besoin d'une confirmation automatique à l'utilisateur ?
- Stockage en base : juste pour historique ou besoin de tableau de bord admin ?

**E. Ordre de développement préféré ?**
Quelle approche préférez-vous :
1. **Design system d'abord** : Créer toute la charte (couleurs, composants, etc.) puis les pages
2. **Page par page** : Homepage complète → validation → suite
3. **Skeleton complet** : Toutes les pages en wireframe → habillage progressif

---

*Fin des mises à jour CDC V3.1*
