import { useState } from "react";
import { Gift as GiftIcon, Pencil, Download, Plus } from "lucide-react";
import { useStore, download } from "../store";
import {
  quantity,
  stockStatus,
  displayDate,
  displayTime,
  toCsv,
  adjustStock,
  redeem,
  type Gift,
} from "../domain";
import { Pill, Empty, Pager, SearchBox, Modal, Field } from "../components/ui";
import { STOCK, STATUS } from "./Inventory";
import { GiftForm } from "./GiftForm";
import { ImportCodes } from "./ImportCodes";
export function GiftDetail({
  gift,
  city,
  onDriver,
}: {
  gift: Gift;
  city: string;
  onDriver: (id: string) => void;
}) {
  const { state, actor, commit } = useStore();
  const g = gift,
    n = quantity(state, g),
    sk = STOCK[stockStatus(n)],
    st = STATUS[g.status];
  const [modal, setModal] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [driver, setDriver] = useState(state.drivers[0]?.id || "");
  const [success, setSuccess] = useState("");
  const txn = state.transactions
    .filter(
      (t) =>
        t.sku === g.sku &&
        (city === "Nationwide" || t.city === city) &&
        t.driverId.toLowerCase().includes(q.toLowerCase()),
    )
    .sort((a, b) => b.at.localeCompare(a.at));
  const currentPage = Math.min(page, Math.max(1, Math.ceil(txn.length / 10)));
  const activity = state.activities.filter((a) => a.sku === g.sku);
  const selectedDriver = state.drivers.find((d) => d.id === driver);
  const details = [
    ["SKU", g.sku],
    ["Gift name", g.name],
    ["Source", g.source],
    ["Point price", `${g.price.toLocaleString()} points`],
    ["Expiry", displayDate(g.expiry)],
    ["Available quantity", n.toLocaleString()],
    ["Category / type", `${g.category} / ${g.type}`],
    ["Eligible cities", g.cities.join(", ")],
    ["Redemption limit", `${g.limit} per driver / ${g.period}`],
    ["Last updated by", `${g.updatedBy} · ${displayTime(g.updatedAt)}`],
  ];
  return (
    <>
      <section className="card">
        <div className="card-head detail-head">
          <div className="art">
            <GiftIcon size={27} />
          </div>
          <div className="titleblock">
            <h2>{g.name}</h2>
            <span className="sub">
              {g.sku} · {g.source}
            </span>
          </div>
          <div className="right">
            <Pill kind={sk[0]}>{sk[1]}</Pill>
            <Pill kind={st[0]}>{st[1]}</Pill>
            <button
              className="btn btn-sm"
              disabled={actor.role === "Viewer"}
              onClick={() => {
                setDelta("");
                setReason("");
                setModal(g.type === "Physical" ? "stock" : "import");
              }}
            >
              {g.type === "Physical" ? (
                <Plus size={14} />
              ) : (
                <Download size={14} />
              )}{" "}
              {g.type === "Physical" ? "Adjust stock" : "Import Code"}
            </button>
            <button
              className="btn btn-sm"
              disabled={actor.role === "Viewer"}
              onClick={() => setModal("edit")}
            >
              <Pencil size={13} />
              Edit
            </button>
          </div>
        </div>
        <div className="card-pad">
          <div className="dl">
            {details.map(([key, val]) => (
              <div key={key}>
                <span className="k">{key}</span>
                <div className="v">{val}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Transactions</h2>
            <span className="sub">
              Driver redemptions of this SKU, newest first.
            </span>
          </div>
          <div className="right">
            <button
              className="btn btn-sm"
              disabled={actor.role === "Viewer"}
              onClick={() => {
                setSuccess("");
                setModal("redeem");
              }}
            >
              Simulate redemption
            </button>
            <button
              className="btn btn-sm"
              onClick={() =>
                download(
                  `${g.sku}-transactions.csv`,
                  toCsv([
                    [
                      "Transaction ID",
                      "Date (ICT)",
                      "Driver",
                      "City",
                      "Points spent",
                    ],
                    ...txn.map((t) => [
                      t.id,
                      displayTime(t.at),
                      t.driverId,
                      t.city,
                      t.points,
                    ]),
                  ]),
                )
              }
            >
              <Download size={13} />
              Export CSV
            </button>
          </div>
        </div>
        <div className="transaction-search">
          <SearchBox
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Search driver ID"
          />
          {city !== "Nationwide" && (
            <span className="hint">Showing {city} redemptions</span>
          )}
        </div>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Driver</th>
                <th>City</th>
                <th className="num">Points spent</th>
              </tr>
            </thead>
            <tbody>
              {txn.slice((currentPage - 1) * 10, currentPage * 10).map((t) => (
                <tr key={t.id}>
                  <td>{displayTime(t.at)}</td>
                  <td>
                    <button
                      className="text-btn"
                      onClick={() => onDriver(t.driverId)}
                    >
                      {t.driverId}
                    </button>
                  </td>
                  <td>{t.city}</td>
                  <td className="num">{t.points.toLocaleString()}</td>
                </tr>
              ))}
              {!txn.length && (
                <tr>
                  <td colSpan={4}>
                    <Empty>No transactions match this city and search.</Empty>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager
          total={txn.length}
          page={currentPage}
          size={10}
          onPage={setPage}
          noun="transactions"
        />
      </section>
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Activity Log</h2>
            <span className="sub">Configuration changes made to this SKU.</span>
          </div>
        </div>
        <div className="card-pad">
          {activity.length ? (
            activity.map((a) => (
              <div className="logrow" key={a.id}>
                <div>
                  <div className="t">{a.action}</div>
                  <div className="m">{a.detail}</div>
                </div>
                <div className="r">
                  <div>{a.by}</div>
                  <div className="m">{displayTime(a.at)}</div>
                </div>
              </div>
            ))
          ) : (
            <Empty>No activity yet.</Empty>
          )}
        </div>
      </section>
      {modal === "edit" && <GiftForm gift={g} onClose={() => setModal("")} />}{" "}
      {modal === "import" && (
        <ImportCodes preset={g.sku} onClose={() => setModal("")} />
      )}
      {modal === "stock" && (
        <Modal
          title="Adjust physical stock"
          onClose={() => setModal("")}
          footer={
            <>
              <button className="btn" onClick={() => setModal("")}>
                Cancel
              </button>
              <button className="btn btn-primary" form="stock-form">
                Save adjustment
              </button>
            </>
          }
        >
          <form
            id="stock-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                commit(
                  (s) => adjustStock(s, g.sku, Number(delta), reason, actor),
                  "Physical stock updated.",
                )
              )
                setModal("");
            }}
          >
            <p>
              {g.name} · {n} units available
            </p>
            <Field
              label="Quantity change *"
              help="Positive to add units, negative to remove units."
            >
              <input
                type="number"
                required
                step="1"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
              />
            </Field>
            <Field label="Reason *">
              <textarea
                required
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <div className="callout">
              <b>Result</b>
              <span>{n + Number(delta)} units after this adjustment.</span>
            </div>
          </form>
        </Modal>
      )}
      {modal === "redeem" && (
        <Modal
          title="Simulate a driver redemption"
          onClose={() => setModal("")}
          footer={
            <>
              <button className="btn" onClick={() => setModal("")}>
                {success ? "Close" : "Cancel"}
              </button>
              {!success && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    let result = "";
                    if (
                      commit((s) => {
                        const next = redeem(s, g.sku, driver, actor);
                        result =
                          next.transactions[0].code ||
                          "Physical gift reserved for collection";
                        return next;
                      }, "Demo redemption completed.")
                    )
                      setSuccess(result);
                  }}
                >
                  Redeem for {g.price.toLocaleString()} points
                </button>
              )}
            </>
          }
        >
          {success ? (
            <div className="callout success">
              <b>Redemption complete</b>
              <span>{success}</span>
              <span>
                Stock, driver balance, transaction history, and activity log are
                updated.
              </span>
            </div>
          ) : (
            <>
              <p>
                {g.name} · {n.toLocaleString()} available
              </p>
              <Field label="Driver">
                <select
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                >
                  {state.drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.id} · {d.city}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="callout">
                <b>
                  {selectedDriver?.balance.toLocaleString()} points available
                </b>
                <span>
                  {g.limit} redemption{g.limit > 1 ? "s" : ""} per {g.period}.
                  Status, stock, expiry, city, balance, and limits are checked
                  before deduction.
                </span>
              </div>
              <p className="hint">
                Demo only. No voucher is issued to a real driver.
              </p>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
export function DriverModal({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { state } = useStore();
  const driver = state.drivers.find((d) => d.id === id);
  const tx = state.transactions.filter((t) => t.driverId === id);
  return (
    <Modal
      title={`Driver ${id}`}
      onClose={onClose}
      wide
      footer={
        <button className="btn" onClick={onClose}>
          Close
        </button>
      }
    >
      {driver ? (
        <div className="callout">
          <b>{driver.balance.toLocaleString()} points</b>
          <span>{driver.city} · Demo driver</span>
        </div>
      ) : (
        <p className="hint">
          Historical demo driver. Current balance is not available.
        </p>
      )}
      <h3>Redemption history</h3>
      {tx.length ? (
        tx.map((t) => (
          <div className="logrow" key={t.id}>
            <div>
              <div className="t">
                {state.gifts.find((g) => g.sku === t.sku)?.name || t.sku}
              </div>
              <div className="m">
                {t.sku} · {displayTime(t.at)}
              </div>
            </div>
            <div className="r">{t.points.toLocaleString()} points</div>
          </div>
        ))
      ) : (
        <Empty>No redemptions yet.</Empty>
      )}
    </Modal>
  );
}
