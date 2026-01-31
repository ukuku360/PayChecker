import { useRef, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Plus as Plus_Lucide, Bookmark, Clock, X } from 'lucide-react';
import type { Shift, JobConfig, ShiftTemplate } from '../../../types';
import { colorMap } from '../../../utils/colorUtils';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { BottomSheet } from '../../ui/BottomSheet';

interface JobPickerProps {
  position: { top: number; left: number };
  onClose: () => void;
  jobConfigs: JobConfig[];
  templates: ShiftTemplate[];
  shifts: Shift[]; // To check if already added
  onAddJobAddNewJob?: () => void;
  onSelectJob: (jobId: string) => void;
  onSelectTemplate: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void;
  isMobile?: boolean;
}

export const JobPicker = ({
  position,
  onClose,
  jobConfigs,
  templates,
  shifts,
  onAddJobAddNewJob,
  onSelectJob,
  onSelectTemplate,
  onDeleteTemplate,
  isMobile: isMobileProp,
}: JobPickerProps) => {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pickerTab, setPickerTab] = useState<'jobs' | 'templates'>('jobs');
  const isMobileQuery = useMediaQuery('(max-width: 768px)');
  const isMobile = isMobileProp ?? isMobileQuery;

  useEffect(() => {
    if (isMobile) return; // BottomSheet handles its own close

    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, isMobile]);

  const pickerContent = (
    <>
      {/* Tabs */}
      <div className="flex p-0.5 bg-slate-100 rounded-lg mb-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPickerTab('jobs');
          }}
          className={clsx(
            'flex-1 py-2.5 min-h-[44px] text-xs font-bold rounded-md transition-all',
            pickerTab === 'jobs'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          Jobs
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPickerTab('templates');
          }}
          className={clsx(
            'flex-1 py-2.5 min-h-[44px] text-xs font-bold rounded-md transition-all',
            pickerTab === 'templates'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          Templates
        </button>
      </div>

      {pickerTab === 'jobs' ? (
        <>
          <div className="flex items-center justify-between mb-1 px-2 py-1">
            <span className="text-xs font-medium text-slate-500">Pick Job</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddJobAddNewJob?.();
                onClose();
              }}
              className="p-2.5 min-w-[44px] min-h-[44px] hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-500 transition-colors flex items-center justify-center"
              title="Create New Job"
            >
              <Plus_Lucide className="w-4 h-4" />
            </button>
          </div>
          {jobConfigs.length === 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddJobAddNewJob?.();
                onClose();
              }}
              className="w-full text-center px-3 py-4 rounded-lg text-xs text-slate-400 hover:text-indigo-500 hover:bg-slate-50 border border-dashed border-slate-200 hover:border-indigo-200 transition-all flex flex-col items-center gap-1"
            >
              <Plus_Lucide className="w-4 h-4" />
              <span>Create First Job</span>
            </button>
          )}
          {jobConfigs.map((job) => {
            const colors = colorMap[job.color] || colorMap.slate;
            const alreadyAdded = shifts.some((s) => s.type === job.id);
            return (
              <button
                key={job.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectJob(job.id);
                }}
                disabled={alreadyAdded}
                className={clsx(
                  'w-full text-left px-3 py-3 min-h-[44px] rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                  alreadyAdded
                    ? 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400'
                    : `${colors.bg} ${colors.text} hover:shadow-md hover:-translate-y-0.5`
                )}
              >
                <span
                  className={clsx('w-2 h-2 rounded-full', `bg-${job.color}-500`)}
                ></span>
                {job.name}
                {alreadyAdded && <span className="text-xs opacity-60 ml-auto">✓</span>}
              </button>
            );
          })}
        </>
      ) : (
        <>
          <div className="max-h-[200px] overflow-y-auto">
            {templates.length === 0 ? (
              <div className="text-center py-4 px-2">
                <div className="bg-slate-50 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Bookmark className="w-4 h-4 text-slate-300" />
                </div>
                <p className="text-xs text-slate-400">
                  Save shifts as templates to reuse them here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {templates.map((t) => {
                  const job = jobConfigs.find((j) => j.id === t.jobId);
                  return (
                    <div key={t.id} className="group/item relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTemplate(t.id);
                        }}
                        className={clsx(
                          'w-full text-left px-3 py-3 min-h-[44px] rounded-lg text-xs transition-all hover:bg-slate-50 border border-transparent hover:border-slate-100'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={clsx(
                              'w-1.5 h-1.5 rounded-full shrink-0',
                              `bg-${job?.color || 'slate'}-500`
                            )}
                          ></span>
                          <span className="font-bold text-slate-700 truncate">
                            {t.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 pl-3.5">
                          <Clock className="w-3 h-3" />
                          <span>
                            {t.startTime} - {t.endTime}
                          </span>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTemplate(t.id);
                        }}
                        className="absolute top-1 right-1 p-2 min-w-[44px] min-h-[44px] text-slate-300 hover:text-red-400 md:opacity-0 group-hover/item:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );

  // Mobile: use BottomSheet
  if (isMobile) {
    return (
      <BottomSheet
        isOpen={true}
        onClose={onClose}
        snapPoints={[0.4, 0.6]}
        initialSnap={0}
      >
        <div className="pb-4">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Add Shift</h2>
          {pickerContent}
        </div>
      </BottomSheet>
    );
  }

  // Desktop: use positioned popup
  return (
    <div
      ref={pickerRef}
      style={{
        top: position.top,
        left: position.left,
        position: 'fixed',
      }}
      className="-translate-x-1/2 -translate-y-1/2 z-[999] bg-white rounded-xl shadow-xl border border-slate-200 p-2 min-w-[150px] animate-in fade-in zoom-in-95 duration-150"
    >
      {pickerContent}
    </div>
  );
};
