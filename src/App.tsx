import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Clock,
  MapPin,
  Settings as SettingsIcon,
} from "lucide-react";
import { useStore } from "./store";
import { CITIES, quantity, displayDate, today } from "./domain";
import { SearchBox, Modal, Empty } from "./components/ui";
import { Multiplier } from "./features/Multiplier";
import { Inventory } from "./features/Inventory";
import { GiftDetail, DriverModal } from "./features/GiftDetail";
import { Settings } from "./features/Settings";
function route() {
  try {
    return decodeURIComponent(
      location.hash.match(/^#\/gifts\/(.+)$/)?.[1] || "",
    );
  } catch {
    return "";
  }
}
export default function App() {
  const { state, actor, notice, storageError } = useStore();
  const [sku, setSku] = useState(route);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("Ho Chi Minh City");
  const [overlay, setOverlay] = useState("");
  const [driver, setDriver] = useState("");
  const [now, setNow] = useState(new Date());
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("aha-theme") || "light";
    } catch {
      return "light";
    }
  });
  useEffect(() => {
    const f = () => {
      setSku(route());
      window.scrollTo(0, 0);
    };
    addEventListener("hashchange", f);
    return () => removeEventListener("hashchange", f);
  }, []);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("aha-theme", theme);
    } catch {
      /* Theme remains available without storage. */
    }
  }, [theme]);
  const gift = state.gifts.find((g) => g.sku === sku);
  const open = (id: string) => {
    location.hash = "/gifts/" + encodeURIComponent(id);
    setSku(id);
    window.scrollTo(0, 0);
  };
  const home = () => {
    location.hash = "/";
    setSku("");
  };
  const alerts = state.gifts.flatMap((g) => {
    const qty = quantity(state, g);
    return [
      ...(g.status === "error"
        ? [
            {
              key: g.sku + "review",
              title: g.name,
              detail: "Needs review before drivers can redeem.",
              sku: g.sku,
            },
          ]
        : []),
      ...(qty < 100
        ? [
            {
              key: g.sku + "stock",
              title: g.name,
              detail:
                qty === 0
                  ? "Out of stock. Replenish inventory."
                  : `Low stock: ${qty} remaining.`,
              sku: g.sku,
            },
          ]
        : []),
      ...(g.expiry &&
      g.expiry <=
        new Date(Date.parse(today()) + 30 * 86400000).toISOString().slice(0, 10)
        ? [
            {
              key: g.sku + "expiry",
              title: g.name,
              detail: `${g.expiry < today() ? "Expired" : "Expires"} ${displayDate(g.expiry)}.`,
              sku: g.sku,
            },
          ]
        : []),
    ];
  });
  const pending = state.approvals.filter((a) => a.status === "pending");
  return (
    <>
      <header className="appbar">
        <button
          className="back"
          aria-label="Back to inventory"
          disabled={!sku}
          onClick={home}
        >
          <ArrowLeft size={13} />
        </button>
        <h1>AhaBenefits</h1>
        <div className="appbar-right">
          <SearchBox
            value={query}
            onChange={(q) => {
              setQuery(q);
              if (sku) home();
            }}
            placeholder="Search driver ID, SKU or gift name"
            label="Global search"
          />
          <div className="pickers">
            <MapPin size={14} color="var(--blue)" />
            <select
              aria-label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              {[...CITIES, "Nationwide"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="clock">
            <Clock size={14} color="var(--blue)" />
            <span>
              {new Intl.DateTimeFormat("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Ho_Chi_Minh",
              }).format(now)}
            </span>{" "}
            ICT
          </div>
          <button
            className="bell"
            aria-label={`Notifications (${alerts.length + pending.length})`}
            onClick={() => setOverlay("notifications")}
          >
            <Bell size={17} />
            {alerts.length + pending.length > 0 && (
              <b>{alerts.length + pending.length}</b>
            )}
          </button>
          <button
            className="avatar"
            aria-label="Demo settings"
            title={`${actor.id} · ${actor.role}`}
            onClick={() => setOverlay("settings")}
          >
            {actor.id === "nantt" ? "NT" : actor.id === "hieult" ? "HL" : "RV"}
          </button>
        </div>
      </header>
      <nav className="crumbs" aria-label="Breadcrumb">
        <a
          href="#/"
          onClick={(e) => {
            e.preventDefault();
            home();
          }}
        >
          AhaBenefits
        </a>
        <span>/</span>
        {sku ? (
          <>
            <a
              href="#/"
              onClick={(e) => {
                e.preventDefault();
                home();
              }}
            >
              Gift Inventory
            </a>
            <span>/</span>
            <span>{gift?.name || "Gift not found"}</span>
          </>
        ) : (
          <>
            <span>Configuration</span>
            <span>/</span>
            <span>Multipliers &amp; Gift Inventory</span>
          </>
        )}
      </nav>
      <main className="page">
        {storageError && (
          <div className="error-banner" role="alert">
            {storageError}
          </div>
        )}
        {sku ? (
          gift ? (
            <GiftDetail
              key={sku}
              gift={gift}
              city={city}
              onDriver={setDriver}
            />
          ) : (
            <section className="card">
              <Empty>
                This SKU was not found.
                <br />
                <button className="btn" onClick={home}>
                  Back to inventory
                </button>
              </Empty>
            </section>
          )
        ) : (
          <>
            <Multiplier />
            <Inventory
              query={query}
              onQuery={setQuery}
              city={city}
              onOpen={open}
            />
          </>
        )}
        <footer className="demo-footer">
          <span>
            <i />
            Interactive demo · Changes saved in this browser
          </span>
          <button className="text-btn" onClick={() => setOverlay("settings")}>
            <SettingsIcon size={13} />
            {actor.id} · {actor.role}
          </button>
          <a href="/guide.html" target="_blank" rel="noreferrer">
            User guide &amp; system design
          </a>
        </footer>
      </main>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
      {overlay === "settings" && (
        <Settings
          theme={theme}
          setTheme={setTheme}
          onClose={() => setOverlay("")}
        />
      )}
      {driver && <DriverModal id={driver} onClose={() => setDriver("")} />}
      {overlay === "notifications" && (
        <Modal
          title="Notifications"
          onClose={() => setOverlay("")}
          footer={
            <button className="btn" onClick={() => setOverlay("")}>
              Close
            </button>
          }
        >
          <p className="hint">
            Current inventory and approval alerts. They clear automatically when
            resolved.
          </p>
          {pending.map((a) => (
            <div className="logrow" key={a.id}>
              <div>
                <div className="t">Multiplier approval requested</div>
                <div className="m">
                  {a.value.toFixed(2)}× requested by {a.by}
                </div>
                <button
                  className="text-btn"
                  onClick={() => {
                    home();
                    setOverlay("");
                  }}
                >
                  Open configuration
                </button>
              </div>
            </div>
          ))}
          {alerts.map((a) => (
            <button
              className="notification-row"
              key={a.key}
              onClick={() => {
                open(a.sku);
                setOverlay("");
              }}
            >
              <strong>{a.title}</strong>
              <span>{a.detail}</span>
            </button>
          ))}
          {!alerts.length && !pending.length && (
            <Empty>You’re all caught up.</Empty>
          )}
        </Modal>
      )}
    </>
  );
}
