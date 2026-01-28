import { X, Calendar, PieChart, Wallet, CreditCard, Briefcase, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ReadmeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReadmeModal = ({ isOpen, onClose }: ReadmeModalProps) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-[#e0e5ec] rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-white/50 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200/50 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-700">{t('help.title')}</h2>
            <p className="text-xs text-slate-500">{t('help.subtitle')}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <p className="text-sm text-slate-600">
            {t('help.intro')}
          </p>

          <div className="space-y-4">
            <FeatureSection 
              icon={<Calendar className="w-5 h-5 text-indigo-500" />}
              title={t('help.autoRoster')}
            >
              <ul 
                className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-1"
                dangerouslySetInnerHTML={{ __html: t('help.autoRosterDesc') }}
              />
            </FeatureSection>

            <FeatureSection 
              icon={<PieChart className="w-5 h-5 text-emerald-500" />}
              title={t('help.dashboard')}
            >
              <ul 
                className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-1"
                dangerouslySetInnerHTML={{ __html: t('help.dashboardDesc') }}
              />
            </FeatureSection>

            <FeatureSection 
              icon={<Wallet className="w-5 h-5 text-amber-500" />}
              title={t('help.fiscal')}
            >
              <ul 
                className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-1"
                dangerouslySetInnerHTML={{ __html: t('help.fiscalDesc') }}
              />
            </FeatureSection>

            <FeatureSection 
              icon={<CreditCard className="w-5 h-5 text-pink-500" />}
              title={t('help.expense')}
            >
              <ul 
                className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-1"
                dangerouslySetInnerHTML={{ __html: t('help.expenseDesc') }}
              />
            </FeatureSection>

            <FeatureSection 
              icon={<Briefcase className="w-5 h-5 text-blue-500" />}
              title={t('help.multipleJobs')}
            >
              <ul 
                className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-1"
                dangerouslySetInnerHTML={{ __html: t('help.multipleJobsDesc') }}
              />
            </FeatureSection>
            
            <FeatureSection 
              icon={<Download className="w-5 h-5 text-slate-500" />}
              title={t('help.getStarted')}
            >
               <ol 
                 className="list-decimal list-inside text-sm text-slate-600 space-y-1 ml-1"
                 dangerouslySetInnerHTML={{ __html: t('help.getStartedDesc') }} 
               />
            </FeatureSection>
          </div>
          
          <div className="pt-6 text-center">
             <button 
               onClick={onClose}
               className="neu-btn px-8 py-2 text-indigo-500 font-bold"
             >
                {t('help.gotIt')}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureSection = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
  <div className="neu-flat p-4 rounded-xl">
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 rounded-lg bg-slate-100 shadow-sm">
        {icon}
      </div>
      <h3 className="font-bold text-slate-700">{title}</h3>
    </div>
    <div className="pl-2 border-l-2 border-slate-200 ml-4">
      {children}
    </div>
  </div>
);
