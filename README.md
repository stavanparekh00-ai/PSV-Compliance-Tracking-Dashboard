# Boiler Inspection Management System

A web application for maintenance teams to track industrial boilers and their recurring safety inspections — from scheduling through repairs to final certification. Built to support both individual use and shared, real-time team collaboration.

## Overview

The system gives maintenance teams a single source of truth for the status of every boiler in their fleet — what's due for inspection, what's currently being inspected, what's failed and needs repair, and what's fully certified. Every action is logged, so the full inspection and repair history of any unit is always available.

## Features

- **Fleet Overview** — Each boiler is displayed as a card showing name, type, capacity, location, and a color-coded status indicator with a five-stage tracker showing exactly where it sits in the inspection workflow:
  - 🔴 Red — Failed last inspection, repairs required
  - 🟠 Amber — Inspection in progress
  - 🟢 Green — Passed, all steps complete
  - ⚪ Gray — No inspection started

  Overdue and upcoming inspections are flagged automatically.

- **Detail View** — Editable technical specifications alongside the active inspection workflow, plus a full history tab showing every past inspection with timelines, notes, and repair logs.

- **Inspection Workflow** — Inspections are logged with date, notes, and outcome. A pass moves the unit through a five-step certification process (Inspection Done → Invoice Received → PO Issued → Certificate Received → Certificate Installed), each step timestamped automatically. A fail opens a repair workflow that tracks repairs through to re-inspection.

- **Dashboard Summary** — At-a-glance metrics: total boilers, active inspections, failed units, and average inspection duration, alongside a schedule of upcoming/overdue inspections and units currently under repair.

- **Audit Trail** — Every edit to specs, inspection results, or workflow status is recorded with before/after values and is fully searchable.

- **Data Export** — Per-boiler and fleet-wide CSV reports for offline reporting and recordkeeping.

- **Real-Time Multi-User Sync** — Built on Supabase, allowing multiple team members to view and update the same live data simultaneously, with authentication to control access.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend | Supabase (Auth + real-time database) |

## Live Demo

[Add your demo link here]
