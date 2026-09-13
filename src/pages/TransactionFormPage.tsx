import { ArrowLeft, RotateCcw } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import {
  useAccounts,
  useCreateTransaction,
  useFxRate,
  useTransaction,
  useUpdateTransaction,
} from "../api/queries";
import { AccountPicker } from "../components/AccountPicker";
import { ClickTip, Field, Switch } from "../components/form";
import {
  Card,
  ErrorState,
  LoadingState,
  PageHeader,
} from "../components/ui";
import { formatMinor } from "../lib/format";
import { useLedgerTimezone } from "../lib/ledgerTimezone";
import {
  calendarMonthFromNow,
  convertMinorAtRate,
  dateTimeLocalMax,
  duplicateDateTimeLocal,
  fromDateTimeLocal,
  isDateTimeLocalFutureDate,
  minorToMajorInput,
  parseMajorToMinor,
  toDateTimeLocal,
  civilDateFromDateTimeLocal,
  withDateTimeLocalMonth,
  withDateTimeLocalToday,
} from "../lib/money";

type AmountSide = "from" | "to";
type DateChipId = "today" | "this-month" | "last-month" | "two-months" | "no-change";

const monthChipOffsets: Record<Exclude<DateChipId, "today" | "no-change">, number> = {
  "this-month": 0,
  "last-month": -1,
  "two-months": -2,
};

function applyDateChip(
  datetime: string,
  chip: DateChipId,
  originalDatetime: string,
  timeZone: string,
): string {
  if (chip === "today") {
    return withDateTimeLocalToday(datetime, timeZone);
  }
  if (chip === "no-change") {
    return originalDatetime || datetime;
  }
  const { year, month } = calendarMonthFromNow(monthChipOffsets[chip], timeZone);
  return withDateTimeLocalMonth(datetime, year, month, timeZone);
}

