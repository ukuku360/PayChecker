import { X, User, GraduationCap, Plus, Trash2, Calendar } from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useCountry } from '../../hooks/useCountry';
import { COUNTRIES } from '../../data/countries';
import type { CountryCode } from '../../data/countries';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string | undefined;
}

export const ProfileModal = ({ isOpen, onClose, email }: ProfileModalProps) => {
  const { t } = useTranslation();
  const { isAustralia } = useCountry();
  const { isStudentVisaHolder, vacationPeriods, updateProfile, country, setCountry } = useScheduleStore();
  const [newPeriod, setNewPeriod] = useState({ start: '', end: '' });
  const [dateError, setDateError] = useState<string | null>(null);

  // Local state for editing
  const [tempIsStudentVisaHolder, setTempIsStudentVisaHolder] = useState(isStudentVisaHolder);
  const [tempCountry, setTempCountry] = useState<CountryCode>(country || 'AU');

  // Sync student visa holder state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempIsStudentVisaHolder(isStudentVisaHolder);
      if (country) setTempCountry(country);
    }
  }, [isOpen, isStudentVisaHolder]);

  if (!isOpen) return null;

  const validateDateRange = (start: string, end: string): boolean => {
    if (!start || !end) return true;
    if (new Date(end) < new Date(start)) {
      setDateError(t('profile.endDateError'));
      return false;
    }
    setDateError(null);
    return true;
  };

  // 휴가 기간 추가 시 즉시 Supabase에 저장
  const handleAddPeriod = async () => {
    if (newPeriod.start && newPeriod.end) {
      if (!validateDateRange(newPeriod.start, newPeriod.end)) return;
      const updatedPeriods = [...(vacationPeriods || []), newPeriod];
      await updateProfile(tempIsStudentVisaHolder, updatedPeriods);
      setNewPeriod({ start: '', end: '' });
      setDateError(null);
    }
  };

  // 휴가 기간 삭제 시 즉시 Supabase에 저장
  const handleRemovePeriod = async (index: number) => {
    const updated = [...(vacationPeriods || [])];
    updated.splice(index, 1);
    await updateProfile(tempIsStudentVisaHolder, updated);
  };

  // Save Changes 시 입력칸의 날짜도 함께 저장
  const handleSave = async () => {
    let periodsToSave = [...(vacationPeriods || [])];

    // 입력칸에 날짜가 있으면 추가
    if (newPeriod.start && newPeriod.end) {
      if (!validateDateRange(newPeriod.start, newPeriod.end)) return;
      periodsToSave = [...periodsToSave, newPeriod];
      setNewPeriod({ start: '', end: '' });
    }

    await updateProfile(tempIsStudentVisaHolder, periodsToSave);
    
    if (country !== tempCountry) {
      await setCountry(tempCountry);
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
      <div className="glass-panel w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-white/30 flex items-center justify-between bg-white/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-400/10 rounded-lg"><User className="w-5 h-5 text-slate-600" /></div>
            <h2 className="text-lg font-bold text-slate-700">{t('profile.title')}</h2>
          </div>
          <button onClick={onClose} className="neu-icon-btn w-8 h-8 !rounded-lg !p-0" aria-label={t('common.close')}><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-5">
           <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">{t('profile.email')}</label>
              <div className="px-4 py-2 bg-white/40 border border-white/40 rounded-lg text-slate-700 font-medium">
                 {email || t('profile.noEmail')}
               </div>
            </div>

            {/* Region / Country Selection */}
            <div>
               <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">{t('common.region') || 'Region'}</label>
               <div className="grid grid-cols-2 gap-3">
                 {(Object.keys(COUNTRIES) as CountryCode[]).map((code) => {
                   const c = COUNTRIES[code];
                   const isSelected = tempCountry === code;
                   return (
                     <button
                       key={code}
                       onClick={() => setTempCountry(code)}
                       className={`px-3 py-2 rounded-lg border flex items-center gap-2 transition-all ${
                         isSelected 
                           ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium' 
                           : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                       }`}
                     >
                       <span className="text-lg">{c.flag}</span>
                       <span className="text-sm">{c.name}</span>
                     </button>
                   );
                 })}
               </div>
            </div>

           {isAustralia && (
           <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">{t('common.settings')}</label>
              <div className="px-4 py-3 neu-flat !shadow-sm border border-white/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="p-1.5 bg-blue-100 rounded-md">
                     <GraduationCap className="w-4 h-4 text-blue-600" />
                   </div>
                   <div className="flex flex-col">
                     <span className="text-sm font-medium text-slate-700">{t('profile.studentVisaHolder')}</span>
                     <span className="text-xs text-slate-500">{t('profile.enableWorkingHourRestrictions')}</span>
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
           )}

           {isAustralia && tempIsStudentVisaHolder && (
             <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">{t('profile.holidayPeriods')}</label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="date"
                      className="flex-1 px-3 py-2 bg-white/50 border border-slate-200 rounded-lg text-sm"
                      value={newPeriod.start}
                      onChange={(e) => {
                        setNewPeriod({...newPeriod, start: e.target.value});
                        if (newPeriod.end) validateDateRange(e.target.value, newPeriod.end);
                      }}
                    />
                    <input
                      type="date"
                      className={`flex-1 px-3 py-2 bg-white/50 border rounded-lg text-sm ${dateError ? 'border-rose-300' : 'border-slate-200'}`}
                      value={newPeriod.end}
                      onChange={(e) => {
                        setNewPeriod({...newPeriod, end: e.target.value});
                        if (newPeriod.start) validateDateRange(newPeriod.start, e.target.value);
                      }}
                    />
                    <button
                      onClick={handleAddPeriod}
                      disabled={!newPeriod.start || !newPeriod.end || !!dateError}
                      className="p-2 neu-btn !bg-indigo-500 !text-white rounded-lg disabled:opacity-50 hover:!bg-indigo-600"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {dateError && (
                    <p className="text-xs text-rose-500 font-medium">{dateError}</p>
                  )}
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {vacationPeriods?.map((period, index) => (
                      <div key={index} className="flex items-center justify-between px-3 py-2 bg-white/50 border border-slate-200 rounded-lg text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{format(new Date(period.start), 'dd/MM/yyyy')} - {format(new Date(period.end), 'dd/MM/yyyy')}</span>
                        </div>
                        <button
                          onClick={() => handleRemovePeriod(index)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-white rounded"
                          aria-label="Remove period"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {(!vacationPeriods || vacationPeriods.length === 0) && (
                      <p className="text-xs text-slate-400 italic text-center py-2">{t('profile.noHolidayPeriods')}</p>
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
                {t('common.cancel')}
              </button>
              <button 
                onClick={handleSave}
                className="neu-btn px-6 py-2 !bg-indigo-500 !text-white font-medium rounded-lg hover:!bg-indigo-600 shadow-md hover:shadow-lg transition-all"
              >
                {t('profile.saveChanges')}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
