import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { CalendarGrid } from './components/Calendar/CalendarGrid';
import { Dashboard } from './components/Dashboard/Dashboard';
import { AddJobModal } from './components/Dashboard/AddJobModal';
import { HourlyRateModal } from './components/JobBar/HourlyRateModal';
import { ExportModal } from './components/Export/ExportModal';
import { ProfileModal } from './components/Profile/ProfileModal';
import { useScheduleStore } from './store/useScheduleStore';
import type { JobConfig, JobType } from './types';
import { v4 as uuidv4 } from 'uuid';
import { clsx } from 'clsx';
import { isSaturday, isSunday } from 'date-fns';
import { dotColorMap } from './utils/colorUtils';
import { supabase } from './lib/supabaseClient';
import { Auth } from './components/Auth/Auth'; // Import Auth component
import { GoogleAd } from './components/GoogleAd';

function App() {
  const { addShift, jobConfigs, updateJobConfig, addJobConfig, removeJobConfig, fetchData } = useScheduleStore();
  const [activeType, setActiveType] = useState<JobType | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobConfig | null>(null);
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'monthly' | 'fiscal' | 'budget'>('monthly');
  const [session, setSession] = useState<any>(null); // Use any for simplicity or import Session type
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) {
        fetchData(); // Fetch data when session is restored
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
      if (session) {
        fetchData(); // Fetch data on login
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchData]);

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
        });
      }
    }
  };

  const handleAddJob = (newJob: JobConfig) => {
    addJobConfig(newJob);
    setShowAddJobModal(false);
  };

  const getActiveJobColor = () => {
    const job = jobConfigs.find(j => j.id === activeType);
    return job?.color || 'slate';
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading...</div>;
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen p-6 md:p-12 font-sans text-slate-700 pb-20">
        <header className="mb-8 max-w-7xl mx-auto flex justify-between items-center glass-panel px-6 py-4 sticky top-4 z-40">
          <div>
            <h1 className="text-2xl font-bold text-slate-700 tracking-tight">
              PayChecker
            </h1>
            <p className="text-slate-500 text-sm">Manage scheduling and track earnings.</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Sign Out
            </button>
            <button 
               onClick={() => setShowProfileModal(true)}
               className="neu-btn text-sm"
            >
               Profile
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto space-y-8">
          <Dashboard 
            currentMonth={currentDate}
            onJobDoubleClick={setSelectedJob}
            onAddJob={() => setShowAddJobModal(true)}
            onExport={() => setShowExportModal(true)}
            onViewModeChange={setViewMode}
          />
          {viewMode === 'monthly' && (
            <CalendarGrid 
              currentDate={currentDate}
              onMonthChange={setCurrentDate}
            />
          )}
          <GoogleAd className="mt-8" />
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
        <AddJobModal 
          isOpen={showAddJobModal} 
          onClose={() => setShowAddJobModal(false)} 
          onAdd={handleAddJob}
        />

        {/* Export Modal */}
        {showExportModal && (
          <ExportModal
            currentMonth={currentDate}
            onClose={() => setShowExportModal(false)}
          />
        )}

        {/* Profile Modal */}
        <ProfileModal 
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          email={session?.user?.email}
        />
      </div>
    </DndContext>
  )
}

export default App
