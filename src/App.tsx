import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./components/utils/ScrollToTop";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Services from "./pages/Services";
import Solutions from "./pages/Solutions";
import Actualites from "./pages/Actualites";
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
import AdminComments from "./pages/AdminComments";
import AdminDashboard from "./pages/AdminDashboard";
import { CookieConsent } from "./components/CookieConsent";

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
          <Route path="/solutions" element={<Solutions />} />
          <Route path="/actualites" element={<Actualites />} />
          <Route path="/actualites/:slug" element={<ArticleDetail />} />
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
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/articles/new" element={<AdminArticleEditor />} />
          <Route path="/admin/articles/:id" element={<AdminArticleEditor />} />
          <Route path="/admin/articles/:id/history" element={<ArticleVersionHistory />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/tags" element={<AdminTags />} />
          <Route path="/admin/comments" element={<AdminComments />} />
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <CookieConsent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
