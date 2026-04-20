# PayChecker - Pre-Launch Compliance Update Plan

**Plan Date:** 2026-02-23  
**Based on:** LEGAL_COMPLIANCE_REPORT.md  
**Objective:** Systematically resolve all identified compliance issues before public launch  

---

## Phase Overview

| Phase | Timeline | Focus | Issue Count | Effort |
|-------|----------|-------|-------------|--------|
| Phase 0 | Immediate (Day 1) | Critical Code Bugs | 1 | 1 hour |
| Phase 1 | Week 1 | Legal Documents Overhaul | 12 | 3-5 days |
| Phase 2 | Week 2 | In-App Disclaimer & Consent UX | 8 | 3-4 days |
| Phase 3 | Week 3 | Security Hardening | 7 | 3-4 days |
| Phase 4 | Week 4 | Marketing Audit & Cleanup | 5 | 2-3 days |
| Phase 5 | Week 5-6 | Accessibility & i18n | 6 | 4-5 days |
| Phase 6 | Week 6-8 | External Legal Consultation | 3 | External |
| Phase 7 | Ongoing | Monitoring & Maintenance | Continuous | Weekly |

---

## Phase 0: Immediate Critical Fix (Day 1)

### P0-1. Fix Super Rate Inconsistency
**File:** `src/store/useScheduleStore.ts` line 293  
**Issue:** `SUPER_RATE = 0.115` (11.5%) conflicts with `AU_SUPER_RATE = 0.12` (12%) in `src/data/taxRates/australia.ts`  
**Action:**
```
1. Remove SUPER_RATE export from useScheduleStore.ts
2. Update ExportModal.tsx to import AU_SUPER_RATE from taxRates/australia.ts
3. Search entire codebase for any other references to 0.115
4. Add unit test: SUPER_RATE === AU_SUPER_RATE
```
**Owner:** Developer  
**Verification:** Run full test suite + manual check of Export modal

---

## Phase 1: Legal Documents Overhaul (Week 1)

### P1-1. Privacy Policy Complete Rewrite
**File:** `public/privacy-policy.html`  
**Priority:** CRITICAL  
**Tasks:**
```
1. Add operating entity name and ABN (if applicable)
2. Add comprehensive data inventory table:
   | Data Category | Data Fields | Purpose | Retention |
   |--------------|-------------|---------|-----------|
   | Account | Email, password hash, user ID | Auth | Account lifetime + 6mo |
   | Profile | Visa type, country, admin flag | Personalization | Account lifetime |
   | Employment | Job names, hourly rates, shift times | Core service | Account lifetime |
   | Financial | Income estimates, tax calcs, expenses | Core service | Account lifetime |
   | Roster Images | Uploaded PDFs/images | AI extraction | Deleted after processing |
   | Roster Results | Parsed shift data, OCR output | Service records | 12 months |
   | Feedback | Messages, email, replies | Support | 24 months |
   | Technical | IP (anonymized), browser, timestamps | Reliability | 90 days |

3. Add Third-Party Data Processor section:
   - Supabase Inc. (USA) - Database, authentication, edge functions
   - Google LLC (USA) - Gemini AI for roster OCR, AdSense for advertising
   - Vercel Inc. (USA) - Web hosting and CDN

4. Add Cross-Border Data Transfer section (APP 8)
5. Add Cookie disclosure section
6. Add data retention periods (specific timeframes)
7. Add deletion request process (30-day maximum)
8. Add Notifiable Data Breach notification commitment
9. Add children's privacy section (minimum age: 16)
10. Add GDPR section for EU users
11. Update effective date
```

