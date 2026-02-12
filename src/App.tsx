import { useState, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { DndContext, DragOverlay, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { CalendarGrid } from './components/Calendar/CalendarGrid';
import { Dashboard } from './components/Dashboard/Dashboard';

// Lazy load modals to optimize bundle size
const AddJobModal = lazy(() => import('./components/Dashboard/AddJobModal').then(module => ({ default: module.AddJobModal })));
const HourlyRateModal = lazy(() => import('./components/JobBar/HourlyRateModal').then(module => ({ default: module.HourlyRateModal })));
const ExportModal = lazy(() => import('./components/Export/ExportModal').then(module => ({ default: module.ExportModal })));
const ProfileModal = lazy(() => import('./components/Profile/ProfileModal').then(module => ({ default: module.ProfileModal })));
const FeedbackModal = lazy(() => import('./components/Feedback/FeedbackModal').then(module => ({ default: module.FeedbackModal })));
const AdminFeedbackList = lazy(() => import('./components/Feedback/AdminFeedbackList').then(module => ({ default: module.AdminFeedbackList })));
const RosterScannerModal = lazy(() => import('./components/RosterScanner/RosterScannerModal').then(module => ({ default: module.RosterScannerModal })));
const ReadmeModal = lazy(() => import('./components/Help/ReadmeModal').then(module => ({ default: module.ReadmeModal })));

import { useScheduleStore } from './store/useScheduleStore';
import type { JobConfig, JobType } from './types';
import { v4 as uuidv4 } from 'uuid';
import { clsx } from 'clsx';
import { isSaturday, isSunday } from 'date-fns';
import { dotColorMap } from './utils/colorUtils';
import { AuthModal } from './components/Auth/AuthModal';
import { GoogleAd } from './components/GoogleAd';
import { ToastContainer } from './components/Toast/ToastContainer';
import { useModalState } from './hooks/useModalState';
import { useAuthSession } from './hooks/useAuthSession';
import { useRequireAuth } from './hooks/useRequireAuth';
import { useAuthModalStore } from './store/useAuthModalStore';
import { MessageSquare, BookOpen, LogOut, LogIn, User } from 'lucide-react';
import './i18n';


function App() {
  const { t } = useTranslation();
  const { 
    jobConfigs, 
    addJobConfig, 
    updateJobConfig, 
    removeJobConfig,
    shifts,
    addShift,
    isAdmin,
  } = useScheduleStore();
  
  const { session, loading, logout } = useAuthSession();
  const { requireAuth, isAuthenticated } = useRequireAuth();
  const { openAuthModal } = useAuthModalStore();

  const [activeType, setActiveType] = useState<JobType | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobConfig | null>(null);
  const modals = useModalState();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'monthly' | 'fiscal' | 'budget'>('monthly');




  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveType(event.active.data.current?.type);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveType(null);

    if (over && active.data.current?.type) {
      const dateStr = over.data.current?.date; // '2024-MM-DD'
      const type = active.data.current.type as JobType;

      if (dateStr) {
        // Gate drag & drop behind auth
        requireAuth(() => {
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
        }, t('auth.signInToAddShift'));
      }
    }
  };

  const handleAddJob = (newJob: JobConfig) => {
    addJobConfig(newJob);
    modals.close('addJob');
  };

  const getActiveJobColor = () => {
    const job = jobConfigs.find(j => j.id === activeType);
    return job?.color || 'slate';
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading...</div>;
  }

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen p-2 md:p-12 font-sans text-slate-700 pb-20 pb-safe overflow-x-hidden w-full">
        <main className="max-w-7xl mx-auto mt-6 md:mt-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Content Area */}
            <div className="flex-1 min-w-0 space-y-8">
              <header className="flex justify-between items-center bg-white/95 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/60 px-4 py-3 md:px-6 md:py-4 sticky top-0 md:static z-50">
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-slate-700 tracking-tight">
                    PayChecker
                  </h1>
                  <p className="text-slate-500 text-sm hidden md:block">Manage scheduling and track earnings.</p>
                </div>
                <div className="flex items-center gap-3 md:gap-4">
                  {isAuthenticated ? (
                    <button
                      onClick={logout}
                      className="p-3 min-w-[48px] min-h-[48px] text-slate-400 hover:text-red-500 transition-all rounded-xl hover:bg-red-50 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-red-200 focus-visible:outline-none"
                      title={t('auth.signOut')}
                      aria-label={t('auth.signOut')}
                    >
                      <span className="hidden md:inline text-sm font-medium">{t('auth.signOut')}</span>
                      <LogOut className="w-5 h-5 md:hidden" />
                    </button>
                  ) : (
                    <button
                      onClick={() => openAuthModal()}
                      className="neu-btn text-sm px-4 py-3 min-h-[48px] flex items-center justify-center gap-2 !bg-indigo-500 !text-white hover:!bg-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-200 focus-visible:outline-none"
                      title={t('auth.signIn')}
                      aria-label={t('auth.signIn')}
                    >
                      <span className="hidden md:inline">{t('auth.signIn')}</span>
                      <LogIn className="w-5 h-5 md:hidden" />
                    </button>
                  )}
                  <button
                     onClick={() => modals.open('readme')}
                     className="text-slate-400 hover:text-indigo-600 transition-all p-3 min-w-[48px] min-h-[48px] flex items-center justify-center gap-2 rounded-xl hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-200 focus-visible:outline-none"
                     title="User Guide"
                     aria-label="User Guide"
                  >
                     <BookOpen className="w-5 h-5" />
                     <span className="text-sm font-medium hidden md:inline">README</span>
                  </button>
                  <button
                     onClick={() => requireAuth(() => modals.open('feedback'), t('auth.signInToUseFeature'))}
                     className="text-slate-400 hover:text-indigo-600 transition-all p-3 min-w-[48px] min-h-[48px] flex items-center justify-center gap-2 rounded-xl hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-200 focus-visible:outline-none"
                     title="Feedback"
                     aria-label="Feedback"
                  >
                     <MessageSquare className="w-5 h-5" />
                     <span className="text-sm font-medium hidden md:inline">Feedback</span>
                  </button>
                  <button
                     onClick={() => requireAuth(() => modals.open('profile'), t('auth.signInToUseFeature'))}
                     className="neu-btn text-sm px-4 py-3 min-h-[48px] flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-indigo-200 focus-visible:outline-none"
                     title="Profile"
                     aria-label="Profile"
                  >
                     <span className="hidden md:inline">Profile</span>
                     <User className="w-5 h-5 md:hidden" />
                  </button>
                </div>
              </header>

              <Dashboard
                currentMonth={currentDate}
                onJobClick={setSelectedJob}
                onAddJob={() => requireAuth(() => modals.open('addJob'), t('auth.signInToAddJob'))}
                onExport={() => requireAuth(() => modals.open('export'), t('auth.signInToExport'))}
                onAIScan={() => requireAuth(() => modals.open('rosterScanner'), t('auth.signInToUseFeature'))}
                onViewModeChange={setViewMode}
              />
              {viewMode === 'monthly' && (
                <CalendarGrid
                  currentDate={currentDate}
                  onMonthChange={setCurrentDate}
                  onAddJob={() => requireAuth(() => modals.open('addJob'), t('auth.signInToAddJob'))}
                />
              )}
              {/* Horizontal Ad at bottom of content */}
              <GoogleAd slot="8564028791" className="mt-8" /> 
            </div>

            {/* Vertical Ad Sidebar (Desktop only) */}
            <div className="hidden lg:block w-[160px] xl:w-[300px] shrink-0">
               <div className="sticky top-8">
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
        <Suspense fallback={null}>
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
          {modals.isOpen('addJob') && (
            <AddJobModal
              isOpen={true}
              onClose={() => modals.close('addJob')}
              onAdd={handleAddJob}
              existingJobIds={jobConfigs.map(j => j.id)}
            />
          )}

          {/* Export Modal */}
          {modals.isOpen('export') && (
            <ExportModal
              currentMonth={currentDate}
              onClose={() => modals.close('export')}
            />
          )}

          {/* Profile Modal */}
          {modals.isOpen('profile') && (
            <ProfileModal
              isOpen={true}
              onClose={() => modals.close('profile')}
              email={session?.user?.email}
            />
          )}

          {/* Feedback Modals */}
           {modals.isOpen('feedback') && (
            <FeedbackModal
              isOpen={true}
              onClose={() => modals.close('feedback')}
              userEmail={session?.user?.email}
            />
          )}

          {isAdmin && modals.isOpen('adminFeedback') && (
            <AdminFeedbackList
              isOpen={true}
              onClose={() => modals.close('adminFeedback')}
            />
          )}

          {modals.isOpen('rosterScanner') && (
            <RosterScannerModal
              isOpen={true}
              onClose={() => modals.close('rosterScanner')}
            />
          )}

          {modals.isOpen('readme') && (
            <ReadmeModal
              isOpen={true}
              onClose={() => modals.close('readme')}
            />
          )}

        </Suspense>

        {/* Auth Modal for guest sign-in */}
        <AuthModal />

        {/* Toast Notifications */}
        <ToastContainer />

        {/* Secret Admin Trigger (Double click version number or similar, for now just a small hidden footer element or condition) */}
        {/* Alternatively, add it to the profile modal or just check email here */}
        {/* For simplicity, let's put a subtle trigger in the footer or near the ad */}
        {isAdmin ? (
          <div className="text-center mt-20 pb-4 opacity-5 hover:opacity-100 transition-opacity">
            <button onClick={() => modals.open('adminFeedback')} className="text-xs text-slate-400">
               Admin Access
            </button>
          </div>
        ) : null}
      </div>
    </DndContext>
  )
}

export default App
