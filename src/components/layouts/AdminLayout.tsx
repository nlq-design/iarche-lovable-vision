import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Home, BarChart3, Sparkles, FolderOpen, Tag, MessageCircle, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({ title: "Erreur", description: "Impossible de se déconnecter", variant: "destructive" });
    } else {
      navigate('/admin');
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header Admin */}
      <header className="bg-background border-b border-border sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/admin" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">IA</span>
              </div>
              <span className="font-semibold text-lg">Back-office</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              <Link to="/admin/dashboard" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Statistiques
              </Link>
              <Link to="/admin/redacia" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Redacia
              </Link>
              <Link to="/admin/categories" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Catégories
              </Link>
              <Link to="/admin/tags" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Tags
              </Link>
              <Link to="/admin/comments" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Commentaires
              </Link>
              <Link to="/admin/newsletters" className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Newsletter
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
              <Home className="w-4 h-4" />
              <span className="hidden md:inline">Retour au site</span>
            </Link>
            {user && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground hidden md:inline">{user.email}</span>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
