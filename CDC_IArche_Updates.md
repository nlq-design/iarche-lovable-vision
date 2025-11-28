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

## RÉPONSES AUX QUESTIONS - CLARIFICATIONS FINALES ✅

### A. Structure du blog/ressources (/ressources)
**✅ CONFIRMÉ : Bibliothèque d'actualités avec back-office**

**Spécifications :**
- Blog avec articles réguliers (potentiellement quotidiens)
- Contenu : actualités IA, avancées technologiques, retours d'expérience projets
- Gestion 100% via back-office Lovable Cloud
- Structure blog avec section "Articles à venir" pour V1
- Possibilité d'intégrer articles existants dès le départ si disponibles

**Tables Supabase requises :**
```sql
blog_posts:
  - id (uuid)
  - title (text)
  - slug (text, unique)
  - excerpt (text)
  - content (text)
  - featured_image (text, nullable)
  - author (text)
  - published_at (timestamp)
  - status (enum: draft, published)
  - created_at (timestamp)
  - updated_at (timestamp)
```

---

### B. Page Solutions - Niveau de détail
**✅ CONFIRMÉ : 5 projets avec CTA "En savoir plus"**

**Spécifications :**
- 5 projets/solutions à afficher dès V1
- CTA "En savoir plus" sur chaque projet
- Trois options pour le CTA :
  1. **Modale** avec détails complets (recommandé pour projets internes)
  2. **Formulaire de demande de documentation** (capture leads)
  3. **Lien externe** (si solution a site dédié)

**Logique :**
- Projets nommés publics : modale avec détails
- Projets confidentiels/en cours : formulaire pour doc (capture email)

**Table Supabase requise :**
```sql
projects:
  - id (uuid)
  - name (text)
  - description (text)
  - category (text)
  - status (enum: available, coming_soon, confidential)
  - is_public (boolean)
  - cta_type (enum: modal, form, external_link)
  - cta_url (text, nullable)
  - image_url (text, nullable)
  - order (integer)
  - created_at (timestamp)
```

---

### C. Navigation header
**✅ CONFIRMÉ :**
- Expertise : Dropdown avec 5 liens (hub + 4 sous-pages)
- Solutions : Lien simple vers page unique

---

### D. Formulaire contact - Notifications
**✅ CONFIRMÉ :**
- Email de notification : **adresse email professionnelle du fondateur** (à fournir)
- **Email de confirmation automatique** à l'utilisateur : OUI
- Stockage en base : Historique complet pour suivi + tableau de bord admin

**Spécifications techniques :**
- Edge function avec Resend pour envoi emails
- Double envoi : notification fondateur + confirmation utilisateur
- Validation stricte avec Zod (sécurité)
- Stockage contact_submissions en DB

**Table Supabase requise :**
```sql
contact_submissions:
  - id (uuid)
  - name (text)
  - email (text)
  - company (text)
  - message (text)
  - status (enum: new, read, replied, archived)
  - created_at (timestamp)
```

**Secrets requis :**
- `RESEND_API_KEY` (pour envoi emails)
- `CONTACT_EMAIL` (email destinataire notifications)

---

### E. Ordre de développement
**✅ CONFIRMÉ : Homepage complète → validation → suite**

**Approche validée :**
1. **Phase 1 - Homepage seule** :
   - Design system complet (couleurs, typo, composants)
   - Hero adapté du composant 21st.dev
   - Section problème/accroche
   - 4 pôles Expertise (cards)
   - Section crédibilité SaaS
   - CTA final
   - → **VALIDATION AVANT SUITE**

2. **Phase 2 - Navigation + Hubs** (après validation homepage) :
   - Header avec navigation dropdown
   - Footer
   - Hub Expertise
   - Page Solutions unique

3. **Phase 3 - Profondeur** (itératif) :
   - 4 sous-pages Expertise
   - Page À propos
   - Page Contact avec formulaire
   - Page Ressources/Blog

---

### F. Intégration composant 21st.dev
**✅ CONFIRMÉ : Composant hero fourni**

**Composant source :** `dynamic-animated-hero-section-with-gradient.tsx`

**Adaptations appliquées à la charte IArche :**
- ❌ Fond noir → ✅ Blanc Cassé #FAF9F7
- ❌ Dégradé rose/bleu/cyan → ✅ Bleu Nuit #1A2B4A avec accent Terracotta
- ❌ Lignes blanches → ✅ Lignes Terracotta (#D15A3E)
- ❌ Bouton blanc → ✅ Bouton Terracotta (#D15A3E)
- ❌ Texte générique → ✅ Copy IArche :
  - Titre H1 : "IArche" (en Terracotta)
  - Baseline : "L'IA se construit avec vous"
  - Suppression du sur-titre "Agence IA · Bayonne"
- ✅ Animations optimisées : Progressive staggered, pulse subtil (3s), patterns ultra-lents (45s)
- ✅ Typographie Inter

---

## DÉVELOPPEMENT EN COURS

### Étape actuelle : Homepage V1
- [x] Lovable Cloud activé
- [x] CDC mis à jour avec réponses finales
- [x] Design system configuré (index.css + tailwind.config.ts)
- [x] Composant hero adapté à charte IArche (animations A+B appliquées)
- [x] Copy hero finalisé (IArche + baseline)
- [x] Ancrage géographique ajouté ("Bayonne · France" en bas de page)
- [x] Intégration design system : utilisation token `text-primary` pour cohérence globale
- [ ] Homepage assemblée (sections suivantes à ajouter)
- [ ] Validation client

---

---

*Fin des mises à jour CDC V3.1*
