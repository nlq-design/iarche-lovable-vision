import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./components/utils/ScrollToTop";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import CharteGraphique from "./pages/CharteGraphique";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import Solutions from "./pages/Solutions";
import Actualites from "./pages/Actualites";
import Articles from "./pages/Articles";
import ArticleDetail from "./pages/ArticleDetail";
import Contact from "./pages/Contact";

// Lazy load secondary public pages for bundle optimization
const CasClients = lazy(() => import("./pages/CasClients"));
const LivresBlancs = lazy(() => import("./pages/LivresBlancs"));
const AteliersWebinaires = lazy(() => import("./pages/AteliersWebinaires"));
const Newsletter = lazy(() => import("./pages/Newsletter"));
const LivreOr = lazy(() => import("./pages/LivreOr"));
const Status = lazy(() => import("./pages/Status"));
import MentionsLegales from "./pages/MentionsLegales";
import ConditionsGenerales from "./pages/ConditionsGenerales";
import Confidentialite from "./pages/Confidentialite";
import Admin from "./pages/Admin";
import { CookieConsent } from "./components/CookieConsent";
import { ResourceTypeValidator } from "./components/dev/ResourceTypeValidator";
import { Loader2 } from "lucide-react";

// Lazy load admin routes
const AdminArticleEditor = lazy(() => import("./pages/AdminArticleEditor"));
const ArticleVersionHistory = lazy(() => import("./pages/ArticleVersionHistory"));
const AdminCategories = lazy(() => import("./pages/AdminCategories"));
const AdminTags = lazy(() => import("./pages/AdminTags"));
const AdminComments = lazy(() => import('./pages/AdminComments'));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Redacia = lazy(() => import("./pages/admin/Redacia"));
const RedacNews = lazy(() => import("./pages/admin/RedacNews"));
const AdvancedStats = lazy(() => import("./pages/admin/AdvancedStats"));
const AuditLogs = lazy(() => import("./pages/admin/AuditLogs"));
const SecurityDashboard = lazy(() => import("./pages/admin/SecurityDashboard"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const BackupManagement = lazy(() => import("./pages/admin/BackupManagement"));
const AdminArticles = lazy(() => import("./pages/admin/AdminArticles"));
const AdminActualites = lazy(() => import("./pages/admin/AdminActualites"));
const AdminCasClients = lazy(() => import("./pages/admin/AdminCasClients"));
const AdminLivresBlancs = lazy(() => import("./pages/admin/AdminLivresBlancs"));
const AdminAteliersWebinaires = lazy(() => import("./pages/admin/AdminAteliersWebinaires"));
const AdminSolutions = lazy(() => import("./pages/admin/AdminSolutions"));
const AdminLeads = lazy(() => import("./pages/admin/AdminLeads"));
const AdminContacts = lazy(() => import("./pages/admin/AdminContacts"));
const AdminAtelierInscriptions = lazy(() => import("./pages/admin/AdminAtelierInscriptions"));
const AdminLivreBlancsInscriptions = lazy(() => import("./pages/admin/AdminLivreBlancsInscriptions"));
const AdminNewsletters = lazy(() => import("./pages/admin/AdminNewsletters"));
const AdminFAQs = lazy(() => import("./pages/admin/AdminFAQs"));
const PerformanceMonitoring = lazy(() => import("./pages/admin/PerformanceMonitoring"));
const CTAAnalytics = lazy(() => import("./pages/admin/CTAAnalytics"));
const AdminMedias = lazy(() => import("./pages/admin/AdminMedias"));

const BannerEditor = lazy(() => import("./pages/admin/BannerEditor"));
const PostEditor = lazy(() => import("./pages/admin/PostEditor"));
const SignatureEditor = lazy(() => import("./pages/admin/SignatureEditor"));
const ThumbnailEditor = lazy(() => import("./pages/admin/ThumbnailEditor"));
const StoryEditor = lazy(() => import("./pages/admin/StoryEditor"));
const OpenGraphEditor = lazy(() => import("./pages/admin/OpenGraphEditor"));
const HeaderEmailEditor = lazy(() => import("./pages/admin/HeaderEmailEditor"));
const GenerateAssets = lazy(() => import("./pages/admin/GenerateAssets"));
const LogoEditor = lazy(() => import("./pages/admin/LogoEditor"));
const FaviconEditor = lazy(() => import("./pages/admin/FaviconEditor"));
const CharteEditor = lazy(() => import("./pages/admin/CharteEditor"));
const QRCodeEditor = lazy(() => import("./pages/admin/QRCodeEditor"));
const HeaderDocEditor = lazy(() => import("./pages/admin/HeaderDocEditor"));
const FooterEmailEditor = lazy(() => import("./pages/admin/FooterEmailEditor"));
const AdminFormulaires = lazy(() => import("./pages/admin/AdminFormulaires"));
const FormEditor = lazy(() => import("./pages/admin/FormEditor"));
const FormResponses = lazy(() => import("./pages/admin/FormResponses"));
const AdminFormResponses = lazy(() => import("./pages/admin/AdminFormResponses"));
const AdminEmails = lazy(() => import("./pages/admin/AdminEmails"));
const AdminRendezVous = lazy(() => import("./pages/admin/AdminRendezVous"));
const FormPublic = lazy(() => import("./pages/FormPublic"));
const RendezVous = lazy(() => import("./pages/RendezVous"));
const BrochurePublic = lazy(() => import("./pages/BrochurePublic"));
const AdminBrochures = lazy(() => import("./pages/admin/AdminBrochures"));
const BrochureEditor = lazy(() => import("./pages/admin/BrochureEditor"));
const ProtectedAdminRoute = lazy(() => import("./components/ProtectedAdminRoute"));

// Cockpit Commercial
const ProtectedCockpitRoute = lazy(() => import("./components/cockpit/ProtectedCockpitRoute"));
const CockpitDashboard = lazy(() => import("./pages/cockpit/CockpitDashboard"));
const CockpitPipeline = lazy(() => import("./pages/cockpit/CockpitPipeline"));
const CockpitLeads = lazy(() => import("./pages/cockpit/CockpitLeads"));
const CockpitAgenda = lazy(() => import("./pages/cockpit/CockpitAgenda"));
const CockpitProjects = lazy(() => import("./pages/cockpit/CockpitProjects"));
const CockpitAnalytics = lazy(() => import("./pages/cockpit/CockpitAnalytics"));

// QueryClient avec cache optimisé
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (anciennement cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ 
        v7_startTransition: true,
        v7_relativeSplatPath: true 
      }}>
        <ScrollToTop />
        <Routes>
          {/* Homepage */}
          <Route path="/" element={<Index />} />
          
          {/* Redirection 301: /accueil → / */}
          <Route path="/accueil" element={<Navigate to="/" replace />} />
          
          {/* Pages principales */}
          <Route path="/services" element={<Services />} />
          <Route path="/services/:slug" element={<ServiceDetail />} />
          <Route path="/solutions" element={<Solutions />} />
          <Route path="/solutions/:slug" element={<ArticleDetail />} />
          <Route path="/actualites" element={<Actualites />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/cas-clients" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <CasClients />
            </Suspense>
          } />
          <Route path="/livres-blancs" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <LivresBlancs />
            </Suspense>
          } />
          <Route path="/ateliers-webinaires" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <AteliersWebinaires />
            </Suspense>
          } />
          <Route path="/actualites/:slug" element={<ArticleDetail />} />
          <Route path="/articles/:slug" element={<ArticleDetail />} />
          <Route path="/cas-clients/:slug" element={<ArticleDetail />} />
          <Route path="/livres-blancs/:slug" element={<ArticleDetail />} />
          <Route path="/ateliers-webinaires/:slug" element={<ArticleDetail />} />
          <Route path="/contact" element={<Contact />} />
          
          {/* Rendez-vous - uniquement avec slug */}
          <Route path="/rendez-vous/:slug" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <RendezVous />
            </Suspense>
          } />
          
          {/* Pages secondaires */}
          <Route path="/newsletter" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <Newsletter />
            </Suspense>
          } />
          <Route path="/livre-or" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <LivreOr />
            </Suspense>
          } />
          <Route path="/status" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <Status />
            </Suspense>
          } />
          
          {/* Formulaires publics */}
          <Route path="/formulaires/:slug" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <FormPublic />
            </Suspense>
          } />
          
          {/* Brochures publiques */}
          <Route path="/brochure/:slug" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <BrochurePublic />
            </Suspense>
          } />
          
          {/* Pages légales */}
          <Route path="/mentions-legales" element={<MentionsLegales />} />
          <Route path="/conditions-generales" element={<ConditionsGenerales />} />
          <Route path="/confidentialite" element={<Confidentialite />} />
          <Route path="/charte-graphique" element={<CharteGraphique />} />
          
          {/* Admin - Lazy loaded avec Suspense */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/dashboard" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/advanced-stats" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdvancedStats /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/articles" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminArticles /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/actualites" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminActualites /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/cas-clients" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminCasClients /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/livres-blancs" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminLivresBlancs /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/ateliers-webinaires" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminAteliersWebinaires /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/solutions" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminSolutions /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/solutions/new" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/solutions/:id" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/solutions/:id/history" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><ArticleVersionHistory /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/leads" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminLeads /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/contacts" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminContacts /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/atelier-inscriptions" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminAtelierInscriptions /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/livre-blanc-inscriptions" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminLivreBlancsInscriptions /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/redacia" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><Redacia /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/redacnews" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><RedacNews /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/articles/new" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/actualites/new" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/cas-clients/new" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/livres-blancs/new" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/ateliers-webinaires/new" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/articles/:id" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/actualites/:id" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/cas-clients/:id" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/livres-blancs/:id" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/ateliers-webinaires/:id" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/articles/:id/history" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><ArticleVersionHistory /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/actualites/:id/history" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><ArticleVersionHistory /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/cas-clients/:id/history" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><ArticleVersionHistory /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/livres-blancs/:id/history" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><ArticleVersionHistory /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/ateliers-webinaires/:id/history" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><ArticleVersionHistory /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/categories" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminCategories /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/tags" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminTags /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/comments" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminComments /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/faqs" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminFAQs /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/rendez-vous" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminRendezVous /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/newsletters" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminNewsletters /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/emails" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminEmails /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/security-dashboard" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><SecurityDashboard /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/audit-logs" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AuditLogs /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/backups" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><BackupManagement /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/settings" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminSettings /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/performance-monitoring" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><PerformanceMonitoring /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/cta-analytics" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><CTAAnalytics /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/medias" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminMedias /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/medias/banner" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><BannerEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/medias/post" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><PostEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/medias/signature" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><SignatureEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/medias/thumbnail" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><ThumbnailEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/medias/story" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><StoryEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/medias/og" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><OpenGraphEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/medias/header-email" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><HeaderEmailEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/medias/generate-assets" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><GenerateAssets /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/medias/logo" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><LogoEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/medias/favicon" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><FaviconEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/medias/charte" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><CharteEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/medias/qrcode" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><QRCodeEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/medias/header-doc" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><HeaderDocEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/medias/footer-email" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><FooterEmailEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          
          
          {/* Formulaires */}
          <Route path="/admin/formulaires" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminFormulaires /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/formulaires/:id" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><FormEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/formulaires/:id/responses" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><FormResponses /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/form-responses" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminFormResponses /></ProtectedAdminRoute>
            </Suspense>
          } />
          
          {/* Brochures */}
          <Route path="/admin/brochures" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminBrochures /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/brochures/new" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><BrochureEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          <Route path="/admin/brochures/:id" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><BrochureEditor /></ProtectedAdminRoute>
            </Suspense>
          } />
          
{/* Cockpit Commercial */}
          <Route path="/cockpit" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedCockpitRoute><CockpitDashboard /></ProtectedCockpitRoute>
            </Suspense>
          } />
          <Route path="/cockpit/pipeline" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedCockpitRoute><CockpitPipeline /></ProtectedCockpitRoute>
            </Suspense>
          } />
          <Route path="/cockpit/leads" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedCockpitRoute><CockpitLeads /></ProtectedCockpitRoute>
            </Suspense>
          } />
          <Route path="/cockpit/agenda" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedCockpitRoute><CockpitAgenda /></ProtectedCockpitRoute>
            </Suspense>
          } />
          <Route path="/cockpit/projects" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedCockpitRoute><CockpitProjects /></ProtectedCockpitRoute>
            </Suspense>
          } />
          <Route path="/cockpit/analytics" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedCockpitRoute><CockpitAnalytics /></ProtectedCockpitRoute>
            </Suspense>
          } />
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <CookieConsent />
        <ResourceTypeValidator />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
