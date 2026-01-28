import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DndContext, DragOverlay, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { CalendarGrid } from './components/Calendar/CalendarGrid';
import { Dashboard } from './components/Dashboard/Dashboard';
import { AddJobModal } from './components/Dashboard/AddJobModal';
import { HourlyRateModal } from './components/JobBar/HourlyRateModal';
import { ExportModal } from './components/Export/ExportModal';
import { ProfileModal } from './components/Profile/ProfileModal';
import { CountrySelectionModal } from './components/CountrySelectionModal';
import { useScheduleStore } from './store/useScheduleStore';
import type { JobConfig, JobType } from './types';
import { v4 as uuidv4 } from 'uuid';
import { clsx } from 'clsx';
import { isSaturday, isSunday } from 'date-fns';
import { dotColorMap } from './utils/colorUtils';
import { supabase } from './lib/supabaseClient';
import { Auth } from './components/Auth/Auth';
import { GoogleAd } from './components/GoogleAd';
import { FeedbackModal } from './components/Feedback/FeedbackModal';
import { AdminFeedbackList } from './components/Feedback/AdminFeedbackList';
import { RosterScannerModal } from './components/RosterScanner/RosterScannerModal';
import { FeatureHelpTrigger } from './components/FeatureHelp/FeatureHelpTrigger';
import { ReadmeModal } from './components/Help/ReadmeModal';
import { useFeatureHelpStore } from './store/useFeatureHelpStore';
import { MessageSquare, BookOpen } from 'lucide-react';
import './i18n';

