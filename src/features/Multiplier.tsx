import { useState } from "react";
import { Pencil, History } from "lucide-react";
import { useStore } from "../store";
import { displayTime, setMultiplier, reviewMultiplier } from "../domain";
import { Modal, Field, Pill, Empty } from "../components/ui";
export function Multiplier() {
  const { state, actor, commit } = useStore();
  const [view, setView] = useState<"edit" | "history" | null>(null);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const m = state.multiplier;
  const pending = state.approvals.find((a) => a.status === "pending");
  const close = () => setView(null);
  return (
    <>
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Shift point multiplier</h2>
            <span className="sub">
              One multiplier applies to every shift. Points earned on a
              completed order = the order’s base points × this multiplier.
            </span>
          </div>
          <div className="right">
            <button
              className="btn btn-sm"
              disabled={actor.role === "Viewer"}
              onClick={() => {
                setValue(m.value.toFixed(2));
                setReason("");
                setView("edit");
              }}
            >
              <Pencil size={13} />
              Edit
            </button>
            <button className="btn btn-sm" onClick={() => setView("history")}>
              <History size={14} />
              Change history
            </button>
          </div>
        </div>
        <div className="tw">
          <table className="shift-table">
            <thead>
              <tr>
                <th>Multiplier</th>
                <th>Applies to</th>
                <th>Updated by</th>
                <th>Effective from</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="mult-val">{m.value.toFixed(2)}×</span>
                  <div className="mult-bar">
                    <i style={{ width: `${(m.value / 3) * 100}%` }} />
                  </div>
                </td>
                <td>
                  <span className="strong">All shifts</span>
                  <span className="sub">
                    Every completed order, 24/7, all cities
                  </span>
                </td>
                <td>
                  <span className="user-text">{m.by}</span>
                  <span className="sub">{displayTime(m.at)}</span>
                </td>
                <td>{displayTime(m.at)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {pending && (
          <div className="pending-banner">
            <Pill kind="amber">Approval pending</Pill>
            <span>
              {pending.value.toFixed(2)}× requested by {pending.by}. Current
              multiplier remains {m.value.toFixed(2)}×.
            </span>
            <button className="text-btn" onClick={() => setView("history")}>
              Review request
            </button>
          </div>
        )}
      </section>
      {view === "edit" && (
        <Modal
          title="Edit shift point multiplier"
          onClose={close}
          footer={
            <>
              <button className="btn" onClick={close}>
                Cancel
              </button>
              <button className="btn btn-primary" form="mult-form">
                {Number(value) > 2.5 ? "Request approval" : "Save changes"}
              </button>
            </>
          }
        >
          <form
            id="mult-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (
                commit(
                  (s) => setMultiplier(s, Number(value), reason, actor),
                  Number(value) > 2.5
                    ? "Approval requested. The active multiplier has not changed."
                    : "Multiplier saved for all shifts.",
                )
              )
                close();
            }}
          >
            <Field label="Applies to">
              <input
                readOnly
                value="All shifts — every completed order, 24/7"
              />
            </Field>
            <Field
              label="Multiplier *"
              help="Between 0.50 and 3.00, up to two decimal places. Above 2.50 requires approval from another Head of Ops actor."
            >
              <input
                autoFocus
                type="number"
                required
                min="0.5"
                max="3"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </Field>
            <Field label="Reason for change *">
              <textarea
                required
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Lift driver supply during rain hours"
              />
            </Field>
            <div className="callout">
              <b>Example</b>
              <span>
                A 20-point order becomes{" "}
                {Number.isFinite(Number(value))
                  ? Math.round(20 * Number(value))
                  : 0}{" "}
                points. Orders completed before the change keep their original
                points.
              </span>
            </div>
          </form>
        </Modal>
      )}
      {view === "history" && (
        <Modal
          title="Multiplier change history"
          onClose={close}
          wide
          footer={
            <button className="btn" onClick={close}>
              Close
            </button>
          }
        >
          {pending && (
            <div className="approval-box">
              <Pill kind="amber">Awaiting Head of Ops</Pill>
              <h3>
                {pending.previous.toFixed(2)} → {pending.value.toFixed(2)}×
              </h3>
              <p>{pending.reason}</p>
              <p className="muted">
                Requested by {pending.by} · {displayTime(pending.at)}
              </p>
              {actor.role === "Head of Ops" && actor.id !== pending.by ? (
                <>
                  <Field label="Review note *">
                    <textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      maxLength={500}
                    />
                  </Field>
                  <div className="rowacts">
                    <button
                      className="btn"
                      onClick={() => {
                        if (
                          commit(
                            (s) =>
                              reviewMultiplier(
                                s,
                                pending.id,
                                false,
                                reviewNote,
                                actor,
                              ),
                            "Request rejected.",
                          )
                        )
                          setReviewNote("");
                      }}
                    >
                      Reject request
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        if (
                          commit(
                            (s) =>
                              reviewMultiplier(
                                s,
                                pending.id,
                                true,
                                reviewNote,
                                actor,
                              ),
                            "Multiplier approved and applied.",
                          )
                        )
                          setReviewNote("");
                      }}
                    >
                      Approve multiplier
                    </button>
                  </div>
                </>
              ) : (
                <p className="hint">
                  In Demo settings, select a different Head of Ops actor to
                  review this request.
                </p>
              )}
            </div>
          )}
          {state.multiplierHistory.map((h) => (
            <div className="logrow" key={h.id}>
              <div>
                <div className="t">
                  {h.from.toFixed(2)} → {h.to.toFixed(2)}×
                </div>
                <div className="m">{h.reason}</div>
              </div>
              <div className="r">
                <div>{h.by}</div>
                <div className="m">{displayTime(h.at)}</div>
              </div>
            </div>
          ))}
          {state.approvals
            .filter((a) => a.status !== "pending")
            .map((a) => (
              <div className="logrow" key={a.id}>
                <div>
                  <div className="t">
                    {a.value.toFixed(2)}× request · {a.status}
                  </div>
                  <div className="m">
                    {a.reason}
                    {a.reviewNote ? " · " + a.reviewNote : ""}
                  </div>
                </div>
                <div className="r">
                  <div>{a.reviewer || a.by}</div>
                  <div className="m">{displayTime(a.reviewedAt || a.at)}</div>
                </div>
              </div>
            ))}
          {!state.multiplierHistory.length && !pending && (
            <Empty>No multiplier changes yet.</Empty>
          )}
        </Modal>
      )}
    </>
  );
}
