import { X, User, GraduationCap, Plus, Trash2, Calendar } from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string | undefined;
}

export const ProfileModal = ({ isOpen, onClose, email }: ProfileModalProps) => {
  const { isStudentVisaHolder, vacationPeriods, updateProfile } = useScheduleStore();
  const [newPeriod, setNewPeriod] = useState({ start: '', end: '' });
  
  // Local state for editing
  const [tempIsStudentVisaHolder, setTempIsStudentVisaHolder] = useState(isStudentVisaHolder);
  const [tempVacationPeriods, setTempVacationPeriods] = useState(vacationPeriods);

  // Sync with store when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempIsStudentVisaHolder(isStudentVisaHolder);
      setTempVacationPeriods(vacationPeriods || []);
    }
  }, [isOpen, isStudentVisaHolder, vacationPeriods]);

  if (!isOpen) return null;

  const handleAddPeriod = () => {
    if (newPeriod.start && newPeriod.end) {
      setTempVacationPeriods([...(tempVacationPeriods || []), newPeriod]);
      setNewPeriod({ start: '', end: '' });
    }
  };

  const handleRemovePeriod = (index: number) => {
    const updated = [...(tempVacationPeriods || [])];
    updated.splice(index, 1);
    setTempVacationPeriods(updated);
  };

  const handleSave = async () => {
    await updateProfile(tempIsStudentVisaHolder, tempVacationPeriods);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300" onClick={onClose}>
      <div className="glass-panel w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-white/30 flex items-center justify-between bg-white/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-400/10 rounded-lg"><User className="w-5 h-5 text-slate-600" /></div>
            <h2 className="text-lg font-bold text-slate-700">Profile</h2>
          </div>
          <button onClick={onClose} className="neu-icon-btn w-8 h-8 !rounded-lg !p-0"><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-5">
           <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Email</label>
              <div className="px-4 py-2 bg-white/40 border border-white/40 rounded-lg text-slate-700 font-medium">
                {email || 'No email available'}
              </div>
           </div>

           <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Settings</label>
              <div className="px-4 py-3 neu-flat !shadow-sm border border-white/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="p-1.5 bg-blue-100 rounded-md">
                     <GraduationCap className="w-4 h-4 text-blue-600" />
                   </div>
                   <div className="flex flex-col">
                     <span className="text-sm font-medium text-slate-700">Student Visa Holder</span>
                     <span className="text-xs text-slate-500">Enable working hour restrictions</span>
                   </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={tempIsStudentVisaHolder}
                    onChange={(e) => setTempIsStudentVisaHolder(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
           </div>

           {tempIsStudentVisaHolder && (
             <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Holiday Periods</label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input 
                      type="date" 
                      className="flex-1 px-3 py-2 bg-white/50 border border-slate-200 rounded-lg text-sm"
                      value={newPeriod.start}
                      onChange={(e) => setNewPeriod({...newPeriod, start: e.target.value})}
                    />
                    <input 
                      type="date" 
                      className="flex-1 px-3 py-2 bg-white/50 border border-slate-200 rounded-lg text-sm"
                      value={newPeriod.end}
                      onChange={(e) => setNewPeriod({...newPeriod, end: e.target.value})}
                    />
                    <button 
                      onClick={handleAddPeriod}
                      disabled={!newPeriod.start || !newPeriod.end}
                      className="p-2 neu-btn !bg-indigo-500 !text-white rounded-lg disabled:opacity-50 hover:!bg-indigo-600"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {tempVacationPeriods?.map((period, index) => (
                      <div key={index} className="flex items-center justify-between px-3 py-2 bg-white/50 border border-slate-200 rounded-lg text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{format(new Date(period.start), 'dd/MM/yyyy')} - {format(new Date(period.end), 'dd/MM/yyyy')}</span>
                        </div>
                        <button 
                          onClick={() => handleRemovePeriod(index)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-white rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {(!tempVacationPeriods || tempVacationPeriods.length === 0) && (
                      <p className="text-xs text-slate-400 italic text-center py-2">No holiday periods added</p>
                    )}
                  </div>
                </div>
             </div>
           )}

           
           <div className="pt-4 flex justify-end gap-3">
              <button 
                onClick={onClose}
                className="px-4 py-2 text-slate-500 font-medium hover:text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="neu-btn px-6 py-2 !bg-indigo-500 !text-white font-medium rounded-lg hover:!bg-indigo-600 shadow-md hover:shadow-lg transition-all"
              >
                Save Changes
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
