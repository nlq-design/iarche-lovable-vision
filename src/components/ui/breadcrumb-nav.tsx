import React from 'react';
import { NavLink } from '@/components/NavLink';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
}

const BreadcrumbNav = ({ items }: BreadcrumbNavProps) => {
  return (
    <nav aria-label="Breadcrumb" className="py-4">
      <ol className="flex items-center gap-2 text-sm">
        <li>
          <NavLink 
            to="/" 
            className="text-muted-foreground hover:text-accent transition-colors"
          >
            Accueil
          </NavLink>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            {item.href ? (
              <NavLink 
                to={item.href} 
                className="text-muted-foreground hover:text-accent transition-colors"
              >
                {item.label}
              </NavLink>
            ) : (
              <span className="text-foreground font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default BreadcrumbNav;
