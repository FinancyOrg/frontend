import { useEffect, useId, useRef, useState, type PropsWithChildren, type ReactNode } from "react";
import { HelpCircle } from "lucide-react";

export function ConfirmDialog({
  title,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  pending = false,
  danger = false,
  error,
  onCancel,
  onConfirm,
}: PropsWithChildren<{
  title: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  danger?: boolean;
  error?: unknown;
  onCancel: () => void;
  onConfirm?: () => void;
}>) {
  const titleId = useId();
  const bodyId = useId();
  const message = error instanceof Error ? error.message : null;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, pending]);

  return (
    <div
      className="dialog-overlay"
      onClick={() => {
        if (!pending) {
          onCancel();
        }
      }}
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId}>{title}</h2>
        <div id={bodyId}>{children}</div>
        {message && <p className="dialog-error">{message}</p>}
        <div className="dialog-actions">
          <button
            type="button"
            className="button button-secondary"
            disabled={pending}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          {onConfirm && (
            <button
              type="button"
              className={`button ${danger ? "button-danger" : "button-primary"}`}
              disabled={pending}
              onClick={onConfirm}
            >
              {pending ? "Working…" : confirmLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {hint && !error && <small className="muted">{hint}</small>}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <span className="switch">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="switch-ui" aria-hidden="true" />
    </span>
  );
}

export function ClickTip({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span className="click-tip" ref={root}>
      <button
        type="button"
        className="click-tip-btn"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <HelpCircle size={15} />
      </button>
      {open && (
        <span className="click-tip-bubble" role="tooltip">
          {text}
        </span>
      )}
    </span>
  );
}
