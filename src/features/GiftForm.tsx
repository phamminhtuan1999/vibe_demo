import { useState } from "react";
import { CITIES, SOURCES, saveGift, type Gift } from "../domain";
import { useStore } from "../store";
import { Modal, Field } from "../components/ui";
export function GiftForm({
  gift,
  onClose,
}: {
  gift?: Gift;
  onClose: () => void;
}) {
  const { actor, commit } = useStore();
  const [form, setForm] = useState<Gift>(
    gift || {
      sku: "GIFT-",
      name: "",
      category: "Fuel",
      type: "Voucher code",
      expiry: "",
      price: 800,
      source: "In-house",
      status: "active",
      cities: [...CITIES],
      limit: 2,
      period: "week",
      stock: 0,
      updatedAt: new Date().toISOString(),
      updatedBy: actor.id,
    },
  );
  const set = <K extends keyof Gift>(k: K, v: Gift[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal
      title={gift ? "Edit gift" : "Add a new gift"}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" form="gift-form">
            {gift ? "Save changes" : "Create gift"}
          </button>
        </>
      }
    >
      <form
        id="gift-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (
            commit(
              (s) => saveGift(s, form, actor, !!gift),
              gift
                ? "Gift updated."
                : "Gift created. Add stock to make it redeemable.",
            )
          )
            onClose();
        }}
      >
        <div className="grid2">
          <Field label="Gift name *">
            <input
              required
              maxLength={120}
              minLength={2}
              autoFocus
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <Field
            label="SKU *"
            help="Unique identifier. Cannot be changed later."
          >
            <input
              required
              pattern="GIFT-[A-Z0-9-]{1,40}"
              value={form.sku}
              readOnly={!!gift}
              onChange={(e) => set("sku", e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Source *">
            <select
              value={form.source}
              onChange={(e) => set("source", e.target.value as Gift["source"])}
            >
              {SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Point price *">
            <input
              type="number"
              min={1}
              max={10000000}
              step={1}
              required
              value={form.price || ""}
              onChange={(e) => set("price", Number(e.target.value))}
            />
          </Field>
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) =>
                set("category", e.target.value as Gift["category"])
              }
            >
              {["Fuel", "Telco", "Vehicle", "Gear", "Food", "Other"].map(
                (v) => (
                  <option key={v}>{v}</option>
                ),
              )}
            </select>
          </Field>
          <Field
            label="Gift type"
            help={gift ? "Gift type is fixed after creation." : undefined}
          >
            <select
              disabled={!!gift}
              value={form.type}
              onChange={(e) => set("type", e.target.value as Gift["type"])}
            >
              {["Voucher code", "Service", "Physical"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Expiry">
            <input
              type="date"
              value={form.expiry}
              onChange={(e) => set("expiry", e.target.value)}
            />
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as Gift["status"])}
            >
              <option value="active">Active</option>
              <option value="inactive">Hidden</option>
              <option value="error">Needs review</option>
            </select>
          </Field>
          <Field label="Redemptions per driver *">
            <input
              type="number"
              required
              min={1}
              max={100}
              step={1}
              value={form.limit}
              onChange={(e) => set("limit", Number(e.target.value))}
            />
          </Field>
          <Field label="Limit period">
            <select
              value={form.period}
              onChange={(e) => set("period", e.target.value as Gift["period"])}
            >
              {["week", "month", "quarter", "year"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
        </div>
        <fieldset>
          <legend>Eligible cities *</legend>
          {CITIES.map((city) => (
            <label className="check" key={city}>
              <input
                type="checkbox"
                checked={form.cities.includes(city)}
                onChange={(e) =>
                  set(
                    "cities",
                    e.target.checked
                      ? [...form.cities, city]
                      : form.cities.filter((c) => c !== city),
                  )
                }
              />
              {city}
            </label>
          ))}
        </fieldset>
        {!form.cities.length && (
          <p className="error-text">Select at least one city.</p>
        )}
        <div className="callout">
          <b>{gift ? "Inventory stays intact" : "After you create it"}</b>
          <span>
            {form.type === "Physical"
              ? "Use Adjust stock in gift details to record physical inventory."
              : "Use Import Code to add a validated batch of voucher codes."}{" "}
            Hidden and review statuses are kept when stock is added.
          </span>
        </div>
      </form>
    </Modal>
  );
}
