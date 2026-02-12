import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../hooks/useCurrency';

interface ChartDataPoint {
  name: string;
  value?: number;
  netIncome?: number;
  realIncome?: number;
  [key: string]: string | number | undefined;
}

const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#3b82f6', '#ef4444', '#64748b'];

interface ChartProps {
  data: ChartDataPoint[];
}

export const ExpensePieChart = ({ data }: ChartProps) => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const formatTooltipValue = (value: number | string | ReadonlyArray<number | string> | undefined) => {
    const amount = Array.isArray(value) ? Number(value[0] ?? 0) : Number(value ?? 0);
    return formatCurrency(amount);
  };

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        {t('charts.noExpenseData')}
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((_entry, index: number) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
	          <RechartsTooltip 
	            formatter={(value) => formatTooltipValue(value)}
	            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
	          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            iconType="circle"
            formatter={(value) => <span className="text-xs text-slate-500 font-medium ml-1">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const RealIncomeChart = ({ data }: ChartProps) => {
  const { t } = useTranslation();
  const { formatCurrency } = useCurrency();
  const formatTooltipValue = (value: number | string | ReadonlyArray<number | string> | undefined) => {
    const amount = Array.isArray(value) ? Number(value[0] ?? 0) : Number(value ?? 0);
    return formatCurrency(amount);
  };

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorRealIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorNetIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#64748b' }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#64748b' }} 
            tickFormatter={(value) => `$${value}`}
          />
	          <RechartsTooltip 
	            formatter={(value) => formatTooltipValue(value)}
	            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
	          />
          <Area 
            type="monotone" 
            dataKey="netIncome" 
            name={t('charts.netIncome')}
            stroke="#6366f1" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorNetIncome)" 
          />
          <Area 
            type="monotone" 
            dataKey="realIncome" 
            name={t('charts.realIncome')}
            stroke="#10b981" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorRealIncome)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
