import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  invalidateLedger,
  useAppConfig,
  useCommodities,
  useEnsureCommodity,
  useSetAppConfig,
} from "../api/queries";
import type { UiTheme } from "../api/types";
import { ConfirmDialog, Field } from "../components/form";
import { Card, ErrorState, LoadingState, PageHeader } from "../components/ui";
import { mergeCurrencyOptions } from "../lib/currencies";
import { applyTheme } from "../lib/theme";
import { ledgerTimezones } from "../lib/timezones";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const config = useAppConfig();
  const commodities = useCommodities();
  const ensureCommodity = useEnsureCommodity();
  const save = useSetAppConfig();
  const zones = useMemo(() => ledgerTimezones(), []);

  const savedCommodityId = config.data?.commodityId ?? "";
  const savedTheme = config.data?.theme ?? "dark";
  const savedTimezone = config.data?.timezone ?? "";
  const journalCount = config.data?.postedJournalCount ?? 0;
  const estimatedMs = config.data?.functionalChangeEstimatedMs ?? 800;
  const job = config.data?.functionalChange ?? null;

  const [commodityId, setCommodityId] = useState(savedCommodityId);
  const [theme, setTheme] = useState<UiTheme>(savedTheme);
  const [timezone, setTimezone] = useState(savedTimezone);
  const [justSaved, setJustSaved] = useState(false);
  const [restamp, setRestamp] = useState<"off" | "run" | "done">("off");
  const [confirmChange, setConfirmChange] = useState(false);

  useEffect(() => {
    void config.refetch();
  }, [config.refetch]);

  useEffect(() => {
    if (job?.status === "running" || restamp === "run") {
      return;
    }
    setCommodityId(savedCommodityId);
    setTheme(savedTheme);
    setTimezone(savedTimezone);
  }, [job?.status, restamp, savedCommodityId, savedTheme, savedTimezone]);

  useEffect(() => {
    if (job?.status === "running" && job.to) {
      setCommodityId(job.to);
      setRestamp("run");
    }
  }, [job?.status, job?.to]);

  useEffect(() => {
    if (restamp !== "run") {
      return;
    }
    if (job?.status === "error") {
      setRestamp("off");
      setJustSaved(false);
      return;
    }
    const finished =
      job?.status === "done" ||
      (Boolean(job?.to) && savedCommodityId === job?.to && job?.status !== "running");
    if (!finished) {
      return;
    }
    setRestamp("done");
    setJustSaved(true);
    void invalidateLedger(queryClient);
  }, [job, queryClient, restamp, savedCommodityId]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    return () => {
      if (config.data?.theme) {
        applyTheme(config.data.theme);
      }
    };
  }, [config.data?.theme]);

  if (config.isPending || commodities.isPending) {
    return <LoadingState label="Loading settings…" />;
  }
  if (config.isError) {
    return <ErrorState error={config.error} onRetry={() => void config.refetch()} />;
  }
  if (commodities.isError) {
    return (
      <ErrorState
        error={commodities.error}
        onRetry={() => void commodities.refetch()}
      />
    );
  }

  const catalog = commodities.data ?? [];
  const options = mergeCurrencyOptions(catalog.map((item) => item.id));
  const selectedCommodity = options.some((item) => item.code === commodityId)
    ? commodityId
    : savedCommodityId || options[0]?.code || "";
  const selectedTimezone = zones.includes(timezone)
    ? timezone
    : zones.includes(savedTimezone)
      ? savedTimezone
      : zones[0] ?? "";
  const changingFunctional =
    Boolean(savedCommodityId) && selectedCommodity !== savedCommodityId;
  const dirty =
    changingFunctional ||
    theme !== savedTheme ||
    selectedTimezone !== savedTimezone;
  const restamping = restamp === "run" || job?.status === "running";

  const persist = async (confirm: boolean) => {
    const selected = options.find((item) => item.code === selectedCommodity);
    if (!selected) {
      return;
    }
    const known = catalog.find((item) => item.id === selected.code);
    if (!known) {
      await ensureCommodity.mutateAsync({
        code: selected.code,
        name: selected.name,
        minorUnits: selected.minorUnits,
        kind: "currency",
      });
    }
    const data = await save.mutateAsync({
      commodityId: selected.code,
      theme,
      timezone: selectedTimezone,
      confirm,
    });
    if (data.functionalChange?.status === "running") {
      setRestamp("run");
      setJustSaved(false);
      return;
    }
    if (data.functionalChange?.status === "done") {
      setRestamp("done");
    } else {
      setRestamp("off");
    }
    setJustSaved(true);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (changingFunctional) {
      setConfirmChange(true);
      return;
    }
    try {
      await persist(false);
    } catch {
      setJustSaved(false);
      setRestamp("off");
    }
  };

  const onConfirmChange = async () => {
    try {
      await persist(true);
      setConfirmChange(false);
    } catch {
      setJustSaved(false);
      setRestamp("off");
    }
  };

  const pending = save.isPending || ensureCommodity.isPending || restamping;
  const error = save.error ?? ensureCommodity.error;
  const jobError =
    job?.status === "error" ? job.error ?? "Functional currency restatement failed." : null;
  const fromLabel = savedCommodityId || job?.from || "";
  const toLabel = selectedCommodity || job?.to || "";
  const journals = journalCount === 1 ? "1 journal" : `${journalCount} journals`;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Settings"
        title="How you measure the ledger"
        description="Functional currency is the measurement currency. Changing it automatically restates lot costs at today's ECB rate."
      />

      <Card>
        <form className="write-form" onSubmit={(event) => void onSubmit(event)}>
          <Field
            label="Functional currency"
            hint="Native accounts stay native. Reports and lot costs use this currency."
          >
            <select
              value={selectedCommodity}
              onChange={(event) => {
                setJustSaved(false);
                setRestamp("off");
                setCommodityId(event.target.value);
              }}
              disabled={pending}
              required
            >
              {options.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} — {item.name}
                </option>
              ))}
            </select>
          </Field>

          <fieldset className="onboarding-fieldset">
            <legend>Theme</legend>
            <div className="choice-row" role="group" aria-label="Theme">
              <button
                type="button"
                className={`picker-chip ${theme === "dark" ? "picker-chip-active" : ""}`}
                onClick={() => {
                  setJustSaved(false);
                  setRestamp("off");
                  setTheme("dark");
                }}
                disabled={pending}
              >
                Dark
              </button>
              <button
                type="button"
                className={`picker-chip ${theme === "light" ? "picker-chip-active" : ""}`}
                onClick={() => {
                  setJustSaved(false);
                  setRestamp("off");
                  setTheme("light");
                }}
                disabled={pending}
              >
                Light
              </button>
            </div>
          </fieldset>

          <Field
            label="Ledger timezone"
            hint="Civil days, months, and “today” use this zone. Journals stay in UTC."
          >
            <select
              value={selectedTimezone}
              onChange={(event) => {
                setJustSaved(false);
                setRestamp("off");
                setTimezone(event.target.value);
              }}
              disabled={pending}
              required
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </Field>

          {restamp !== "off" && (
            <RestampProgress
              journalCount={journalCount}
              estimatedMs={estimatedMs}
              pending={restamp === "run"}
              complete={restamp === "done"}
            />
          )}

          {error instanceof Error && <p className="form-error">{error.message}</p>}
          {jobError && restamp !== "run" && <p className="form-error">{jobError}</p>}
          {justSaved && !dirty && !error && !jobError && (
            <p className="form-success">Saved. Ledger views now use these settings.</p>
          )}

          <div className="form-actions">
            <button
              className="button button-primary"
              type="submit"
              disabled={pending || !dirty}
            >
              {restamping ? "Restating…" : pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Card>

      {confirmChange && (
        <ConfirmDialog
          title="Change functional currency?"
          confirmLabel={`Change to ${toLabel}`}
          cancelLabel={`Keep ${fromLabel}`}
          pending={save.isPending || ensureCommodity.isPending}
          error={save.error ?? ensureCommodity.error}
          onCancel={() => setConfirmChange(false)}
          onConfirm={() => void onConfirmChange()}
        >
          <p>
            This restates every lot into {toLabel} at today’s ECB rate. On this
            ledger that is {journals} and can take several minutes. Keep this
            page open; progress continues while the server works.
          </p>
          <p>
            IAS 21 treats a change of functional currency as infrequent. Do not
            switch because you are travelling or want a different report view.
            Frequent changes revalue the same lots again at a new rate and are
            not recommended.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

function RestampProgress({
  journalCount,
  estimatedMs,
  pending,
  complete,
}: {
  journalCount: number;
  estimatedMs: number;
  pending: boolean;
  complete: boolean;
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (complete) {
      setWidth(100);
      return;
    }
    if (!pending) {
      setWidth(0);
      return;
    }
    setWidth(0);
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setWidth(95));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [pending, complete]);

  const journals = journalCount === 1 ? "1 journal" : `${journalCount} journals`;
  const label = complete
    ? journalCount === 0
      ? "Updated functional currency."
      : `Restated ${journals}.`
    : journalCount === 0
      ? "Updating functional currency…"
      : `Restating ${journals}…`;

  return (
    <div className="restamp-progress" role="status" aria-live="polite">
      <p className="restamp-progress-label">{label}</p>
      <div
        className="restamp-progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={complete ? 100 : pending ? 95 : 0}
        aria-label="Functional currency restatement"
      >
        <span
          className="restamp-progress-fill"
          style={{
            width: `${width}%`,
            transitionDuration: pending && !complete ? `${estimatedMs}ms` : "180ms",
          }}
        />
      </div>
    </div>
  );
}
