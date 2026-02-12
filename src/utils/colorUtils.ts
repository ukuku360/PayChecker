/**
 * Centralized color utility constants for job types
 * Eliminates duplicate color mappings across components
 */

// Full color map with bg, border, and text classes
export const colorMap: { [key: string]: { bg: string; border: string; text: string } } = {
  blue: { bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700' },
  purple: { bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-700' },
  orange: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-700' },
  pink: { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-700' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-100', text: 'text-cyan-700' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-700' },
};

// Solid dot/indicator color classes
export const dotColorMap: { [key: string]: string } = {
  blue: 'bg-sky-300',
  emerald: 'bg-emerald-300',
  purple: 'bg-violet-300',
  orange: 'bg-amber-300',
  pink: 'bg-rose-300',
  cyan: 'bg-cyan-300',
  slate: 'bg-slate-300',
};

// Border accent colors for cards and draggable items
export const borderColorMap: { [key: string]: string } = {
  blue: 'border-sky-200 hover:border-sky-300',
  emerald: 'border-emerald-200 hover:border-emerald-300',
  purple: 'border-violet-200 hover:border-violet-300',
  orange: 'border-amber-200 hover:border-amber-300',
  pink: 'border-rose-200 hover:border-rose-300',
  cyan: 'border-cyan-200 hover:border-cyan-300',
  slate: 'border-slate-200 hover:border-slate-300',
};

// Interactive border colors (with stronger hover)
export const interactiveBorderColorMap: { [key: string]: string } = {
  blue: 'text-sky-700 border-sky-200 hover:border-sky-300',
  emerald: 'text-emerald-700 border-emerald-200 hover:border-emerald-400',
  purple: 'text-violet-700 border-violet-200 hover:border-violet-300',
  orange: 'text-amber-700 border-amber-200 hover:border-amber-300',
  pink: 'text-rose-700 border-rose-200 hover:border-rose-300',
  cyan: 'text-cyan-700 border-cyan-200 hover:border-cyan-400',
  slate: 'text-slate-700 border-slate-200 hover:border-slate-300',
};

// Color options available for new job creation
export const colorOptions = ['blue', 'emerald', 'purple', 'orange', 'pink', 'cyan'] as const;

// Helper function to get job color with fallback
export const getColorWithFallback = (color: string, fallback = 'slate') => {
  return colorMap[color] || colorMap[fallback];
};

export const getDotColorWithFallback = (color: string, fallback = 'bg-slate-300') => {
  return dotColorMap[color] || fallback;
};
