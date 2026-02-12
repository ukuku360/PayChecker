import { X, User, GraduationCap, Plus, Trash2, Calendar, Plane, Home, Check } from 'lucide-react';
import { useScheduleStore } from '../../store/useScheduleStore';
import { useState } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { AustraliaVisaType } from '../../types';

// Visa type options for Australia
const VISA_OPTIONS: Array<{
  value: AustraliaVisaType;
  labelKey: string;
  descriptionKey: string;
  icon: typeof Home;
}> = [
  {
    value: 'domestic',
    labelKey: 'profile.visaType.domestic',
    descriptionKey: 'profile.visaType.domesticDesc',
    icon: Home,
  },
  {
    value: 'working_holiday',
    labelKey: 'profile.visaType.workingHoliday',
    descriptionKey: 'profile.visaType.workingHolidayDesc',
    icon: Plane,
  },
  {
    value: 'student_visa',
    labelKey: 'profile.visaType.studentVisa',
    descriptionKey: 'profile.visaType.studentVisaDesc',
    icon: GraduationCap,
  },
];

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string | undefined;
}

export const ProfileModal = ({ isOpen, onClose, email }: ProfileModalProps) => {
  const { t } = useTranslation();
  const { visaType, vacationPeriods, updateProfile } = useScheduleStore();
  const [newPeriod, setNewPeriod] = useState({ start: '', end: '' });
  const [dateError, setDateError] = useState<string | null>(null);

  // Local state for editing
  const [tempVisaType, setTempVisaType] = useState<AustraliaVisaType>(visaType);

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
      await updateProfile(tempVisaType, updatedPeriods);
      setNewPeriod({ start: '', end: '' });
      setDateError(null);
    }
  };

  // 휴가 기간 삭제 시 즉시 Supabase에 저장
  const handleRemovePeriod = async (index: number) => {
    const updated = [...(vacationPeriods || [])];
    updated.splice(index, 1);
    await updateProfile(tempVisaType, updated);
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

    await updateProfile(tempVisaType, periodsToSave);
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

           {/* Visa Type Selection */}
           <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">{t('profile.visaType.title')}</label>
              <div className="space-y-2">
                {VISA_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = tempVisaType === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setTempVisaType(option.value)}
                      className={`w-full px-4 py-3 rounded-lg border flex items-center gap-3 transition-all text-left ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className={`p-1.5 rounded-md ${isSelected ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-medium">{t(option.labelKey)}</span>
                        <span className="text-xs text-slate-500">{t(option.descriptionKey)}</span>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
           </div>

           {tempVisaType === 'student_visa' && (
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
