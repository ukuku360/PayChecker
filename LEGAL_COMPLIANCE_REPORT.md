# PayChecker - Public Launch Legal Compliance Report

**Report Date:** 2026-02-23  
**Prepared by:** Internal Compliance Review  
**Project:** PayChecker (paychecker-six.vercel.app)  
**Status:** PRE-LAUNCH REVIEW  

---

## Executive Summary

PayChecker is a web-based roster management and pay estimation tool targeting Australian shift workers (casual, working holiday visa, student visa holders). Before public launch and promotional campaigns, this report identifies **every legal and regulatory obligation** that must be satisfied, categorized by risk severity.

### Risk Summary Dashboard

| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Privacy & Data Protection | 3 | 4 | 2 | 1 | 10 |
| Financial Disclaimers & Regulation | 2 | 3 | 2 | 0 | 7 |
| Terms of Service & Contracts | 1 | 3 | 2 | 0 | 6 |
| Advertising & Marketing | 1 | 2 | 3 | 1 | 7 |
| Accessibility & Anti-Discrimination | 0 | 2 | 2 | 1 | 5 |
| Intellectual Property | 0 | 1 | 2 | 1 | 4 |
| Platform & Technical Compliance | 1 | 2 | 3 | 0 | 6 |
| International (Korea/Visa Holders) | 0 | 2 | 2 | 0 | 4 |
| **Total** | **8** | **19** | **18** | **4** | **49** |

---

## 1. PRIVACY & DATA PROTECTION

### 1.1 Australian Privacy Act 1988 Compliance

#### 1.1.1 [CRITICAL] Australian Privacy Principles (APPs) - APP Entity Classification

**Current State:** The Privacy Policy (effective 2026-02-19) exists but is vaguely drafted.

**Issues Identified:**
- No explicit statement of which entity operates PayChecker (individual, company, or partnership)
- If annual turnover exceeds AUD $3 million, you MUST comply fully with the APPs
- Even below the threshold, handling **Tax File Number (TFN) equivalent data** (income/tax estimation data) may trigger APP obligations
- The Privacy Act's Small Business Exemption does NOT apply if you collect sensitive information or provide a service under a government contract

**Required Actions:**
1. Determine and declare the operating legal entity
2. Conduct a **Privacy Impact Assessment (PIA)** before launch
3. Register with the **Office of the Australian Information Commissioner (OAIC)** if required
4. Explicitly list all 13 APPs in your compliance framework

#### 1.1.2 [CRITICAL] APP 1 - Collection Transparency

**Current State:** The Privacy Policy lists categories of data collected (account identifiers, schedule data, uploads, technical logs) but lacks specificity.

**Issues Identified:**
- No mention of the **specific data fields** collected (email, password hash, visa type, employer names, hourly rates, income amounts)
- No explicit consent mechanism at sign-up for data collection
- **Visa type** data is potentially **sensitive information** under the Privacy Act (relating to racial or ethnic origin)
- No disclosure that **roster images** are sent to Google Gemini API (a US-based third-party AI service)
- No mention of **Supabase** as the data processor or its data location

**Required Actions:**
1. Add a comprehensive data inventory table to the Privacy Policy
2. Implement explicit opt-in consent at sign-up (not just "by using the service you agree")
3. Disclose ALL third-party data processors by name:
   - **Supabase** (database, auth) - AWS infrastructure
   - **Google Gemini API** (AI roster extraction) - US-based
   - **Google AdSense** (advertising) - US-based
   - **Vercel** (hosting) - US-based
4. State the specific jurisdiction(s) where data is stored

#### 1.1.3 [CRITICAL] Cross-Border Data Transfer (APP 8)

**Current State:** No disclosure of overseas data transfer.

**Issues Identified:**
- User data flows to:
  - **Supabase** (likely US/AWS) for storage
  - **Google Gemini** (US) for OCR/AI processing of roster images
  - **Google AdSense** (US) for ad personalization
  - **Vercel** (US) for hosting
- APP 8 requires the entity to take reasonable steps to ensure overseas recipients comply with APPs, OR obtain explicit informed consent

**Required Actions:**
1. Add a "Cross-Border Data Transfers" section to Privacy Policy
2. List each overseas recipient, their country, and what data they receive
3. Implement either:
   - Contractual protections (Data Processing Agreements) with each provider, OR
   - Explicit informed consent from users for overseas transfers

#### 1.1.4 [HIGH] Consent for AI Processing of Roster Images

**Current State:** Users upload roster images which are sent to Google Gemini API. No explicit disclosure.

