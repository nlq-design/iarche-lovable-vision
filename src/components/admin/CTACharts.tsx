import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#1A2B4A', '#B04A32', '#4A90E2', '#50C878', '#F59E0B', '#8B5CF6'];

interface ChartData {
  [key: string]: any;
}

interface CTAChartProps {
  data: ChartData[];
}

export const CTAClicksBarChart = ({ data }: CTAChartProps) => (
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="clicks" fill="hsl(var(--primary))" />
    </BarChart>
  </ResponsiveContainer>
);

export const SourcesPieChart = ({ data }: CTAChartProps) => (
  <ResponsiveContainer width="100%" height={300}>
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={(entry) => `${entry.name}: ${entry.value}`}
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

export const ConversionLineChart = ({ data }: CTAChartProps) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2} />
      <Line type="monotone" dataKey="conversions" stroke="hsl(var(--accent))" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);
