import { FormEvent, useEffect, useMemo, useState } from "react";

import { useCommodities, useEnsureCommodity, useSetAppConfig } from "../api/queries";
import type { UiTheme } from "../api/types";
import { Field } from "../components/form";
import { ErrorState, LoadingState } from "../components/ui";
import { guessCurrency, mergeCurrencyOptions } from "../lib/currencies";
import { applyTheme } from "../lib/theme";
import { guessTimezone, ledgerTimezones } from "../lib/timezones";

export function OnboardingPage() {
  const commodities = useCommodities();
  const ensureCommodity = useEnsureCommodity();
  const save = useSetAppConfig();
  const zones = useMemo(() => ledgerTimezones(), []);
  const guessed = useMemo(() => guessTimezone(), []);

  const [commodityId, setCommodityId] = useState("");
  const [theme, setTheme] = useState<UiTheme>("dark");
  const [timezone, setTimezone] = useState(guessed);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!zones.includes(timezone) && guessed && zones.includes(guessed)) {
      setTimezone(guessed);
    }
  }, [guessed, timezone, zones]);

  if (commodities.isPending) {
    return (
      <main className="auth-screen">
        <LoadingState label="Loading currencies…" />
      </main>
    );
  }
  if (commodities.isError) {
    return (
      <main className="auth-screen">
        <ErrorState
          error={commodities.error}
          onRetry={() => void commodities.refetch()}
        />
      </main>
    );
  }

  const catalog = commodities.data ?? [];
  const options = mergeCurrencyOptions(catalog.map((item) => item.id));
  const selectedCommodity =
    options.some((item) => item.code === commodityId) ? commodityId : guessCurrency(options.map((item) => item.code));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const selected = options.find((item) => item.code === selectedCommodity) ?? options[0];
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
    await save.mutateAsync({
      commodityId: selected.code,
      theme,
      timezone,
    });
  };

  const pending = save.isPending || ensureCommodity.isPending;
  const error = save.error ?? ensureCommodity.error;

  return (
    <main className="auth-screen">
      <section className="auth-card auth-card-wide">
        <div className="brand-mark">F</div>
        <span className="eyebrow">Welcome</span>
        <h1>Set up how you measure the ledger.</h1>
        <p className="auth-copy">
          Functional currency is the measurement currency. Theme and timezone
          stay with you across devices.
        </p>
        <form className="write-form onboarding-form" onSubmit={(event) => void onSubmit(event)}>
          <Field
            label="Functional currency"
            hint="The ledger measures in this currency. Native accounts stay native. You can change it later."
          >
            <select
              value={selectedCommodity}
              onChange={(event) => setCommodityId(event.target.value)}
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
                onClick={() => setTheme("dark")}
              >
                Dark
              </button>
              <button
                type="button"
                className={`picker-chip ${theme === "light" ? "picker-chip-active" : ""}`}
                onClick={() => setTheme("light")}
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
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              required
            >
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </Field>

          {error instanceof Error && <p className="error-text">{error.message}</p>}

          <button className="button button-primary local-login" disabled={pending} type="submit">
            {pending ? "Saving…" : "Start"}
          </button>
        </form>
      </section>
    </main>
  );
}