### P1-2. Terms of Service Rewrite
**File:** `public/terms-of-service.html`  
**Priority:** CRITICAL  
**Tasks:**
```
1. Add governing law: "Laws of [State], Australia"
2. Add jurisdiction clause
3. Add Australian Consumer Law savings clause:
   "Nothing in these Terms excludes, restricts, or modifies any consumer 
    guarantee, right, or remedy conferred on you by the Australian Consumer Law 
    that cannot be excluded, restricted, or modified by agreement."
4. Add User Content section:
   - Users retain ownership of their data
   - Limited license grant to PayChecker for service delivery
   - User warranty that uploaded content is authorized
5. Add indemnification clause (user indemnifies for unauthorized uploads)
6. Add age requirement (16+)
7. Add dispute resolution process
8. Add data portability commitment
9. Add service modification notice period (30 days for material changes)
10. Strengthen financial disclaimer prominently in Section 1
11. Add AI processing disclosure
12. Update effective date
```

### P1-3. Create Cookie Policy Page
**File:** `public/cookie-policy.html` (NEW)  
**Priority:** HIGH  
**Tasks:**
```
1. Create cookie-policy.html with same styling as other legal pages
2. Document all cookies/storage:
   - localStorage: paychecker-storage-v2 (Essential - app state)
   - Supabase auth cookies (Essential - authentication)
   - Google AdSense cookies (Advertising - non-essential)
3. Explain how to manage/delete cookies
4. Link from Privacy Policy and footer
```

### P1-4. Add LICENSE and THIRD_PARTY_LICENSES Files
**Files:** `LICENSE`, `THIRD_PARTY_LICENSES` (NEW)  
**Priority:** HIGH  
**Tasks:**
```
1. Run: npx license-checker --summary --production
2. Verify no GPL/copyleft licenses in production dependencies
3. Create LICENSE file (choose appropriate license)
4. Create THIRD_PARTY_LICENSES with all dependency attributions
5. Add ATO data attribution
```

### P1-5. Update About Page
**File:** `public/about.html`  
**Priority:** MEDIUM  
**Tasks:**
```
1. Add "Data Sources" section with ATO attribution
2. Add link to Cookie Policy
3. Strengthen disclaimer language
4. Add AI technology disclosure
```

### P1-6. Update Contact Page
**File:** `public/contact.html`  
**Priority:** MEDIUM  
**Tasks:**
```
1. Verify email addresses actually work (set up email hosting)
2. Add data deletion request process
3. Add privacy complaint handling process
4. Add OAIC contact details for unresolved privacy complaints
```

### P1-7. Update Sitemap & Footer
**Files:** `public/sitemap.xml`, `src/components/Content/SiteFooterLinks.tsx`  
**Priority:** LOW  
**Tasks:**
```
1. Add cookie-policy.html to sitemap
2. Add Cookie Policy link to footer
3. Update footer disclaimer text to be more prominent
```

---

## Phase 2: In-App Disclaimer & Consent UX (Week 2)

### P2-1. Cookie Consent Banner Component
**File:** `src/components/CookieConsent/CookieBanner.tsx` (NEW)  
**Priority:** CRITICAL  
**Tasks:**
```
1. Create CookieBanner component:
   - Show on first visit (check localStorage)
   - Categories: Essential (always on) | Advertising (opt-in)
   - Accept All / Manage Preferences / Reject Non-Essential
   - Save preference to localStorage
   - If Advertising rejected, do NOT load AdSense script
2. Move AdSense <script> from index.html to dynamic loading
3. Conditionally load GoogleAd component based on consent
4. Integrate with App.tsx
```

### P2-2. Financial Disclaimer Component
**File:** `src/components/Disclaimer/FinancialDisclaimer.tsx` (NEW)  
**Priority:** CRITICAL  
**Tasks:**
```
1. Create a reusable FinancialDisclaimer component (small, unobtrusive)
2. Two variants:
   - Inline: Small text below financial figures
   - Tooltip: Info icon that shows disclaimer on hover/tap
3. Text: "Estimate only. Not tax or financial advice. Verify with your employer 
   and a registered tax agent."
```

