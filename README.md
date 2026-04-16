# PayChecker

Roster scanning and pay forecasting app for casual workers, built with React, Vite, and Supabase.

## Problem

Casual workers often piece together income from multiple jobs, shifting penalty rates, and roster screenshots that are hard to turn into clean schedule data. PayChecker focuses on three practical needs:

- turning roster files into editable shifts
- forecasting take-home income across different rate rules
- keeping tax-year context, expenses, and savings goals in one place

## Solution

PayChecker combines a schedule planner with an OCR-assisted roster intake flow.

- Users create job profiles with weekday, weekend, holiday, and break defaults.
- Shift data feeds monthly and fiscal-year views, income summaries, and category breakdowns.
- A Supabase Edge Function processes uploaded roster files and returns candidate shifts for confirmation before import.
- Auth-gated feedback and profile flows support an admin-reviewed product loop.

## Key Flows

### 1. Job and rate setup

- Create one or more jobs with base rates and per-day penalties.
- Track rate history so future calculations can use the correct pay rules.

### 2. Calendar planning

- Add or edit shifts manually from the calendar.
- Track notes, break minutes, start/end times, and country-aware holiday handling.

### 3. Roster scanning

- Upload a roster image or PDF.
- Send the file to the `process-roster` Edge Function.
- Review extracted shifts, map roster aliases to job configs, and confirm import.

### 4. Earnings and tax tracking

- View monthly summaries, work statistics, and job breakdowns.
- Track expenses and savings goals.
- Switch to fiscal-year reporting for tax-season planning.

## Architecture

### Frontend

- React 19 + TypeScript + Vite
- Zustand store split into shift, job, and user slices
- Lazy-loaded modals and feature-heavy views to keep the initial shell smaller
- i18n scaffolding for English and Korean locales

### Backend and data

- Supabase auth for session management
- Supabase tables for profiles, jobs, shifts, feedback, and roster metadata
- Supabase Edge Function for OCR and roster parsing

### Core modules

- `src/store`: client state and persistence
- `src/lib/rosterApi.ts`: frontend boundary around the roster-processing function
- `src/components/RosterScanner`: upload, mapping, processing, and confirmation flow
- `supabase/functions/process-roster`: server-side OCR orchestration and validation

## Testing

The project keeps lightweight automated checks around the most failure-prone paths.

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run check:no-danger`

Current test coverage is concentrated around:

- roster API error handling and retry behavior
- auth/session hooks
- README/help modal behavior
- date utilities used by scheduling logic

## Local Setup

### 1. Install dependencies

```bash
npm ci
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
GEMINI_API_KEY=...
SERVICE_ROLE_KEY=...
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
LOG_LEVEL=warn
```

### 3. Run the app

```bash
npm run dev:3000
```

Then open `http://localhost:3000`.

### 4. Apply database migrations

Run the SQL files in `supabase/migrations` in filename order. The repo currently expects the roster-scanning, visa-type, and admin/feedback policy migrations to be applied before production use.

## Deployment Notes

- Frontend is deployed separately from the Supabase Edge Function.
- Production requires both frontend `VITE_*` variables and Edge Function secrets.
- Admin feedback features depend on `profiles.is_admin` being set only for trusted users.

## Tradeoffs

- OCR is intentionally human-in-the-loop. Extracted shifts are reviewed before import rather than written directly into the schedule.
- The app prioritizes product speed over deep backend abstraction; some domain logic still lives close to the client store.
- Rate and holiday handling are currently optimized for the countries already modeled in the repo rather than a generic payroll engine.

## Status

This is an active product-style project, not a static mockup. The current branch builds cleanly, passes lint, and runs the existing test suite without requiring live Supabase credentials during tests.
