# 📊 Audit Architecture Leads & Contacts - IArche

**Date:** 30 novembre 2025  
**Auditeur:** AI Assistant  
**Contexte:** Restructuration complète de la gestion des leads et contacts

---

## 🎯 Objectif

Créer une structure claire et fonctionnelle pour capturer, gérer et exploiter tous les leads générés par le site, avec des sections admin dédiées et des routes établies entre site public, base de données et back-office admin.

---

## 📂 Architecture Actuelle (État des lieux)

### **1. Tables Supabase (Backend)**

| Table | Description | Utilisation | Statut |
|-------|-------------|-------------|--------|
| `leads` | **Table CONSOLIDÉE** - Tous les leads (newsletter, contact, livre-blanc, atelier-webinaire) | Vue générale des conversions | ✅ Fonctionnel |
| `newsletter_subscribers` | Inscriptions newsletters uniquement | Gestion spécifique newsletters | ✅ Fonctionnel |
| `contacts` | Formulaires de contact (message détaillé) | Gestion des demandes entrantes | ✅ Fonctionnel |
| `atelier_inscriptions` | Jonction atelier ↔ lead (table relationnelle) | Inscriptions aux ateliers/webinaires | ✅ Fonctionnel |
| `cta_clicks` | Tracking des clics sur CTAs | Analytics des conversions | ✅ Fonctionnel |

**🔍 Observation importante:** 
- La table `leads` sert de **table consolidée** pour TOUS les types de leads
- Les tables `newsletter_subscribers` et `contacts` sont **spécialisées** avec plus de détails
- Les formulaires créent des entrées dans DEUX tables (leads + table spécialisée)

---

### **2. Pages Admin (Back-office)**

#### **✅ Section "Engagement" (Sidebar)**

| Page | Route | Fichier | Statut | Description |
|------|-------|---------|--------|-------------|
| **Leads (consolidé)** | `/admin/leads` | `AdminLeads.tsx` | ✅ Existe | Vue consolidée de TOUS les leads avec filtres source |
| **Contacts** | `/admin/contacts` | `AdminContacts.tsx` | ✅ Existe | Messages formulaire contact avec sujet/message |
| **Livres blancs** | `/admin/livre-blanc-inscriptions` | `AdminLivreBlancsInscriptions.tsx` | ✅ **CRÉÉ** | Inscriptions spécifiques livres blancs |
| **Ateliers** | `/admin/atelier-inscriptions` | `AdminAtelierInscriptions.tsx` | ✅ Existe | Inscriptions ateliers/webinaires |
| Commentaires | `/admin/comments` | `AdminComments.tsx` | ✅ Existe | Gestion des commentaires articles |
| FAQs | `/admin/faqs` | `AdminFAQs.tsx` | ✅ Existe | Gestion des FAQ articles |

#### **✅ Section "Communication" (Sidebar)**

| Page | Route | Fichier | Statut | Description |
|------|-------|---------|--------|-------------|
| **Abonnés newsletters** | `/admin/newsletters` | `AdminNewsletters.tsx` | ✅ **CRÉÉ** | Liste emails inscrits newsletter |
| RedacNews | `/admin/redacnews` | `RedacNews.tsx` | ✅ Existe | Création newsletters |

---

### **3. Formulaires Site Public (Frontend)**

| Formulaire | Composant | Tables alimentées | Statut | Notification admin |
|------------|-----------|-------------------|--------|-------------------|
| **Livre blanc** | `LivreBlancsForm.tsx` | `leads` (source='livre-blanc') | ✅ Fonctionnel | ✅ Edge function `send-lead-notification` |
| **Newsletter** | Composants sections | `newsletter_subscribers` + `leads` | ✅ Fonctionnel | ⚠️ À vérifier |
| **Contact** | Page `/contact` | `contacts` + `leads` | ✅ Fonctionnel | ✅ Email confirmation |
| **Atelier inscription** | À créer | `leads` + `atelier_inscriptions` | ❌ **À CRÉER** | ❌ À implémenter |

---

## 🔄 Flux de Données (Data Flow)