### P2-3. Add Disclaimers to All Financial Screens
**Files:** Multiple components  
**Priority:** CRITICAL  
**Tasks:**
```
1. Dashboard.tsx - Add below Est. Pay, Net Pay, Tax cards
2. FiscalYearView.tsx - Add below YTD Income, Tax Withheld, Est. Return
3. PaySummaryCards.tsx - Add to summary section
4. ExportModal.tsx - Add to preview section + export file output
5. WorkStats.tsx - Add if showing financial data
6. IncomeChart.tsx - Add below chart
```

### P2-4. Roster Upload AI Disclosure
**File:** `src/components/RosterScanner/UploadStep.tsx`  
**Priority:** HIGH  
**Tasks:**
```
1. Before file upload, show notice:
   "Your roster will be processed by Google's AI service to extract shift data.
    - The image is sent to Google servers for processing
    - Ensure you have authorization to share workplace documents
    - Other employees' names/data visible in the roster will be processed
    By uploading, you confirm you have the right to share this document."
2. Add checkbox: "I confirm I have authorization to upload this document"
3. Disable upload button until checkbox is checked
```

### P2-5. Visa Warning Disclaimer Enhancement
**File:** `src/components/Calendar/VisaWarningModal.tsx`  
**Priority:** HIGH  
**Tasks:**
```
1. Add disclaimer text:
   "This is a planning aid only. Work hour limits and conditions vary.
    Always verify your visa work conditions with the Department of Home Affairs."
2. Add link to: https://immi.homeaffairs.gov.au/
```

### P2-6. Sign-Up Consent Enhancement
**File:** `src/components/Auth/Auth.tsx`  
**Priority:** HIGH  
**Tasks:**
```
1. Add checkbox during sign-up:
   "I agree to the [Terms of Service] and [Privacy Policy]"
2. Link to actual pages
3. Require checkbox before allowing sign-up
4. Add age confirmation: "I confirm I am 16 years or older"
5. Store consent timestamp in profile
```

### P2-7. Export File Disclaimers
**Files:** `src/utils/exportUtils.ts`, `src/utils/pdfUtils.ts`  
**Priority:** HIGH  
**Tasks:**
```
1. Add disclaimer footer to PDF exports:
   "Generated by PayChecker. Estimates only - not official payroll or tax records.
    Verify all amounts with your employer and a registered tax agent.
    Tax rates based on ATO 2025-26 FY data."
2. Add disclaimer row to CSV exports
3. Add disclaimer to ICS calendar events (in description field)
```

### P2-8. Account Deletion Feature
**File:** `src/components/Profile/ProfileModal.tsx` (or new DeleteAccountModal)  
**Priority:** HIGH  
**Tasks:**
```
1. Add "Delete Account" button to Profile Modal
2. Show confirmation dialog with:
   - Warning about permanent data loss
   - List what will be deleted (profile, jobs, shifts, expenses, feedback)
   - Require email confirmation input
3. Implement deletion:
   - Call Supabase auth.admin.deleteUser (via Edge Function) OR
   - Use Supabase's built-in account deletion
   - Cascading deletes via ON DELETE CASCADE in schema
4. Add "Export My Data" button before deletion option
```

---

## Phase 3: Security Hardening (Week 3)

### P3-1. Content Security Policy
**File:** `vercel.json` (NEW or update)  
**Priority:** CRITICAL  
**Tasks:**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' https://pagead2.googlesyndication.com https://*.google.com https://*.gstatic.com 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co https://*.google.com https://*.googleusercontent.com; connect-src 'self' https://*.supabase.co https://pagead2.googlesyndication.com; frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com;"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

### P3-2. Tighten CORS Policy
**File:** `supabase/functions/process-roster/index.ts`  
**Priority:** HIGH  
**Tasks:**
```
1. Remove wildcard Vercel preview URL acceptance
2. Change isAllowedOrigin to exact match only:
   - Production URL
   - Localhost (dev only, controlled by env)
3. Remove the hostname.includes('paychecker') logic
4. Move allowed origins entirely to ALLOWED_ORIGINS env var
```

