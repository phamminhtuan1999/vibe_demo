import Papa from "papaparse";
import { z } from "zod";
export const CITIES = ["Ho Chi Minh City", "Hanoi", "Da Nang"] as const;
export const SOURCES = ["In-house", "Merchant pool", "Aggregator"] as const;
export type Actor = { id: string; role: "Admin" | "Head of Ops" | "Viewer" };
export const ACTORS: Actor[] = [
  { id: "nantt", role: "Admin" },
  { id: "hieult", role: "Head of Ops" },
  { id: "reviewer", role: "Viewer" },
];
const iso = z.string().datetime();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Invalid calendar date",
  );
export const giftSchema = z.object({
  sku: z.string().regex(/^GIFT-[A-Z0-9-]{1,40}$/),
  name: z.string().trim().min(2).max(120),
  category: z.enum(["Fuel", "Telco", "Vehicle", "Gear", "Food", "Other"]),
  type: z.enum(["Voucher code", "Service", "Physical"]),
  expiry: z.union([date, z.literal("")]),
  price: z.number().int().min(1).max(10000000),
  source: z.enum(SOURCES),
  status: z.enum(["active", "inactive", "error"]),
  cities: z.array(z.enum(CITIES)).min(1),
  limit: z.number().int().min(1).max(100),
  period: z.enum(["week", "month", "quarter", "year"]),
  stock: z.number().int().nonnegative().max(1000000),
  updatedBy: z.string(),
  updatedAt: iso,
});
export type Gift = z.infer<typeof giftSchema>;
const codeSchema = z.object({
  code: z.string().min(1).max(100),
  sku: z.string(),
  expiry: date,
  status: z.enum(["available", "redeemed"]),
  batchId: z.string(),
});
export type Code = z.infer<typeof codeSchema>;
const activitySchema = z.object({
  id: z.string(),
  sku: z.string(),
  at: iso,
  by: z.string(),
  action: z.string(),
  detail: z.string(),
});
const txnSchema = z.object({
  id: z.string(),
  sku: z.string(),
  at: iso,
  driverId: z.string(),
  city: z.enum(CITIES),
  points: z.number().int().nonnegative(),
  code: z.string().optional(),
});
const multiplierSchema = z.object({
  value: z.number().min(0.5).max(3),
  by: z.string(),
  at: iso,
});
const approvalSchema = z.object({
  id: z.string(),
  value: z.number().min(0.5).max(3),
  previous: z.number(),
  by: z.string(),
  at: iso,
  reason: z.string(),
  status: z.enum(["pending", "approved", "rejected", "superseded"]),
  reviewer: z.string().optional(),
  reviewedAt: iso.optional(),
  reviewNote: z.string().optional(),
});
export const stateSchema = z.object({
  version: z.literal(1),
  gifts: z.array(giftSchema).max(1000),
  codes: z.array(codeSchema).max(20000),
  activities: z.array(activitySchema),
  transactions: z.array(txnSchema),
  drivers: z.array(
    z.object({
      id: z.string(),
      city: z.enum(CITIES),
      balance: z.number().int().nonnegative(),
    }),
  ),
  multiplier: multiplierSchema,
  approvals: z.array(approvalSchema),
  multiplierHistory: z.array(
    z.object({
      id: z.string(),
      at: iso,
      by: z.string(),
      from: z.number(),
      to: z.number(),
      reason: z.string(),
    }),
  ),
  batches: z.array(
    z.object({
      id: z.string(),
      sku: z.string(),
      at: iso,
      by: z.string(),
      filename: z.string(),
      source: z.enum(SOURCES),
      valid: z.number(),
      duplicate: z.number(),
      expired: z.number(),
      malformed: z.number(),
    }),
  ),
});
export type State = z.infer<typeof stateSchema>;
export const uid = () => crypto.randomUUID();
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const displayDate = (v: string) =>
  v ? v.split("-").reverse().join("/") : "—";
export const displayTime = (v: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  })
    .format(new Date(v))
    .replace(",", "");
export const quantity = (s: State, g: Gift) =>
  g.type === "Physical"
    ? g.stock
    : s.codes.filter(
        (c) =>
          c.sku === g.sku && c.status === "available" && c.expiry >= today(),
      ).length;
