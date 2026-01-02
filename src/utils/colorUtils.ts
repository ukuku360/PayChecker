/**
 * Centralized color utility constants for job types
 * Eliminates duplicate color mappings across components
 */

// Full color map with bg, border, and text classes
export const colorMap: { [key: string]: { bg: string; border: string; text: string } } = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-700' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-100', text: 'text-pink-700' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-100', text: 'text-cyan-700' },
  slate: { bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-700' },
};

// Solid dot/indicator color classes
export const dotColorMap: { [key: string]: string } = {
  blue: 'bg-blue-500',
  emerald: 'bg-emerald-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  pink: 'bg-pink-500',
  cyan: 'bg-cyan-500',
  slate: 'bg-slate-500',
};

// Border accent colors for cards and draggable items
export const borderColorMap: { [key: string]: string } = {
  blue: 'border-blue-200 hover:border-blue-300',
  emerald: 'border-emerald-200 hover:border-emerald-300',
  purple: 'border-purple-200 hover:border-purple-300',
  orange: 'border-orange-200 hover:border-orange-300',
  pink: 'border-pink-200 hover:border-pink-300',
  cyan: 'border-cyan-200 hover:border-cyan-300',
};

// Interactive border colors (with stronger hover)
export const interactiveBorderColorMap: { [key: string]: string } = {
  blue: 'text-blue-700 border-blue-200 hover:border-blue-400',
  emerald: 'text-emerald-700 border-emerald-200 hover:border-emerald-400',
  purple: 'text-purple-700 border-purple-200 hover:border-purple-400',
  orange: 'text-orange-700 border-orange-200 hover:border-orange-400',
  pink: 'text-pink-700 border-pink-200 hover:border-pink-400',
  cyan: 'text-cyan-700 border-cyan-200 hover:border-cyan-400',
};

// Color options available for new job creation
export const colorOptions = ['purple', 'orange', 'pink', 'cyan'] as const;

// Helper function to get job color with fallback
export const getColorWithFallback = (color: string, fallback = 'slate') => {
  return colorMap[color] || colorMap[fallback];
};

export const getDotColorWithFallback = (color: string, fallback = 'bg-slate-500') => {
  return dotColorMap[color] || fallback;
};