### P3-3. Edge Function Security Review
**File:** `supabase/functions/process-roster/index.ts`  
**Priority:** HIGH  
**Tasks:**
```
1. Add request body size limit (already has 10MB image limit, but verify total)
2. Add rate limiting by user ID (beyond scan limits)
3. Remove health check config exposure in production
4. Validate all input types strictly (not just existence checks)
5. Add input sanitization for string fields
```

### P3-4. Supabase RLS Audit
**Files:** All migration files  
**Priority:** HIGH  
**Tasks:**
```
1. Verify every table has RLS enabled
2. Test each policy with automated tests:
   - User A cannot read User B's data
   - User A cannot update User B's data  
   - Non-admin cannot access admin feedback
   - is_admin cannot be self-set via profile update
3. Add RLS policy for is_admin column (prevent user self-escalation):
   CREATE POLICY "Users cannot set admin flag"
   ON profiles FOR UPDATE
   TO authenticated
   WITH CHECK (
     is_admin = (SELECT is_admin FROM profiles WHERE id = auth.uid())
   );
```

### P3-5. Dependency Audit
**Priority:** HIGH  
**Tasks:**
```
1. Run: npm audit --omit=dev --audit-level=moderate
2. Run: npx license-checker --failOn 'GPL;AGPL'
3. Update any dependencies with known vulnerabilities
4. Pin critical dependency versions
5. Set up automated dependency scanning (Dependabot/Snyk)
```

### P3-6. Data Breach Response Plan
**File:** `docs/DATA_BREACH_RESPONSE_PLAN.md` (NEW - internal document)  
**Priority:** HIGH  
**Tasks:**
```
1. Define breach severity levels (Critical/High/Medium/Low)
2. Define response timelines:
   - Detection → Assessment: 24 hours
   - Assessment → Notification (if required): 72 hours  
   - Notification to OAIC: Within 30 days (as per NDB scheme)
3. Create notification templates:
   - OAIC notification form
   - User notification email template
4. Define roles and responsibilities
5. Establish communication channels
```

### P3-7. Logging & Monitoring
**Priority:** MEDIUM  
**Tasks:**
```
1. Set up error monitoring (Sentry or equivalent)
2. Implement server-side request logging (anonymized)
3. Set up alerts for:
   - Unusual authentication failures
   - High rate of Edge Function errors
   - Unusual data access patterns
4. Do NOT log sensitive data (passwords, tokens, financial data)
```

---

## Phase 4: Marketing Audit & Cleanup (Week 4)

### P4-1. Promotional Content Audit
**File:** `marketing/promotional-content.md`  
**Priority:** HIGH  
**Tasks:**
```
Replace problematic claims throughout the file:

BEFORE → AFTER:
- "Accurate Pay Calculations" → "Pay Estimation Tools"
- "정확한 급여 계산" → "급여 예상 도구"
- "Real-time tax estimates based on current ATO brackets" → 
  "Tax withholding estimates for planning purposes (not tax advice)"
- "Tax Made Easy" → "Tax Estimation for Planning"
- "Accurate calculations" → "Estimates based on your input"
- "100% free" → "Free to use (ad-supported)"
- Remove all "88일 계산용 기록" references
- Remove "88 days calculation" references
- Add disclaimer to every promotional post template:
  "PayChecker provides estimates for planning. Not tax, payroll, or 
   immigration advice."
```

### P4-2. SEO Meta Tag Review
**File:** `index.html`  
**Priority:** MEDIUM  
**Tasks:**
```
1. Update meta description to use "estimate" language
2. Remove keyword "australia pay calculator" (implies authority)
3. Add "unofficial" or "planning tool" qualifiers
4. Review og:description for accuracy
```

### P4-3. Platform Rules Research
**Priority:** HIGH  
**Tasks:**
```
1. Research rules for each platform BEFORE posting:
   - r/australia - Check self-promotion rules
   - r/AusFinance - Check promotional post rules
   - r/IWantOut - Check tool sharing rules
   - Product Hunt - Review submission guidelines
   - Korean forums - Check advertising policies
2. Document findings in marketing folder
3. Prepare organic engagement strategy (not just promotional posts)
```

