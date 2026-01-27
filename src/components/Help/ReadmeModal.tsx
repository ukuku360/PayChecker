import { X, Calendar, PieChart, Wallet, CreditCard, Briefcase, Download } from 'lucide-react';

interface ReadmeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReadmeModal = ({ isOpen, onClose }: ReadmeModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <div className="bg-[#e0e5ec] rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-white/50 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200/50 flex justify-between items-center bg-slate-50/50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-700">How to use PayChecker</h2>
            <p className="text-xs text-slate-500">Your Personal Roster & Pay Manager</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <p className="text-sm text-slate-600">
            PayChecker makes it effortless to manage your work schedule, calculate accurate expected pay, and track your financial goals—all in one place.
          </p>

          <div className="space-y-4">
            <FeatureSection 
              icon={<Calendar className="w-5 h-5 text-indigo-500" />}
              title="Auto Roster Scanner (Upload & Go)"
            >
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-1">
                <li><strong>Snap & Upload:</strong> Just drag and drop your roster file (PDF or Image).</li>
                <li><strong>Automatic Schedule:</strong> The app reads your shifts—dates, times, and roles—and adds them to your calendar.</li>
                <li><strong>Smart Mapping:</strong> It remembers your job codes (e.g., "Shift A" &rarr; "Bartender").</li>
              </ul>
            </FeatureSection>

            <FeatureSection 
              icon={<PieChart className="w-5 h-5 text-emerald-500" />}
              title="Smart Dashboard & Savings Goals"
            >
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-1">
                <li><strong>Track Your Earnings:</strong> See estimated earnings for the week or month instantly.</li>
                <li><strong>Set Goals:</strong> Set a Savings Goal and watch your progress bar grow as you complete shifts.</li>
              </ul>
            </FeatureSection>

            <FeatureSection 
              icon={<Wallet className="w-5 h-5 text-amber-500" />}
              title="Fiscal Year Overview"
            >
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-1">
                <li><strong>Tax Made Easy:</strong> View income based on the financial year (e.g., July to June).</li>
                <li><strong>Year-to-Date Tracking:</strong> Monitor your total cumulative income to stay on top of tax brackets.</li>
              </ul>
            </FeatureSection>

            <FeatureSection 
              icon={<CreditCard className="w-5 h-5 text-pink-500" />}
              title="Expense Tracker"
            >
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-1">
                <li><strong>Log Deductions:</strong> Record work-related expenses like uniforms or courses.</li>
                <li><strong>Organized for Tax Time:</strong> Keep expenses categorized for easy tax filing.</li>
              </ul>
            </FeatureSection>

            <FeatureSection 
              icon={<Briefcase className="w-5 h-5 text-blue-500" />}
              title="Manage Multiple Jobs"
            >
              <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 ml-1">
                <li><strong>Multiple Rates:</strong> Add different employers with specific base rates.</li>
                <li><strong>Penalty Rates:</strong> Define custom rules for weekends, public holidays, or overtime.</li>
              </ul>
            </FeatureSection>
            
            <FeatureSection 
              icon={<Download className="w-5 h-5 text-slate-500" />}
              title="Get Started"
            >
               <ol className="list-decimal list-inside text-sm text-slate-600 space-y-1 ml-1">
                <li><strong>Add Your Jobs:</strong> Go to settings or use the "+" button to set up employers/rates.</li>
                <li><strong>Upload Roster:</strong> Use the <strong>Scanner</strong> tab (Sparkles icon) to upload your roster.</li>
                <li><strong>Check Dashboard:</strong> See your upcoming schedule and projected earnings!</li>
              </ol>
            </FeatureSection>
          </div>
          
          <div className="pt-6 text-center">
             <button 
               onClick={onClose}
               className="neu-btn px-8 py-2 text-indigo-500 font-bold"
             >
                Got it!
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
