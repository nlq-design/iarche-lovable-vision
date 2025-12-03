import { Helmet } from 'react-helmet-async';
import { useState, useEffect, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, TrendingUp, MousePointerClick, Users, ArrowRight, ArrowLeft } from 'lucide-react';
import { MiniChartSkeleton } from '@/components/admin/ChartSkeleton';
import { NavLink } from '@/components/NavLink';

// Lazy load heavy chart components
const CTAClicksBarChart = lazy(() => import('@/components/admin/CTACharts').then(m => ({ default: m.CTAClicksBarChart })));
const SourcesPieChart = lazy(() => import('@/components/admin/CTACharts').then(m => ({ default: m.SourcesPieChart })));
const ConversionLineChart = lazy(() => import('@/components/admin/CTACharts').then(m => ({ default: m.ConversionLineChart })));

interface CTAClick {
  id: string;
  cta_name: string;
  source_page: string;
  source_context: string | null;
  clicked_at: string;
  user_session: string | null;
}

interface Contact {
  id: string;
  source: string | null;
  source_context: string | null;
  created_at: string;
}

const CTAAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('7');
  const [ctaClicks, setCTAClicks] = useState<CTAClick[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const daysAgo = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Charger les clics CTA
      const { data: clicksData, error: clicksError } = await supabase
        .from('cta_clicks')
        .select('*')
        .gte('clicked_at', startDate.toISOString())
        .order('clicked_at', { ascending: false });

      if (clicksError) throw clicksError;
      setCTAClicks(clicksData || []);

      // Charger les contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id, source, source_context, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (contactsError) throw contactsError;
      setContacts(contactsData || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stats générales
  const totalClicks = ctaClicks.length;
  const totalContacts = contacts.length;
  const uniqueSessions = new Set(ctaClicks.map(c => c.user_session).filter(Boolean)).size;
  const conversionRate = totalClicks > 0 ? ((totalContacts / totalClicks) * 100).toFixed(1) : '0';

  // Top CTAs cliqués
  const ctaClicksByName = ctaClicks.reduce((acc, click) => {
    const key = click.cta_name;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCTAsData = Object.entries(ctaClicksByName)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Répartition par source page
  const clicksBySourcePage = ctaClicks.reduce((acc, click) => {
    const key = click.source_page;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sourcePageData = Object.entries(clicksBySourcePage)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Conversions par source (depuis la table leads unifiée)
  const [conversionsBySource, setConversionsBySource] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchLeads = async () => {
      const daysAgo = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data: leadsData } = await supabase
        .from('leads')
        .select('source')
        .gte('created_at', startDate.toISOString());

      if (leadsData) {
        const bySource = leadsData.reduce((acc, lead) => {
          const label = 
            lead.source === 'atelier-webinaire' ? 'Atelier/Webinaire' :
            lead.source === 'livre-blanc' ? 'Livre blanc' :
            lead.source === 'newsletter' ? 'Newsletter' :
            lead.source === 'contact' ? 'Contact' : lead.source;
          acc[label] = (acc[label] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        setConversionsBySource(bySource);
      }
    };
    fetchLeads();
  }, [period]);

  const contactSourceData = Object.entries(conversionsBySource)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Contextes les plus performants
  const clicksByContext = ctaClicks
    .filter(c => c.source_context)
    .reduce((acc, click) => {
      const key = click.source_context!;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const contextPerformanceData = Object.entries(clicksByContext)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Evolution temporelle (par jour)
  const clicksByDay = ctaClicks.reduce((acc, click) => {
    const day = new Date(click.clicked_at).toLocaleDateString('fr-FR', { 
      month: 'short', 
      day: 'numeric' 
    });
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const timelineData = Object.entries(clicksByDay)
    .map(([day, clicks]) => ({ day, clicks }))
    .slice(-14); // 14 derniers jours

  const COLORS = ['#2D4263', '#B04A32', '#5B8FA3', '#8B5E3C', '#A67B5B', '#6B8E7F'];

  const exportToCSV = (data: any[], filename: string) => {
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Analytics CTAs · Admin · IArche</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <NavLink 
              to="/admin" 
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au Dashboard
            </NavLink>
            <h1 className="text-3xl font-bold text-foreground">Analytics CTAs</h1>
            <p className="text-muted-foreground mt-1">
              Suivi des performances des Call-To-Action
            </p>
          </div>

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 derniers jours</SelectItem>
              <SelectItem value="30">30 derniers jours</SelectItem>
              <SelectItem value="90">90 derniers jours</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clics CTAs</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClicks}</div>
              <p className="text-xs text-muted-foreground">
                {period} derniers jours
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contacts générés</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalContacts}</div>
              <p className="text-xs text-muted-foreground">
                Formulaires soumis
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taux de conversion</CardTitle>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversionRate}%</div>
              <p className="text-xs text-muted-foreground">
                Clics → Contacts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessions uniques</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueSessions}</div>
              <p className="text-xs text-muted-foreground">
                Visiteurs trackés
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="ctas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ctas">CTAs Performance</TabsTrigger>
            <TabsTrigger value="sources">Conversions</TabsTrigger>
            <TabsTrigger value="timeline">Evolution</TabsTrigger>
            <TabsTrigger value="context">Contextes</TabsTrigger>
          </TabsList>

          {/* Tab: CTAs Performance */}
          <TabsContent value="ctas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 CTAs les plus cliqués</CardTitle>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<MiniChartSkeleton />}>
                  <CTAClicksBarChart data={topCTAsData} />
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Répartition par section</CardTitle>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<MiniChartSkeleton />}>
                  <SourcesPieChart data={sourcePageData} />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Conversions (depuis table leads) */}
          <TabsContent value="sources" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Conversions par source</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Toutes les conversions (newsletter, contact, livre-blanc, atelier)
                </p>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<MiniChartSkeleton />}>
                  <SourcesPieChart data={contactSourceData} />
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Détail des conversions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {contactSourceData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-sm text-muted-foreground">{item.value} conversions</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Evolution */}
          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Evolution des clics CTAs</CardTitle>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<MiniChartSkeleton />}>
                  <ConversionLineChart data={timelineData} />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Contextes */}
          <TabsContent value="context" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Contextes les plus performants</CardTitle>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<MiniChartSkeleton />}>
                  <CTAClicksBarChart data={contextPerformanceData} />
                </Suspense>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Détail des contextes</CardTitle>
                <button
                  onClick={() => exportToCSV(ctaClicks.filter(c => c.source_context).map(c => ({
                    cta: c.cta_name,
                    page: c.source_page,
                    context: c.source_context,
                    date: new Date(c.clicked_at).toLocaleDateString('fr-FR')
                  })), 'cta-contexts.csv')}
                  className="text-sm text-primary hover:underline"
                >
                  Exporter CSV
                </button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {contextPerformanceData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between border-b pb-2">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-sm text-muted-foreground">{item.count} clics</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default CTAAnalytics;