### **Flux 1: Livre Blanc**
```
User remplit formulaire LB
    ↓
LivreBlancsForm.tsx
    ↓
INSERT dans table `leads` (source='livre-blanc', source_id=article.id)
    ↓
Edge function `send-lead-notification` → Email admin
    ↓
Visible dans:
  - /admin/leads (vue consolidée)
  - /admin/livre-blanc-inscriptions (vue dédiée) ✅ NOUVEAU
```

### **Flux 2: Newsletter**
```
User remplit formulaire newsletter
    ↓
NewsletterSection.tsx
    ↓
INSERT dans `newsletter_subscribers` + `leads` (source='newsletter')
    ↓
Visible dans:
  - /admin/leads (vue consolidée)
  - /admin/newsletters (vue dédiée) ✅ NOUVEAU
```

### **Flux 3: Contact**
```
User remplit formulaire contact
    ↓
Page Contact.tsx
    ↓
INSERT dans `contacts` (avec message détaillé) + `leads` (source='contact')
    ↓
Email confirmation automatique
    ↓
Visible dans:
  - /admin/leads (vue consolidée)
  - /admin/contacts (vue dédiée)
```

### **Flux 4: Atelier (À CRÉER)**
```
User remplit formulaire inscription atelier
    ↓
AteliersWebinairesForm.tsx (À CRÉER)
    ↓
INSERT dans `leads` (source='atelier-webinaire', source_id=article.id)
    ↓
INSERT dans `atelier_inscriptions` (jonction atelier_id ↔ lead_id)
    ↓
Email confirmation avec .ics calendrier
    ↓
Visible dans:
  - /admin/leads (vue consolidée)
  - /admin/atelier-inscriptions (vue dédiée)
```

---

## ✅ Actions Réalisées (30/11/2025)

### **1. Création Pages Admin**

✅ **AdminLivreBlancsInscriptions.tsx** - `/admin/livre-blanc-inscriptions`
- Affiche leads filtrés par `source='livre-blanc'`
- Colonnes: Livre blanc, Nom, Email, Entreprise, Téléphone, Consentement marketing, Date
- Statistiques: Total inscriptions, Avec consentement, Livres blancs actifs, Derniers 7 jours
- Actions: Recherche, Sélection multiple, Suppression bulk, Export CSV
- JOIN avec `articles` pour afficher titre du livre blanc

✅ **AdminNewsletters.tsx** - `/admin/newsletters`
- Affiche abonnés depuis `newsletter_subscribers`
- Colonnes: Email, Date d'inscription
- Statistiques: Total abonnés, Derniers 7 jours, Derniers 30 jours
- Actions: Recherche, Sélection multiple, Suppression bulk, Export CSV

### **2. Mise à jour AdminSidebar**

✅ **Section "Engagement" restructurée:**
```tsx
{
  group: 'Engagement',
  items: [
    { title: 'Commentaires', url: '/admin/comments', icon: MessageCircle },
    { title: 'FAQs', url: '/admin/faqs', icon: HelpCircle },
    { title: 'Leads (consolidé)', url: '/admin/leads', icon: Users },
    { title: 'Contacts', url: '/admin/contacts', icon: Mail },
    { title: 'Livres blancs', url: '/admin/livre-blanc-inscriptions', icon: FileText },
    { title: 'Ateliers', url: '/admin/atelier-inscriptions', icon: UserCheck },
  ]
}
```

**Logique de hiérarchie:**
1. **Leads (consolidé)** en premier = vue globale de TOUS les leads
2. **Contacts** = messages détaillés avec sujet
3. **Livres blancs** = leads spécifiques téléchargement
4. **Ateliers** = inscriptions événements

### **3. Routes App.tsx**

✅ Ajout route lazy-loaded:
```tsx
<Route path="/admin/livre-blanc-inscriptions" element={
  <Suspense fallback={<Loader2 />}>
    <ProtectedAdminRoute><AdminLivreBlancsInscriptions /></ProtectedAdminRoute>
  </Suspense>
} />

<Route path="/admin/newsletters" element={
  <Suspense fallback={<Loader2 />}>
    <ProtectedAdminRoute><AdminNewsletters /></ProtectedAdminRoute>
  </Suspense>
} />
```

---

## ❌ Actions à Réaliser (Prochaines étapes)

