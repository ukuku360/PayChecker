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
          'neu-flat px-4 py-2 text-sm border-l-2 cursor-grab active:cursor-grabbing transition-transform flex items-center gap-2',
          interactiveBorderColorMap[job.color] ? '' : 'border-transparent',
          isDragging ? 'opacity-90 z-50 scale-105' : 'hover:scale-105',
          'text-slate-700'
        )}
      >
        <div className={clsx("w-2 h-2 rounded-full shadow-inner", dotColorMap[job.color] || 'bg-slate-500')} />
        <span className="font-medium">{job.name}</span>
      </div>
      <button
        onClick={() => onOpenSettings(job)}
        className={clsx(
          'neu-icon-btn absolute -right-2 -top-2 w-6 h-6 !rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10 !p-0',
          interactiveBorderColorMap[job.color] || 'text-slate-500',
        )}
        title="Set hourly rate"
      >
        <Settings className="w-3 h-3" />
      </button>
    </div>
  );
};
