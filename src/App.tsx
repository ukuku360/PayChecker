import { useState } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { CalendarGrid } from './components/Calendar/CalendarGrid';
import { Dashboard } from './components/Dashboard/Dashboard';
import { HourlyRateModal } from './components/JobBar';
import { ExportModal } from './components/Export';
import { useScheduleStore } from './store/useScheduleStore';
import type { JobConfig, JobType } from './types';
import { v4 as uuidv4 } from 'uuid';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { isSaturday, isSunday } from 'date-fns';
import { dotColorMap, colorOptions } from './utils/colorUtils';
import { useTheme } from './hooks/useTheme';
import { Moon, Sun } from 'lucide-react';

function App() {
  const { addShift, jobConfigs, updateJobConfig, addJobConfig, removeJobConfig } = useScheduleStore();
  const { theme, toggleTheme } = useTheme();
  const [activeType, setActiveType] = useState<JobType | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobConfig | null>(null);
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [newJobName, setNewJobName] = useState('');
  const [newJobColor, setNewJobColor] = useState('purple');
  const [currentDate, setCurrentDate] = useState(new Date());

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor)
  );

  const handleDragStart = (event: any) => {
    setActiveType(event.active.data.current?.type);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveType(null);

    if (over && active.data.current?.type) {
      const dateStr = over.data.current?.date; // '2024-MM-DD'
      const type = active.data.current.type as JobType;

      if (dateStr) {
        const date = new Date(dateStr);
        const jobConfig = jobConfigs.find(j => j.id === type);
        let hours = 7.5; // default
        
        if (jobConfig) {
          const isWeekendVal = isSaturday(date) || isSunday(date);
          hours = isWeekendVal ? jobConfig.defaultHours.weekend : jobConfig.defaultHours.weekday;
        }

        addShift({
          id: uuidv4(),
          date: dateStr,
          type: type,
          hours: hours,
          overtimeHours: 0,
        });
      }
    }
  };

  const handleAddJob = () => {
    if (!newJobName.trim()) return;
    
    const newJob: JobConfig = {
      id: newJobName.toUpperCase().replace(/\s+/g, '_'),
      name: newJobName,
      color: newJobColor,
      defaultHours: {
        weekday: 7.5,
        weekend: 7.5,
      },
      hourlyRates: {
        weekday: 25,
        saturday: 30,
        sunday: 35,
        holiday: 40,
      },
    };
    
    addJobConfig(newJob);
    setNewJobName('');
    setNewJobColor('purple');
    setShowAddJobModal(false);
  };

  const getActiveJobColor = () => {
    const job = jobConfigs.find(j => j.id === activeType);
    return job?.color || 'slate';
  };

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 p-6 md:p-12 font-sans text-slate-900 dark:text-slate-100 pb-20 transition-colors duration-200">
        <header className="mb-8 max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              PayChecker
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Manage scheduling and track earnings with ease.</p>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all shadow-sm"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        <main className="max-w-7xl mx-auto space-y-8">
          <Dashboard 
            currentMonth={currentDate}
            onJobDoubleClick={setSelectedJob}
            onAddJob={() => setShowAddJobModal(true)}
            onExport={() => setShowExportModal(true)}
          />
          <CalendarGrid 
            currentDate={currentDate}
            onMonthChange={setCurrentDate}
          />
        </main>
        
        <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeType ? (
             <div className="px-4 py-2.5 rounded-xl font-semibold text-sm border shadow-2xl opacity-90 scale-105 cursor-grabbing bg-white border-slate-200/60 transform -rotate-2 flex items-center gap-2">
               <div className={clsx("w-2 h-2 rounded-full", dotColorMap[getActiveJobColor()] || 'bg-slate-500')} />
               {activeType} Shift
             </div>
          ) : null}
        </DragOverlay>

        {/* Hourly Rate Modal */}
        {selectedJob && (
          <HourlyRateModal
            job={selectedJob}
            onClose={() => setSelectedJob(null)}
            onSave={updateJobConfig}
            onDelete={removeJobConfig}
          />
        )}

        {/* Add Job Modal */}
        {showAddJobModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAddJobModal(false)}>
            <div 
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between transition-colors">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add New Job</h2>
                <button onClick={() => setShowAddJobModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  <X className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Job Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Tutoring"
                    value={newJobName}
                    onChange={(e) => setNewJobName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Color</label>
                  <div className="flex gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewJobColor(color)}
                        className={clsx(
                          "w-8 h-8 rounded-full transition-all",
                          dotColorMap[color],
                          newJobColor === color ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-500 scale-110' : 'opacity-60 hover:opacity-100'
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-700/30 transition-colors">
                <button onClick={() => setShowAddJobModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  Cancel
                </button>
                <button onClick={handleAddJob} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm">
                  Add Job
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <ExportModal
            currentMonth={currentDate}
            onClose={() => setShowExportModal(false)}
          />
        )}
      </div>
    </DndContext>
  )
}

export default App