**Issues Identified:**
- Roster images may contain **other employees' personal information** (names, shifts, roles)
- Users may upload images containing data they don't have rights to share
- Google Gemini's data processing terms may allow training on submitted data
- No consent from the **third parties** whose data appears in roster images

**Required Actions:**
1. Add a clear warning before roster upload explaining:
   - The image will be processed by Google's AI
   - Other people's data may be visible in the image
   - Users must have authority to share workplace documents
2. Review Google Gemini API terms for data retention/training clauses
3. Consider implementing PII redaction before sending to Gemini
4. Add to Terms of Service: user responsibility for uploaded content

#### 1.1.5 [HIGH] Data Retention & Deletion (APP 11)

**Current State:** Privacy Policy says "We retain data as needed" with no specific timeframes.

**Issues Identified:**
- No defined retention periods for any data category
- No automated data cleanup processes
- Roster scan results (`roster_scans` table) store full parsed results indefinitely
- No clear "right to deletion" process documented
- Feedback data includes user email addresses stored in plaintext

**Required Actions:**
1. Define and publish specific retention periods:
   - Account data: Duration of account + X months
   - Shift data: Configurable by user, maximum Y years
   - Roster scan images: Delete after processing (do NOT store)
   - Roster scan metadata: 12 months
   - Feedback: 24 months
   - Technical logs: 90 days
2. Implement automated data purge jobs
3. Create a formal account deletion endpoint/process
4. Document the deletion request process with a timeline (max 30 days under APPs)

#### 1.1.6 [HIGH] Cookie & Tracking Disclosure

**Current State:** No Cookie Policy exists. Google AdSense is loaded on the page.

**Issues Identified:**
- Google AdSense uses cookies and tracking technologies
- `zustand` persist middleware uses `localStorage` (key: `paychecker-storage-v2`)
- No cookie banner or consent mechanism exists
- EU visitors (GDPR) and some Australian state laws may require explicit cookie consent
- `ads.txt` confirms Google AdSense publisher ID `pub-4516626856296531`

**Required Actions:**
1. Implement a Cookie Consent Banner (required for ad-supported sites)
2. Create a Cookie Policy page
3. Categorize cookies: Necessary / Analytics / Advertising
4. Allow users to accept/reject non-essential cookies
5. Don't load AdSense scripts until cookie consent is obtained

#### 1.1.7 [HIGH] Notifiable Data Breaches Scheme (NDB)

**Current State:** No data breach response plan exists.

**Issues Identified:**
- Under the Privacy Act, if an eligible data breach occurs, you must notify affected individuals and the OAIC within 30 days
- Financial data (income, tax estimates, employer info) qualifies as data likely to cause serious harm
- No incident response plan documented
- No breach notification template prepared

**Required Actions:**
1. Create a Data Breach Response Plan
2. Prepare breach notification templates (for OAIC and users)
3. Implement security monitoring on Supabase
4. Define breach severity assessment criteria
5. Establish a 72-hour initial assessment timeline

#### 1.1.8 [MEDIUM] Children's Privacy

**Current State:** No age verification or restriction.

**Issues Identified:**
- No minimum age requirement stated
- Working holiday visa holders are typically 18-35, but student visa holders may include minors (under 18)
- Enhanced protections apply for children's data under APPs

**Required Actions:**
1. Add minimum age requirement (13 or 16) to Terms of Service
2. Add age confirmation during sign-up
3. If allowing under-18 users, implement parental consent mechanisms

#### 1.1.9 [MEDIUM] Email Communication Compliance (Spam Act 2003)

**Current State:** Email addresses are collected but no email marketing system is evident.

**Issues Identified:**
- The Spam Act 2003 requires opt-in consent for commercial electronic messages
- Password reset and verification emails are transactional (exempt)
- Any future promotional emails MUST have opt-in consent and unsubscribe mechanism
- Contact emails (`support@paychecker-six.vercel.app`) suggest potential for email communication

**Required Actions:**
1. Ensure all Supabase transactional emails are properly configured
2. If planning email marketing, implement double opt-in
3. Include unsubscribe links in all commercial messages
4. Keep records of email consent

#### 1.1.10 [LOW] De-identification & Analytics

**Current State:** No analytics system identified beyond basic technical logs.

**Required Actions:**
1. If adding analytics (Google Analytics, Mixpanel, etc.), update Privacy Policy
2. Implement IP anonymization
3. Consider privacy-focused alternatives (Plausible, Fathom)

---

## 2. FINANCIAL DISCLAIMERS & REGULATORY COMPLIANCE

### 2.1 [CRITICAL] Financial Services Disclaimer

