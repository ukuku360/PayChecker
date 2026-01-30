import { useState, useMemo, useEffect } from 'react';
import { Check, AlertTriangle, ChevronDown, ChevronUp, RefreshCcw, Plus, User, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { format, parseISO, isValid } from 'date-fns';
import type { ParsedShift, JobConfig, Shift, IdentifiedPerson } from '../../types';
import { dotColorMap } from '../../utils/colorUtils';
import { calculateTotalHours, isOvernightShift } from '../../utils/timeUtils';
import { InlineJobCreator } from './InlineJobCreator';

interface ConfirmationStepProps {
  shifts: ParsedShift[];
  jobConfigs: JobConfig[];
  existingShifts: Shift[];
  onShiftsChange: (shifts: ParsedShift[]) => void;
  onConfirm: () => void;
  onBack: () => void;
  isLoading: boolean;
  onAddJob?: (job: JobConfig) => Promise<void>;
  identifiedPerson?: IdentifiedPerson | null;
}

export function ConfirmationStep({
  shifts,
  jobConfigs,
  existingShifts,
  onShiftsChange,
  onConfirm,
  onBack,
  isLoading,
  onAddJob,
  identifiedPerson
}: ConfirmationStepProps) {
  const [expandedShift, setExpandedShift] = useState<string | null>(null);
  const [creatingJobForShift, setCreatingJobForShift] = useState<string | null>(null);

  // Local copy of job configs that includes newly created jobs
  const [localJobConfigs, setLocalJobConfigs] = useState<JobConfig[]>(jobConfigs);

  // Sync with parent jobConfigs when they change
  useEffect(() => {
    setLocalJobConfigs(jobConfigs);
  }, [jobConfigs]);

  const formatShiftDate = (date: string) => {
    const parsed = parseISO(date);
    return isValid(parsed) ? format(parsed, 'EEE, MMM d') : date;
  };

  // Detect conflicts with existing shifts
  const shiftsWithConflicts = useMemo(() => {
    return shifts.map(shift => {
      const conflict = existingShifts.find(
        existing => existing.date === shift.date && existing.type === shift.mappedJobId
      );
      return {
        ...shift,
        hasConflict: !!conflict,
        conflictShiftId: conflict?.id
      };
    });
  }, [shifts, existingShifts]);

  const selectableShifts = shiftsWithConflicts.filter(s => s.mappedJobId);
  const selectedCount = selectableShifts.filter(s => s.selected).length;
  const selectableCount = selectableShifts.length;
  const totalCount = shiftsWithConflicts.length;
  const conflictCount = selectableShifts.filter(s => s.hasConflict && s.selected).length;
  const lowConfidenceCount = selectableShifts.filter(s => s.confidence < 0.8 && s.selected).length;
  const missingTimeCount = selectableShifts.filter(s => s.selected && (!s.startTime || !s.endTime)).length;

  const handleToggleSelect = (shiftId: string) => {
    const updated = shifts.map(s =>
      s.id === shiftId ? { ...s, selected: !s.selected } : s
    );
    onShiftsChange(updated);
  };

  const handleSelectAll = () => {
    const selectable = shifts.filter(s => s.mappedJobId);
    if (selectable.length === 0) return;
    const allSelected = selectable.every(s => s.selected);
    const updated = shifts.map(s => (
      s.mappedJobId ? { ...s, selected: !allSelected } : s
    ));
    onShiftsChange(updated);
  };

  const handleFieldChange = (shiftId: string, field: string, value: string) => {
    const updated = shifts.map(s => {
      if (s.id !== shiftId) return s;

      if (field === 'jobId') {
        return { ...s, mappedJobId: value };
      }
      if (field === 'date') {
        return { ...s, date: value };
      }
      if (field === 'startTime' || field === 'endTime') {
        // Handle empty string as null, otherwise use the value
        const timeValue = value || null;
        const nextStart = field === 'startTime' ? timeValue : s.startTime;
        const nextEnd = field === 'endTime' ? timeValue : s.endTime;
        // Only calculate if both times are present
        const recalculated = (nextStart && nextEnd) ? calculateTotalHours(nextStart, nextEnd) : null;
        return {
          ...s,
          ...(field === 'startTime' ? { startTime: timeValue } : { endTime: timeValue }),
          totalHours: recalculated
        };
      }
      return s;
    });
    onShiftsChange(updated);
  };

  const getJobName = (jobId?: string) => {
    if (!jobId) return 'Unmapped';
    const job = localJobConfigs.find(j => j.id === jobId);
    return job?.name || jobId;
  };

  const getJobColor = (jobId?: string) => {
    if (!jobId) return 'slate';
    const job = localJobConfigs.find(j => j.id === jobId);
    return job?.color || 'slate';
  };

  const handleJobCreated = async (shiftId: string, newJob: JobConfig) => {
    // Add to local state immediately so it appears in the UI
    setLocalJobConfigs(prev => [...prev, newJob]);
    // Persist to the store
    if (onAddJob) {
      await onAddJob(newJob);
    }
    // Auto-select the newly created job for this shift
    handleFieldChange(shiftId, 'jobId', newJob.id);
    // Close the creator
    setCreatingJobForShift(null);
  };

  const formatTimeRange = (start: string | null, end: string | null) => {
    // Fixed: More user-friendly messages instead of "?"
    if (!start && !end) return 'Time not found';
    if (!start) return `Ends: ${end} (start missing)`;
    if (!end) return `Starts: ${start} (end missing)`;
    // Check for overnight shift and add indicator
    const overnight = isOvernightShift(start, end);
    return overnight ? `${start} - ${end} (+1 day)` : `${start} - ${end}`;
  };

  const hasMissingTime = (shift: ParsedShift) => !shift.startTime || !shift.endTime;

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Header summary */}
      <div className="p-4 border-b border-white/30 bg-white/10">
        {/* Identified person banner */}
        {identifiedPerson && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-100">
            <User className="w-4 h-4 text-indigo-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-indigo-700">
                Found: "{identifiedPerson.nameFound}"
              </span>
              <span className="text-xs text-indigo-500 ml-2">
                ({identifiedPerson.location}, {Math.round(identifiedPerson.confidence * 100)}% match)
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-bold text-slate-700">
              {selectedCount} of {selectableCount || totalCount} shifts selected
            </span>
            {conflictCount > 0 && (
              <span className="ml-2 text-xs text-amber-600">
                ({conflictCount} conflicts)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs font-medium text-indigo-500 hover:text-indigo-600"
          >
            {selectableCount > 0 && selectableShifts.every(s => s.selected) ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        {/* Warnings */}
        {(conflictCount > 0 || lowConfidenceCount > 0 || missingTimeCount > 0) && (
          <div className="flex flex-wrap gap-4 mt-2 text-xs">
            {missingTimeCount > 0 && (
              <span className="text-blue-600 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {missingTimeCount} need time input
              </span>
            )}
            {conflictCount > 0 && (
              <span className="text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {conflictCount} will replace existing shifts
              </span>
            )}
            {lowConfidenceCount > 0 && (
              <span className="text-orange-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {lowConfidenceCount} low confidence
              </span>
            )}
          </div>
        )}
      </div>

      {/* Shift list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {shiftsWithConflicts.map(shift => {
          const isExpanded = expandedShift === shift.id;
          const isLowConfidence = shift.confidence < 0.8;

          return (
            <div
              key={shift.id}
              className={clsx(
                "neu-flat overflow-hidden transition-all",
                shift.hasConflict && shift.selected && "ring-2 ring-amber-300",
                isLowConfidence && shift.selected && !shift.hasConflict && "ring-2 ring-orange-200"
              )}
            >
              {/* Main row */}
              <div
                className="px-4 py-3 flex items-center gap-3 cursor-pointer"
                onClick={() => setExpandedShift(isExpanded ? null : shift.id)}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSelect(shift.id);
                  }}
                  className={clsx(
                    "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                    shift.selected
                      ? "bg-indigo-500 border-indigo-500"
                      : "border-slate-300 hover:border-slate-400"
                  )}
                >
                  {shift.selected && <Check className="w-3 h-3 text-white" />}
                </button>

                {/* Job color dot */}
                <div className={clsx(
                  "w-3 h-3 rounded-full shrink-0",
                  dotColorMap[getJobColor(shift.mappedJobId)] || 'bg-slate-400'
                )} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-700">
                      {formatShiftDate(shift.date)}
                    </span>
                    <span className={clsx(
                      "text-xs",
                      hasMissingTime(shift) ? "text-blue-500 font-medium" : "text-slate-400"
                    )}>
                      {formatTimeRange(shift.startTime, shift.endTime)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {getJobName(shift.mappedJobId)} {shift.totalHours !== null ? `- ${shift.totalHours}h` : ''}
                  </div>
                </div>

                {/* Status badges */}
                <div className="flex items-center gap-2">
                  {hasMissingTime(shift) && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-bold rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Time
                    </span>
                  )}
                  {shift.hasConflict && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase">
                      Replace
                    </span>
                  )}
                  {isLowConfidence && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded">
                      {Math.round(shift.confidence * 100)}%
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Expanded edit section */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-3">
                  {/* Original roster name */}
                  <div className="text-xs text-slate-400">
                    Original: "{shift.rosterJobName}"
                  </div>

                  {/* Edit fields */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Date */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Date</label>
                      <input
                        type="date"
                        value={shift.date}
                        onChange={(e) => handleFieldChange(shift.id, 'date', e.target.value)}
                        className="w-full mt-1 px-2 py-1.5 text-sm rounded-lg neu-pressed border-none"
                      />
                    </div>

                    {/* Job */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Job</label>
                      <div className="flex gap-2 mt-1">
                        <select
                          value={shift.mappedJobId || ''}
                          onChange={(e) => handleFieldChange(shift.id, 'jobId', e.target.value)}
                          className="flex-1 px-2 py-1.5 text-sm rounded-lg neu-pressed border-none"
                        >
                          <option value="">-- Select Job --</option>
                          {localJobConfigs.map(job => (
                            <option key={job.id} value={job.id}>{job.name}</option>
                          ))}
                        </select>
                        {onAddJob && (
                          <button
                            type="button"
                            onClick={() => setCreatingJobForShift(shift.id)}
                            className="px-2 py-1.5 rounded-lg neu-flat hover:scale-105 transition-all"
                            title="Create new job"
                          >
                            <Plus className="w-4 h-4 text-emerald-500" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Start time */}
                    <div>
                      <label className={clsx(
                        "text-[10px] font-bold uppercase",
                        !shift.startTime ? "text-blue-500" : "text-slate-400"
                      )}>
                        Start {!shift.startTime && "*"}
                      </label>
                      <input
                        type="time"
                        value={shift.startTime || ''}
                        onChange={(e) => handleFieldChange(shift.id, 'startTime', e.target.value)}
                        className={clsx(
                          "w-full mt-1 px-2 py-1.5 text-sm rounded-lg neu-pressed border-none",
                          !shift.startTime && "ring-2 ring-blue-300 bg-blue-50"
                        )}
                        placeholder="Enter time"
                      />
                    </div>

                    {/* End time */}
                    <div>
                      <label className={clsx(
                        "text-[10px] font-bold uppercase",
                        !shift.endTime ? "text-blue-500" : "text-slate-400"
                      )}>
                        End {!shift.endTime && "*"}
                      </label>
                      <input
                        type="time"
                        value={shift.endTime || ''}
                        onChange={(e) => handleFieldChange(shift.id, 'endTime', e.target.value)}
                        className={clsx(
                          "w-full mt-1 px-2 py-1.5 text-sm rounded-lg neu-pressed border-none",
                          !shift.endTime && "ring-2 ring-blue-300 bg-blue-50"
                        )}
                        placeholder="Enter time"
                      />
                    </div>
                  </div>

                  {/* Inline job creator */}
                  {creatingJobForShift === shift.id && onAddJob && (
                    <InlineJobCreator
                      suggestedName={shift.rosterJobName}
                      onJobCreated={(job) => handleJobCreated(shift.id, job)}
                      onCancel={() => setCreatingJobForShift(null)}
                    />
                  )}

                  {/* Conflict info */}
                  {shift.hasConflict && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                      <RefreshCcw className="w-3 h-3" />
                      This will replace an existing shift on this date
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="p-4 border-t border-white/30 bg-white/10 flex justify-between items-center">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          Back
        </button>

        <button
          type="button"
          onClick={onConfirm}
          disabled={selectedCount === 0 || isLoading}
          className={clsx(
            "neu-btn !bg-emerald-500 !text-white text-sm font-semibold flex items-center gap-2",
            (selectedCount === 0 || isLoading) && "opacity-50 cursor-not-allowed"
          )}
        >
          <Check className="w-4 h-4" />
          {isLoading ? 'Adding...' : `Add ${selectedCount} Shifts`}
        </button>
      </div>
    </div>
  );
}
