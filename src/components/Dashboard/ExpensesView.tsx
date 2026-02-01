import { useState } from 'react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { calculateTotalPay } from '../../utils/calculatePay';
import { getTaxCalculator } from '../../data/taxRates';
import { EXPENSE_CATEGORIES } from '../../types';
import type { Expense, ExpenseCategory } from '../../types';
import { Plus, Trash2, Edit2, Check, X, Receipt, TrendingDown, Wallet, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { v4 as uuidv4 } from 'uuid';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';
import { ExpensePieChart, RealIncomeChart } from './ExpenseCharts';


import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../hooks/useCurrency';

// Format currency helper removed, use useCurrency instead

export const ExpensesView = () => {
  const { t } = useTranslation();
  const { formatCurrency, symbol } = useCurrency();
  const { shifts, jobConfigs, holidays, expenses, addExpense, updateExpense, removeExpense, visaType } = useScheduleStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', amount: '', category: 'other' as ExpenseCategory, isRecurring: true });

  // Current month key for filtering
  const now = new Date();
  const currentMonthKey = format(now, 'yyyy-MM');
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const monthlyShifts = shifts.filter(s => {
    const d = new Date(s.date);
    return d >= monthStart && d <= monthEnd;
  });
  const grossMonthlyIncome = calculateTotalPay(monthlyShifts, jobConfigs, holidays);
  const taxCalculator = getTaxCalculator(visaType);
  const netMonthlyIncome = taxCalculator.calculateTakeHome(grossMonthlyIncome, 'monthly').netPay;

  // Filter expenses for current month (recurring + this month's one-time)
  const visibleExpenses = expenses.filter(e => 
    e.isRecurring || e.month === currentMonthKey
  );

  // Calculate total expenses (only visible ones)
  const totalExpenses = visibleExpenses.reduce((acc, e) => acc + e.amount, 0);
  const realIncome = netMonthlyIncome - totalExpenses;

  // Group expenses by category
  const expensesByCategory = EXPENSE_CATEGORIES.map(cat => ({
    ...cat,
    total: visibleExpenses.filter(e => e.category === cat.value).reduce((acc, e) => acc + e.amount, 0),
    items: visibleExpenses.filter(e => e.category === cat.value)
  })).filter(cat => cat.total > 0 || cat.items.length > 0);

  // Chart Data preparation
  const pieData = expensesByCategory.map(cat => ({
    name: cat.label,
    value: cat.total,
    fill: '#8884d8' // Placeholder, ExpensePieChart handles colors
  }));

  const trendData = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i);

    
    // Filter shifts robustly by parsing Year and Month from YYYY-MM-DD string
    // This handles potential format differences (e.g. 2024-9-1 vs 2024-09-01)
    // Fixed: Added validation to prevent silent failures on malformed dates
    const mShifts = shifts.filter(s => {
      if (!s.date || typeof s.date !== 'string') return false;
      const parts = s.date.split('-');
      if (parts.length !== 3) return false;
      const [year, month] = parts.map(Number);
      if (isNaN(year) || isNaN(month)) return false;
      return year === d.getFullYear() && (month - 1) === d.getMonth();
    });
    
    const gross = calculateTotalPay(mShifts, jobConfigs, holidays);
    const net = taxCalculator.calculateTakeHome(gross, 'monthly').netPay;
    
    // User Request: If net income is 0 (no data), expenses should also be 0.
    // Expenses only apply when there is income activity (i.e. user started working/using app).
    const mExpenses = net > 0 ? expenses.reduce((acc, e) => acc + e.amount, 0) : 0;
      
    trendData.push({
      name: format(d, 'MMM'),
      netIncome: net,
      realIncome: net - mExpenses
    });
  }

  const handleAdd = () => {
    if (!formData.name.trim() || !formData.amount) return;
    addExpense({
      id: uuidv4(),
      name: formData.name,
      amount: parseFloat(formData.amount) || 0,
      category: formData.category,
      isRecurring: formData.isRecurring,
      month: formData.isRecurring ? undefined : currentMonthKey
    });
    setFormData({ name: '', amount: '', category: 'other', isRecurring: true });
    setIsAdding(false);
  };

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setFormData({ 
      name: expense.name, 
      amount: expense.amount.toString(), 
      category: expense.category,
      isRecurring: expense.isRecurring ?? true
    });
  };

  const handleUpdate = () => {
    if (!editingId || !formData.name.trim() || !formData.amount) return;
    const existingExpense = expenses.find(e => e.id === editingId);
    updateExpense(editingId, {
      name: formData.name,
      amount: parseFloat(formData.amount) || 0,
      category: formData.category,
      isRecurring: formData.isRecurring,
      month: formData.isRecurring ? undefined : (existingExpense?.month || currentMonthKey)
    });
    setEditingId(null);
    setFormData({ name: '', amount: '', category: 'other', isRecurring: true });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', amount: '', category: 'other', isRecurring: true });
  };
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="neu-flat p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-emerald-500">
            <Wallet className="w-5 h-5" />
            <span className="text-xs font-bold uppercase text-slate-400">{t('dashboard.netPay')}</span>
          </div>
          <span className="text-2xl font-bold text-slate-700">{formatCurrency(netMonthlyIncome)}</span>
          <span className="text-xs text-slate-400">{t('dashboard.monthly')}</span>
        </div>

        <div className="neu-flat p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-rose-500">
            <TrendingDown className="w-5 h-5" />
            <span className="text-xs font-bold uppercase text-slate-400">{t('expenses.fixedExpenses')}</span>
          </div>
          <span className="text-2xl font-bold text-rose-600">{formatCurrency(totalExpenses)}</span>
          <span className="text-xs text-slate-400">{visibleExpenses.length} {t('expenses.itemsMonthly')}</span>
        </div>

            <div className={clsx("neu-flat p-5 flex flex-col gap-2 border-l-4 h-full", realIncome >= 0 ? "border-emerald-400" : "border-rose-400")}>
              <div className="flex items-center gap-2">
                <Receipt className={clsx("w-5 h-5", realIncome >= 0 ? "text-emerald-500" : "text-rose-500")} />
                <span className="text-xs font-bold uppercase text-slate-400">{t('expenses.realIncome')}</span>
              </div>
              <span className={clsx("text-2xl font-bold", realIncome >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {formatCurrency(realIncome)}
              </span>
              <span className="text-xs text-slate-400">{t('expenses.afterFixedExpenses')}</span>
            </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RealIncomeChart data={trendData} />
        <ExpensePieChart data={pieData} />
      </div>
      {/* Expense List */}
      <div className="neu-flat p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t('expenses.monthlyFixedExpenses')}</h3>
          {!isAdding && (
                <button
                onClick={() => setIsAdding(true)}
                className="neu-icon-btn !p-2 flex items-center gap-2"
                >
                <Plus className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-500">{t('common.add')}</span>
                </button>
          )}
        </div>

        {/* Add Form */}
        {isAdding && (
          <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Name (e.g., Rent)"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="px-3 py-3 min-h-[48px] bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                autoFocus
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{symbol}</span>
                <input
                  type="number"
                  placeholder="Amount"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full pl-7 pr-3 py-3 min-h-[48px] bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))}
                className="px-3 py-3 min-h-[48px] bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {EXPENSE_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.emoji} {cat.label}</option>
                ))}
              </select>
              <div className="flex items-center gap-2 md:col-span-3">
                 <label className="flex items-center gap-2 min-w-[44px] min-h-[44px] cursor-pointer">
                   <input
                      type="checkbox"
                      id="isRecurring"
                      checked={formData.isRecurring}
                      onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
                      className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                   />
                 </label>
                 <label htmlFor="isRecurring" className="text-sm text-slate-600 flex items-center gap-2 cursor-pointer">
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                    Monthly Recurring Expense <span className="text-xs text-slate-400">(Auto-applies every month)</span>
                 </label>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={handleCancel} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!formData.name.trim() || !formData.amount}
                className="neu-btn !bg-indigo-500 !text-white hover:!bg-indigo-600 disabled:opacity-50"
              >
                Add Expense
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {visibleExpenses.length === 0 && !isAdding && (
          <div className="text-center py-8 text-slate-400">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t('expenses.noExpenses')}</p>
            <p className="text-xs">{t('expenses.addRecurring')}</p>
          </div>
        )}

        {/* Expenses by Category */}
        {expensesByCategory.map(category => (
          <div key={category.value} className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-lg">{category.emoji}</span>
              <span className="font-semibold text-slate-600">{category.label}</span>
              <span className="text-slate-400 font-medium">{formatCurrency(category.total)}</span>
            </div>
            <div className="pl-8 space-y-1">
              {category.items.map(expense => (
                <div key={expense.id} className="group flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                  {editingId === expense.id ? (
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="px-2 py-1 border border-slate-200 rounded text-sm flex-1 min-w-[100px]"
                      />
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{symbol}</span>
                        <input
                          type="number"
                          value={formData.amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                          className="w-20 pl-5 pr-2 py-1 border border-slate-200 rounded text-sm"
                        />
                      </div>
                      <label className="flex items-center gap-1 cursor-pointer bg-slate-50 px-2 py-1 rounded border border-slate-100 min-h-[44px]">
                          <input
                              type="checkbox"
                              checked={formData.isRecurring}
                              onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
                              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                          />
                          <RefreshCw className={clsx("w-4 h-4", formData.isRecurring ? "text-indigo-500" : "text-slate-300")} />
                      </label>
                      <button onClick={handleUpdate} className="p-2.5 min-w-[44px] min-h-[44px] text-emerald-500 hover:bg-emerald-50 rounded flex items-center justify-center">
                        <Check className="w-5 h-5" />
                      </button>
                      <button onClick={handleCancel} className="p-2.5 min-w-[44px] min-h-[44px] text-slate-400 hover:bg-slate-100 rounded flex items-center justify-center">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-700">{expense.name}</span>
                        {expense.isRecurring && (
                          <span title="Recurring">
                            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-600">{formatCurrency(expense.amount)}</span>
                        <div className="md:opacity-0 md:group-hover:opacity-100 flex gap-1 transition-opacity">
                          <button onClick={() => handleEdit(expense)} className="p-2.5 min-w-[44px] min-h-[44px] text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded flex items-center justify-center">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => removeExpense(expense.id)} className="p-2.5 min-w-[44px] min-h-[44px] text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded flex items-center justify-center">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Total Bar */}
        {totalExpenses > 0 && (
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm font-bold text-slate-500 uppercase">Total Monthly</span>
            <span className="text-lg font-bold text-rose-600">{formatCurrency(totalExpenses)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