**Current State:** The Terms of Service states "It is not payroll software, legal advice, or tax advice." The About page has a similar disclaimer. However, the app actively calculates tax estimates using ATO tax brackets and PAYG withholding coefficients.

**Issues Identified:**
- Calculating tax estimates with ATO data creates an implied advisory relationship
- The marketing material says "Tax Made Easy" and "Real-time tax estimates based on current ATO brackets"
- Promotional content claims "Accurate Pay Calculations" and "정확한 급여 계산"
- These claims may constitute providing financial product advice under the **Corporations Act 2001**
- Without an **Australian Financial Services Licence (AFSL)**, providing financial advice is illegal
- The disclaimer buried in ToS/About pages is insufficient if promotional materials contradict it

**Required Actions:**
1. **Strengthen ALL disclaimers** - Add prominent, unavoidable disclaimers:
   - On every page that shows tax calculations
   - In the Dashboard component where tax estimates appear
   - In the Fiscal Year view
   - In all export files (CSV, PDF, ICS)
2. **Revise marketing language** - Remove words like:
   - "Accurate" (replace with "estimated")
   - "Tax Made Easy" (implies tax advisory)
   - "정확한 급여 계산" (accurate pay calculation)
   - "Real-time tax estimates based on current ATO brackets" (implies professional-grade accuracy)
3. Add in-app banner: *"These are estimates only. Always verify with your payslip, employer, or a registered tax agent."*
4. Consider consulting with a financial services lawyer

### 2.2 [CRITICAL] Tax Agent Services Act 2009

**Current State:** The app provides tax withholding estimates using PAYG coefficients from ATO NAT 1004 Schedule 1.

**Issues Identified:**
- Under the Tax Agent Services Act 2009, it is illegal to provide a "tax agent service" for a fee (or in connection with a commercial activity like AdSense) without being registered with the Tax Practitioners Board (TPB)
- "Tax agent service" includes preparing returns, providing advice on tax obligations, or applying tax laws to specific circumstances
- PayChecker applies specific ATO tax tables to individual user income = potentially a tax agent service
- The ads generate commercial revenue alongside the tax calculation feature

**Required Actions:**
1. Obtain legal opinion from a tax law specialist on whether PayChecker constitutes a "tax agent service"
2. If required, register with the **Tax Practitioners Board** or restructure the service
3. At minimum, add prominent disclaimers on every tax-related screen:
   - *"This is not tax advice. Consult a registered tax agent for your tax obligations."*
4. Add the disclaimer in ALL tax calculation exports
5. Consider labeling tax features as "educational estimates" rather than "calculations"

### 2.3 [HIGH] Accuracy of ATO Tax Data

**Current State:** Tax rates reference 2025-26 Financial Year. PAYG coefficients are from NAT 1004 (Stage 3 Tax Cuts, effective 1 July 2024).

**Issues Identified:**
- Tax brackets and PAYG coefficients change annually
- Medicare Levy threshold (currently $27,222) changes annually
- Superannuation rate changes (currently 12%, scheduled increases)
- Working Holiday Maker rates may change
- Stale data = incorrect estimates = potential liability

**Required Actions:**
1. Implement a systematic annual review process aligned with ATO announcements (typically May-June each year)
2. Display the financial year the calculations apply to prominently
3. Add "Last updated" timestamps on tax calculation screens
4. Create automated tests that flag when rates should be reviewed
5. Add a warning if a user's shift dates span multiple financial years

### 2.4 [HIGH] Superannuation Rate Display

**Current State:** `SUPER_RATE = 0.115` in `useScheduleStore.ts` but `AU_SUPER_RATE = 0.12` in `australia.ts`.

**Issues Identified:**
- **INCONSISTENCY**: Two different super rates in the codebase (11.5% vs 12%)
- The Export modal uses `SUPER_RATE` (11.5%) while tax calculations use `AU_SUPER_RATE` (12%)
- SG rate as of 1 July 2025 is 12%
- Incorrect super calculations could mislead users

**Required Actions:**
1. **IMMEDIATELY fix the inconsistency** - unify to 12% (or whatever the current rate is)
2. Source super rate from a single constant
3. Display the applicable period for super rate
4. Add automated test to catch rate inconsistencies

### 2.5 [HIGH] Korean Tax Rates - Disclaimer Gap

**Current State:** Korean tax calculations exist in `korea.ts` (2024 tax brackets, 4대보험 rates) but the Korean calculator is referenced but not fully integrated.