export function TransactionFormPage() {
  const { entryId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const duplicating = location.pathname.endsWith("/duplicate");
  const editing = Boolean(entryId) && !duplicating;
  const accounts = useAccounts();
  const existing = useTransaction(editing || duplicating ? entryId : undefined);
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const timeZone = useLedgerTimezone();

  const visibleAccounts = useMemo(
    () => (accounts.data?.accounts ?? []).filter((account) => !account.isHidden),
    [accounts.data?.accounts],
  );

  const [fromId, setFromId] = useState(searchParams.get("from") ?? "");
  const [toId, setToId] = useState(searchParams.get("to") ?? "");
  const [notes, setNotes] = useState("");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [useEcb, setUseEcb] = useState(true);
  const [datetime, setDatetime] = useState(() => toDateTimeLocal(undefined, timeZone));
  const [dateChip, setDateChip] = useState<DateChipId | null>(
    duplicating ? "this-month" : "today",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const lastEdited = useRef<AmountSide>("from");
  const selectedDateChipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedDateChipRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "smooth",
    });
  }, [dateChip]);

  useEffect(() => {
    const nextFrom = searchParams.get("from");
    const nextTo = searchParams.get("to");
    if (nextFrom) {
      setFromId(nextFrom);
    }
    if (nextTo) {
      setToId(nextTo);
    }
  }, [searchParams]);

  useEffect(() => {
    const entry = existing.data;
    if (!entry) {
      return;
    }
    setFromId(entry.from?.id ?? "");
    setToId(entry.to?.id ?? "");
    setNotes(entry.description ?? "");
    if (entry.amountMinor && entry.commodity) {
      setFromAmount(minorToMajorInput(entry.amountMinor, entry.commodity.minorUnits));
    }
    if (entry.toAmountMinor && entry.toCommodity) {
      setToAmount(minorToMajorInput(entry.toAmountMinor, entry.toCommodity.minorUnits));
    }
    setDatetime(
      duplicating
        ? duplicateDateTimeLocal(entry.date, timeZone)
        : toDateTimeLocal(entry.date, timeZone),
    );
    if (duplicating) {
      const original = toDateTimeLocal(entry.date, timeZone);
      const thisMonth = applyDateChip(original, "this-month", original, timeZone);
      setDateChip(isDateTimeLocalFutureDate(thisMonth, timeZone) ? "today" : "this-month");
    }
  }, [duplicating, existing.data, timeZone]);

  const fromAccount = visibleAccounts.find((account) => account.id === fromId)
    ?? accounts.data?.accounts.find((account) => account.id === fromId);
  const toAccount = visibleAccounts.find((account) => account.id === toId)
    ?? accounts.data?.accounts.find((account) => account.id === toId);
  const crossCurrency = Boolean(
    fromAccount &&
      toAccount &&
      fromAccount.commodity.id !== toAccount.commodity.id,
  );
  const fxDate = civilDateFromDateTimeLocal(datetime, timeZone);
  const fxRate = useFxRate({
    from: fromAccount?.commodity.id,
    to: toAccount?.commodity.id,
    date: fxDate,
    enabled: !editing && crossCurrency && useEcb && !isDateTimeLocalFutureDate(datetime, timeZone),
  });
  const pending = createTransaction.isPending || updateTransaction.isPending;

  const applyEcbFill = (side: AmountSide, sourceText: string) => {
    if (!useEcb || !crossCurrency || !fromAccount || !toAccount || !fxRate.data) {
      return;
    }
    const rateNum = BigInt(fxRate.data.rateNumerator);
    const rateDen = BigInt(fxRate.data.rateDenominator);
    const fromUnits = fromAccount.commodity.minorUnits;
    const toUnits = toAccount.commodity.minorUnits;

    if (side === "from") {
      const trimmed = sourceText.trim();
      if (!trimmed) {
        setToAmount("");
        return;
      }
      const fromMinor = parseMajorToMinor(sourceText, fromUnits);
      if (fromMinor === null || fromMinor <= 0n) {
        return;
      }
      const toMinor = convertMinorAtRate(fromMinor, rateNum, rateDen, fromUnits, toUnits);
      if (toMinor !== null && toMinor > 0n) {
        setToAmount(minorToMajorInput(toMinor, toUnits));
      }
      return;
    }

    const trimmed = sourceText.trim();
    if (!trimmed) {
      setFromAmount("");
      return;
    }
    const toMinor = parseMajorToMinor(sourceText, toUnits);
    if (toMinor === null || toMinor <= 0n) {
      return;
    }
    const fromMinor = convertMinorAtRate(toMinor, rateDen, rateNum, toUnits, fromUnits);
    if (fromMinor !== null && fromMinor > 0n) {
      setFromAmount(minorToMajorInput(fromMinor, fromUnits));
    }
  };

  useEffect(() => {
    if (!useEcb || !crossCurrency || !fxRate.data) {
      return;
    }
    applyEcbFill(lastEdited.current, lastEdited.current === "from" ? fromAmount : toAmount);
    // Re-run when rate/toggle/accounts change; amounts are read from latest state via lastEdited.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    useEcb,
    crossCurrency,
    fxRate.data?.rateNumerator,
    fxRate.data?.rateDenominator,
    fromAccount?.commodity.id,
    toAccount?.commodity.id,
    fxDate,
  ]);

  const accountHref = (slot: "from" | "to") => {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return `/accounts/new?next=${next}&slot=${slot}`;
  };

  const validate = (amounts?: { fromAmount: string; toAmount: string }) => {
    const amountFrom = amounts?.fromAmount ?? fromAmount;
    const amountTo = amounts?.toAmount ?? toAmount;
    const next: Record<string, string> = {};
    if (!fromAccount) {
      next.from = "Please select an account";
    }
    if (!toAccount) {
      next.to = "Please select an account";
    }
    if (fromAccount && toAccount && fromAccount.id === toAccount.id) {
      next.to = "From and to accounts must differ";
    }
    if (!editing) {
      const fromMinor = fromAccount
        ? parseMajorToMinor(amountFrom, fromAccount.commodity.minorUnits)
        : null;
      if (fromMinor === null || fromMinor <= 0n) {
        next.fromAmount = "Enter an amount";
      }
      if (crossCurrency) {
        const toMinor = toAccount
          ? parseMajorToMinor(amountTo, toAccount.commodity.minorUnits)
          : null;
        if (toMinor === null || toMinor <= 0n) {
          next.toAmount = "Enter an amount";
        }
        if (useEcb && fxRate.isError) {
          next.toAmount = "ECB rate unavailable for this date";
        }
      }
    }
    if (!datetime) {
      next.datetime = "Choose a date";
    } else if (isDateTimeLocalFutureDate(datetime, timeZone)) {
      next.datetime = "Date can't be in the future";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    let submitFromAmount = fromAmount;
    let submitToAmount = toAmount;
    if (!editing && crossCurrency && useEcb && fromAccount && toAccount && fxRate.data) {
      const rateNum = BigInt(fxRate.data.rateNumerator);
      const rateDen = BigInt(fxRate.data.rateDenominator);
      const fromUnits = fromAccount.commodity.minorUnits;
      const toUnits = toAccount.commodity.minorUnits;
      if (lastEdited.current === "from") {
        const fromMinor = parseMajorToMinor(fromAmount, fromUnits);
        if (fromMinor !== null && fromMinor > 0n) {
          const toMinor = convertMinorAtRate(fromMinor, rateNum, rateDen, fromUnits, toUnits);
          if (toMinor !== null && toMinor > 0n) {
            submitToAmount = minorToMajorInput(toMinor, toUnits);
            setToAmount(submitToAmount);
          }
        }
      } else {
        const toMinor = parseMajorToMinor(toAmount, toUnits);
        if (toMinor !== null && toMinor > 0n) {
          const fromMinor = convertMinorAtRate(toMinor, rateDen, rateNum, toUnits, fromUnits);
          if (fromMinor !== null && fromMinor > 0n) {
            submitFromAmount = minorToMajorInput(fromMinor, fromUnits);
            setFromAmount(submitFromAmount);
          }
        }
      }
    }

    if (!validate({ fromAmount: submitFromAmount, toAmount: submitToAmount }) || !fromAccount || !toAccount) {
      return;
    }
    try {
      if (editing && entryId) {
        await updateTransaction.mutateAsync({
          id: entryId,
          description: notes.trim(),
          datetime: fromDateTimeLocal(datetime, timeZone),
        });
        navigate("/transactions");
        return;
      }
      const creditAmountMinor = parseMajorToMinor(
        submitFromAmount,
        fromAccount.commodity.minorUnits,
      );
      if (creditAmountMinor === null) {
        return;
      }
      const debitAmountMinor = crossCurrency
        ? parseMajorToMinor(submitToAmount, toAccount.commodity.minorUnits)
        : null;
      await createTransaction.mutateAsync({
        creditAccountId: fromAccount.id,
        debitAccountId: toAccount.id,
        creditAmountMinor: creditAmountMinor.toString(),
        debitAmountMinor:
          debitAmountMinor && debitAmountMinor > 0n
            ? debitAmountMinor.toString()
            : undefined,
        datetime: fromDateTimeLocal(datetime, timeZone),
        description: notes.trim() || undefined,
      });
      navigate("/transactions");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not save the transaction.",
      );
    }
  };

  if (accounts.isPending || ((editing || duplicating) && existing.isPending)) {
    return <LoadingState label="Loading transaction…" />;
  }
  if (accounts.isError) {
    return <ErrorState error={accounts.error} onRetry={() => void accounts.refetch()} />;
  }
  if ((editing || duplicating) && existing.isError) {
    return <ErrorState error={existing.error} onRetry={() => void existing.refetch()} />;
  }
  if ((editing || duplicating) && !existing.data) {
    return (
      <ErrorState
        title="Transaction not found."
        error={new Error("This entry is no longer in the ledger.")}
        onRetry={() => navigate("/transactions")}
      />
    );
  }

  const title = editing
    ? "Edit transaction"
    : duplicating
      ? "Duplicate transaction"
      : "Add a transaction";
  const originalDatetime = existing.data ? toDateTimeLocal(existing.data.date, timeZone) : "";
  const datetimeError = !datetime
    ? errors.datetime
    : isDateTimeLocalFutureDate(datetime, timeZone)
      ? "Date can't be in the future"
      : undefined;
  const dateChips = (
    [
      { id: "today", label: "Today" },
      { id: "this-month", label: "This month" },
      { id: "last-month", label: "Last month" },
      { id: "two-months", label: "2 months back" },
      ...(duplicating ? [{ id: "no-change" as const, label: "No change" }] : []),
    ] satisfies { id: DateChipId; label: string }[]
  ).map((chip) => ({
    ...chip,
    blocked: isDateTimeLocalFutureDate(applyDateChip(datetime, chip.id, originalDatetime, timeZone), timeZone),
  }));

  return (
    <div className="page-stack">
      <Link className="back-link" to="/transactions">
        <ArrowLeft size={16} /> Transactions
      </Link>
      <PageHeader
        eyebrow={editing ? "Ledger edit" : "Ledger write"}
        title={title}
        description={
          editing
            ? "Accounts and amounts stay as posted. You can still correct the notes and date."
            : "Move money from one account to another. Cross-currency amounts can use the ECB rate."
        }
      />

      <Card>
        <form className="write-form" onSubmit={(event) => void onSubmit(event)}>
          <AccountPicker
            title="From account"
            accounts={editing && fromAccount ? [fromAccount] : visibleAccounts}
            selectedId={fromId}
            disabled={editing}
            error={errors.from}
            onSelect={(account) => setFromId(account?.id ?? "")}
            onAddNew={() => navigate(accountHref("from"))}
          />
          <AccountPicker
            title="To account"
            accounts={editing && toAccount ? [toAccount] : visibleAccounts}
            selectedId={toId}
            disabled={editing}
            error={errors.to}
            onSelect={(account) => setToId(account?.id ?? "")}
            onAddNew={() => navigate(accountHref("to"))}
          />

          <Field label="Transaction notes">
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Enter transaction notes"
            />
          </Field>

          {editing ? (
            <Field label="Amount">
              <input
                value={
                  existing.data
                    ? formatMinor(existing.data.amountMinor, existing.data.commodity)
                    : ""
                }
                disabled
              />
            </Field>
          ) : (
            <>
              {crossCurrency && (
                <div className="toggle-row">
                  <span className="toggle-row-title">
                    <strong>Use ECB rate</strong>
                    <ClickTip
                      label="What ECB rate does"
                      text="When on, typing either amount fills the other from the ECB cross rate for this date. When off, enter both amounts yourself."
                    />
                  </span>
                  <Switch
                    checked={useEcb}
                    onChange={setUseEcb}
                    label="Use ECB rate"
                  />
                </div>
              )}
              {crossCurrency && useEcb && fxRate.isError && (
                <p className="form-error">
                  {fxRate.error instanceof Error
                    ? fxRate.error.message
                    : "Could not load the ECB rate for this date."}
                </p>
              )}
              <Field
                label={
                  !fromAccount || !crossCurrency
                    ? fromAccount
                      ? `Amount (${fromAccount.commodity.code})`
                      : "Amount"
                    : `Amount leaving ${fromAccount.commodity.code}`
                }
                error={errors.fromAmount}
              >
                <div className="amount-input">
                  <span>{fromAccount?.commodity.code ?? "—"}</span>
                  <input
                    value={fromAmount}
                    onChange={(event) => {
                      const value = event.target.value;
                      lastEdited.current = "from";
                      setFromAmount(value);
                      if (useEcb && crossCurrency) {
                        applyEcbFill("from", value);
                      }
                    }}
                    inputMode="decimal"
                    placeholder="Enter amount"
                  />
                </div>
              </Field>
              {crossCurrency && (
                <Field
                  label={
                    toAccount
                      ? `Amount arriving in ${toAccount.commodity.code}`
                      : "Arriving amount"
                  }
                  error={errors.toAmount}
                >
                  <div className="amount-input">
                    <span>{toAccount?.commodity.code ?? "—"}</span>
                    <input
                      value={toAmount}
                      onChange={(event) => {
                        const value = event.target.value;
                        lastEdited.current = "to";
                        setToAmount(value);
                        if (useEcb) {
                          applyEcbFill("to", value);
                        }
                      }}
                      inputMode="decimal"
                      placeholder="Enter amount"
                    />
                  </div>
                </Field>
              )}
            </>
          )}

          <div className="datetime-block">
            <Field label="Date and time" error={datetimeError}>
              <div className="datetime-row">
                <input
                  type="datetime-local"
                  value={datetime}
                  max={dateTimeLocalMax(timeZone)}
                  onChange={(event) => {
                    setDateChip(null);
                    setDatetime(event.target.value);
                  }}
                />
                <button
                  type="button"
                  className="icon-button subtle"
                  title="Reset to now"
                  aria-label="Reset to now"
                  onClick={() => {
                    setDateChip("today");
                    setDatetime(toDateTimeLocal(undefined, timeZone));
                  }}
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </Field>
            {!editing && (
              <div className="chips-picker" role="group" aria-label="Date shortcuts">
                {dateChips.map((chip) => (
                  <button
                    key={chip.id}
                    ref={dateChip === chip.id && !chip.blocked ? selectedDateChipRef : undefined}
                    type="button"
                    className={`picker-chip ${dateChip === chip.id && !chip.blocked ? "picker-chip-active" : ""}`}
                    disabled={chip.blocked}
                    onClick={() => {
                      if (chip.blocked) {
                        return;
                      }
                      setDateChip(chip.id);
                      setDatetime(applyDateChip(datetime, chip.id, originalDatetime, timeZone));
                    }}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {formError && <p className="form-error">{formError}</p>}

          <div className="form-actions">
            <button className="button button-primary" type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
