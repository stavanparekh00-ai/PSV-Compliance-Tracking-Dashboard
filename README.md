# PSV Tracking Dashboard

A Pressure Safety Valve (PSV) compliance tracking dashboard built for the Texas A&M University – Utilities & Energy Services department, designed to track every relief valve across the site through its full lifecycle — installation, service, inventory, and 3-year recertification.

## Overview

The dashboard organizes the entire valve fleet by Site → Equipment → Location → PSV, giving the team a clear, hierarchical view of compliance status at every level. Recertification due dates are calculated automatically from each valve's last install date, with built-in alerts for valves approaching or past their due date — so nothing slips through the cracks.

## Features

- **Site-Wide KPIs** — Total PSVs, installed units, inventory, units out for service, due-soon and overdue counts, and an overall compliance rate, visible at a glance on the dashboard.

- **Equipment & Location Drill-Down** — Each equipment card expands into its locations, and each location shows the PSVs assigned to it with live status and due dates, down to the individual serial number.

- **Compliance Status Tracking**
  - 🟢 Compliant — recertification current
  - 🟠 Due Soon — within 90 days of recertification
  - 🔴 Overdue — past its recertification date
  - ⚪ In Inventory / Out for Service — tracked but not counted against live compliance until installed

- **Full PSV Datasheets** — Make, model, type, set pressure, capacity, orifice size, materials, National Board number, and more for every valve.

- **History & Audit Trail** — Every install, service, and inventory status change is logged with effective dates, fully editable to correct mistakes, and viewable as a timeline on each valve's detail page.

- **Data Import/Export** — Bulk import via Excel/CSV template, full JSON backup and restore, and multi-sheet Excel exports (PSV register, compliance summary, due/overdue list, and history log) for offline reporting.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS (Texas A&M maroon theme) |
| Routing | React Router |
| Icons | lucide-react |
| Backend | Supabase (Auth + real-time database) |

## Live Demo

[Live Dashboard](https://psv-compliance-tracking-dashboard.vercel.app)