**Issues Identified:**
- Korean tax rates are labeled "2024 기준" - already potentially out of date for 2026
- No disclaimer specific to Korean tax calculations
- Different regulatory framework applies (Korean tax law, not Australian)
- Country selection is limited to 'AU' in `countries.ts` but code exists for Korea
- If re-enabled, Korean financial disclosure requirements would apply

**Required Actions:**
1. Either completely remove Korean tax code before launch, or
2. Fully validate Korean rates for 2026
3. Add Korean-specific financial disclaimers if the feature is enabled
4. Consult Korean tax law requirements for digital tax tools

### 2.6 [MEDIUM] Pay Estimation Accuracy Disclaimers

**Current State:** Basic disclaimer in footer and About page.

**Issues Identified:**
- No disclaimer is shown in:
  - The Dashboard summary cards (Est. Pay, Net Pay, Tax)
  - The Fiscal Year view (YTD Income, Tax Withheld, Est. Return)
  - The Export modal (preview amounts)
  - CSV/PDF export files
- Users may rely on these figures for financial decisions

**Required Actions:**
1. Add an informational tooltip or footnote to every monetary value displayed
2. Include disclaimer text in all exported files
3. The footer disclaimer should be more prominent (currently `text-xs`)

### 2.7 [MEDIUM] Visa Work Hour Compliance Feature

**Current State:** The `VisaWarningModal` warns about 48-hour fortnightly limits for student visa holders.

**Issues Identified:**
- This feature implies the app helps with visa compliance
- Student visa work conditions are complex and change frequently
- The 48-hour limit has exceptions (e.g., during course breaks, post-July 2023 changes)
- Reliance on this feature for visa compliance could have serious immigration consequences

**Required Actions:**
1. Add a prominent disclaimer: *"This feature is for planning only. Verify work hour limits with the Department of Home Affairs."*
2. Link to official government resources
3. Do NOT market this as a visa compliance tool

---

## 3. TERMS OF SERVICE & CONTRACTUAL REQUIREMENTS

### 3.1 [CRITICAL] Governing Law & Jurisdiction

**Current State:** Terms of Service has no governing law clause.

**Issues Identified:**
- No applicable law specified (should be Australian law, specific state)
- No jurisdiction for dispute resolution
- No arbitration or mediation clause
- International users (Korea, other countries) need clarity on which law applies

**Required Actions:**
1. Add governing law clause (e.g., "Laws of New South Wales, Australia")
2. Add jurisdiction clause for dispute resolution
3. Consider adding a dispute resolution process (mediation before litigation)

### 3.2 [HIGH] Australian Consumer Law (ACL) Compliance

**Current State:** Terms include "as is" and limitation of liability clauses.

**Issues Identified:**
- Under ACL, consumer guarantees **cannot be excluded** for consumer services
- The "as is" disclaimer may be void to the extent it conflicts with consumer guarantees
- Service must be provided with "due care and skill" and be "fit for purpose"
- If the service is free, ACL may have more limited application, but advertising and promotional materials must still comply

**Required Actions:**
1. Add ACL disclaimer: *"Nothing in these Terms excludes your rights under Australian Consumer Law"*
2. Remove or qualify the "as is" clause for Australian consumers
3. Review promotional claims against ACL misleading conduct provisions

### 3.3 [HIGH] User Content & Intellectual Property

**Current State:** No clause addressing ownership of user-created data.

**Issues Identified:**
- Users create valuable data (shift records, job configs, expense records)
- No clause confirming users retain ownership of their data
- No license grant clause for how PayChecker can use uploaded data
- Roster images may be employer intellectual property

**Required Actions:**
1. Add "User Content" clause specifying:
   - Users retain ownership of their data
   - PayChecker receives a limited license to process data for service delivery
   - Users warrant they have rights to upload content (especially roster images)
2. Add data portability provision (users can export all their data)

### 3.4 [HIGH] Account Deletion & Data Portability

**Current State:** Privacy Policy mentions "You may request account deletion" but no mechanism exists.

**Issues Identified:**
- No in-app account deletion feature
- No documented process for data export (beyond CSV/PDF of shifts)
- No response timeline for deletion requests
- Under APPs, users have a right to access and correction

**Required Actions:**
1. Implement in-app account deletion
2. Implement full data export (all tables: profile, jobs, shifts, expenses, feedback)
3. Document the process with a maximum 30-day timeline
4. Confirm data is actually deleted from Supabase (not just soft-deleted)

### 3.5 [MEDIUM] Service Level & Availability

**Current State:** Terms state "We may modify, suspend, or discontinue features at any time."

**Required Actions:**
1. Add notice period for significant changes (e.g., 30 days)
2. Define the process for notifying users of changes
3. Address what happens to user data if the service shuts down