export const stockStatus = (n: number) =>
  n === 0 ? "out" : n < 100 ? "low" : "in";
function editable(actor: Actor) {
  if (actor.role === "Viewer")
    throw Error(
      "Viewer access is read-only. Select an admin in Demo settings.",
    );
}
function activity(
  s: State,
  sku: string,
  actor: Actor,
  action: string,
  detail: string,
) {
  s.activities.unshift({
    id: uid(),
    sku,
    by: actor.id,
    at: new Date().toISOString(),
    action,
    detail,
  });
}
export function saveGift(
  state: State,
  input: unknown,
  actor: Actor,
  editing = false,
): State {
  editable(actor);
  const gift = giftSchema.parse(input);
  const s = structuredClone(state);
  const existing = s.gifts.find((g) => g.sku === gift.sku);
  if (!editing && s.gifts.length >= 1000)
    throw Error("The demo supports up to 1,000 gifts.");
  if (!editing && existing)
    throw Error("This SKU already exists. Choose a unique SKU.");
  if (editing && !existing) throw Error("Gift no longer exists.");
  if (existing && gift.type !== existing.type)
    throw Error("Gift type cannot change after creation.");
  if (gift.expiry && gift.expiry < today())
    throw Error("Gift expiry must be today or later.");
  gift.updatedAt = new Date().toISOString();
  gift.updatedBy = actor.id;
  if (existing) {
    gift.stock = existing.stock;
    s.gifts[s.gifts.indexOf(existing)] = gift;
    activity(
      s,
      gift.sku,
      actor,
      "Gift updated",
      Object.keys(gift)
        .filter(
          (k) =>
            !["updatedAt", "updatedBy"].includes(k) &&
            JSON.stringify(gift[k as keyof Gift]) !==
              JSON.stringify(existing[k as keyof Gift]),
        )
        .map(
          (k) =>
            `${k}: ${String(existing[k as keyof Gift])} → ${String(gift[k as keyof Gift])}`,
        )
        .join("; ") || "Details saved",
    );
  } else {
    gift.stock = 0;
    s.gifts.push(gift);
    activity(
      s,
      gift.sku,
      actor,
      "SKU created",
      `${gift.category} · ${gift.type}`,
    );
  }
  return s;
}
export function setMultiplier(
  state: State,
  value: number,
  reason: string,
  actor: Actor,
): State {
  editable(actor);
  if (
    !Number.isFinite(value) ||
    value < 0.5 ||
    value > 3 ||
    Math.abs(value * 100 - Math.round(value * 100)) > 1e-8
  )
    throw Error("Use 0.50–3.00 with at most two decimal places.");
  if (!reason.trim()) throw Error("A reason is required.");
  if (value === state.multiplier.value)
    throw Error("Enter a different multiplier.");
  const s = structuredClone(state);
  const at = new Date().toISOString();
  s.approvals
    .filter((a) => a.status === "pending")
    .forEach((a) => (a.status = "superseded"));
  if (value > 2.5)
    s.approvals.unshift({
      id: uid(),
      value,
      previous: s.multiplier.value,
      by: actor.id,
      at,
      reason: reason.trim(),
      status: "pending",
    });
  else {
    s.multiplierHistory.unshift({
      id: uid(),
      at,
      by: actor.id,
      from: s.multiplier.value,
      to: value,
      reason: reason.trim(),
    });
    s.multiplier = { value, by: actor.id, at };
  }
  return s;
}
export function reviewMultiplier(
  state: State,
  id: string,
  approve: boolean,
  note: string,
  actor: Actor,
): State {
  if (actor.role !== "Head of Ops")
    throw Error("Only Head of Ops can review multiplier requests.");
  const s = structuredClone(state);
  const a = s.approvals.find((a) => a.id === id);
  if (!a || a.status !== "pending")
    throw Error("This request is no longer pending.");
  if (a.by === actor.id)
    throw Error("The requester cannot approve their own request.");
  if (!note.trim()) throw Error("A review note is required.");
  if (a.previous !== s.multiplier.value)
    throw Error("Multiplier changed. Submit a new request.");
  a.status = approve ? "approved" : "rejected";
  a.reviewer = actor.id;
  a.reviewNote = note;
  a.reviewedAt = new Date().toISOString();
  if (approve) {
    s.multiplierHistory.unshift({
      id: uid(),
      at: a.reviewedAt,
      by: actor.id,
      from: s.multiplier.value,
      to: a.value,
      reason: `${a.reason} · Approved: ${note}`,
    });
    s.multiplier = { value: a.value, by: actor.id, at: a.reviewedAt };
  }
  return s;
}
export type ImportRow = {
  row: number;
  code: string;
  expiry: string;
  status: "valid" | "duplicate" | "expired" | "malformed";
  reason: string;
};
export type ImportPreview = {
  rows: ImportRow[];
  valid: number;
  duplicate: number;
  expired: number;
  malformed: number;
  total: number;
};
export const importCutoff = () =>
  today() > "2026-10-01" ? today() : "2026-10-01";
