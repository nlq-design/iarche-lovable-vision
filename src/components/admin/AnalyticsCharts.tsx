import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#1A2B4A', '#D15A3E', '#4A90E2', '#50C878'];

interface ChartData {
  [key: string]: any;
}

interface AnalyticsChartProps {
  data: ChartData[];
}

export const PublicationTrendChart = ({ data }: AnalyticsChartProps) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="articles" stroke="hsl(var(--primary))" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);

export const EngagementPieChart = ({ data }: AnalyticsChartProps) => (
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={(entry) => entry.name}
        outerRadius={80}
        fill="#8884d8"
        dataKey="value"
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  </ResponsiveContainer>
);

export const TopArticlesBarChart = ({ data }: AnalyticsChartProps) => (
  <ResponsiveContainer width="100%" height={400}>
    <BarChart data={data} layout="vertical">
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis type="number" />
      <YAxis dataKey="title" type="category" width={150} />
      <Tooltip />
      <Bar dataKey="views" fill="hsl(var(--primary))" />
    </BarChart>
  </ResponsiveContainer>
);
