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
import AdminArticleEditor from "./pages/AdminArticleEditor";
import ArticleVersionHistory from "./pages/ArticleVersionHistory";
import AdminCategories from "./pages/AdminCategories";
import AdminTags from "./pages/AdminTags";
import AdminComments from './pages/AdminComments';
import AdminNewsletters from './pages/AdminNewsletters';
import AdminDashboard from "./pages/AdminDashboard";
import Redacia from "./pages/admin/Redacia";
import RedacNews from "./pages/admin/RedacNews";
import AdvancedStats from "./pages/admin/AdvancedStats";
import AuditLogs from "./pages/admin/AuditLogs";
import SecurityDashboard from "./pages/admin/SecurityDashboard";
import AdminSettings from "./pages/admin/AdminSettings";
import BackupManagement from "./pages/admin/BackupManagement";
import AdminArticles from "./pages/admin/AdminArticles";
import AdminActualites from "./pages/admin/AdminActualites";
import AdminCasClients from "./pages/admin/AdminCasClients";
import AdminLivresBlancs from "./pages/admin/AdminLivresBlancs";
import AdminAteliersWebinaires from "./pages/admin/AdminAteliersWebinaires";
import AdminLeads from "./pages/admin/AdminLeads";
import AdminFAQs from "./pages/admin/AdminFAQs";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import { CookieConsent } from "./components/CookieConsent";
import { ResourceTypeValidator } from "./components/dev/ResourceTypeValidator";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          
          {/* Admin */}
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/dashboard" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
          <Route path="/admin/advanced-stats" element={<ProtectedAdminRoute><AdvancedStats /></ProtectedAdminRoute>} />
          <Route path="/admin/articles" element={<ProtectedAdminRoute><AdminArticles /></ProtectedAdminRoute>} />
          <Route path="/admin/actualites" element={<ProtectedAdminRoute><AdminActualites /></ProtectedAdminRoute>} />
          <Route path="/admin/cas-clients" element={<ProtectedAdminRoute><AdminCasClients /></ProtectedAdminRoute>} />
          <Route path="/admin/livres-blancs" element={<ProtectedAdminRoute><AdminLivresBlancs /></ProtectedAdminRoute>} />
          <Route path="/admin/ateliers-webinaires" element={<ProtectedAdminRoute><AdminAteliersWebinaires /></ProtectedAdminRoute>} />
          <Route path="/admin/leads" element={<ProtectedAdminRoute><AdminLeads /></ProtectedAdminRoute>} />
          <Route path="/admin/redacia" element={<ProtectedAdminRoute><Redacia /></ProtectedAdminRoute>} />
          <Route path="/admin/redacnews" element={<ProtectedAdminRoute><RedacNews /></ProtectedAdminRoute>} />
          <Route path="/admin/articles/new" element={<ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>} />
          <Route path="/admin/actualites/new" element={<ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>} />
          <Route path="/admin/cas-clients/new" element={<ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>} />
          <Route path="/admin/livres-blancs/new" element={<ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>} />
          <Route path="/admin/ateliers-webinaires/new" element={<ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>} />
          <Route path="/admin/articles/:id" element={<ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>} />
          <Route path="/admin/actualites/:id" element={<ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>} />
          <Route path="/admin/cas-clients/:id" element={<ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>} />
          <Route path="/admin/livres-blancs/:id" element={<ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>} />
          <Route path="/admin/ateliers-webinaires/:id" element={<ProtectedAdminRoute><AdminArticleEditor /></ProtectedAdminRoute>} />
          <Route path="/admin/articles/:id/history" element={<ProtectedAdminRoute><ArticleVersionHistory /></ProtectedAdminRoute>} />
          <Route path="/admin/actualites/:id/history" element={<ProtectedAdminRoute><ArticleVersionHistory /></ProtectedAdminRoute>} />
          <Route path="/admin/cas-clients/:id/history" element={<ProtectedAdminRoute><ArticleVersionHistory /></ProtectedAdminRoute>} />
          <Route path="/admin/livres-blancs/:id/history" element={<ProtectedAdminRoute><ArticleVersionHistory /></ProtectedAdminRoute>} />
          <Route path="/admin/ateliers-webinaires/:id/history" element={<ProtectedAdminRoute><ArticleVersionHistory /></ProtectedAdminRoute>} />
          <Route path="/admin/categories" element={<ProtectedAdminRoute><AdminCategories /></ProtectedAdminRoute>} />
          <Route path="/admin/tags" element={<ProtectedAdminRoute><AdminTags /></ProtectedAdminRoute>} />
          <Route path="/admin/comments" element={<ProtectedAdminRoute><AdminComments /></ProtectedAdminRoute>} />
          <Route path="/admin/faqs" element={<ProtectedAdminRoute><AdminFAQs /></ProtectedAdminRoute>} />
          <Route path="/admin/newsletters" element={<ProtectedAdminRoute><AdminNewsletters /></ProtectedAdminRoute>} />
          <Route path="/admin/security-dashboard" element={<ProtectedAdminRoute><SecurityDashboard /></ProtectedAdminRoute>} />
          <Route path="/admin/audit-logs" element={<ProtectedAdminRoute><AuditLogs /></ProtectedAdminRoute>} />
          <Route path="/admin/backups" element={<ProtectedAdminRoute><BackupManagement /></ProtectedAdminRoute>} />
          <Route path="/admin/settings" element={<ProtectedAdminRoute><AdminSettings /></ProtectedAdminRoute>} />
          
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