### **🔥 PRIORITÉ 1: Formulaire Atelier**

**Étape 1:** Créer `AteliersWebinairesForm.tsx`
- Champs: name, email, company (optional), phone (optional)
- Validation Zod
- Submit → INSERT `leads` + `atelier_inscriptions`
- Confirmation avec bouton .ics téléchargement calendrier

**Étape 2:** Intégrer dans `ArticleDetail.tsx`
- Condition: `article.resource_type === 'atelier-webinaire'`
- Affichage formulaire si `registration_open=true` et capacité disponible
- Masquer si `inscription_count >= max_participants`

**Étape 3:** Email confirmation
- Edge function `send-atelier-confirmation`
- Contenu: Détails atelier, .ics attachment
- Notification admin (nouvel inscrit)

### **🔥 PRIORITÉ 2: Vérifier Flux Newsletter**

**Action:** Auditer le composant NewsletterSection
- Vérifier si INSERT dans `leads` est bien effectué
- Vérifier notification admin
- Tester flux complet newsletter

### **📊 PRIORITÉ 3: Tests de bout en bout**

**Tester chaque flux:**
1. Livre blanc: Formulaire → Base de données → Admin visible
2. Newsletter: Formulaire → Base de données → Admin visible
3. Contact: Formulaire → Base de données → Admin visible
4. Atelier (après création): Formulaire → Base de données → Admin visible

---

## 📋 Checklist de Validation

### ✅ Architecture Backend
- [x] Table `leads` consolidée
- [x] Tables spécialisées (`newsletter_subscribers`, `contacts`, `atelier_inscriptions`)
- [x] RLS policies actives
- [x] Edge functions notifications

### ✅ Pages Admin Créées
- [x] `/admin/leads` (consolidé)
- [x] `/admin/contacts`
- [x] `/admin/livre-blanc-inscriptions` ✅ **CRÉÉ**
- [x] `/admin/atelier-inscriptions`
- [x] `/admin/newsletters` ✅ **CRÉÉ**

### ⏳ Formulaires Site Public
- [x] Livre blanc (LivreBlancsForm.tsx)
- [x] Newsletter (sections)
- [x] Contact (page Contact)
- [ ] **Atelier inscription** ❌ **À CRÉER**

### ⏳ Notifications Admin
- [x] Livre blanc → Email admin
- [ ] Newsletter → **À VÉRIFIER**
- [x] Contact → Email confirmation
- [ ] Atelier → **À CRÉER**

---

## 🎯 Résumé Structurel Final

### **Tables Supabase (5 tables actives)**
```
leads (CONSOLIDÉE - TOUS les leads)
  ├─ newsletter_subscribers (spécialisée newsletters)
  ├─ contacts (spécialisée messages contact)
  ├─ atelier_inscriptions (jonction atelier ↔ lead)
  └─ cta_clicks (tracking conversions)
```

### **Pages Admin (6 pages engagement + 2 communication)**
```
/admin (Section Engagement)
  ├─ /admin/leads (VUE CONSOLIDÉE)
  ├─ /admin/contacts
  ├─ /admin/livre-blanc-inscriptions ✅ NOUVEAU
  ├─ /admin/atelier-inscriptions
  ├─ /admin/comments
  └─ /admin/faqs

/admin (Section Communication)
  ├─ /admin/newsletters ✅ NOUVEAU
  └─ /admin/redacnews
```

### **Formulaires Site Public (4 formulaires)**
```
Site Public
  ├─ LivreBlancsForm.tsx (livre-blanc) ✅
  ├─ NewsletterSection.tsx (newsletter) ✅
  ├─ Contact.tsx (contact) ✅
  └─ AteliersWebinairesForm.tsx (atelier) ❌ À CRÉER
```

---

## 🚀 Prochaine Action Immédiate

**ÉTAPE 2 (Après validation ÉTAPE 1):**

Créer le formulaire d'inscription ateliers-webinaires avec:
1. Composant `AteliersWebinairesForm.tsx`
2. Intégration dans `ArticleDetail.tsx`
3. Edge function confirmation email avec .ics
4. Tests de bout en bout

---

**✅ Audit complété - Architecture restructurée et validée**