export function parseCodes(text: string, state: State): ImportPreview {
  if (new TextEncoder().encode(text).length > 2 * 1024 * 1024)
    throw Error("CSV files must be 2 MB or smaller.");
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ""), {
    skipEmptyLines: "greedy",
  });
  if (parsed.errors.length)
    throw Error("CSV could not be parsed. Check quotes and delimiters.");
  const [headers, ...data] = parsed.data;
  if (
    !headers ||
    headers.length !== 2 ||
    headers[0].trim().toLowerCase() !== "code" ||
    headers[1].trim().toLowerCase() !== "expiry"
  )
    throw Error("CSV must start with exactly: code,expiry");
  if (data.length > 10000) throw Error("Import at most 10,000 rows at a time.");
  const seen = new Set(state.codes.map((c) => c.code.toUpperCase()));
  const rows: ImportRow[] = data.map((r, i) => {
    const code = (r[0] || "").trim().toUpperCase();
    const raw = (r[1] || "").trim();
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
    const expiry = match ? `${match[3]}-${match[2]}-${match[1]}` : "";
    let status: ImportRow["status"] = "valid";
    let reason = "Ready to import";
    if (
      r.length !== 2 ||
      !/^[A-Z0-9][A-Z0-9._-]{0,99}$/.test(code) ||
      !date.safeParse(expiry).success
    ) {
      status = "malformed";
      reason = "Use a valid code and calendar date (dd/mm/yyyy).";
    } else if (seen.has(code)) {
      status = "duplicate";
      reason = "Code already exists in this file or inventory.";
    } else if (expiry < importCutoff()) {
      status = "expired";
      reason = `Expiry must be ${displayDate(importCutoff())} or later.`;
    }
    if (status === "valid") seen.add(code);
    return { row: i + 2, code, expiry: expiry || raw, status, reason };
  });
  return {
    rows,
    total: rows.length,
    valid: rows.filter((r) => r.status === "valid").length,
    duplicate: rows.filter((r) => r.status === "duplicate").length,
    expired: rows.filter((r) => r.status === "expired").length,
    malformed: rows.filter((r) => r.status === "malformed").length,
  };
}
export function importCodes(
  state: State,
  sku: string,
  text: string,
  filename: string,
  source: Gift["source"],
  actor: Actor,
): State {
  editable(actor);
  const s = structuredClone(state);
  const g = s.gifts.find((g) => g.sku === sku);
  if (!g || g.type === "Physical")
    throw Error("Choose a voucher or service SKU.");
  const p = parseCodes(text, s);
  if (!p.valid) throw Error("No valid codes to import.");
  if (s.codes.length + p.valid > 20000)
    throw Error(
      "Demo storage supports 20,000 codes. Export a backup and reset before adding more.",
    );
  const id = uid();
  s.codes.push(
    ...p.rows
      .filter((r) => r.status === "valid")
      .map((r) => ({
        code: r.code,
        expiry: r.expiry,
        sku,
        status: "available" as const,
        batchId: id,
      })),
  );
  s.batches.unshift({
    id,
    sku,
    at: new Date().toISOString(),
    by: actor.id,
    filename,
    source,
    valid: p.valid,
    duplicate: p.duplicate,
    expired: p.expired,
    malformed: p.malformed,
  });
  g.updatedBy = actor.id;
  g.updatedAt = new Date().toISOString();
  activity(
    s,
    sku,
    actor,
    `Imported ${p.valid.toLocaleString()} codes`,
    `${filename} · ${source} · skipped ${p.duplicate} duplicate, ${p.expired} expiring, ${p.malformed} malformed`,
  );
  return s;
}
export function adjustStock(
  state: State,
  sku: string,
  delta: number,
  reason: string,
  actor: Actor,
): State {
  editable(actor);
  const s = structuredClone(state);
  const g = s.gifts.find((g) => g.sku === sku);
  if (!g || g.type !== "Physical")
    throw Error("Stock adjustments are for physical gifts.");
  if (
    !Number.isSafeInteger(delta) ||
    delta === 0 ||
    g.stock + delta < 0 ||
    g.stock + delta > 1000000
  )
    throw Error(
      "Enter a nonzero whole number that keeps stock between 0 and 1,000,000.",
    );
  if (!reason.trim()) throw Error("A stock adjustment reason is required.");
  g.stock += delta;
  g.updatedAt = new Date().toISOString();
  g.updatedBy = actor.id;
  activity(
    s,
    sku,
    actor,
    "Stock adjusted",
    `${delta > 0 ? "+" : ""}${delta} units · ${reason}`,
  );
  return s;
}
function periodKey(at: string, period: Gift["period"]) {
  const v = new Date(at);
  const local = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(v);
  const d = new Date(local + "T00:00:00Z");
  if (period === "week") {
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  }
  const y = d.getUTCFullYear(),
    m = d.getUTCMonth();
  return period === "year"
    ? `${y}`
    : period === "quarter"
      ? `${y}-${Math.floor(m / 3)}`
      : `${y}-${m}`;
}
export function redeem(
  state: State,
  sku: string,
  driverId: string,
  actor: Actor,
): State {
  editable(actor);
  const s = structuredClone(state),
    g = s.gifts.find((g) => g.sku === sku),
    d = s.drivers.find((d) => d.id === driverId);
  if (!g || !d) throw Error("Select an existing gift and driver.");
  if (g.status !== "active") throw Error("Only active gifts can be redeemed.");
  if (g.expiry && g.expiry < today()) throw Error("This gift has expired.");
  if (!g.cities.includes(d.city))
    throw Error("This gift is unavailable in the driver’s city.");
  if (quantity(s, g) < 1) throw Error("This gift is out of stock.");
  if (d.balance < g.price) throw Error("The driver has insufficient points.");
  const at = new Date().toISOString();
  if (
    s.transactions.filter(
      (t) =>
        t.sku === sku &&
        t.driverId === driverId &&
        periodKey(t.at, g.period) === periodKey(at, g.period),
    ).length >= g.limit
  )
    throw Error(`Redemption limit reached: ${g.limit} per ${g.period}.`);
  let code: Code | undefined;
  if (g.type === "Physical") g.stock--;
  else {
    code = s.codes
      .filter(
        (c) => c.sku === sku && c.status === "available" && c.expiry >= today(),
      )
      .sort((a, b) => a.expiry.localeCompare(b.expiry))[0];
    code.status = "redeemed";
  }
  d.balance -= g.price;
  s.transactions.unshift({
    id: uid(),
    sku,
    at,
    driverId,
    city: d.city,
    points: g.price,
    code: code?.code,
  });
  activity(
    s,
    sku,
    actor,
    "Demo redemption completed",
    `${driverId} · ${g.price} points · ${code?.code || "1 physical unit"}`,
  );
  return s;
}
export function toCsv(rows: unknown[][]) {
  return (
    "\uFEFF" +
    Papa.unparse(
      rows.map((row) =>
        row.map((v) =>
          typeof v === "string" && /^[\s]*[=+\-@]/.test(v) ? `'${v}` : v,
        ),
      ),
    )
  );
}
export function validateBackup(input: unknown): State {
  const s = stateSchema.parse(input);
  if (new Set(s.gifts.map((g) => g.sku)).size !== s.gifts.length)
    throw Error("Backup contains duplicate SKUs.");
  if (new Set(s.codes.map((c) => c.code.toUpperCase())).size !== s.codes.length)
    throw Error("Backup contains duplicate codes.");
  const skus = new Set(s.gifts.map((g) => g.sku));
  if (
    s.codes.some((c) => !skus.has(c.sku)) ||
    s.transactions.some((t) => !skus.has(t.sku))
  )
    throw Error("Backup contains orphan inventory records.");
  return s;
}