### 3.6 [MEDIUM] Indemnification Clause

**Current State:** No indemnification clause exists.

**Required Actions:**
1. Add user indemnification for:
   - Uploading content they don't have rights to
   - Misuse of the service
   - Reliance on estimates for tax or payroll purposes
2. Ensure indemnification is reasonable and balanced

---

## 4. ADVERTISING & MARKETING COMPLIANCE

### 4.1 [CRITICAL] Google AdSense Policy Compliance

**Current State:** AdSense is active with publisher ID `ca-pub-4516626856296531`. The `ads.txt` file is configured.

**Issues Identified:**
- Google AdSense requires a published Privacy Policy (EXISTS, but needs updates)
- Google's EU User Consent Policy requires consent for EEA/UK users
- Ad placement must follow Google policies (no misleading placement, click encouragement, etc.)
- Financial services content has special AdSense policies - tax calculation pages may require additional review
- Must comply with Better Ads Standards

**Required Actions:**
1. Review and ensure Privacy Policy meets Google's requirements
2. Implement Google's Consent Management Platform (CMP) for EU/UK users
3. Verify ad placement follows Google's policies
4. Review if financial content triggers Google's "sensitive category" policies
5. Ensure ads are clearly labeled as advertisements (currently done: `aria-label="Advertisement"`)

### 4.2 [HIGH] Australian Competition and Consumer Commission (ACCC) - Misleading Claims

**Current State:** Marketing materials contain bold claims.

**Issues Identified:**
- "Accurate Pay Calculations" - may be misleading if estimates differ from actual pay
- "100% free, no premium tier" - must remain true or be updated
- "정확한 급여 계산" (accurate pay calculation) - same issue in Korean
- "Introducing PayChecker - A Free Roster & Pay Management App" - "Free" claim requires that it be truly free (no hidden costs, in-app purchases, or data monetization beyond ads)
- Marketing claims that the tool helps with "88일 계산용 기록" (88 days calculation) for working holiday visa second year - this is immigration-adjacent advice

**Required Actions:**
1. Audit ALL promotional content for potentially misleading claims
2. Replace "accurate" with "estimated" or "approximate"
3. Ensure "free" claims remain valid
4. Add appropriate qualifiers to all claims
5. Remove or heavily qualify immigration-related claims

### 4.3 [HIGH] Platform-Specific Promotional Rules

**Current State:** `marketing/promotional-content.md` contains ready-made posts for Reddit, Product Hunt, LinkedIn, Facebook, Korean communities.

**Issues Identified:**
- Reddit has strict self-promotion policies (many subreddits ban or limit promotional posts)
- r/australia, r/AusFinance have specific rules about commercial posts
- Korean community platforms (호주나라, 마이호주, 워홀프렌즈) may have advertising restrictions
- Product Hunt requires honest disclosure
- LinkedIn has sponsored content policies
- Facebook has advertising policies and financial services restrictions

**Required Actions:**
1. Review each target platform's rules BEFORE posting
2. Mark posts as promotional where required
3. Follow Reddit's 10% self-promotion rule
4. Prepare for community backlash by having responses ready
5. Consider paid advertising channels where organic promotion is restricted

### 4.4 [MEDIUM] Testimonials & User Reviews

**Current State:** No testimonials or reviews system exists.

**Required Actions (if adding):**
1. Any testimonials must be genuine and verifiable
2. Must disclose material connections (e.g., if incentivized)
3. Must not be misleading about typical user experience

### 4.5 [MEDIUM] SEO & Meta Tag Claims

**Current State:** `index.html` contains SEO meta tags.

**Issues Identified:**
- Meta description: "Track schedules, estimate earnings, and export records for tax-season prep" - the phrase "tax-season prep" should be qualified
- Keywords include "australia pay calculator" - could imply official/authoritative status
- og:description: "Track rosters, estimate shift earnings, and manage work records in one place" - reasonable

**Required Actions:**
1. Review meta descriptions for accuracy
2. Avoid keywords that imply official or government-endorsed status
3. Use consistent language across all pages

### 4.6 [MEDIUM] Affiliate & Referral Disclosure

**Current State:** No affiliate or referral programs exist.

**Required Actions (if adding):**
1. Disclose any affiliate relationships
2. Follow ACCC disclosure requirements
3. Ensure transparency in any partnership promotions

### 4.7 [LOW] Trademark Considerations

**Current State:** Using "PayChecker" as a brand name.

**Required Actions:**
1. Search the IP Australia trademark register for conflicts
2. Search ASIC for business name conflicts
3. Consider registering "PayChecker" as a trademark
4. Ensure no confusion with existing financial services brands

