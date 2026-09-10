import { useRef, useState } from "react";
import { useStore, download } from "../store";
import { ACTORS, validateBackup } from "../domain";
import { seedState } from "../seed";
import { Modal, Field } from "../components/ui";
export function Settings({
  onClose,
  theme,
  setTheme,
}: {
  onClose: () => void;
  theme: string;
  setTheme: (s: string) => void;
}) {
  const { state, actor, setActor, replace, notify } = useStore();
  const file = useRef<HTMLInputElement>(null);
  const [reset, setReset] = useState(false);
  const [backup, setBackup] = useState<ReturnType<
    typeof validateBackup
  > | null>(null);
  return (
    <Modal
      title="Demo settings"
      onClose={onClose}
      footer={
        <button className="btn" onClick={onClose}>
          Done
        </button>
      }
    >
      <div className="callout">
        <b>Interactive demo · Saved in this browser</b>
        <span>
          All drivers, codes, and balances are sample data. Each browser has its
          own inventory. Demo roles simulate access rules and are not
          authentication.
        </span>
      </div>
      <Field label="Demo actor">
        <select
          value={actor.id}
          onChange={(e) =>
            setActor(ACTORS.find((a) => a.id === e.target.value)!)
          }
        >
          {ACTORS.map((a) => (
            <option value={a.id} key={a.id}>
              {a.id} · {a.role}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Appearance">
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </Field>
      <h3>Data management</h3>
      <p className="hint">
        Backups include the complete demo inventory, imported codes, drivers,
        and history.
      </p>
      <div className="rowacts">
        <button
          className="btn"
          onClick={() =>
            download(
              "ahabenefits-backup.json",
              JSON.stringify(state, null, 2),
              "application/json",
            )
          }
        >
          Export backup
        </button>
        <button
          className="btn"
          disabled={actor.role === "Viewer"}
          onClick={() => file.current?.click()}
        >
          Restore backup
        </button>
        <input
          ref={file}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              if (f.size > 5 * 1024 * 1024)
                throw Error("Backup must be 5 MB or smaller.");
              setBackup(validateBackup(JSON.parse(await f.text())));
            } catch {
              notify(
                "Invalid backup. Choose an unmodified AhaBenefits JSON backup, up to 5 MB.",
              );
            }
            e.target.value = "";
          }}
        />
      </div>
      {backup && (
        <div className="approval-box">
          <p>
            Replace this browser’s demo with {backup.gifts.length} gifts,{" "}
            {backup.codes.length} codes, and {backup.transactions.length}{" "}
            transactions?
          </p>
          <div className="rowacts">
            <button className="btn" onClick={() => setBackup(null)}>
              Cancel restore
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                replace(backup);
                setBackup(null);
              }}
            >
              Restore this backup
            </button>
          </div>
        </div>
      )}
      <div className="settings-reset">
        <button
          className="text-btn danger"
          disabled={actor.role === "Viewer"}
          onClick={() => setReset(!reset)}
        >
          Reset demo data
        </button>
        {reset && (
          <div className="approval-box">
            <p>
              This replaces local changes with the original sample inventory.
              Export a backup first to keep your work.
            </p>
            <div className="rowacts">
              <button className="btn" onClick={() => setReset(false)}>
                Keep current data
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  replace(seedState());
                  setReset(false);
                }}
              >
                Reset to sample data
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
