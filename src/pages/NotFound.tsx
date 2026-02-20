import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Logo from "@/components/ui/Logo";
import { ArrowLeft, Home, Briefcase, Lightbulb, Calendar } from "lucide-react";

const suggestions = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/services", label: "Nos services", icon: Briefcase },
  { to: "/solutions", label: "Nos solutions", icon: Lightbulb },
  { to: "/rendez-vous/premier-echange", label: "Prendre RDV", icon: Calendar },
];

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Helmet>
        <title>404 · Page non trouvée · IArche</title>
        <meta name="description" content="La page que vous recherchez n'existe pas ou a été déplacée. Retournez à l'accueil pour découvrir nos services IA." />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        {/* Logo */}
        <Link to="/" aria-label="Retour à l'accueil">
          <Logo variant="main" size="lg" className="mb-10" />
        </Link>

        {/* 404 */}
        <p className="text-7xl font-bold text-primary mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
          404
        </p>
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Cette page n'existe pas
        </h1>
        <p className="text-muted-foreground mb-8">
          Vous cherchez peut-être l'une de ces pages :
        </p>

        {/* Suggestions */}
        <nav aria-label="Pages suggérées" className="grid grid-cols-2 gap-3 w-full max-w-sm mb-10">
          {suggestions.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Icon className="h-4 w-4 text-primary shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* CTA principal */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-medium text-primary-foreground transition-colors"
          style={{ backgroundColor: '#D15A3E' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'accueil
        </Link>
      </div>
    </>
  );
};

export default NotFound;