---

## 5. ACCESSIBILITY & ANTI-DISCRIMINATION

### 5.1 [HIGH] Web Content Accessibility Guidelines (WCAG) Compliance

**Current State:** Some accessibility features exist (aria-labels, focus-visible styles, min touch targets of 48px), but no systematic WCAG audit has been conducted.

**Issues Identified:**
- No WCAG conformance level declared
- The **Disability Discrimination Act 1992 (DDA)** applies to websites accessible in Australia
- Government guidelines recommend WCAG 2.1 Level AA compliance
- Color-coded job indicators (using Tailwind color names) may be inaccessible to color-blind users
- Drag-and-drop interaction (DnD Kit) may not be keyboard accessible
- Modal dialogs should trap focus
- PDF exports should be accessible

**Required Actions:**
1. Conduct WCAG 2.1 Level AA audit
2. Fix identified accessibility issues
3. Add a WCAG conformance statement to the website
4. Ensure all interactive elements are keyboard navigable
5. Test with screen readers (NVDA, VoiceOver)
6. Add text labels alongside color indicators
7. Ensure modals have proper focus management

### 5.2 [HIGH] Language Accessibility

**Current State:** App is primarily English. Korean translations exist but the country is locked to 'AU'. Some UI strings are hardcoded in English (e.g., "Visa Limit Warning", "Don't Add Shift").

**Issues Identified:**
- Target audience includes Korean speakers (marketing content exists in Korean)
- Some Korean comments exist in source code (`// 휴가 기간 추가 시 즉시 Supabase에 저장`)
- i18n infrastructure exists but is incomplete
- Mixed language experience could confuse users

**Required Actions:**
1. Complete Korean translations if targeting Korean speakers
2. Or remove Korean marketing materials if not supporting Korean UI
3. Ensure all user-facing strings go through i18n
4. Add language selector if supporting multiple languages

### 5.3 [MEDIUM] Mobile Accessibility

**Current State:** Responsive design with mobile-specific UI adaptations.

**Required Actions:**
1. Test on assistive technology across iOS/Android
2. Ensure touch targets meet 48x48dp minimum
3. Test with dynamic font sizes
4. Ensure modals work properly on mobile screen readers

### 5.4 [MEDIUM] Cultural Sensitivity

**Current State:** Targets visa holders (working holiday, student visa) which includes diverse cultural backgrounds.

**Required Actions:**
1. Review all content for cultural sensitivity
2. Avoid stereotyping (e.g., "backpackers = fruit picking")
3. Ensure examples are inclusive
4. Consider adding language support for other common languages (Mandarin, Japanese)

### 5.5 [LOW] Right-to-Left (RTL) Support

**Required Actions:**
1. If expanding to RTL languages, implement RTL layout support
2. Low priority for current audience

---

## 6. INTELLECTUAL PROPERTY

### 6.1 [HIGH] Open-Source License Compliance

**Current State:** `package.json` lists 20+ dependencies. No license field in `package.json`. No `LICENSE` file in the repository.

**Issues Identified:**
- Each dependency has its own license (MIT, Apache 2.0, ISC, etc.)
- Some may have attribution requirements
- No license file declares the project's own license
- If using any copyleft (GPL) dependencies, the entire codebase may need to be open-sourced

**Required Actions:**
1. Run `npx license-checker --summary` to audit all dependency licenses
2. Ensure no GPL-licensed dependencies are included (or comply with GPL)
3. Add a `LICENSE` file declaring the project's license
4. Create a `THIRD_PARTY_LICENSES` file listing all dependency licenses
5. Add attribution for all required licenses

### 6.2 [MEDIUM] ATO Data Usage

**Current State:** Tax brackets and PAYG coefficients are sourced from ATO publications.

**Issues Identified:**
- ATO data is Crown Copyright (Commonwealth of Australia)
- May be used under Creative Commons Attribution license
- Attribution to the ATO may be required
- "Reference" URLs in code comments are good but insufficient for public attribution

**Required Actions:**
1. Add ATO attribution statement: *"Tax rates sourced from the Australian Taxation Office. Commonwealth of Australia."*
2. Review ATO's data use terms
3. Include in a "Data Sources" section of the About page

### 6.3 [MEDIUM] Google Gemini API - Usage Terms

**Current State:** Roster images are sent to Google Gemini for OCR/extraction.

**Issues Identified:**
- Google Gemini API has specific terms about data usage and retention
- API usage may have rate limits and acceptable use policies
- Must comply with Google Cloud Terms of Service

