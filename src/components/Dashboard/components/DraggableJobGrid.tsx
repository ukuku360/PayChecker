import { Plus, Download, Sparkles } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { dotColorMap, borderColorMap } from '../../../utils/colorUtils';
import type { JobConfig } from '../../../types';

interface DraggableJobGridProps {
  jobConfigs: JobConfig[];
  getJobStats: (jobId: string) => { totalHours: number; actualHours: number };
  onJobClick?: (job: JobConfig) => void;
  onAddJob?: () => void;
  onAIScan?: () => void;
  onExport?: () => void;
}

const DraggableJobCard = ({
  job,
  stats,
  onClick,
}: {
  job: JobConfig;
  stats: { totalHours: number; actualHours: number };
  onClick: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `draggable-source-${job.id}`,
      data: {
        type: job.id,
        isSource: true,
      },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={clsx(
        'neu-flat px-4 py-3 flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all select-none border-t border-l border-white/50 touch-none',
        borderColorMap[job.color] ? '' : 'border-transparent',
        isDragging ? 'opacity-80 scale-105 z-50' : 'hover:scale-[1.02]'
      )}
    >
      <div
        className={clsx(
          'w-3 h-3 rounded-full shadow-inner',
          dotColorMap[job.color] || 'bg-slate-300'
        )}
      />
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase">
          {job.name}
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-slate-700">{stats.totalHours}h</span>
          {stats.actualHours !== stats.totalHours && (
            <span className="text-xs font-medium text-slate-400">({stats.actualHours}h)</span>
          )}
        </div>
      </div>
    </div>
  );
};

export const DraggableJobGrid = ({
  jobConfigs,
  getJobStats,
  onJobClick,
  onAddJob,
  onAIScan,
  onExport,
}: DraggableJobGridProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 md:space-y-0 md:flex md:flex-wrap md:gap-4 md:items-center">
      {/* Action Buttons - Full width row on mobile */}
      <div className="flex gap-2 items-center justify-end md:justify-start w-full md:w-auto">
        {onAddJob && (
          <button
            onClick={onAddJob}
            className="neu-icon-btn w-10 h-10 rounded-xl !p-0"
            title={t('dashboard.addNewJob')}
          >
            <Plus className="w-4 h-4 text-slate-500" />
          </button>
        )}

        {onAIScan && (
            <button
              onClick={onAIScan}
              className="neu-icon-btn w-10 h-10 rounded-xl !p-0 group"
              title={t('dashboard.scanRoster')}
            >
              <div className="relative">
                <Sparkles className="w-4 h-4 text-indigo-500 group-hover:text-indigo-600 transition-colors" />
                <span className="absolute -top-3 -right-3 px-1 rounded-[4px] bg-indigo-500 text-[8px] font-bold text-white border border-white shadow-sm">
                  BETA
                </span>
              </div>
            </button>
        )}

        {onExport && (
            <button
              onClick={onExport}
              className="neu-icon-btn w-10 h-10 rounded-xl !p-0"
              title={t('dashboard.exportReport')}
            >
              <Download className="w-4 h-4 text-slate-500" />
            </button>
        )}
      </div>

      {/* Job Cards Grid */}
      <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 md:gap-4 w-full md:w-auto">
        {jobConfigs.map((job) => (
          <DraggableJobCard
            key={job.id}
            job={job}
            stats={getJobStats(job.id)}
            onClick={() => onJobClick?.(job)}
          />
        ))}
      </div>
    </div>
  );
};
