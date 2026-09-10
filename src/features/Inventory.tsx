import { useMemo, useState } from "react";
import { Plus, Download, Filter, ArrowDown, ArrowUp } from "lucide-react";
import { useStore } from "../store";
import {
  displayDate,
  displayTime,
  quantity,
  stockStatus,
  SOURCES,
  today,
  type Gift,
} from "../domain";
import { SearchBox, Pager, Pill, Modal, Field } from "../components/ui";
import { GiftForm } from "./GiftForm";
import { ImportCodes } from "./ImportCodes";
export const STATUS = {
  active: ["green", "Active"],
  inactive: ["gray", "Hidden"],
  error: ["red", "Needs review"],
} as const;
export const STOCK = {
  in: ["green", "In stock"],
  low: ["amber", "Low stock"],
  out: ["red", "Out of stock"],
} as const;
const defaults = { source: "", status: "", min: "", max: "", expiry: "" };
export function Inventory({
  query,
  onQuery,
  city,
  onOpen,
}: {
  query: string;
  onQuery: (s: string) => void;
  city: string;
  onOpen: (sku: string) => void;
}) {
  const { state, actor } = useStore();
  const [chip, setChip] = useState("all");
  const [filters, setFilters] = useState(defaults);
  const [draft, setDraft] = useState(defaults);
  const [modal, setModal] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [sort, setSort] = useState<{
    key: "sku" | "expiry" | "price" | "qty";
    dir: number;
  } | null>(null);
  const filtered = useMemo(
    () =>
      state.gifts
        .map((g) => ({ ...g, qty: quantity(state, g) }))
        .filter((g) => {
          const q = query.trim().toLowerCase();
          const matched =
            [g.sku, g.name, g.source].some((s) =>
              s.toLowerCase().includes(q),
            ) ||
            state.transactions.some(
              (t) => t.sku === g.sku && t.driverId.toLowerCase().includes(q),
            );
          const days = g.expiry
            ? (Date.parse(g.expiry) - Date.parse(today())) / 86400000
            : Infinity;
          return (
            matched &&
            (city === "Nationwide" ||
              g.cities.includes(city as Gift["cities"][number])) &&
            (chip === "all" ||
              (chip === "err"
                ? g.status === "error"
                : stockStatus(g.qty) === chip)) &&
            (!filters.source || g.source === filters.source) &&
            (!filters.status || g.status === filters.status) &&
            (filters.min === "" || g.price >= Number(filters.min)) &&
            (filters.max === "" || g.price <= Number(filters.max)) &&
            (!filters.expiry ||
              (filters.expiry === "expired"
                ? days < 0
                : days >= 0 && days <= 30))
          );
        })
        .sort((a, b) =>
          !sort
            ? 0
            : sort.dir *
              (sort.key === "price" || sort.key === "qty"
                ? a[sort.key] - b[sort.key]
                : (a[sort.key] || "9999").localeCompare(b[sort.key] || "9999")),
        ),
    [state, query, city, chip, filters, sort],
  );
  const maxPage = Math.max(1, Math.ceil(filtered.length / size)),
    currentPage = Math.min(page, maxPage),
    rows = filtered.slice((currentPage - 1) * size, currentPage * size);
  const active = Object.values(filters).filter(Boolean).length;
  function header(label: string, key: NonNullable<typeof sort>["key"]) {
    return (
      <button
        className="sort-btn"
        onClick={() => setSort({ key, dir: sort?.key === key ? -sort.dir : 1 })}
      >
        {label}
        {sort?.key === key && sort.dir < 0 ? (
          <ArrowDown size={12} />
        ) : (
          <ArrowUp size={12} className={sort?.key !== key ? "muted" : ""} />
        )}
      </button>
    );
  }
  return (
    <>
      <section className="card">
        <div className="toolbar">
          <SearchBox
            placeholder="Search by SKU, gift name or source"
            value={query}
            onChange={(v) => {
              onQuery(v);
              setPage(1);
            }}
          />
          <div className="right">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setDraft(filters);
                setModal("filters");
              }}
            >
              <Filter size={14} />
              Filters{active ? ` (${active})` : ""}
            </button>
            <button
              className="btn"
              disabled={actor.role === "Viewer"}
              onClick={() => setModal("import")}
            >
              <Download size={15} />
              Import Code
            </button>
            <button
              className="btn btn-primary"
              disabled={actor.role === "Viewer"}
              onClick={() => setModal("add")}
            >
              <Plus size={15} />
              Add Gift
            </button>
          </div>
        </div>
        <div className="chips">
          {[
            ["all", "All"],
            ["in", "In stock"],
            ["low", "Low stock"],
            ["out", "Out of stock"],
            ["err", "Needs review"],
          ].map(([key, label]) => (
            <button
              className="chip"
              key={key}
              aria-pressed={chip === key}
              onClick={() => {
                setChip(key);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
          {active > 0 && (
            <button
              className="text-btn"
              onClick={() => {
                setFilters(defaults);
                setPage(1);
              }}
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="tw">
          <table className="inventory-table">
            <thead>
              <tr>
                <th
                  aria-sort={
                    sort?.key === "sku"
                      ? sort.dir > 0
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  {header("SKU", "sku")}
                </th>
                <th>Gift name</th>
                <th>{header("Expiry", "expiry")}</th>
                <th className="num">{header("Available", "qty")}</th>
                <th className="num">{header("Point price", "price")}</th>
                <th>Source</th>
                <th>Updated by</th>
                <th>Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => {
                const stock = STOCK[stockStatus(g.qty)],
                  status = STATUS[g.status],
                  days = g.expiry
                    ? Math.ceil(
                        (Date.parse(g.expiry) - Date.parse(today())) / 86400000,
                      )
                    : Infinity;
                return (
                  <tr key={g.sku}>
                    <td>
                      <a
                        className="sku"
                        href={"#/gifts/" + encodeURIComponent(g.sku)}
                        onClick={(e) => {
                          e.preventDefault();
                          onOpen(g.sku);
                        }}
                      >
                        {g.sku}
                      </a>
                    </td>
                    <td>{g.name}</td>
                    <td>
                      {displayDate(g.expiry)}
                      {days <= 30 && (
                        <span
                          className="sub"
                          style={{
                            color: days < 0 ? "var(--red)" : "var(--amber)",
                          }}
                        >
                          {days < 0 ? "Expired" : `${days} days left`}
                        </span>
                      )}
                    </td>
                    <td className="num">{g.qty.toLocaleString()}</td>
                    <td className="num">{g.price.toLocaleString()}</td>
                    <td>{g.source}</td>
                    <td>
                      <span className="user-text">{g.updatedBy}</span>
                      <span className="sub">{displayTime(g.updatedAt)}</span>
                    </td>
                    <td>
                      <Pill kind={stock[0]}>{stock[1]}</Pill>
                    </td>
                    <td>
                      <Pill kind={status[0]}>{status[1]}</Pill>
                    </td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={9}>
                    <div className="empty">
                      No gifts match these filters.
                      <br />
                      <button
                        className="text-btn"
                        onClick={() => {
                          setFilters(defaults);
                          setChip("all");
                          onQuery("");
                        }}
                      >
                        Clear search and filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager
          page={currentPage}
          size={size}
          total={filtered.length}
          onPage={setPage}
          onSize={(n) => {
            setSize(n);
            setPage(1);
          }}
        />
      </section>
      {modal === "add" && <GiftForm onClose={() => setModal("")} />}{" "}
      {modal === "import" && <ImportCodes onClose={() => setModal("")} />}
      {modal === "filters" && (
        <Modal
          title="Filter gift inventory"
          onClose={() => setModal("")}
          footer={
            <>
              <button className="btn" onClick={() => setDraft(defaults)}>
                Reset
              </button>
              <button className="btn btn-primary" form="filters-form">
                Apply filters
              </button>
            </>
          }
        >
          <form
            id="filters-form"
            onSubmit={(e) => {
              e.preventDefault();
              setFilters(draft);
              setPage(1);
              setModal("");
            }}
          >
            <div className="grid2">
              <Field label="Source">
                <select
                  value={draft.source}
                  onChange={(e) =>
                    setDraft({ ...draft, source: e.target.value })
                  }
                >
                  <option value="">All sources</option>
                  {SOURCES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft({ ...draft, status: e.target.value })
                  }
                >
                  <option value="">All statuses</option>
                  {Object.entries(STATUS).map(([key, v]) => (
                    <option key={key} value={key}>
                      {v[1]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Minimum points">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={draft.min}
                  onChange={(e) => setDraft({ ...draft, min: e.target.value })}
                />
              </Field>
              <Field label="Maximum points">
                <input
                  type="number"
                  min={draft.min || 0}
                  step="1"
                  value={draft.max}
                  onChange={(e) => setDraft({ ...draft, max: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Expiry">
              <select
                value={draft.expiry}
                onChange={(e) => setDraft({ ...draft, expiry: e.target.value })}
              >
                <option value="">Any expiry</option>
                <option value="soon">Expires within 30 days</option>
                <option value="expired">Expired</option>
              </select>
            </Field>
          </form>
        </Modal>
      )}
    </>
  );
}
