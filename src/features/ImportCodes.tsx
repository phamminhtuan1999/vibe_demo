import { useMemo, useRef, useState } from "react";
import { Download, UploadCloud } from "lucide-react";
import { useStore, download } from "../store";
import {
  parseCodes,
  importCodes,
  importCutoff,
  displayDate,
  displayTime,
  SOURCES,
  toCsv,
  type Gift,
} from "../domain";
import { Modal, Field, Empty, Pill } from "../components/ui";
export function ImportCodes({
  preset,
  onClose,
}: {
  preset?: string;
  onClose: () => void;
}) {
  const { state, actor, commit, notify } = useStore();
  const choices = state.gifts.filter((g) => g.type !== "Physical");
  const [sku, setSku] = useState(preset || choices[0]?.sku || "");
  const [source, setSource] = useState<Gift["source"]>(
    state.gifts.find((g) => g.sku === sku)?.source || "In-house",
  );
  const [tab, setTab] = useState("import");
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("pasted-codes.csv");
  const [hot, setHot] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const readVersion = useRef(0);
  const { preview, error } = useMemo(() => {
    if (!text) return { preview: null, error: "" };
    try {
      return { preview: parseCodes(text, state), error: "" };
    } catch (e) {
      return { preview: null, error: (e as Error).message };
    }
  }, [text, state]);
  async function read(f?: File) {
    if (!f) return;
    const version = ++readVersion.current;
    setText("");
    if (!/\.csv$/i.test(f.name) || f.size > 2 * 1024 * 1024) {
      notify("Choose a .csv file up to 2 MB.");
      return;
    }
    setReading(true);
    try {
      const content = await f.text();
      if (version === readVersion.current) {
        setText(content);
        setFilename(f.name);
      }
    } catch {
      notify("The file could not be read. Please try again.");
    } finally {
      if (version === readVersion.current) setReading(false);
    }
  }
  return (
    <Modal
      title="Import Code"
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          {tab === "import" && (
            <button
              className="btn btn-primary"
              disabled={
                !preview?.valid || reading || !sku || actor.role === "Viewer"
              }
              onClick={() => {
                if (
                  commit(
                    (s) => importCodes(s, sku, text, filename, source, actor),
                    "Valid codes imported. Inventory and history updated.",
                  )
                )
                  onClose();
              }}
            >
              Import {preview?.valid ? preview.valid.toLocaleString() : ""} to
              stock
            </button>
          )}
        </>
      }
    >
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => {
          const exp = displayDate(importCutoff());
          download(
            "gift-code-template.csv",
            toCsv([
              ["code", "expiry"],
              ["MY-CODE-001", exp],
              ["MY-CODE-002", exp],
            ]),
          );
        }}
      >
        <Download size={15} />
        Download template (.csv)
      </button>
      <div className="tabs" role="tablist" aria-label="Code import">
        <button
          role="tab"
          aria-selected={tab === "import"}
          onClick={() => setTab("import")}
        >
          Import Code
        </button>
        <button
          role="tab"
          aria-selected={tab === "history"}
          onClick={() => setTab("history")}
        >
          Import history
        </button>
      </div>
      {tab === "import" ? (
        <>
          <div className="grid2">
            <Field label="Import into SKU *">
              <select
                value={sku}
                onChange={(e) => {
                  setSku(e.target.value);
                  setSource(
                    state.gifts.find((g) => g.sku === e.target.value)!.source,
                  );
                }}
              >
                {choices.map((g) => (
                  <option value={g.sku} key={g.sku}>
                    {g.sku} · {g.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Code source">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as Gift["source"])}
              >
                {SOURCES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
          {!choices.length && (
            <p className="error-text">
              Create a voucher or service gift before importing.
            </p>
          )}
          <div
            className={"dropzone" + (hot ? " hot" : "")}
            onDragOver={(e) => {
              e.preventDefault();
              setHot(true);
            }}
            onDragLeave={() => setHot(false)}
            onDrop={(e) => {
              e.preventDefault();
              setHot(false);
              void read(e.dataTransfer.files[0]);
            }}
          >
            <div className="cloud">
              <UploadCloud size={21} />
            </div>
            <p>
              Drop a file here or{" "}
              <button
                className="text-btn"
                onClick={() => file.current?.click()}
              >
                choose a file
              </button>
            </p>
            <span className="hint">
              One .csv file, up to 2 MB / 10,000 rows
            </span>
            <input
              ref={file}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => void read(e.target.files?.[0])}
            />
          </div>
          <details className="paste-csv">
            <summary>Or paste CSV content</summary>
            <Field label="CSV content">
              <textarea
                rows={5}
                placeholder={"code,expiry\nMY-CODE-001,31/12/2026"}
                value={text}
                onChange={(e) => {
                  readVersion.current++;
                  setReading(false);
                  setText(e.target.value);
                  setFilename("pasted-codes.csv");
                }}
              />
            </Field>
          </details>
          {reading && <p role="status">Reading file…</p>}
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          {preview && (
            <>
              <p className="hint">
                Read <b>{filename}</b> — {preview.total} rows.
              </p>
              <div className="parse">
                {(["valid", "duplicate", "expired", "malformed"] as const).map(
                  (key, i) => (
                    <div key={key}>
                      <span className="k">
                        {
                          [
                            "Valid",
                            "Duplicate",
                            "Expires too soon",
                            "Malformed",
                          ][i]
                        }
                      </span>
                      <span
                        className={"v " + (i === 0 ? "g" : i === 3 ? "r" : "a")}
                      >
                        {preview[key]}
                      </span>
                    </div>
                  ),
                )}
              </div>
              {preview.rows.some((r) => r.status !== "valid") && (
                <button
                  className="text-btn report-button"
                  onClick={() =>
                    download(
                      "import-validation-report.csv",
                      toCsv([
                        ["row", "code", "expiry", "status", "reason"],
                        ...preview.rows
                          .filter((r) => r.status !== "valid")
                          .map((r) => [
                            r.row,
                            r.code,
                            r.expiry,
                            r.status,
                            r.reason,
                          ]),
                      ]),
                    )
                  }
                >
                  Download rejected-row report
                </button>
              )}
            </>
          )}
          <div className="callout">
            <b>Import rules</b>
            <span>
              Existing codes and repeated rows are skipped, never overwritten.
              Expiry must be {displayDate(importCutoff())} or later. Importing
              keeps the gift’s current visibility. Preview is revalidated when
              you import.
            </span>
          </div>
        </>
      ) : (
        <>
          {state.batches.filter((b) => !preset || b.sku === preset).length ? (
            state.batches
              .filter((b) => !preset || b.sku === preset)
              .map((b) => (
                <div className="logrow" key={b.id}>
                  <div>
                    <div className="t">
                      {b.sku} <Pill kind="green">{b.valid} codes</Pill>
                    </div>
                    <div className="m">
                      {b.filename} · {b.source}
                    </div>
                    <div className="m">
                      Skipped: {b.duplicate} duplicate, {b.expired} expiring,{" "}
                      {b.malformed} malformed
                    </div>
                  </div>
                  <div className="r">
                    <div>{b.by}</div>
                    <div className="m">{displayTime(b.at)}</div>
                  </div>
                </div>
              ))
          ) : (
            <Empty>No batches imported in this demo yet.</Empty>
          )}
        </>
      )}
    </Modal>
  );
}
