import { Info } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { usePostRetranslation, useRetranslation } from "../api/queries";
import type { Commodity } from "../api/types";
import { formatMinor } from "../lib/format";
import { Card } from "./ui";

const DIALOG_TITLE = "Foreign Currency Retranslation";

export function RetranslationNote({ currency }: { currency: Commodity }) {
  const retranslation = useRetranslation();
  const post = usePostRetranslation();
  const [open, setOpen] = useState(false);

  const preview = retranslation.data;
  if (!preview || preview.retranslationMinor === "0") {
    return null;
  }

  return (
    <>
      <Card className="retranslation-note">
        <div className="retranslation-icon">
          <Info size={18} />
        </div>
        <div>
          <strong>Unrealised currency movement</strong>
          <p>
            {formatMinor(preview.retranslationMinor, currency)} is currently
            sitting outside posted income and expense.
          </p>
        </div>
        <button
          type="button"
          className="button button-secondary retranslate-button"
          aria-haspopup="dialog"
          onClick={() => {
            post.reset();
            setOpen(true);
          }}
        >
          Retranslate
        </button>
      </Card>
      {open && (
        <RetranslateDialog
          error={post.error}
          pending={post.isPending}
          onCancel={() => {
            if (!post.isPending) {
              setOpen(false);
              post.reset();
            }
          }}
          onConfirm={() => {
            void post.mutateAsync().then(() => setOpen(false)).catch(() => undefined);
          }}
        />
      )}
    </>
  );
}

function RetranslateDialog({
  error,
  pending,
  onCancel,
  onConfirm,
}: {
  error: unknown;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
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
        <h2 id={titleId}>{DIALOG_TITLE}</h2>
        <div id={bodyId}>
          <p>
            Unrealised gains or losses occur when the value of your accounts in
            different currencies changes due to exchange rate fluctuations, even
            though you haven't made any transactions.
          </p>
          <p>Do you want to adjust the unrealised amount as expenses?</p>
        </div>
        {message && <p className="dialog-error">{message}</p>}
        <div className="dialog-actions">
          <button
            type="button"
            className="button button-secondary"
            disabled={pending}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Posting…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
