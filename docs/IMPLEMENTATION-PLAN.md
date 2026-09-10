# AhaBenefits implementation plan

## Scope

Complete the workflows present in `ahabenefits-admin-console.html`, preserving the original as a reference. Default delivery: hosted interactive demo with browser persistence; a shared production system is a separately described architecture until identity and backend requirements are confirmed.

## Design system

Source of truth: supplied HTML and `docs/design/original-desktop.png`. White surfaces, #F4F6F9 canvas, #2563EB primary, #1F2937 text, #E5E7EB borders; Be Vietnam Pro, 14px base, 19px app title, 15.5px section titles, 12px metadata. Cards use 10px corners, buttons 8px; 22px page gutters and 18px panel gaps. Preserve the top bar, breadcrumb, multiplier panel, 9-column gift table, filter chips, detail sections, and modal forms. Use the same line icon treatment. No new sidebar or marketing content.

Primary copy comes from the HTML. Necessary additions: explicit demo labeling; accessible control names; working approval, inventory, import, and redemption states. Correct hardcoded clock, dates, fake page counts, false import success, and placeholder actions. Mobile uses wrapped toolbars and horizontally scrollable data tables.

## Implementation inventory

- React + Vite, typed domain models and pure state transitions.
- Gift create/edit, unique immutable SKU, source/category/type, price, expiry, status, cities, redemption limits.
- Text and driver search, city scope, stock/status/source/expiry/point filters, sortable columns, real pagination.
- Global multiplier 0.50–3.00, two decimal precision, required reason; values above 2.50 remain pending until another demo actor in Head of Ops role approves or rejects.
- CSV upload/drop/paste, template download, strict calendar dates and header validation, duplicate checks within file and across inventory, cutoff 01/10/2026 or today if later, preview, rejected-row report, atomic commit and import history.
- Physical stock adjustments with reasons; simulated driver redemption with balance, stock, status, city, expiry and per-period limit checks; ledger and CSV exports.
- Per-SKU activity log, notifications derived from stock/review/approval conditions.
- Versioned browser persistence, cross-tab refresh, backup/restore, reset, demo actor and theme preferences.
- User guide, features, system design, deployment guide, meaningful domain tests and browser acceptance checks.