function App() {
  const { t } = useTranslation();
  const { addShift, jobConfigs, updateJobConfig, addJobConfig, removeJobConfig, fetchData, clearData, shifts, country, isLoaded } = useScheduleStore();
  const [activeType, setActiveType] = useState<JobType | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobConfig | null>(null);
  const [showAddJobModal, setShowAddJobModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showReadmeModal, setShowReadmeModal] = useState(false);
  const [showAdminFeedback, setShowAdminFeedback] = useState(false);
  const [showRosterScanner, setShowRosterScanner] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'monthly' | 'fiscal' | 'budget'>('monthly');
  const [session, setSession] = useState<any>(null); // Use any for simplicity or import Session type
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const { data: { user }, error: userError } = await supabase.auth.getUser(session.access_token);
          if (userError || !user) {
            const shouldClearSession =
              userError?.status === 401 ||
              userError?.status === 403 ||
              /jwt|invalid|expired/i.test(userError?.message ?? '');

            if (shouldClearSession) {
              console.warn('Invalid session detected, clearing local auth:', userError);
              await supabase.auth.signOut({ scope: 'local' });
              setSession(null);
              clearData();
              setLoading(false);
              return;
            }

            console.warn('Session validation failed, keeping local session:', userError);
          }
        }

        setSession(session);
        if (session?.user) {
          fetchData(session.user.id).catch(err => console.error('Background fetch failed:', err));
        }
      } catch (error) {
        console.error('Error initializing session:', error);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      
      if (session?.user) {
        // Don't show full screen loading on auth change, just fetch data
        // Maybe show a small indicator in the dashboard if needed, but for now just load
        fetchData(session.user.id).catch(err => console.error('Background fetch failed:', err));
        setLoading(false); 
      } else {
        clearData();
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchData]);

  const { isHelpMode, setHelpMode } = useFeatureHelpStore();
  const { hasSeenHelp, markHelpSeen } = useScheduleStore();

  // Onboarding Logic
  useEffect(() => {
    if (session?.user && !loading) {
       // Allow a small delay to ensure store hydration if needed, 
       // but typically if we are here, we can check.
       // However, default is false. If we haven't fetched profile yet, it is false.
       // So we might open it prematurely if the user HAS seen it but we haven't fetched that fact yet.
       // BUT, fetchData is called in the previous useEffect.
       // We can check if `jobConfigs` or `shifts` (or just check if we have data) to guess if loaded.
       // Or just rely on the fact that if it opens, no big deal, they close it and we save true.
       // To be safer, we could add a `isDataLoaded` flag to store, but that's extra resizing.
       // Let's just try checking hasSeenHelp. If false, we open.
       if (hasSeenHelp === false) { 
          // Check if we really want to force it every time or just once per session?
          // Requirement: "user first logs in".
          // If hasSeenHelp is false, we show it.
          // We should avoid re-opening if the user manually closed it in this session.
          // But hasSeenHelp is persisted.
          // So:
          setHelpMode(true);
       }
    }
  }, [session, loading]); // Run once when session loads

  // Mark as seen when closing
  useEffect(() => {
    if (!isHelpMode && hasSeenHelp === false && session?.user) {
        // If help mode was active and now inactive, and we haven't marked seen yet:
        markHelpSeen();
    }
  }, [isHelpMode, hasSeenHelp, session]);


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
    clearData();
    setSession(null); // Force immediate UI update
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
        <header className="mb-8 max-w-7xl mx-auto flex justify-between items-center bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 px-6 py-4">
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
              {t('auth.signOut')}
            </button>
            <FeatureHelpTrigger />
            <button 
               onClick={() => setShowReadmeModal(true)}
               className="text-slate-500 hover:text-indigo-500 transition-colors p-2 flex items-center gap-1.5"
               title="User Guide"
            >
               <BookOpen className="w-5 h-5" />
               <span className="text-sm font-medium">README</span>
            </button>
            <button 
               onClick={() => setShowFeedbackModal(true)}
               className="text-slate-500 hover:text-indigo-500 transition-colors p-2 flex items-center gap-1.5"
               title="Feedback"
            >
               <MessageSquare className="w-5 h-5" />
               <span className="text-sm font-medium">Feedback</span>
            </button>
            <button 
               onClick={() => setShowProfileModal(true)}
               className="neu-btn text-sm"
            >
               Profile
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Content Area */}
            <div className="flex-1 min-w-0 space-y-8">
              <Dashboard
                currentMonth={currentDate}
                onJobDoubleClick={setSelectedJob}
                onAddJob={() => setShowAddJobModal(true)}
                onExport={() => setShowExportModal(true)}
                onAIScan={() => setShowRosterScanner(true)}
                onViewModeChange={setViewMode}
              />
              {viewMode === 'monthly' && (
                <CalendarGrid 
                  currentDate={currentDate}
                  onMonthChange={setCurrentDate}
                  onAddJob={() => setShowAddJobModal(true)}
                />
              )}
              {/* Horizontal Ad at bottom of content */}
              <GoogleAd slot="8564028791" className="mt-8" /> 
            </div>

            {/* Vertical Ad Sidebar (Desktop only) */}
            <div className="hidden lg:block w-[160px] xl:w-[300px] shrink-0">
               <div>
                  <div className="text-xs font-bold text-slate-300 uppercase text-center mb-2">Ad</div>
                  <GoogleAd slot="6494384759" style={{ minHeight: '600px' }} />
               </div>
            </div>
          </div>
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
            shiftCount={shifts.filter(s => s.type === selectedJob.id).length}
          />
        )}

        {/* Add Job Modal */}
        <AddJobModal
          isOpen={showAddJobModal}
          onClose={() => setShowAddJobModal(false)}
          onAdd={handleAddJob}
          existingJobIds={jobConfigs.map(j => j.id)}
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

        {/* Feedback Modals */}
        <FeedbackModal 
          isOpen={showFeedbackModal} 
          onClose={() => setShowFeedbackModal(false)}
          userEmail={session?.user?.email}
        />
        
        <AdminFeedbackList
          isOpen={showAdminFeedback}
          onClose={() => setShowAdminFeedback(false)}
        />

        <RosterScannerModal
          isOpen={showRosterScanner}
          onClose={() => setShowRosterScanner(false)}
        />

        <ReadmeModal
          isOpen={showReadmeModal}
          onClose={() => setShowReadmeModal(false)}
        />

        {/* Country Selection Modal for existing users */}
        <CountrySelectionModal isOpen={session && !loading && isLoaded && country === null} />

        {/* Secret Admin Trigger (Double click version number or similar, for now just a small hidden footer element or condition) */}
        {/* Alternatively, add it to the profile modal or just check email here */}
        {/* For simplicity, let's put a subtle trigger in the footer or near the ad */}
        {session?.user?.email === 'nayoonho2001@gmail.com' && (
          <div className="text-center mt-20 pb-4 opacity-5 hover:opacity-100 transition-opacity">
            <button onClick={() => setShowAdminFeedback(true)} className="text-[10px] text-slate-400">
               Admin Access
            </button>
          </div>
        )}
      </div>
    </DndContext>
  )
}

export default App
