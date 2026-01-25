import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useMonthlyTrends } from '../../hooks/useMonthlyTrends';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
    
    return (
      <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-lg text-xs">
        <p className="font-bold text-slate-700 mb-2">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
             <span className="text-slate-500 capitalize">{entry.name}:</span>
             <span className="font-mono font-medium ml-auto">
               ${entry.value.toLocaleString()}
             </span>
          </div>
        ))}
        <div className="border-t border-slate-100 mt-2 pt-2 flex items-center justify-between font-bold text-slate-700">
            <span>Total</span>
            <span>${total.toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
};

export const IncomeChart = () => {
  const { chartData, jobs } = useMonthlyTrends(12); // Last 12 months

  if (chartData.length === 0) {
    return (
        <div className="neu-flat p-10 flex flex-col items-center justify-center text-slate-400 min-h-[300px]">
            <p>No data available to chart.</p>
            <span className="text-xs">Add some shifts to see your income trends!</span>
        </div>
    );
  }

  // Helper to get hex color from tailwind color name
  // Note: chart libraries need hex usually
  // We'll map standard Tailwind colors. If missing, fallback to gray.
  const getHexColor = (colorName: string) => {
      // Very basic mapping for demo. In production, import full palette or use CSS vars
      const map: Record<string, string> = {
          blue: '#3b82f6',
          indigo: '#6366f1',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
          purple: '#8b5cf6',
          cyan: '#06b6d4',
          slate: '#64748b'
      };
      return map[colorName] || '#94a3b8';
  };

  return (
    <div className="neu-flat p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-4">
         <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Income Trends</h3>
         <span className="text-xs text-slate-400">Last 12 Months</span>
      </div>

      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                dy={10}
            />
            <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            
            {jobs.map((job) => (
                <Bar 
                    key={job.id} 
                    dataKey={job.id} 
                    name={job.name} 
                    stackId="a" 
                    fill={getHexColor(job.color)} 
                    radius={[2, 2, 0, 0]}
                />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
