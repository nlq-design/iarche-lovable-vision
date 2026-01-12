import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Download, TrendingUp } from 'lucide-react';
import { format, parseISO, startOfDay, eachDayOfInterval, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { CampaignRecipient, CampaignStats } from '@/hooks/useVivierCampaignDetail';

interface CampaignAnalyticsChartProps {
  recipients: CampaignRecipient[];
  stats: CampaignStats;
  campaignName: string;
  onExport?: () => void;
}

const COLORS = {
  sent: '#3b82f6',
  opened: '#22c55e',
  clicked: '#8b5cf6',
  replied: '#f59e0b',
  bounced: '#ef4444',
};

export function CampaignAnalyticsChart({ 
  recipients, 
  stats, 
  campaignName,
  onExport,
}: CampaignAnalyticsChartProps) {
  
  // Generate daily timeline data
  const timelineData = useMemo(() => {
    if (recipients.length === 0) return [];

    // Get date range
    const sentDates = recipients
      .filter(r => r.sent_at)
      .map(r => parseISO(r.sent_at!));
    
    if (sentDates.length === 0) return [];

    const minDate = startOfDay(Math.min(...sentDates.map(d => d.getTime())));
    const maxDate = startOfDay(new Date());
    const days = eachDayOfInterval({ start: minDate, end: maxDate });

    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayRecipients = recipients.filter(r => {
        if (!r.sent_at) return false;
        return format(parseISO(r.sent_at), 'yyyy-MM-dd') === dayStr;
      });

      return {
        date: format(day, 'dd/MM', { locale: fr }),
        fullDate: dayStr,
        sent: dayRecipients.length,
        opened: recipients.filter(r => r.opened_at && format(parseISO(r.opened_at), 'yyyy-MM-dd') === dayStr).length,
        clicked: recipients.filter(r => r.clicked_at && format(parseISO(r.clicked_at), 'yyyy-MM-dd') === dayStr).length,
        replied: recipients.filter(r => r.replied_at && format(parseISO(r.replied_at), 'yyyy-MM-dd') === dayStr).length,
        bounced: recipients.filter(r => r.bounced_at && format(parseISO(r.bounced_at), 'yyyy-MM-dd') === dayStr).length,
      };
    });
  }, [recipients]);

  // Funnel data for pie chart
  const funnelData = useMemo(() => [
    { name: 'Envoyés', value: stats.sent, color: COLORS.sent },
    { name: 'Ouverts', value: stats.opened, color: COLORS.opened },
    { name: 'Cliqués', value: stats.clicked, color: COLORS.clicked },
    { name: 'Réponses', value: stats.replied, color: COLORS.replied },
  ].filter(d => d.value > 0), [stats]);

  // Rate comparison data
  const ratesData = useMemo(() => [
    { name: 'Ouverture', rate: stats.openRate, benchmark: 25, color: COLORS.opened },
    { name: 'Clic', rate: stats.clickRate, benchmark: 5, color: COLORS.clicked },
    { name: 'Réponse', rate: stats.replyRate, benchmark: 3, color: COLORS.replied },
    { name: 'Bounce', rate: stats.bounceRate, benchmark: 2, color: COLORS.bounced },
  ], [stats]);

  if (recipients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>Aucune donnée disponible</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          Ajoutez des destinataires et lancez la campagne pour voir les analytics
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Performance de la campagne</h3>
        </div>
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
        )}
      </div>

      {/* Timeline Chart */}
      {timelineData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Évolution temporelle</CardTitle>
            <CardDescription>Activité jour par jour</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="sent" name="Envoyés" stroke={COLORS.sent} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="opened" name="Ouverts" stroke={COLORS.opened} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="clicked" name="Cliqués" stroke={COLORS.clicked} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="replied" name="Réponses" stroke={COLORS.replied} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Funnel Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entonnoir de conversion</CardTitle>
            <CardDescription>Répartition des interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={funnelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rates Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Taux de performance</CardTitle>
            <CardDescription>Comparaison avec les benchmarks secteur</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ratesData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Taux']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="rate" name="Votre taux" radius={[0, 4, 4, 0]}>
                  {ratesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
                <Bar dataKey="benchmark" name="Benchmark" fill="#94a3b8" radius={[0, 4, 4, 0]} opacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
