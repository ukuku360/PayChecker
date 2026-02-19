const FOOTER_LINKS = [
  { href: '/about.html', label: 'About' },
  { href: '/privacy-policy.html', label: 'Privacy Policy' },
  { href: '/terms-of-service.html', label: 'Terms of Service' },
  { href: '/contact.html', label: 'Contact' },
];

export function SiteFooterLinks() {
  return (
    <footer className="mt-10 border-t border-slate-200/70 pt-5 text-xs text-slate-500">
      <div className="flex flex-wrap items-center gap-3">
        {FOOTER_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-700 underline underline-offset-2"
          >
            {link.label}
          </a>
        ))}
      </div>
      <p className="mt-3 leading-relaxed">
        PayChecker provides informational estimates for planning. Final pay, deductions, and tax outcomes depend on
        your employer records and official rules.
      </p>
    </footer>
  );
}
