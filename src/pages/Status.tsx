import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BackgroundLayout } from "@/components/layouts/BackgroundLayout";
import { Helmet } from "react-helmet-async";
import { Activity, CheckCircle2, AlertTriangle, Gauge, Accessibility, CheckSquare, Search } from "lucide-react";

const Status = () => {
  // Fetch latest metrics
  const { data: latestMetrics, isLoading } = useQuery({
    queryKey: ['latest-performance-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Calculate overall status
  const getOverallStatus = () => {
    if (!latestMetrics) return { status: 'unknown', label: 'Checking...', color: 'bg-muted' };

    const issues = [];
    
    if (latestMetrics.performance_score < 85) issues.push('Performance');
    if (latestMetrics.accessibility_score < 90) issues.push('Accessibility');
    if (latestMetrics.best_practices_score < 85) issues.push('Best Practices');
    if (latestMetrics.seo_score < 90) issues.push('SEO');
    if (latestMetrics.lcp > 2500) issues.push('LCP');
    if (latestMetrics.cls > 0.1) issues.push('CLS');

    if (issues.length === 0) {
      return { 
        status: 'operational', 
        label: 'All Systems Operational', 
        color: 'bg-green-500',
        icon: CheckCircle2 
      };
    } else if (issues.length <= 2) {
      return { 
        status: 'degraded', 
        label: 'Performance Degraded', 
        color: 'bg-yellow-500',
        icon: AlertTriangle,
        issues 
      };
    } else {
      return { 
        status: 'issues', 
        label: 'Multiple Issues Detected', 
        color: 'bg-red-500',
        icon: AlertTriangle,
        issues 
      };
    }
  };

  const overallStatus = getOverallStatus();
  const StatusIcon = overallStatus.icon || Activity;

  const getScoreColor = (score: number, threshold: number = 85) => {
    if (score >= threshold) return "text-green-600";
    if (score >= threshold - 10) return "text-yellow-600";
    return "text-red-600";
  };

  const getMetricColor = (value: number, goodThreshold: number, badThreshold: number) => {
    if (value <= goodThreshold) return "text-green-600";
    if (value <= badThreshold) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <BackgroundLayout>
      <Helmet>
        <title>Status - IArche</title>
        <meta name="description" content="Statut en temps réel des performances et de la disponibilité de la plateforme IArche." />
        <meta name="robots" content="index, follow" />
      </Helmet>

      <div className="container mx-auto px-4 py-16 md:py-24 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12 invisible animate-fadeIn" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-primary">
            Status
          </h1>
          <p className="text-lg text-muted-foreground">
            Transparence totale sur les performances de notre plateforme
          </p>
        </div>

        {/* Overall Status Card */}
        <Card className="mb-8 p-8 invisible animate-fadeIn" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${overallStatus.color}`}>
                <StatusIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-primary mb-1">
                  {overallStatus.label}
                </h2>
                {overallStatus.issues && overallStatus.issues.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Issues détectés: {overallStatus.issues.join(', ')}
                  </p>
                )}
                {latestMetrics && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Dernière vérification: {new Date(latestMetrics.recorded_at).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>
            </div>
            <Badge variant={overallStatus.status === 'operational' ? 'default' : 'destructive'}>
              {overallStatus.status === 'operational' ? 'En ligne' : 'Dégradé'}
            </Badge>
          </div>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Chargement des métriques...</p>
          </div>
        ) : latestMetrics ? (
          <>
            {/* Lighthouse Scores */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="p-6 invisible animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                <div className="flex items-center justify-between mb-4">
                  <Gauge className="w-6 h-6 text-primary" />
                  <span className={`text-3xl font-bold ${getScoreColor(latestMetrics.performance_score, 85)}`}>
                    {latestMetrics.performance_score}
                  </span>
                </div>
                <h3 className="font-semibold text-primary">Performance</h3>
                <p className="text-xs text-muted-foreground mt-1">Vitesse & réactivité</p>
              </Card>

              <Card className="p-6 invisible animate-fadeIn" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center justify-between mb-4">
                  <Accessibility className="w-6 h-6 text-primary" />
                  <span className={`text-3xl font-bold ${getScoreColor(latestMetrics.accessibility_score, 90)}`}>
                    {latestMetrics.accessibility_score}
                  </span>
                </div>
                <h3 className="font-semibold text-primary">Accessibilité</h3>
                <p className="text-xs text-muted-foreground mt-1">WCAG compliance</p>
              </Card>

              <Card className="p-6 invisible animate-fadeIn" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-center justify-between mb-4">
                  <CheckSquare className="w-6 h-6 text-primary" />
                  <span className={`text-3xl font-bold ${getScoreColor(latestMetrics.best_practices_score, 85)}`}>
                    {latestMetrics.best_practices_score}
                  </span>
                </div>
                <h3 className="font-semibold text-primary">Best Practices</h3>
                <p className="text-xs text-muted-foreground mt-1">Standards web</p>
              </Card>

              <Card className="p-6 invisible animate-fadeIn" style={{ animationDelay: '0.6s' }}>
                <div className="flex items-center justify-between mb-4">
                  <Search className="w-6 h-6 text-primary" />
                  <span className={`text-3xl font-bold ${getScoreColor(latestMetrics.seo_score, 90)}`}>
                    {latestMetrics.seo_score}
                  </span>
                </div>
                <h3 className="font-semibold text-primary">SEO</h3>
                <p className="text-xs text-muted-foreground mt-1">Référencement</p>
              </Card>
            </div>

            {/* Core Web Vitals */}
            <Card className="p-6 mb-8 invisible animate-fadeIn" style={{ animationDelay: '0.7s' }}>
              <h3 className="text-xl font-bold text-primary mb-6">Core Web Vitals</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">FCP</p>
                  <p className={`text-2xl font-bold ${getMetricColor(latestMetrics.fcp, 1000, 1800)}`}>
                    {(latestMetrics.fcp / 1000).toFixed(2)}s
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">First Contentful Paint</p>
                </div>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">LCP</p>
                  <p className={`text-2xl font-bold ${getMetricColor(latestMetrics.lcp, 2500, 4000)}`}>
                    {(latestMetrics.lcp / 1000).toFixed(2)}s
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Largest Contentful Paint</p>
                </div>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">TTI</p>
                  <p className={`text-2xl font-bold ${getMetricColor(latestMetrics.tti, 1500, 3800)}`}>
                    {(latestMetrics.tti / 1000).toFixed(2)}s
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Time to Interactive</p>
                </div>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">TBT</p>
                  <p className={`text-2xl font-bold ${getMetricColor(latestMetrics.tbt, 200, 600)}`}>
                    {latestMetrics.tbt}ms
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Total Blocking Time</p>
                </div>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">CLS</p>
                  <p className={`text-2xl font-bold ${getMetricColor(latestMetrics.cls, 0.1, 0.25)}`}>
                    {latestMetrics.cls.toFixed(3)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Cumulative Layout Shift</p>
                </div>
              </div>
            </Card>

            {/* Bundle Size */}
            <Card className="p-6 invisible animate-fadeIn" style={{ animationDelay: '0.8s' }}>
              <h3 className="text-xl font-bold text-primary mb-6">Taille des ressources</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">JavaScript</p>
                  <p className="text-2xl font-bold text-primary">
                    {(latestMetrics.bundle_size_js / 1024).toFixed(0)} KB
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">CSS</p>
                  <p className="text-2xl font-bold text-primary">
                    {(latestMetrics.bundle_size_css / 1024).toFixed(0)} KB
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Total</p>
                  <p className={`text-2xl font-bold ${getMetricColor(latestMetrics.bundle_size_total, 300000, 500000)}`}>
                    {(latestMetrics.bundle_size_total / 1024).toFixed(0)} KB
                  </p>
                </div>
              </div>
            </Card>
          </>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Aucune métrique disponible pour le moment.</p>
          </Card>
        )}

        {/* Info Footer */}
        <div className="text-center mt-12 text-sm text-muted-foreground invisible animate-fadeIn" style={{ animationDelay: '0.9s' }}>
          <p>
            Les métriques sont capturées automatiquement après chaque déploiement via GitHub Actions.
          </p>
          <p className="mt-2">
            Cette page est publique pour garantir une transparence totale sur les performances de notre plateforme.
          </p>
        </div>
      </div>
    </BackgroundLayout>
  );
};

export default Status;
