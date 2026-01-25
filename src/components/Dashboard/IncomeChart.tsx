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
      <div className="glass-panel p-4 min-w-[180px]">
        <p className="font-semibold text-slate-700 mb-3 text-sm border-b border-slate-200/50 pb-2">{label}</p>
        <div className="space-y-2">
            {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center gap-3 text-sm">
                <div className="w-2.5 h-2.5 rounded-full ring-2 ring-white/50" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-600 font-medium text-xs uppercase tracking-wide opacity-80">{entry.name}</span>
                <span className="font-mono font-semibold ml-auto text-slate-700">
                ${entry.value.toLocaleString()}
                </span>
            </div>
            ))}
        </div>
        <div className="border-t border-slate-200/50 mt-3 pt-2 flex items-center justify-between font-bold text-slate-800 text-sm">
            <span>Total</span>
            <span>${total.toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
};

export const IncomeChart = () => {
  const { chartData, jobs } = useMonthlyTrends(12);

  if (chartData.length === 0) {
    return (
        <div className="neu-flat p-10 flex flex-col items-center justify-center text-slate-400 min-h-[300px] animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-slate-200/50 rounded-full flex items-center justify-center mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.5 4.5 9 9 9s6 3.5 6 3 6-3.5 6-3.5 6 3.5 6 3.5-1.5 7-6 7-6-3.5-6-3.5-6 3.5-6 3.5S3 13.75 3 13.125zM12 9v9m-9-3c0-1.5 2-3 4-3m10 6c0-1.5-2-3-4-3" />
                </svg>
            </div>
            <p className="font-medium text-slate-500">No data available yet</p>
            <span className="text-xs mt-1 opacity-70">Add shifts to see your income grow!</span>
        </div>
    );
  }

  // Premium Pastel Palette
  const getJobColor = (index: number) => {
      const palette = [
          '#8b5cf6', // Violet
          '#ec4899', // Pink
          '#3b82f6', // Blue
          '#10b981', // Emerald
          '#f59e0b', // Amber
          '#6366f1', // Indigo
          '#f43f5e', // Rose
          '#06b6d4', // Cyan
      ];
      return palette[index % palette.length];
  };

  return (
    <div className="neu-flat p-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-8 px-2">
         <div>
            <h3 className="text-lg font-bold text-slate-700 tracking-tight">Income Trends</h3>
            <p className="text-xs text-slate-400 font-medium mt-0.5 uppercase tracking-wider">Last 12 Months</p>
         </div>
         {/* Optional: Add a filter or total summary here conceptually */}
      </div>

      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 0,
            }}
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }} 
                dy={15}
            />
            <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                tickFormatter={(value) => `$${value}`}
                dx={-10}
            />
            <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: '#f8fafc', opacity: 0.5 }} 
            />
            <Legend 
                wrapperStyle={{ paddingTop: '30px', opacity: 0.8 }} 
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-xs font-semibold text-slate-500 ml-1">{value}</span>}
            />
            
            {jobs.map((job, index) => (
                <Bar 
                    key={job.id} 
                    dataKey={job.id} 
                    name={job.name} 
                    stackId="a" 
                    fill={getJobColor(index)} 
                    radius={[0, 0, 0, 0]} // Reset radius for stacked bars, applied only to top in logic usually, but consistent look is clean
                    maxBarSize={50}
                    className="hover:opacity-90 transition-opacity cursor-pointer"
                />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
