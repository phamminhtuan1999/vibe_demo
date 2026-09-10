import reference from "./reference-data.json";
import { CITIES, type State, type Gift } from "./domain";
const dt = (d: string) => {
  const [day, time = "00:00"] = d.split(" ");
  return day.split("/").reverse().join("-") + "T" + time + ":00+07:00";
};
const iso = (d: string) => new Date(dt(d)).toISOString();
export function seedState(): State {
  const gifts: Gift[] = reference.GIFTS.map((g) => ({
    sku: g.sku,
    name: g.name,
    category: g.cat as Gift["category"],
    type: g.type as Gift["type"],
    expiry: g.exp === "—" ? "" : g.exp.split("/").reverse().join("-"),
    price: g.price,
    source: g.src as Gift["source"],
    status: g.status as Gift["status"],
    cities: [...CITIES],
    limit: Number(g.limit.split(" ")[0]),
    period: g.limit.split("/ ")[1] as Gift["period"],
    stock: g.type === "Physical" ? g.qty : 0,
    updatedBy: g.by,
    updatedAt: iso(g.at),
  }));
  const codes: State["codes"] = reference.GIFTS.flatMap((g) =>
    g.type === "Physical"
      ? []
      : Array.from({ length: g.qty }, (_, i) => ({
          sku: g.sku,
          code: `DEMO-${g.sku}-${String(i + 1).padStart(5, "0")}`,
          expiry: g.exp.split("/").reverse().join("-"),
          status: "available" as const,
          batchId: "seed-" + g.sku,
        })),
  );
  const transactions: State["transactions"] = reference.TXN["GIFT-FUEL-50"].map(
    (t, i) => ({
      id: `seed-tx-${i}`,
      sku: "GIFT-FUEL-50",
      at: iso(t.d),
      driverId: t.who,
      city: t.city as (typeof CITIES)[number],
      points: t.pts,
    }),
  );
  const activities: State["activities"] = gifts.flatMap((g) =>
    g.sku === "GIFT-FUEL-50"
      ? reference.ACT["GIFT-FUEL-50"].map((a, i) => ({
          id: `seed-${g.sku}-${i}`,
          sku: g.sku,
          at: iso(a.d),
          by: a.by,
          action: a.what,
          detail: a.det.replaceAll("&middot;", "·").replaceAll("&rarr;", "→"),
        }))
      : [
          {
            id: `seed-${g.sku}`,
            sku: g.sku,
            at: g.updatedAt,
            by: g.updatedBy,
            action: "Demo inventory initialized",
            detail: `${g.category} · ${g.type}`,
          },
        ],
  );
  return {
    version: 1,
    gifts,
    codes,
    transactions,
    activities,
    drivers: [
      { id: "DRV-448120", city: "Ho Chi Minh City", balance: 5000 },
      { id: "DRV-107765", city: "Ho Chi Minh City", balance: 3500 },
      { id: "DRV-512337", city: "Da Nang", balance: 7200 },
      { id: "DRV-330984", city: "Hanoi", balance: 1000 },
    ],
    multiplier: { value: 1.5, by: "nantt", at: iso("04/09/2026 09:03") },
    approvals: [],
    multiplierHistory: [
      {
        id: "mh-1",
        at: iso("04/09/2026 09:03"),
        by: "nantt",
        from: 1.3,
        to: 1.5,
        reason: "Evening rain surge, all shifts",
      },
      {
        id: "mh-2",
        at: iso("28/08/2026 15:40"),
        by: "nantt",
        from: 1.2,
        to: 1.3,
        reason: "National Day peak week",
      },
    ],
    batches: [],
  };
}