**Required Actions:**
1. Review and comply with Google Gemini API terms
2. Ensure data handling meets Google's requirements
3. Disclose AI usage in Privacy Policy and Terms of Service

### 6.4 [LOW] Brand Assets & Third-Party Logos

**Current State:** No third-party logos detected in the codebase.

**Required Actions:**
1. If adding logos (Google, Supabase, etc.), ensure compliance with their brand guidelines
2. Do not imply endorsement by third parties

---

## 7. PLATFORM & TECHNICAL COMPLIANCE

### 7.1 [CRITICAL] Security Audit Before Launch

**Current State:** CI pipeline includes lint, build, test, audit. RLS (Row Level Security) is enabled on all Supabase tables.

**Issues Identified:**
- No dedicated security audit has been performed
- `npm audit --omit=dev --audit-level=high` is only for production dependencies
- No penetration testing
- `dangerouslySetInnerHTML` check exists but other XSS vectors may exist
- Service role key handling in Edge Function needs review
- CORS configuration accepts all `*.vercel.app` URLs containing "paychecker"

**Required Actions:**
1. Conduct a security audit (OWASP Top 10 review)
2. Penetration testing on the Supabase Edge Function
3. Review all RLS policies for completeness
4. Implement Content Security Policy (CSP) headers
5. Add rate limiting to the Edge Function (beyond scan limits)
6. Review CORS policy - tighten to specific production domains only
7. Ensure `.env` files are never committed (`.gitignore` has this)
8. Review Supabase auth configuration (email verification required?)

### 7.2 [HIGH] HTTPS & Transport Security

**Current State:** Vercel provides automatic HTTPS. Supabase Edge Functions are HTTPS.

**Required Actions:**
1. Verify HSTS headers are set
2. Ensure all resources are loaded over HTTPS
3. Set `Strict-Transport-Security` header
4. Consider Certificate Transparency monitoring

### 7.3 [HIGH] Content Security Policy

**Current State:** No CSP headers configured.

**Issues Identified:**
- Google AdSense requires specific CSP directives
- External scripts (AdSense) loaded without nonce/hash
- No protection against XSS via CSP

**Required Actions:**
1. Implement CSP headers in Vercel configuration
2. Use nonce-based CSP for inline scripts
3. Whitelist required external domains (Google AdSense, Supabase)

### 7.4 [MEDIUM] Data Backup & Disaster Recovery

**Current State:** Relies on Supabase's built-in backup.

**Required Actions:**
1. Document the backup strategy
2. Verify Supabase's backup and recovery capabilities for your plan
3. Test data restoration procedure
4. Implement export-all functionality for users

### 7.5 [MEDIUM] Error Handling & Information Disclosure

**Current State:** Errors are logged to console in DEV mode. Production error handling exists.

