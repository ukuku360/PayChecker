import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useScheduleStore } from '../../store/useScheduleStore';
import { calculateTotalPay } from '../../utils/calculatePay';
import { Briefcase, Clock, Wallet } from 'lucide-react';

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#f43f5e', '#06b6d4'];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="glass-panel p-3">
        <p className="font-semibold text-slate-700 text-sm">{data.name}</p>
        <p className="text-xs text-slate-500">{formatCurrency(data.value)}</p>
        <p className="text-xs text-slate-400">{data.hours}h worked</p>
      </div>
    );
  }
  return null;
};

export const JobBreakdown = () => {
  const { shifts, jobConfigs, holidays } = useScheduleStore();

  const jobData = jobConfigs.map((job, index) => {
    const jobShifts = shifts.filter(s => s.type === job.id);
    const totalHours = jobShifts.reduce((acc, s) => acc + (s.hours || 0), 0);
    const totalPay = calculateTotalPay(jobShifts, jobConfigs, holidays);
    
    return {
      name: job.name,
      value: totalPay,
      hours: totalHours,
      color: COLORS[index % COLORS.length],
    };
  }).filter(d => d.value > 0);

  const totalEarnings = jobData.reduce((acc, d) => acc + d.value, 0);
  const totalHours = jobData.reduce((acc, d) => acc + d.hours, 0);

  if (jobData.length === 0) {
    return (
      <div className="neu-flat p-6 text-center text-slate-400">
        <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No job data available</p>
      </div>
    );
  }

  return (
    <div className="neu-flat p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Briefcase className="w-4 h-4" />
        Job Breakdown
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={jobData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {jobData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Job Summary */}
        <div className="space-y-3">
          {jobData.map((job, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: job.color }} />
                <span className="text-sm font-medium text-slate-600">{job.name}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-700">{formatCurrency(job.value)}</p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-end">
                  <Clock className="w-3 h-3" /> {job.hours}h
                </p>
              </div>
            </div>
          ))}
          
          {/* Totals */}
          <div className="border-t border-slate-200/50 pt-3 mt-3 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Total
            </span>
            <div className="text-right">
              <p className="text-lg font-bold text-slate-700">{formatCurrency(totalEarnings)}</p>
              <p className="text-[10px] text-slate-400">{totalHours}h total</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
