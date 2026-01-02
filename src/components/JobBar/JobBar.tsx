import { useDraggable } from '@dnd-kit/core';
import type { JobConfig } from '../../types';
import { clsx } from 'clsx';
import { Settings } from 'lucide-react';
import { interactiveBorderColorMap, dotColorMap } from '../../utils/colorUtils';

interface JobBarProps {
  job: JobConfig;
  onOpenSettings: (job: JobConfig) => void;
}

export const JobBar = ({ job, onOpenSettings }: JobBarProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `draggable-source-${job.id}`,
    data: {
      type: job.id,
      isSource: true,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div className="flex items-center group relative">
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={clsx(
          'px-3 py-2 rounded-lg font-medium text-sm border cursor-grab active:cursor-grabbing transition-all flex items-center gap-2 bg-white',
          interactiveBorderColorMap[job.color] || 'text-slate-700 border-slate-200 hover:border-slate-400',
          isDragging ? 'opacity-90 z-50 shadow-lg scale-105' : 'opacity-100'
        )}
      >
        <div className={clsx("w-2 h-2 rounded-full", dotColorMap[job.color] || 'bg-slate-500')} />
        {job.name}
      </div>
      <button
        onClick={() => onOpenSettings(job)}
        className={clsx(
          'absolute -right-1 -top-1 w-5 h-5 rounded-full border cursor-pointer flex items-center justify-center bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm',
          interactiveBorderColorMap[job.color] || 'text-slate-700 border-slate-200',
        )}
        title="Set hourly rate"
      >
        <Settings className="w-3 h-3" />
      </button>
    </div>
  );
};
