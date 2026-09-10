import { useEffect, useRef, type ReactNode } from "react";
import { X, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useStore } from "../store";
export function Modal({
  title,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const { notice, notify } = useStore();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current,
      previous = document.activeElement as HTMLElement;
    el?.showModal();
    notify("");
    return () => {
      el?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={"modal" + (wide ? " wide" : "")}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          const r = ref.current!.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-head">
        <h3>{title}</h3>
        <button className="icon-btn x" aria-label="Close" onClick={onClose}>
          <X size={19} />
        </button>
      </div>
      <div className="modal-body">{children}</div>
      {notice && (
        <div className="modal-notice" role="status">
          {notice}
        </div>
      )}
      {footer && <div className="modal-foot">{footer}</div>}
    </dialog>
  );
}
export function Pill({
  kind,
  children,
}: {
  kind: string;
  children: ReactNode;
}) {
  return (
    <span className={"pill " + kind}>
      <i />
      {children}
    </span>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label?: string;
}) {
  return (
    <div className="searchbox">
      <Search size={15} color="var(--ink-3)" />
      <input
        type="search"
        aria-label={label || placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function Pager({
  page,
  size,
  total,
  onPage,
  onSize,
  noun = "items",
}: {
  page: number;
  size: number;
  total: number;
  onPage: (n: number) => void;
  onSize?: (n: number) => void;
  noun?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / size));
  return (
    <div className="pager">
      <span>
        Showing {total ? (page - 1) * size + 1 : 0} –{" "}
        {Math.min(page * size, total)} of {total} {noun}
      </span>
      <div className="right">
        {onSize && (
          <>
            <label htmlFor="page-size">Rows per page</label>
            <select
              id="page-size"
              value={size}
              onChange={(e) => onSize(Number(e.target.value))}
            >
              {[5, 20, 50, 100].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </>
        )}
        <button
          className="pg"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="pg current" aria-current="page">
          {page}
        </span>
        <span className="muted">of {pages}</span>
        <button
          className="pg"
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
export function Field({
  label,
  children,
  help,
}: {
  label: string;
  children: ReactNode;
  help?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {help && <span className="help">{help}</span>}
    </label>
  );
}
