import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartData {
  date: string;
  [key: string]: any;
}

interface PerformanceChartProps {
  data: ChartData[];
}

export const LighthouseChart = ({ data }: PerformanceChartProps) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis domain={[0, 100]} />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="Performance" stroke="hsl(var(--primary))" strokeWidth={2} />
      <Line type="monotone" dataKey="Accessibilité" stroke="hsl(var(--accent))" strokeWidth={2} />
      <Line type="monotone" dataKey="Best Practices" stroke="#4A90E2" strokeWidth={2} />
      <Line type="monotone" dataKey="SEO" stroke="#50C878" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);

export const CoreWebVitalsChart = ({ data }: PerformanceChartProps) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="FCP" stroke="hsl(var(--primary))" strokeWidth={2} />
      <Line type="monotone" dataKey="LCP" stroke="hsl(var(--accent))" strokeWidth={2} />
      <Line type="monotone" dataKey="TTI" stroke="#4A90E2" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);

export const BundleSizeChart = ({ data }: PerformanceChartProps) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="JS" fill="hsl(var(--primary))" />
      <Bar dataKey="CSS" fill="hsl(var(--accent))" />
      <Bar dataKey="Total" fill="#4A90E2" />
    </BarChart>
  </ResponsiveContainer>
);
