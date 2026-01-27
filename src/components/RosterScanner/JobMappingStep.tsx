import { useState, useEffect } from 'react';
import { ArrowRight, Save, HelpCircle, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import type { JobConfig } from '../../types';
import type { JobMapping } from './types';
import { dotColorMap } from '../../utils/colorUtils';
import { InlineJobCreator } from './InlineJobCreator';

interface JobMappingStepProps {
  unmappedJobNames: string[];
  jobConfigs: JobConfig[];
  onComplete: (mappings: JobMapping[]) => void;
  onBack: () => void;
  onAddJob: (job: JobConfig) => Promise<void>;
}

export function JobMappingStep({
  unmappedJobNames,
  jobConfigs,
  onComplete,
  onBack,
  onAddJob
}: JobMappingStepProps) {
  const [mappings, setMappings] = useState<Record<string, { jobId: string; saveAlias: boolean }>>(() => {
    const initial: Record<string, { jobId: string; saveAlias: boolean }> = {};
    unmappedJobNames.forEach(name => {
      initial[name] = { jobId: '', saveAlias: true };
    });
    return initial;
  });

  // Local copy of job configs that includes newly created jobs
  const [localJobConfigs, setLocalJobConfigs] = useState<JobConfig[]>(jobConfigs);

  // Sync with parent jobConfigs when they change
  useEffect(() => {
    setLocalJobConfigs(jobConfigs);
  }, [jobConfigs]);

  // Track which roster name is currently adding a new job
  const [creatingJobFor, setCreatingJobFor] = useState<string | null>(null);

  const handleJobSelect = (rosterName: string, jobId: string) => {
    setMappings(prev => ({
      ...prev,
      [rosterName]: { ...prev[rosterName], jobId }
    }));
    // Close any open job creator
    setCreatingJobFor(null);
  };

  const handleJobCreated = async (rosterName: string, newJob: JobConfig) => {
    // Add to local state immediately so it appears in the UI
    setLocalJobConfigs(prev => [...prev, newJob]);
    // Also persist to the store
    await onAddJob(newJob);
    // Auto-select the newly created job
    handleJobSelect(rosterName, newJob.id);
  };

  const handleSaveAliasToggle = (rosterName: string) => {
    setMappings(prev => ({
      ...prev,
      [rosterName]: { ...prev[rosterName], saveAlias: !prev[rosterName].saveAlias }
    }));
  };

  const allMapped = unmappedJobNames.every(name => mappings[name]?.jobId);

  const handleContinue = () => {
    const result: JobMapping[] = unmappedJobNames.map(name => ({
      rosterJobName: name,
      mappedJobId: mappings[name].jobId,
      saveAsAlias: mappings[name].saveAlias
    }));
    onComplete(result);
  };

  if (unmappedJobNames.length === 0) {
    // No mapping needed, auto-advance
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-bold text-slate-700">Map Job Names</h3>
        <p className="text-sm text-slate-500 mt-1">
          Match the roster names to your registered jobs
        </p>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-600">
        <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">New job names detected</p>
          <p className="text-xs text-blue-500 mt-0.5">
            {localJobConfigs.length > 0
              ? 'Select an existing job or create a new one.'
              : 'Create a new job to map this roster name.'}
          </p>
        </div>
      </div>

      {/* Mapping list */}
      <div className="space-y-4 max-h-[300px] overflow-y-auto">
        {unmappedJobNames.map(rosterName => (
          <div
            key={rosterName}
            className="neu-flat p-4 space-y-3"
          >
            {/* Roster name */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase">From roster:</span>
              <span className="text-sm font-semibold text-slate-700">
                "{rosterName}"
              </span>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowRight className="w-4 h-4 text-slate-300" />
            </div>

            {/* Job selector */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">
                Map to job:
              </label>

              {/* Existing jobs + New job button */}
              <div className="flex flex-wrap gap-2">
                {localJobConfigs.map(job => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => handleJobSelect(rosterName, job.id)}
                    className={clsx(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                      mappings[rosterName]?.jobId === job.id
                        ? "neu-pressed text-indigo-600"
                        : "neu-flat hover:scale-[1.02] text-slate-600"
                    )}
                  >
                    <div className={clsx("w-2.5 h-2.5 rounded-full", dotColorMap[job.color] || 'bg-slate-400')} />
                    {job.name}
                  </button>
                ))}

                {/* Add new job button */}
                {creatingJobFor !== rosterName && (
                  <button
                    type="button"
                    onClick={() => setCreatingJobFor(rosterName)}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 neu-flat hover:scale-[1.02] text-emerald-600 border-dashed border-2 border-emerald-200"
                  >
                    <Plus className="w-4 h-4" />
                    New Job
                  </button>
                )}
              </div>

              {/* Inline job creator */}
              {creatingJobFor === rosterName && (
                <div className="mt-3">
                  <InlineJobCreator
                    suggestedName={rosterName}
                    onJobCreated={(job) => handleJobCreated(rosterName, job)}
                    onCancel={() => setCreatingJobFor(null)}
                  />
                </div>
              )}
            </div>

            {/* Save alias checkbox */}
            {mappings[rosterName]?.jobId && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mappings[rosterName].saveAlias}
                  onChange={() => handleSaveAliasToggle(rosterName)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Save className="w-3 h-3" />
                  Remember this mapping
                </span>
              </label>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!allMapped}
          className={clsx(
            "neu-btn !bg-indigo-500 !text-white text-sm",
            !allMapped && "opacity-50 cursor-not-allowed"
          )}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
