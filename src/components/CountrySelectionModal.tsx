import { useState } from 'react';
import { Globe } from 'lucide-react';
import { useScheduleStore } from '../store/useScheduleStore';
import type { CountryCode } from '../data/countries';
import { COUNTRIES } from '../data/countries';

interface CountrySelectionModalProps {
  isOpen: boolean;
}

export const CountrySelectionModal = ({ isOpen }: CountrySelectionModalProps) => {
  const { setCountry } = useScheduleStore();
  const [selectedCountry, setSelectedCountry] = useState<CountryCode | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selectedCountry) return;
    setIsLoading(true);
    await setCountry(selectedCountry);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50 transition-all duration-300">
      <div className="glass-panel w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        <div className="px-6 py-5 border-b border-white/30 bg-white/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Globe className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-700">Select Your Country</h2>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-sm text-slate-600 text-center">
            This will customize tax calculations and language settings.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {(Object.keys(COUNTRIES) as CountryCode[])
              .filter(code => code !== 'KR')
              .map((code) => {
              const country = COUNTRIES[code];
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelectedCountry(code)}
                  className={`flex flex-col items-center gap-2 p-6 rounded-2xl border-2 transition-all ${
                    selectedCountry === code
                      ? 'border-indigo-500 bg-indigo-50 shadow-lg scale-[1.02]'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <span className="text-4xl">{country.flag}</span>
                  <div className="text-center">
                    <span className={`font-bold text-lg ${selectedCountry === code ? 'text-indigo-700' : 'text-slate-700'}`}>
                      {country.nameNative}
                    </span>
                    <span className={`block text-xs ${selectedCountry === code ? 'text-indigo-500' : 'text-slate-400'}`}>
                      {country.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleConfirm}
            disabled={!selectedCountry || isLoading}
            className="w-full neu-btn !bg-indigo-500 !text-white font-medium py-3 rounded-xl hover:!bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};
