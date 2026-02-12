# PayChecker
**Your Personal Roster & Pay Manager**

Keeping track of variable shifts, penalty rates, and tax deductions can be a headache. PayChecker makes it effortless to manage your work schedule, calculate accurate expected pay, and track your financial goals—all in one place.

---

## ✨ Features & How to Use

Click on a section below to learn how PayChecker can help you.

<details>
<summary><strong>📅 Auto Roster Scanner (Upload & Go)</strong></summary>

*   **Snap & Upload**: Just drag and drop your roster file (PDF or Image) into the app.
*   **Automatic Schedule**: The app intelligently reads your shifts—dates, times, and roles—and adds them straight to your calendar.
*   **Smart Mapping**: It remembers your job codes, so "Shift A" on your roster automatically links to your "Bartender" job settings.
</details>

<details>
<summary><strong>📊 Smart Dashboard & Savings Goals</strong></summary>

*   **track Your Earnings**: See exactly how much you are estimated to earn this week or month at a glance. No more guessing until payday.
*   **Set Goals**: Saving for a holiday or a new car? Set a **Savings Goal** and watch your progress bar grow as you complete shifts.
</details>

<details>
<summary><strong>💰 Fiscal Year Overview</strong></summary>

*   **Tax Made Easy**: View your income based on the financial year (e.g., July to June).
*   **Year-to-Date Tracking**: Instantly see your total cumulative income for the year to help you stay on top of tax brackets and annual planning.
</details>

<details>
<summary><strong>💸 Expense Tracker</strong></summary>

*   **Log Deductions**: Bought new work boots, a uniform, or a course? Log the receipts immediately.
*   **Organized for Tax Time**: Keep all your work-related expenses categorized and ready for when you need to file your tax return.
</details>

<details>
<summary><strong>🏢 Manage Multiple Jobs</strong></summary>

*   **Multiple Rates**: Juggle multiple jobs effortlessly. Add different employers and assign specific base rates to each.
*   **Penalty Rates**: Define custom rules for weekends, public holidays, or late nights. The app does the math for you.
</details>

<br/>

## Local Development (Port 3000)

1. Run `npm ci`.
2. Run `npm run dev:3000`.
3. Open `http://localhost:3000`.

## � Get Started

1.  **Add Your Jobs**: Go to the settings or Job Manager to set up your employers and hourly rates.
2.  **Upload Roster**: Use the **Scanner** tab to upload your weekly or monthly roster.
3.  **Check Dashboard**: Visit the **Dashboard** to see your upcoming schedule and projected earnings!

## Environment Variables

Copy `.env.example` to `.env` and fill in the following values.

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL for frontend API calls |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon key for frontend auth and queries |
| `GEMINI_API_KEY` | Yes (Edge Function) | Gemini API key used by roster OCR/extraction |
| `SERVICE_ROLE_KEY` | Yes (Edge Function) | Supabase service role key used for token validation and privileged writes |
| `ALLOWED_ORIGINS` | Yes (Edge Function) | Comma-separated CORS allowlist for `process-roster` (`localhost:3000` + `localhost:5173` in local dev) |
| `LOG_LEVEL` | Recommended (Edge Function) | `debug`, `info`, `warn`, or `error` (recommended `warn` for public production) |

## Supabase Migration Order

Apply SQL migrations in filename order. Current required order:

1. `supabase/migrations/20260126_roster_scanning.sql`
2. `supabase/migrations/20260127_add_has_seen_help.sql`
3. `supabase/migrations/20260127_add_shift_time_fields.sql`
4. `supabase/migrations/20260127_add_job_default_times.sql`
5. `supabase/migrations/20260127_add_roster_identifier.sql`
6. `supabase/migrations/20260201_add_visa_type.sql`
7. `supabase/migrations/20260206_add_admin_role_and_feedback_policies.sql`
8. `supabase/migrations/20260206_set_roster_scan_limit_5.sql`

## Deployment Checklist

1. Run `npm ci`.
2. Run `npm run lint`.
3. Run `npm run check:no-danger`.
4. Run `npm run test`.
5. Run `npm run build`.
6. Run `npm audit --omit=dev --audit-level=high`.
7. Deploy frontend with production `VITE_*` env vars.
8. Deploy Supabase Edge Function `process-roster` with `GEMINI_API_KEY`, `SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS`, and `LOG_LEVEL`.
9. Confirm `profiles.is_admin` is set to `true` for admin users only.
10. Verify roster scan limit policy (`profiles.roster_scan_limit = 5`) in production DB.
