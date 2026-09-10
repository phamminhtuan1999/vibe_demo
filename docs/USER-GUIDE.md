# AhaBenefits user guide

## Start here

The home screen combines the global shift multiplier and gift inventory. The footer identifies this as an interactive demo; changes save in the current browser. The clock, edit times and calendar limits use Asia/Ho_Chi_Minh (ICT).

1. Open **Add Gift**, fill the required fields and create a unique `GIFT-...` SKU.
2. Open the SKU. For voucher/service gifts, use **Import Code**. For physical gifts, use **Adjust stock**.
3. Check inventory, status, point price, eligible cities and redemption limit.
4. Use **Simulate redemption** to exercise a complete inventory/points transaction against a demo driver.
5. Inspect **Transactions** and **Activity Log**, then export CSV or a full backup.

## Inventory

Search by SKU, gift name or source. Global search also matches driver IDs from redemption history and shows the corresponding gifts. City selection filters gifts by eligibility and detail transactions by redemption city; the global multiplier always applies to every city.

Use stock chips (All / In stock / Low stock / Out of stock / Needs review) together with advanced source, status, point-range and expiry filters. Stock is low below 100 and out at zero. Voucher/service availability counts unredeemed, unexpired codes; physical availability comes from the stock ledger. Sort SKU, expiry, available quantity or price with the table headings. Pagination is based on the filtered result count.

Gift fields: unique immutable SKU, name, category, fixed gift type, source, integer point price, optional expiry, Active/Hidden/Needs review status, eligible cities and per-driver calendar-period limit. New gifts start with zero stock. No deletion action is provided: use Hidden to stop redemptions while retaining history. Adding inventory does not change visibility.

## Import codes

Download the real CSV template, choose a file, drag it onto the dropzone, or expand **Or paste CSV content**. The header must be exactly two columns, `code,expiry` (case-insensitive). Quote fields normally; BOM and CRLF are supported.

```csv
code,expiry
MY-CODE-001,31/12/2026
MY-CODE-002,31/12/2026
```

Codes are trimmed, normalized to uppercase and must contain only letters, numbers, dots, underscores or hyphens, starting with a letter or digit. Dates must be real calendar dates in dd/mm/yyyy format. Expiry must be on or after 01/10/2026, or the current ICT date if later. Codes already present anywhere in the demo, including redeemed codes, are skipped. Repeated valid rows in a file are also skipped.

Review the four validation counts. Download the rejected-row report to correct bad rows. Commit imports only valid rows and rechecks the current inventory. Import history records filename, source, counts, actor and time. Zero-valid imports cannot be committed. The browser demo accepts 2 MB / 10,000 rows per file, with 20,000 codes total; the original mockup’s 500 MB claim is replaced by a practical browser limit.

## Physical gifts

Open **Adjust stock** from the detail screen. Positive integers receive inventory and negative integers remove it. A reason is mandatory; total inventory cannot become negative. Every adjustment is recorded in the activity log.

## Multipliers and approval

Edit the global multiplier between 0.50 and 3.00 with at most two decimal places. A reason is mandatory. Values through 2.50 take effect immediately; values above 2.50 create a pending request while the old multiplier stays active.

To test review, request 2.75 as **nantt · Admin**. Open **Demo settings**, select **hieult · Head of Ops**, and open **Change history**. Enter a review note and approve or reject. The requester cannot review their own request. A newer request or direct update supersedes an older pending request. Completed transactions keep their recorded point price; no history is recalculated.

This demo simulates approval roles. It does not authenticate users or enforce a production security boundary.

## Redemption simulator

Choose an existing demo driver in gift details and confirm **Redeem for … points**. The app checks Active status, nonexpired gift, eligible city, available stock, sufficient balance and the current calendar-period limit. Weeks begin Monday in ICT; month, quarter and year limits use calendar boundaries.

Success consumes one code (earliest expiry first) or physical unit, deducts the recorded point price, and adds a transaction and activity record in the same saved snapshot. The confirmation shows the sample voucher code. No real voucher is issued or driver notified. A driver ID in transactions opens that driver’s history and balance when available.

## Notifications and settings

The bell shows current low/out-of-stock, review, expiry and pending-approval alerts. They resolve as the underlying condition changes. The avatar opens demo actor selection, Light/Dark/System appearance, JSON backup export/restore and reset.

**Viewer** can inspect and export, but mutation controls are disabled. Actor selection resets to Admin on reload. Theme persists. Data refreshes across tabs sharing the origin. Storage is best suited to one active editor at a time; simultaneous writes in separate tabs can race.

Export a backup before clearing browser data or resetting the demo. Restore validates the schema and key inventory references, then asks you to confirm replacement. Keep a backup if your browser is low on storage; failed writes show an error and do not report success.
