import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, TrendingUp, Package, Zap, FileText, Plus, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PerformanceMetric {
  id: string;
  recorded_at: string;
  performance_score: number | null;
  accessibility_score: number | null;
  best_practices_score: number | null;
  seo_score: number | null;
  fcp: number | null;
  lcp: number | null;
  tti: number | null;
  tbt: number | null;
  cls: number | null;
  bundle_size_js: number | null;
  bundle_size_css: number | null;
  bundle_size_total: number | null;
  environment: string;
  notes: string | null;
}

const PerformanceMonitoring = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    performance_score: '',
    accessibility_score: '',
    best_practices_score: '',
    seo_score: '',
    fcp: '',
    lcp: '',
    tti: '',
    tbt: '',
    cls: '',
    bundle_size_js: '',
    bundle_size_css: '',
    bundle_size_total: '',
    environment: 'production',
    notes: ''
  });

  // Fetch all metrics
  const { data: metrics = [], isLoading } = useQuery({
    queryKey: ['performance-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .order('recorded_at', { ascending: false });
      
      if (error) throw error;
      return data as PerformanceMetric[];
    }
  });

  // Add new metric
  const addMetric = useMutation({
    mutationFn: async (data: any) => {
      const { data: user } = await supabase.auth.getUser();
      
      const metricData = {
        performance_score: data.performance_score ? parseInt(data.performance_score) : null,
        accessibility_score: data.accessibility_score ? parseInt(data.accessibility_score) : null,
        best_practices_score: data.best_practices_score ? parseInt(data.best_practices_score) : null,
        seo_score: data.seo_score ? parseInt(data.seo_score) : null,
        fcp: data.fcp ? parseFloat(data.fcp) : null,
        lcp: data.lcp ? parseFloat(data.lcp) : null,
        tti: data.tti ? parseFloat(data.tti) : null,
        tbt: data.tbt ? parseInt(data.tbt) : null,
        cls: data.cls ? parseFloat(data.cls) : null,
        bundle_size_js: data.bundle_size_js ? parseInt(data.bundle_size_js) : null,
        bundle_size_css: data.bundle_size_css ? parseInt(data.bundle_size_css) : null,
        bundle_size_total: data.bundle_size_total ? parseInt(data.bundle_size_total) : null,
        environment: data.environment,
        notes: data.notes || null,
        recorded_by: user.user?.id,
        recorded_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('performance_metrics')
        .insert(metricData);
      
      if (error) throw error;

      // Vérifier les seuils et envoyer alerte si nécessaire
      try {
        const { data: alertData, error: alertError } = await supabase.functions.invoke(
          'check-performance-threshold',
          { body: metricData }
        );

        if (alertError) {
          console.error('Error checking thresholds:', alertError);
        } else if (alertData?.violations > 0) {
          toast({
            title: `⚠️ ${alertData.critical > 0 ? 'Alerte critique' : 'Avertissement'} performance`,
            description: `${alertData.violations} métrique${alertData.violations > 1 ? 's' : ''} hors seuil. Email envoyé.`,
            variant: alertData.critical > 0 ? 'destructive' : 'default'
          });
        }
      } catch (alertErr) {
        console.error('Alert check failed:', alertErr);
      }

      return metricData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-metrics'] });
      toast({ title: 'Métrique ajoutée', description: 'La métrique de performance a été enregistrée.' });
      setShowForm(false);
      setFormData({
        performance_score: '',
        accessibility_score: '',
        best_practices_score: '',
        seo_score: '',
        fcp: '',
        lcp: '',
        tti: '',
        tbt: '',
        cls: '',
        bundle_size_js: '',
        bundle_size_css: '',
        bundle_size_total: '',
        environment: 'production',
        notes: ''
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erreur', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMetric.mutate(formData);
  };

  const exportData = () => {
    const csv = [
      ['Date', 'Performance', 'Accessibilité', 'Best Practices', 'SEO', 'FCP', 'LCP', 'TTI', 'TBT', 'CLS', 'JS (KB)', 'CSS (KB)', 'Total (KB)', 'Environnement', 'Notes'].join(','),
      ...metrics.map(m => [
        format(new Date(m.recorded_at), 'yyyy-MM-dd HH:mm'),
        m.performance_score || '',
        m.accessibility_score || '',
        m.best_practices_score || '',
        m.seo_score || '',
        m.fcp || '',
        m.lcp || '',
        m.tti || '',
        m.tbt || '',
        m.cls || '',
        m.bundle_size_js || '',
        m.bundle_size_css || '',
        m.bundle_size_total || '',
        m.environment,
        `"${m.notes?.replace(/"/g, '""') || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  // Prepare chart data
  const lighthouseData = metrics.slice(0, 10).reverse().map(m => ({
    date: format(new Date(m.recorded_at), 'dd/MM'),
    Performance: m.performance_score,
    Accessibilité: m.accessibility_score,
    'Best Practices': m.best_practices_score,
    SEO: m.seo_score
  }));

  const coreWebVitalsData = metrics.slice(0, 10).reverse().map(m => ({
    date: format(new Date(m.recorded_at), 'dd/MM'),
    FCP: m.fcp,
    LCP: m.lcp,
    TTI: m.tti
  }));

  const bundleSizeData = metrics.slice(0, 10).reverse().map(m => ({
    date: format(new Date(m.recorded_at), 'dd/MM'),
    JS: m.bundle_size_js,
    CSS: m.bundle_size_css,
    Total: m.bundle_size_total
  }));

  // Calculate averages
  const recentMetrics = metrics.slice(0, 5);
  const avgPerformance = recentMetrics.length > 0 
    ? Math.round(recentMetrics.reduce((sum, m) => sum + (m.performance_score || 0), 0) / recentMetrics.length)
    : 0;
  const avgBundleSize = recentMetrics.length > 0
    ? Math.round(recentMetrics.reduce((sum, m) => sum + (m.bundle_size_total || 0), 0) / recentMetrics.length)
    : 0;
  const avgLCP = recentMetrics.length > 0
    ? (recentMetrics.reduce((sum, m) => sum + (m.lcp || 0), 0) / recentMetrics.length).toFixed(2)
    : '0.00';

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Monitoring Performance</h1>
          <p className="text-muted-foreground">Suivi des métriques Lighthouse et bundle size</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportData} disabled={metrics.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" />
            {showForm ? 'Annuler' : 'Ajouter métrique'}
          </Button>
        </div>
      </div>

      {/* Seuils d'alerte */}
      <Card className="border-accent/20 bg-accent/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Seuils d'alerte configurés
          </CardTitle>
          <CardDescription>
            Les alertes email sont envoyées automatiquement lorsque ces seuils sont dépassés
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground mb-1">Performance</p>
              <p className="font-mono font-semibold">&lt; 85</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Accessibilité</p>
              <p className="font-mono font-semibold">&lt; 90</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Best Practices</p>
              <p className="font-mono font-semibold">&lt; 90</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">SEO</p>
              <p className="font-mono font-semibold">&lt; 95</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">LCP</p>
              <p className="font-mono font-semibold">&gt; 2.5s</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">FCP</p>
              <p className="font-mono font-semibold">&gt; 1.8s</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">TTI</p>
              <p className="font-mono font-semibold">&gt; 3.8s</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">CLS</p>
              <p className="font-mono font-semibold">&gt; 0.1</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">TBT</p>
              <p className="font-mono font-semibold">&gt; 200ms</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Bundle Total</p>
              <p className="font-mono font-semibold">&gt; 500 KB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Performance Moy.</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPerformance}/100</div>
            <p className="text-xs text-muted-foreground">Score Lighthouse moyen (5 dernières)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bundle Total</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgBundleSize} KB</div>
            <p className="text-xs text-muted-foreground">Taille moyenne (5 dernières)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">LCP Moyen</CardTitle>
            <Zap className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgLCP}s</div>
            <p className="text-xs text-muted-foreground">Largest Contentful Paint</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Métriques</CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.length}</div>
            <p className="text-xs text-muted-foreground">Enregistrements historiques</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Metric Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Ajouter une métrique</CardTitle>
            <CardDescription>Enregistrez manuellement les résultats Lighthouse ou build</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="performance_score">Performance (0-100)</Label>
                  <Input
                    id="performance_score"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.performance_score}
                    onChange={(e) => setFormData({ ...formData, performance_score: e.target.value })}
                    placeholder="90"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accessibility_score">Accessibilité (0-100)</Label>
                  <Input
                    id="accessibility_score"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.accessibility_score}
                    onChange={(e) => setFormData({ ...formData, accessibility_score: e.target.value })}
                    placeholder="95"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="best_practices_score">Best Practices (0-100)</Label>
                  <Input
                    id="best_practices_score"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.best_practices_score}
                    onChange={(e) => setFormData({ ...formData, best_practices_score: e.target.value })}
                    placeholder="92"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seo_score">SEO (0-100)</Label>
                  <Input
                    id="seo_score"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.seo_score}
                    onChange={(e) => setFormData({ ...formData, seo_score: e.target.value })}
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fcp">FCP (secondes)</Label>
                  <Input
                    id="fcp"
                    type="number"
                    step="0.01"
                    value={formData.fcp}
                    onChange={(e) => setFormData({ ...formData, fcp: e.target.value })}
                    placeholder="0.8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lcp">LCP (secondes)</Label>
                  <Input
                    id="lcp"
                    type="number"
                    step="0.01"
                    value={formData.lcp}
                    onChange={(e) => setFormData({ ...formData, lcp: e.target.value })}
                    placeholder="1.2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tti">TTI (secondes)</Label>
                  <Input
                    id="tti"
                    type="number"
                    step="0.01"
                    value={formData.tti}
                    onChange={(e) => setFormData({ ...formData, tti: e.target.value })}
                    placeholder="1.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tbt">TBT (ms)</Label>
                  <Input
                    id="tbt"
                    type="number"
                    value={formData.tbt}
                    onChange={(e) => setFormData({ ...formData, tbt: e.target.value })}
                    placeholder="50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cls">CLS (ratio)</Label>
                  <Input
                    id="cls"
                    type="number"
                    step="0.001"
                    value={formData.cls}
                    onChange={(e) => setFormData({ ...formData, cls: e.target.value })}
                    placeholder="0.05"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bundle_size_js">JS Bundle (KB)</Label>
                  <Input
                    id="bundle_size_js"
                    type="number"
                    value={formData.bundle_size_js}
                    onChange={(e) => setFormData({ ...formData, bundle_size_js: e.target.value })}
                    placeholder="187"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bundle_size_css">CSS Bundle (KB)</Label>
                  <Input
                    id="bundle_size_css"
                    type="number"
                    value={formData.bundle_size_css}
                    onChange={(e) => setFormData({ ...formData, bundle_size_css: e.target.value })}
                    placeholder="24"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bundle_size_total">Total Bundle (KB)</Label>
                  <Input
                    id="bundle_size_total"
                    type="number"
                    value={formData.bundle_size_total}
                    onChange={(e) => setFormData({ ...formData, bundle_size_total: e.target.value })}
                    placeholder="353"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="environment">Environnement</Label>
                  <Select
                    value={formData.environment}
                    onValueChange={(value) => setFormData({ ...formData, environment: value })}
                  >
                    <SelectTrigger id="environment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="local">Local</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optionnel)</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Après optimisation Phase 1+2"
                  />
                </div>
              </div>

              <Button type="submit" disabled={addMetric.isPending}>
                {addMetric.isPending ? 'Enregistrement...' : 'Enregistrer la métrique'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <Tabs defaultValue="lighthouse" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lighthouse">Scores Lighthouse</TabsTrigger>
          <TabsTrigger value="vitals">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="bundle">Bundle Size</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="lighthouse">
          <Card>
            <CardHeader>
              <CardTitle>Évolution des scores Lighthouse</CardTitle>
              <CardDescription>10 dernières mesures (0-100)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={lighthouseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Performance" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="Accessibilité" stroke="hsl(var(--accent))" strokeWidth={2} />
                  <Line type="monotone" dataKey="Best Practices" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="SEO" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vitals">
          <Card>
            <CardHeader>
              <CardTitle>Core Web Vitals</CardTitle>
              <CardDescription>FCP, LCP, TTI en secondes (10 dernières mesures)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={coreWebVitalsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="FCP" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="LCP" stroke="hsl(var(--accent))" strokeWidth={2} />
                  <Line type="monotone" dataKey="TTI" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bundle">
          <Card>
            <CardHeader>
              <CardTitle>Évolution du Bundle Size</CardTitle>
              <CardDescription>Tailles en KB (10 dernières mesures)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={bundleSizeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="JS" fill="hsl(var(--primary))" />
                  <Bar dataKey="CSS" fill="hsl(var(--accent))" />
                  <Bar dataKey="Total" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historique complet</CardTitle>
              <CardDescription>Toutes les métriques enregistrées</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.map((metric) => (
                  <div key={metric.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{format(new Date(metric.recorded_at), 'dd/MM/yyyy HH:mm')}</p>
                        <p className="text-sm text-muted-foreground capitalize">{metric.environment}</p>
                      </div>
                      <div className="text-right space-y-1">
                        {metric.performance_score && (
                          <p className="text-sm">Performance: <span className="font-bold">{metric.performance_score}</span></p>
                        )}
                        {metric.bundle_size_total && (
                          <p className="text-sm">Bundle: <span className="font-bold">{metric.bundle_size_total} KB</span></p>
                        )}
                      </div>
                    </div>
                    {metric.notes && (
                      <p className="text-sm text-muted-foreground italic">{metric.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceMonitoring;