### P4-4. Korean Content Decision
**Priority:** HIGH  
**Tasks:**
```
Decision required:
Option A: Keep Korean marketing → Must complete Korean compliance:
  - Full Korean privacy policy
  - Korean-specific disclaimers
  - PIPA compliance review
  
Option B: Remove Korean marketing → Remove:
  - marketing/promotional-content.md Korean sections
  - Korean tax rate code (src/data/taxRates/korea.ts)
  - Korean locale (src/i18n/locales/ko.json)
  - Korean holiday data (src/data/holidays/korea.ts)

RECOMMENDATION: Option B for initial launch. Add Korean support as a 
future phase after proper compliance review.
```

### P4-5. Trademark Search
**Priority:** MEDIUM  
**Tasks:**
```
1. Search IP Australia: https://search.ipaustralia.gov.au/trademarks/search/
2. Search ASIC business names register
3. Search domain availability for paychecker.com.au, paychecker.app
4. If clear, consider filing trademark application
5. Budget: ~AUD $250 for single-class trademark filing
```

---

## Phase 5: Accessibility & Internationalization (Week 5-6)

### P5-1. WCAG 2.1 AA Audit
**Priority:** HIGH  
**Tasks:**
```
1. Automated testing:
   - Run axe-core on all pages
   - Run Lighthouse accessibility audit
   - Fix all critical/serious issues
2. Manual testing:
   - Keyboard navigation through entire app
   - Screen reader testing (NVDA + VoiceOver)
   - Color contrast verification
   - Focus management in modals
3. Specific known issues to fix:
   - Color-only job indicators → Add text labels or patterns
   - Drag-and-drop → Add keyboard alternative
   - All modals → Verify focus trap
   - All images → Verify alt text
```

### P5-2. Hardcoded English Strings
**Priority:** MEDIUM  
**Tasks:**
```
Search for and move to i18n:
1. VisaWarningModal.tsx - "Visa Limit Warning", "Don't Add Shift", "Add Anyway"
2. PublisherContentSection.tsx - All article text
3. GoogleAd.tsx - No user-facing text (OK)
4. SiteFooterLinks.tsx - Footer disclaimer text
5. Any other hardcoded user-facing strings
```

### P5-3. Accessibility Statement Page
**File:** `public/accessibility.html` (NEW)  
**Priority:** MEDIUM  
**Tasks:**
```
1. Create accessibility statement page
2. Declare WCAG 2.1 AA target
3. List known limitations
4. Provide contact for accessibility issues
5. Add to sitemap and footer
```

### P5-4. Focus Management
**Priority:** MEDIUM  
**Tasks:**
```
1. Verify all modals trap focus
2. Return focus to trigger element when modal closes
3. Ensure skip navigation works
4. Test Tab order across all views
```

### P5-5. Color Contrast & Visual
**Priority:** MEDIUM  
**Tasks:**
```
1. Verify all text meets WCAG AA contrast ratios
2. Ensure job color indicators have non-color differentiation
3. Check dark mode readability (if dark mode exists/planned)
4. Verify chart accessibility (recharts)
```

### P5-6. Mobile Assistive Technology
**Priority:** MEDIUM  
**Tasks:**
```
1. Test with iOS VoiceOver
2. Test with Android TalkBack
3. Verify touch targets >= 48x48dp (mostly done, verify all)
4. Test with dynamic font sizes
```

---

## Phase 6: External Legal Consultation (Week 6-8)

### P6-1. Tax Agent Services Act Opinion
**Priority:** CRITICAL  
**Tasks:**
```
1. Engage a tax law specialist
2. Questions to answer:
   - Does PayChecker constitute a "tax agent service"?
   - Is registration with the Tax Practitioners Board required?
   - Are current disclaimers sufficient?
   - What changes would mitigate regulatory risk?
3. Budget: AUD $2,000-5,000
4. Timeline: 2-3 weeks for opinion
```

