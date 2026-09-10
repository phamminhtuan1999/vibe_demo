import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { seedState } from "../src/seed";
import {
  ACTORS,
  parseCodes,
  importCodes,
  quantity,
  saveGift,
  setMultiplier,
  reviewMultiplier,
  redeem,
  adjustStock,
  validateBackup,
  toCsv,
  type Gift,
} from "../src/domain";
const admin = ACTORS[0],
  ops = ACTORS[1],
  viewer = ACTORS[2];
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-10T14:00:00Z"));
});
afterEach(() => vi.useRealTimers());
describe("gift management", () => {
  it("creates empty inventory with a durable audit record", () => {
    const s = seedState();
    const g = {
      ...s.gifts[0],
      sku: "GIFT-TEST",
      name: "Test gift",
      stock: 500,
    };
    const next = saveGift(s, g, admin);
    expect(next.gifts.at(-1)?.stock).toBe(0);
    expect(quantity(next, next.gifts.at(-1)!)).toBe(0);
    expect(next.activities[0].action).toBe("SKU created");
    expect(s.gifts).toHaveLength(8);
  });
  it("rejects duplicate SKUs, invalid dates, fractional prices, and missing cities", () => {
    const s = seedState();
    expect(() => saveGift(s, s.gifts[0], admin)).toThrow("already exists");
    for (const changes of [
      { expiry: "2026-02-31" },
      { price: 1.5 },
      { cities: [] },
    ])
      expect(() =>
        saveGift(s, { ...s.gifts[0], sku: "GIFT-TEST", ...changes }, admin),
      ).toThrow();
  });
  it("edits settings without silently changing stock or type", () => {
    const s = seedState();
    const g = s.gifts[6];
    const n = saveGift(s, { ...g, price: 4000, stock: 2000 }, admin, true);
    expect(n.gifts[6].stock).toBe(150);
    expect(n.gifts[6].price).toBe(4000);
    expect(n.activities[0].detail).toContain("3500 → 4000");
    expect(() => saveGift(s, { ...g, type: "Service" }, admin, true)).toThrow(
      "type cannot change",
    );
  });
  it("enforces read-only actor permissions", () => {
    const s = seedState();
    expect(() =>
      saveGift(s, { ...s.gifts[0], sku: "GIFT-NEW" }, viewer),
    ).toThrow("read-only");
    expect(() => adjustStock(s, "GIFT-RAIN-KIT", 2, "test", viewer)).toThrow();
    expect(() => redeem(s, "GIFT-FUEL-50", "DRV-448120", viewer)).toThrow();
  });
});
describe("CSV pipeline", () => {
  it("supports quotes, BOM, CRLF, strict dates, deduplication and cutoff", () => {
    const s = seedState();
    const csv =
      '\uFEFFcode,expiry\r\n"TEST-1","31/12/2026"\r\nTEST-1,31/12/2026\r\nBAD,31/02/2026\r\nEARLY,30/09/2026\r\nTEST-2,01/10/2026';
    const p = parseCodes(csv, s);
    expect(p).toMatchObject({
      valid: 2,
      duplicate: 1,
      expired: 1,
      malformed: 1,
      total: 5,
    });
  });
  it("rejects invalid headers and malformed quoting", () => {
    expect(() => parseCodes("name,date\na,b", seedState())).toThrow(
      "code,expiry",
    );
    expect(() =>
      parseCodes('code,expiry\n"ABC,31/12/2026', seedState()),
    ).toThrow("parsed");
  });
  it("imports actual codes, records history, and revalidates repeat uploads", () => {
    const s = seedState();
    const csv = "code,expiry\nUNIQUE-1,31/12/2026";
    const next = importCodes(
      s,
      "GIFT-DATA-5GB",
      csv,
      "file.csv",
      "Aggregator",
      admin,
    );
    expect(quantity(next, next.gifts[7])).toBe(1);
    expect(next.codes.at(-1)?.code).toBe("UNIQUE-1");
    expect(next.batches[0].valid).toBe(1);
    expect(parseCodes(csv, next).duplicate).toBe(1);
    expect(() =>
      importCodes(next, "GIFT-DATA-5GB", csv, "file.csv", "Aggregator", admin),
    ).toThrow("No valid");
  });
  it("deduplicates codes globally across SKUs and does not publish hidden gifts", () => {
    let s = seedState();
    s.gifts[7].status = "inactive";
    const csv = "code,expiry\nUNIQUE-1,31/12/2026";
    s = importCodes(s, "GIFT-DATA-5GB", csv, "file.csv", "Aggregator", admin);
    expect(s.gifts[7].status).toBe("inactive");
    expect(() =>
      importCodes(s, "GIFT-FUEL-50", csv, "file.csv", "In-house", admin),
    ).toThrow("No valid");
  });
  it("rejects physical SKU uploads and input limits", () => {
    expect(() =>
      importCodes(
        seedState(),
        "GIFT-RAIN-KIT",
        "code,expiry\nA,31/12/2026",
        "f.csv",
        "In-house",
        admin,
      ),
    ).toThrow("voucher or service");
    expect(() =>
      parseCodes("a".repeat(2 * 1024 * 1024 + 1), seedState()),
    ).toThrow("2 MB");
    expect(() =>
      parseCodes("code,expiry\n" + "A,31/12/2026\n".repeat(10001), seedState()),
    ).toThrow("10,000");
  });
  it("moves the cutoff forward with the real ICT date", () => {
    vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
    expect(parseCodes("code,expiry\nA,31/12/2026", seedState()).expired).toBe(
      1,
    );
  });
  it("escapes spreadsheet formulas in exported cells", () => {
    expect(toCsv([["name"], ['=HYPERLINK("bad")']])).toContain("'=HYPERLINK");
  });
});
describe("multiplier approvals", () => {
  it("applies ordinary updates but never retroactively edits transactions", () => {
    const s = seedState();
    const n = setMultiplier(s, 2.5, "Rain coverage", admin);
    expect(n.multiplier.value).toBe(2.5);
    expect(n.transactions).toEqual(s.transactions);
    expect(n.multiplierHistory[0].reason).toBe("Rain coverage");
  });
  it("does not activate requests above 2.50 before independent approval", () => {
    const s = setMultiplier(seedState(), 2.75, "Peak hours", admin);
    expect(s.multiplier.value).toBe(1.5);
    expect(s.approvals[0].status).toBe("pending");
    expect(() =>
      reviewMultiplier(s, s.approvals[0].id, true, "OK", admin),
    ).toThrow("Head of Ops");
    const n = reviewMultiplier(
      s,
      s.approvals[0].id,
      true,
      "Approved coverage",
      ops,
    );
    expect(n.multiplier.value).toBe(2.75);
    expect(n.approvals[0].reviewer).toBe("hieult");
  });
  it("blocks self approval and rejects without applying", () => {
    const s = setMultiplier(seedState(), 2.8, "Peak", ops);
    expect(() =>
      reviewMultiplier(s, s.approvals[0].id, true, "OK", ops),
    ).toThrow("own request");
    const a = setMultiplier(seedState(), 2.8, "Peak", admin);
    const n = reviewMultiplier(a, a.approvals[0].id, false, "Too high", ops);
    expect(n.multiplier.value).toBe(1.5);
    expect(n.approvals[0].status).toBe("rejected");
  });
  it("supersedes stale pending requests and prevents double review", () => {
    let s = setMultiplier(seedState(), 2.75, "Peak", admin);
    const id = s.approvals[0].id;
    s = setMultiplier(s, 2, "Adjusted plan", admin);
    expect(s.approvals[0].status).toBe("superseded");
    expect(() => reviewMultiplier(s, id, true, "OK", ops)).toThrow(
      "no longer pending",
    );
  });
  it("validates bounds, precision, reason, and viewer access", () => {
    for (const v of [0.4, 3.01, 1.001, NaN])
      expect(() => setMultiplier(seedState(), v, "why", admin)).toThrow();
    expect(() => setMultiplier(seedState(), 2, " ", admin)).toThrow("reason");
    expect(() => setMultiplier(seedState(), 2, "why", viewer)).toThrow(
      "read-only",
    );
  });
});
describe("redemption and physical stock", () => {
  it("atomically decrements inventory and points, records immutable price and audit", () => {
    const s = seedState();
    const n = redeem(s, "GIFT-FUEL-50", "DRV-448120", admin);
    expect(quantity(n, n.gifts[0])).toBe(1181);
    expect(n.drivers[0].balance).toBe(4200);
    expect(n.transactions[0].points).toBe(800);
    expect(n.transactions[0].code).toBeTruthy();
    expect(n.activities[0].action).toContain("redemption");
    expect(s.drivers[0].balance).toBe(5000);
  });
  it("enforces per-driver current-calendar-week limit", () => {
    let s = seedState();
    s = redeem(s, "GIFT-FUEL-50", "DRV-448120", admin);
    s = redeem(s, "GIFT-FUEL-50", "DRV-448120", admin);
    expect(() => redeem(s, "GIFT-FUEL-50", "DRV-448120", admin)).toThrow(
      "limit reached",
    );
  });
  it("checks status, stock, city, balance, and expiry", () => {
    for (const [changes, message] of [
      [{ status: "inactive" }, "active"],
      [{ cities: ["Hanoi"] }, "city"],
      [{ price: 9999 }, "insufficient"],
      [{ expiry: "2026-09-01" }, "expired"],
    ] as [Partial<Gift>, string][]) {
      const s = seedState();
      Object.assign(s.gifts[0], changes);
      expect(() => redeem(s, "GIFT-FUEL-50", "DRV-448120", admin)).toThrow(
        message,
      );
    }
    expect(() =>
      redeem(seedState(), "GIFT-DATA-5GB", "DRV-448120", admin),
    ).toThrow("out of stock");
  });
  it("redeems earliest-expiring valid code first", () => {
    const s = seedState();
    s.codes.unshift(
      {
        code: "EXPIRED",
        sku: "GIFT-FUEL-50",
        expiry: "2026-09-01",
        status: "available",
        batchId: "test",
      },
      {
        code: "SOON",
        sku: "GIFT-FUEL-50",
        expiry: "2026-09-11",
        status: "available",
        batchId: "test",
      },
    );
    const n = redeem(s, "GIFT-FUEL-50", "DRV-448120", admin);
    expect(n.transactions[0].code).toBe("SOON");
  });
  it("adjusts physical stock without publishing and prevents negative inventory", () => {
    let s = adjustStock(
      seedState(),
      "GIFT-RAIN-KIT",
      10,
      "New delivery",
      admin,
    );
    expect(s.gifts[3].stock).toBe(10);
    expect(s.gifts[3].status).toBe("inactive");
    expect(() =>
      adjustStock(s, "GIFT-RAIN-KIT", -11, "Correction", admin),
    ).toThrow();
    s.gifts[3].status = "active";
    s = redeem(s, "GIFT-RAIN-KIT", "DRV-448120", admin);
    expect(s.gifts[3].stock).toBe(9);
  });
});
describe("backup integrity", () => {
  it("round trips the demo through validated JSON", () => {
    const s = seedState();
    expect(validateBackup(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
  it("rejects invalid versions, duplicate codes, and orphan references", () => {
    const s = seedState();
    expect(() => validateBackup({ ...s, version: 2 })).toThrow();
    expect(() =>
      validateBackup({ ...s, codes: [s.codes[0], s.codes[0]] }),
    ).toThrow("duplicate");
    expect(() => validateBackup({ ...s, gifts: [] })).toThrow("orphan");
  });
});
