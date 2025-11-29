import { NavLink } from '@/components/NavLink';
import { BarChart3, FileText, FolderOpen, Tags, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AdminNav = () => {
  return (
    <nav className="mb-8">
      <div className="flex flex-wrap gap-2">
        <NavLink
          to="/admin/dashboard"
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border border-border",
            "text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
          )}
          activeClassName="bg-primary text-primary-foreground border-primary"
        >
          <BarChart3 className="h-4 w-4" />
          <span className="text-sm font-medium">Statistiques</span>
        </NavLink>

        <NavLink
          to="/admin"
          end
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border border-border",
            "text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
          )}
          activeClassName="bg-primary text-primary-foreground border-primary"
        >
          <FileText className="h-4 w-4" />
          <span className="text-sm font-medium">Articles</span>
        </NavLink>

        <NavLink
          to="/admin/categories"
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border border-border",
            "text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
          )}
          activeClassName="bg-primary text-primary-foreground border-primary"
        >
          <FolderOpen className="h-4 w-4" />
          <span className="text-sm font-medium">Catégories</span>
        </NavLink>

        <NavLink
          to="/admin/tags"
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border border-border",
            "text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
          )}
          activeClassName="bg-primary text-primary-foreground border-primary"
        >
          <Tags className="h-4 w-4" />
          <span className="text-sm font-medium">Tags</span>
        </NavLink>

        <NavLink
          to="/admin/comments"
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border border-border",
            "text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
          )}
          activeClassName="bg-primary text-primary-foreground border-primary"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Commentaires</span>
        </NavLink>
      </div>
    </nav>
  );
};
