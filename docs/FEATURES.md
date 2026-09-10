# Feature matrix

| Area | Implemented demo behavior |
|---|---|
| Global multiplier | 0.50–3.00, decimal precision, required reason, preview, timestamp and audit history |
| Approval workflow | Above 2.50 stays pending; separate Head of Ops actor reviews; reject/supersede states |
| Catalog | Create/edit gifts; unique fixed SKU; category/type/source/status; price/expiry; cities; limits |
| Inventory | Stock chips, global and local search, city/source/status/expiry/price filters, sorting, real pagination |
| Codes | CSV file/drop/paste, template, preview, strict date validation, global deduplication, rejected-row CSV |
| Import commit | Valid rows only; current-state revalidation; codes stored; batches and SKU activity recorded |
| Physical gifts | Signed stock adjustments, reason and nonnegative inventory checks |
| Transactions | Demo redemption, stock/points deduction, calendar limits, transaction history, driver profiles, CSV export |
| Detail records | Accurate SKU-specific data and audit trail; no fallback invented transactions |
| Notifications | Derived stock, expiry, review and approval alerts with navigation |
| Persistence | Versioned local storage, reload persistence, cross-tab updates, JSON backup/restore and reset |
| Usability | Responsive layout, keyboard-operable native dialogs, labeled forms, empty/error states, dark mode, ICT times |
| Documentation | Hosted guide, operating instructions, architecture, feature matrix, deploy instructions, QA evidence |

## Not connected to production

The live URL is a functional demo, not a secure internal admin system. Real authentication/SSO, server-enforced roles, shared database, encrypted voucher vault, distributed transaction locks, merchant ingestion, order-point events, physical fulfillment, actual notifications and production monitoring are not implemented. The architecture document specifies those boundaries and an implementation path. No backend account, API key, database or identity provider was supplied.

There is no undo/reversal for a completed demo redemption; restore a backup or reset the demo. There are no pending reservations or delivery states in the demo, so the original fabricated “Reserved / pending” count was removed.
