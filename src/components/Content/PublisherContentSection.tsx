import { Calculator, CalendarClock, ShieldCheck, Users } from 'lucide-react';

interface PublisherContentSectionProps {
  compact?: boolean;
}

export function PublisherContentSection({ compact = false }: PublisherContentSectionProps) {
  const containerClass = compact
    ? 'bg-white/70 border border-slate-200/70 rounded-2xl p-5 space-y-4'
    : 'bg-white/80 border border-slate-200/70 rounded-2xl p-6 md:p-8 space-y-6';

  return (
    <section className={containerClass} aria-labelledby="publisher-content-title">
      <div>
        <h2 id="publisher-content-title" className="text-lg md:text-xl font-bold text-slate-800">
          How PayChecker helps shift workers in Australia
        </h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          PayChecker is a roster and pay-check tool built for people with variable shifts. It helps workers estimate
          expected pay, track hours, and prepare cleaner records before tax season.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <div className="flex items-center gap-2 text-slate-800">
            <Calculator className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold">Pay estimation logic</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Weekly and monthly totals are estimated from your shift hours and job-specific weekday, weekend, and
            holiday rates. The goal is to help you compare expected pay with your payslip and catch mismatches early.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <div className="flex items-center gap-2 text-slate-800">
            <CalendarClock className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold">Roster to calendar workflow</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            You can add shifts manually or import from a roster image/PDF. Imported shifts are reviewed before saving
            so you can correct job mapping, times, and hours instead of blindly accepting OCR output.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <div className="flex items-center gap-2 text-slate-800">
            <Users className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold">Built for multi-job workers</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Many users split time across hospitality, retail, and casual gigs. PayChecker stores separate rate rules
            per job and combines totals into one dashboard, including fiscal-year summaries.
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <div className="flex items-center gap-2 text-slate-800">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold">Scope and policy notes</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            PayChecker provides estimation and record-keeping support, not tax or legal advice. Always verify final
            tax outcomes with official government guidance or a qualified tax professional.
          </p>
        </article>
      </div>

      {!compact && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-700">Who this is useful for</h3>
          <ul className="mt-2 text-sm text-slate-600 space-y-1 list-disc list-inside">
            <li>Casual workers with different rates by day type</li>
            <li>Working holiday and student visa holders managing variable hours</li>
            <li>People preparing shift and expense records for tax time</li>
          </ul>
        </div>
      )}
    </section>
  );
}
