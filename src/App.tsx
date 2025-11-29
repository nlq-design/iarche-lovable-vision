import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./components/utils/ScrollToTop";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Services from "./pages/Services";
import ServiceDetail from "./pages/ServiceDetail";
import Solutions from "./pages/Solutions";
import Actualites from "./pages/Actualites";
import Articles from "./pages/Articles";
import CasClients from "./pages/CasClients";
import LivresBlancs from "./pages/LivresBlancs";
import AteliersWebinaires from "./pages/AteliersWebinaires";
import ArticleDetail from "./pages/ArticleDetail";
import Contact from "./pages/Contact";
import Newsletter from "./pages/Newsletter";
import LivreOr from "./pages/LivreOr";
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
const AdminNewsletters = lazy(() => import('./pages/AdminNewsletters'));
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
const AdminLeads = lazy(() => import("./pages/admin/AdminLeads"));
const AdminFAQs = lazy(() => import("./pages/admin/AdminFAQs"));
const PerformanceMonitoring = lazy(() => import("./pages/admin/PerformanceMonitoring"));
const ProtectedAdminRoute = lazy(() => import("./components/ProtectedAdminRoute"));

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
          <Route path="/actualites" element={<Actualites />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/cas-clients" element={<CasClients />} />
          <Route path="/livres-blancs" element={<LivresBlancs />} />
          <Route path="/ateliers-webinaires" element={<AteliersWebinaires />} />
          <Route path="/actualites/:slug" element={<ArticleDetail />} />
          <Route path="/articles/:slug" element={<ArticleDetail />} />
          <Route path="/cas-clients/:slug" element={<ArticleDetail />} />
          <Route path="/livres-blancs/:slug" element={<ArticleDetail />} />
          <Route path="/ateliers-webinaires/:slug" element={<ArticleDetail />} />
          <Route path="/contact" element={<Contact />} />
          
          {/* Pages secondaires */}
          <Route path="/newsletter" element={<Newsletter />} />
          <Route path="/livre-or" element={<LivreOr />} />
          
          {/* Pages légales */}
          <Route path="/mentions-legales" element={<MentionsLegales />} />
          <Route path="/conditions-generales" element={<ConditionsGenerales />} />
          <Route path="/confidentialite" element={<Confidentialite />} />
          
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
          <Route path="/admin/leads" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminLeads /></ProtectedAdminRoute>
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
          <Route path="/admin/newsletters" element={
            <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
              <ProtectedAdminRoute><AdminNewsletters /></ProtectedAdminRoute>
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
