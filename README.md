# PSV Tracking Dashboard

A Pressure Safety Valve (PSV) compliance tracking dashboard for the **Texas A&M
University – Utilities & Energy Services** department.

The app tracks every relief valve across the site, when each was installed, and
when it is due for its **3-year recertification** (measured from the last
**installation** date — not the service date). It is currently seeded with mock
data; real data can be loaded later by replacing the seed in
`src/data/mockData.ts`.

## Tech stack

- [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) (Texas A&M maroon theme)
- [React Router](https://reactrouter.com/) for navigation
- [lucide-react](https://lucide.dev/) icons
- State is persisted to the browser's `localStorage`, so edits survive refreshes.

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build
npm run preview  # preview the production build
npm run lint     # run ESLint
```

## How it's organized (navigation)

The data hierarchy is **Site → Equipment → Location → PSV (serial number)**.

1. **Dashboard (front page)**
   - Site-wide KPIs: total PSVs, installed, in inventory, out for service,
     due soon (≤ 90 days), overdue, and overall compliance rate.
   - Middle: a grid of **equipment** cards.
   - Right: an **Urgency & History** panel with two tabs — *Due Dates*
     (upcoming/overdue recertifications) and *History* (every change recorded).
   - Add/edit equipment from here.

2. **Equipment page** (click an equipment card)
   - The same KPI set, scoped to that piece of equipment.
   - A list of **locations**. Each row shows which **S/N is installed right now**
     and its upcoming due date / compliance state.
   - Equipment-scoped Urgency & History panel. Add/edit locations here.

3. **Location page** (click a location)
   - A **faceplate** for each PSV assigned to the location (typically two: one
     installed, one spare in inventory or out for service).
   - Each faceplate has **Installed / Out for Service / In Inventory** toggle
     buttons. Toggling prompts for the effective **date**, which is recorded with
     the status change in the PSV's history.
   - Add/edit PSVs here.

4. **PSV detail page** (click a faceplate)
   - Full **datasheet** (make, model, type, set pressure, capacity, orifice,
     sizes, materials, National Board number, etc.).
   - **History** timeline of install / service / inventory events. The
     recertification due date is computed as **last install date + 3 years**.
   - Every history entry is **editable / deletable** to correct mistakes, and you
     can add new entries.

## Key compliance rules

- **Due date = most recent install date + 3 years** (`RECERT_INTERVAL_YEARS`).
- A PSV is flagged **Due Soon** within 90 days of its due date (`DUE_SOON_DAYS`)
  and **Overdue** once the due date passes.
- Only **installed** PSVs contribute a live due date; spares (inventory / out for
  service) are tracked but not counted against compliance until installed.

Both thresholds live in `src/utils/dates.ts`.

## Modes: shared cloud data vs. local

The app runs in one of two modes depending on whether Supabase is configured:

- **Cloud mode (recommended for a team):** set `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY`. Everyone signs in with a shared Supabase account and
  sees **one shared, live dataset** (edits sync to all users in real time). Sign-in
  is real authentication and the database is locked to signed-in users.
- **Local mode (default / development):** no Supabase. A lightweight static
  username/password gate (`VITE_APP_USERNAME` / `VITE_APP_PASSWORD`, defaults
  `admin` / `tamu-psv-2026`) with data stored per-browser in `localStorage`.

### Setting up shared cloud data (Supabase) — one time, ~5 minutes

1. Create a free project at **[supabase.com](https://supabase.com)**.
2. In the project, open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates the
   shared table, security rules, and live sync.
3. Open **Authentication → Users → Add user**. Create the **one shared account**
   your team will use (email + password) and tick **Auto Confirm User** so it can
   sign in immediately. Share these credentials with whoever should have access.
4. Open **Project Settings → API** and copy the **Project URL** and the
   **anon public** key.
5. In your host (e.g. Vercel), add these environment variables and redeploy:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon public key

That's it — anyone who opens the site signs in with the shared account and works
on the same live data. (Local-mode `VITE_APP_*` vars are ignored in cloud mode.)

## Going live (deploy a shareable URL) — step by step

The app is a static Vite build with SPA routing config already included
(`vercel.json`, `netlify.toml`, `public/_redirects`). The easiest free host is
**Vercel**:

1. Go to **[vercel.com](https://vercel.com)** and click **Sign Up** → **Continue with GitHub**.
2. Click **Add New… → Project**. Find the **PSV-Dashboard** repo and click **Import**.
   (If asked, give Vercel permission to access the repo.)
3. On the configure screen, Vercel auto-detects **Vite** — leave Build Command
   (`npm run build`) and Output Directory (`dist`) as-is.
4. Expand **Environment Variables** and add two:
   - `VITE_APP_USERNAME` = the login id you want
   - `VITE_APP_PASSWORD` = the password you want
5. Click **Deploy**. After ~1 minute you'll get a URL like
   `psv-dashboard.vercel.app`. Open it, sign in with your credentials, and share
   the link + credentials with your manager.

To change the password later: Vercel → your project → **Settings → Environment
Variables**, edit `VITE_APP_PASSWORD`, then **Deployments → … → Redeploy**.

> For a single shared dataset that everyone sees live, also configure Supabase
> (see “Setting up shared cloud data” above) and add the `VITE_SUPABASE_*`
> environment variables in step 4. Without them, the site runs in local mode and
> each browser keeps its own copy.

## Importing your data

Use **Data → Import data…** in the header:

1. **Download the Excel template** and fill one row per PSV (equipment and
   locations are created automatically from the names/tags; status, install date,
   and the “serviced on site” flag are supported).
2. **Upload** the `.xlsx`/`.csv`. You'll see a summary, then choose **Replace all
   data** or **Add to existing data**.
3. **JSON backup**: export a complete, lossless backup of everything (including
   full history) and restore it later or on another machine.

## Exporting reports to Excel

Use the **Export Excel** button on the dashboard (whole site) or on an equipment
page (scoped to that equipment) to download a multi-sheet `.xlsx` workbook:

- **PSV Register** — every PSV with equipment/location, status, datasheet, last
  install/service dates, due date, days remaining, and compliance state.
- **Compliance Summary** — per-equipment counts plus a site total row.
- **Due & Overdue** — installed PSVs sorted by urgency.
- **History Log** — every recorded change.

The Excel library is loaded on demand (only when you export) to keep the app
fast on first load.

## Replacing the mock data

All seed data lives in `src/data/mockData.ts`. Replace the `equipment`,
`locations`, and `psvs` arrays (or call `replaceData(...)` from the store) with
real records. Use the **Reset Data** button in the header to restore the seed at
any time.