### P6-2. Privacy Impact Assessment
**Priority:** HIGH  
**Tasks:**
```
1. Engage a privacy consultant
2. Conduct formal PIA per OAIC guidelines
3. Document findings and remediation
4. Budget: AUD $3,000-8,000
5. Timeline: 3-4 weeks
```

### P6-3. Terms of Service Legal Review
**Priority:** HIGH  
**Tasks:**
```
1. Have rewritten Terms reviewed by a commercial lawyer
2. Verify ACL compliance
3. Verify limitation of liability is enforceable
4. Budget: AUD $1,500-3,000
5. Timeline: 1-2 weeks
```

---

## Phase 7: Ongoing Compliance Maintenance

### P7-1. Annual Tax Rate Review
**Schedule:** May-June each year (before new FY starts July 1)  
**Tasks:**
```
1. Monitor ATO announcements for new tax brackets
2. Update PAYG withholding coefficients from new NAT 1004
3. Update Medicare Levy threshold
4. Update Super rate if changed
5. Update Working Holiday Maker rates
6. Verify all unit tests pass with new rates
7. Deploy before July 1 of each year
```

### P7-2. Quarterly Dependency Audit
**Schedule:** Every 3 months  
**Tasks:**
```
1. Run npm audit
2. Update dependencies with security patches
3. Review any new license changes
4. Test full application after updates
```

### P7-3. Annual Privacy Review
**Schedule:** Every 12 months  
**Tasks:**
```
1. Review Privacy Policy for accuracy
2. Audit data processor list
3. Review data retention compliance
4. Process any pending deletion requests
5. Update effective date
```

### P7-4. Bi-Annual Accessibility Review
**Schedule:** Every 6 months  
**Tasks:**
```
1. Run automated accessibility scans
2. Spot-check with screen reader
3. Address new WCAG guidelines if published
4. Review user feedback for accessibility issues
```

---

## Budget Summary

| Item | Estimated Cost (AUD) | Priority |
|------|---------------------|----------|
| Tax Law Legal Opinion | $2,000 - $5,000 | Critical |
| Privacy Impact Assessment | $3,000 - $8,000 | High |
| Terms of Service Legal Review | $1,500 - $3,000 | High |
| Custom Domain + Email Hosting | $100 - $300/year | High |
| Trademark Registration | $250 - $500 | Medium |
| Vercel Pro Plan (if needed) | $240/year | Medium |
| Error Monitoring (Sentry) | $0 - $312/year | Medium |
| **Total (Year 1)** | **$7,090 - $17,350** | |

---

## Decision Points Requiring Owner Input

1. **Legal Entity:** Who/what operates PayChecker? Individual, company, or partnership?
2. **Korean Market:** Launch with or without Korean support?
3. **Custom Domain:** What will the production domain be?
4. **License Choice:** What license for the codebase? (MIT, proprietary, etc.)
5. **Legal Budget:** Approved budget for external legal consultation?
6. **State of Incorporation:** Which Australian state for governing law?
7. **Data Location:** Acceptable that all data is stored in US-based services?
8. **MinimumAge:** 13 or 16 for minimum user age?

---

## Launch Gate Criteria

**The service MUST NOT be publicly promoted until ALL of the following are complete:**

1. Phase 0 complete (super rate fix)
2. Phase 1 complete (legal documents)
3. Phase 2 items P2-1 through P2-4 complete (cookie consent, disclaimers, AI disclosure, sign-up consent)
4. Phase 3 items P3-1 and P3-4 complete (CSP headers, RLS audit)
5. Contact emails verified as working
6. At minimum, Phase 6 item P6-1 initiated (tax law opinion)

**Estimated minimum time to launch readiness: 3-4 weeks**

---

*End of Update Plan*