**Issues Identified:**
- `import.meta.env.DEV` guards are good for DEV-only logging
- Edge Function health check exposes configuration status (which keys are set)
- Error responses include `requestId` (good for debugging, ensure it doesn't leak info)

**Required Actions:**
1. Ensure production builds don't expose sensitive debugging information
2. Review Edge Function health endpoint exposure
3. Implement centralized error tracking (Sentry or similar)

### 7.6 [MEDIUM] Vercel Deployment Compliance

**Current State:** Deployed on Vercel free tier (implied by paychecker-six.vercel.app domain).

**Issues Identified:**
- Vercel's free tier has usage limits
- Vercel's Terms of Service apply
- If using commercial features (AdSense revenue), may need a paid Vercel plan
- Custom domain recommended for production launch

**Required Actions:**
1. Review Vercel's Terms for commercial use on free tier
2. Set up custom domain (not `*.vercel.app`)
3. Ensure Vercel plan supports expected traffic
4. Configure proper DNS and SSL for custom domain

---

## 8. INTERNATIONAL & VISA-SPECIFIC CONSIDERATIONS

### 8.1 [HIGH] GDPR Compliance (EU/EEA Users)

**Current State:** No GDPR compliance measures exist.

**Issues Identified:**
- Working holiday visa holders may be from EU/EEA countries
- If ANY EU/EEA user accesses the service, GDPR applies
- GDPR requires:
  - Lawful basis for processing
  - Data Protection Officer (DPO) if processing at scale
  - Right to erasure, portability, restriction
  - Privacy by design and by default
  - 72-hour breach notification
- Google AdSense serving to EU users triggers GDPR requirements

**Required Actions:**
1. Implement GDPR consent mechanisms
2. Add GDPR-specific privacy provisions
3. Implement right to erasure and data portability
4. Consider using Google's Consent Mode for EU users
5. Review if a DPO appointment is needed

### 8.2 [HIGH] Korean Personal Information Protection Act (PIPA)

**Current State:** Korean marketing materials exist. Korean tax code exists in the codebase.

**Issues Identified:**
- If targeting Korean users (as marketing suggests), PIPA applies
- PIPA requirements are similar to GDPR but with Korean-specific obligations
- Korean users have specific rights under PIPA
- Cross-border transfer restrictions apply

**Required Actions:**
1. If targeting Korean users:
   - Comply with PIPA requirements
   - Provide Korean-language privacy notice
   - Implement Korean-specific consent mechanisms
2. If NOT targeting Korean users:
   - Remove Korean marketing materials
   - Remove Korean tax code
   - Block or redirect Korean IP addresses (optional)

### 8.3 [MEDIUM] Immigration Disclaimer

**Current State:** The app tracks visa type and work hours for student visa compliance.

**Issues Identified:**
- Providing immigration-related guidance without being a registered migration agent is restricted under the Migration Act 1958
- Marketing claims about tracking "88 days" for working holiday visa extensions
- The visa work hour tracking could be seen as providing immigration assistance

**Required Actions:**
1. Add prominent immigration disclaimer
2. Remove references to "88 days" tracking
3. State that the app does not provide immigration advice
4. Link to official Department of Home Affairs resources

### 8.4 [MEDIUM] Multi-Currency & Tax Jurisdiction

**Current State:** Locked to AUD currency for AU users.

**Issues Identified:**
- If expanding to other countries, each jurisdiction has its own:
  - Tax rates and brackets
  - Privacy laws
  - Financial services regulations
  - Consumer protection laws

**Required Actions:**
1. For each new country/currency, conduct a separate compliance review
2. Do not launch Korean features without Korean regulatory review

---

## 9. CONTACT & SUPPORT EMAIL VALIDITY

### 9.1 [MEDIUM] Professional Contact Information

**Current State:** Support email is `support@paychecker-six.vercel.app`

**Issues Identified:**
- Using a Vercel subdomain for email is unprofessional and may not work
- Contact page lists `partners@paychecker-six.vercel.app` for business inquiries
- These email addresses may not actually receive mail (Vercel doesn't provide email hosting)
- Privacy Policy and Terms reference these potentially non-functional emails

**Required Actions:**
1. Set up a custom domain with working email
2. Verify all listed email addresses actually receive and send mail
3. Update all references if email addresses change
4. Consider a support ticket system for accountability

---

## 10. PRE-LAUNCH COMPLIANCE CHECKLIST

### Must Do Before Launch (CRITICAL)

- [ ] Fix super rate inconsistency (11.5% vs 12%)
- [ ] Strengthen financial/tax disclaimers on ALL calculation screens
- [ ] Update Privacy Policy with complete data processor disclosures
- [ ] Add cross-border data transfer disclosures
- [ ] Implement Cookie Consent Banner
- [ ] Add governing law clause to Terms of Service
- [ ] Conduct security audit (OWASP Top 10)
- [ ] Verify contact emails actually work

### Must Do Within 30 Days of Launch (HIGH)

- [ ] Complete WCAG 2.1 AA accessibility audit
- [ ] Implement account deletion feature
- [ ] Create Data Breach Response Plan
- [ ] Implement Content Security Policy headers
- [ ] Audit all dependency licenses
- [ ] Review marketing materials for misleading claims
- [ ] Add ATO data attribution
- [ ] Obtain legal opinion on Tax Agent Services Act applicability
- [ ] Set up custom production domain
- [ ] Add data retention periods to Privacy Policy
- [ ] Implement GDPR consent mechanisms
- [ ] Review Google AdSense financial content policies
- [ ] Add AI processing disclosure for roster uploads
- [ ] Implement data portability (full export)
- [ ] Set up HSTS headers
- [ ] Add minimum age requirement
- [ ] Review and update Korean marketing materials or remove them
- [ ] Add user content ownership clause to Terms
- [ ] Add ACL savings clause to Terms

### Should Do Within 90 Days (MEDIUM)

- [ ] Conduct penetration testing
- [ ] Implement centralized error monitoring
- [ ] Complete all i18n translations or remove untranslated content
- [ ] Create THIRD_PARTY_LICENSES file
- [ ] Add Cookie Policy page
- [ ] Implement automated data retention/purge
- [ ] Test with screen readers and assistive technology
- [ ] Review cultural sensitivity of content
- [ ] Add "Data Sources" section to About page
- [ ] Implement proper backup verification process
- [ ] Set up monitoring and alerting
- [ ] Prepare a Data Breach notification template

---

*End of Legal Compliance Report*
