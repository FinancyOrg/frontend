import { ArrowLeft } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import {
  useAccounts,
  useCommodities,
  useCreateAccount,
  useDeleteAccount,
  useEnsureCommodity,
  useUpdateAccount,
} from "../api/queries";
import type { AccountType, ViewAccount } from "../api/types";
import { ClickTip, ConfirmDialog, Field, Switch } from "../components/form";
import {
  Card,
  ErrorState,
  LoadingState,
  PageHeader,
} from "../components/ui";
import { currencyOption, supportedCurrencies } from "../lib/currencies";
import { parseMajorToMinor } from "../lib/money";

const userAccountTypes: AccountType[] = ["income", "expense", "asset", "liability"];

export function AccountFormPage() {
  const { accountId } = useParams();
  const editing = Boolean(accountId);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const accounts = useAccounts();
  const commodities = useCommodities();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const ensureCommodity = useEnsureCommodity();

  const existing = accounts.data?.accounts.find((account) => account.id === accountId);
  const defaultCurrency = accounts.data?.currency?.code ?? "EUR";

  const [accountType, setAccountType] = useState<AccountType>("asset");
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [balance, setBalance] = useState("");
  const [hidden, setHidden] = useState(false);
  const [liquid, setLiquid] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"delete" | null>(null);

  useEffect(() => {
    if (!existing) {
      if (!editing) {
        setCurrency(defaultCurrency);
        setHidden(false);
        setLiquid(false);
      }
      return;
    }
    setAccountType(existing.accountType);
    setName(existing.name);
    setCurrency(existing.commodity.code);
    setHidden(existing.isHidden);
    setLiquid(existing.isLiquid);
  }, [defaultCurrency, editing, existing]);

  const trackBalance = accountType === "asset" || accountType === "liability";
  const pending =
    createAccount.isPending ||
    updateAccount.isPending ||
    deleteAccount.isPending ||
    ensureCommodity.isPending;

  const goBack = (created?: ViewAccount | { id: string }) => {
    const next = searchParams.get("next");
    const slot = searchParams.get("slot");
    if (next && created) {
      const url = new URL(next, window.location.origin);
      if (slot === "from" || slot === "to") {
        url.searchParams.set(slot, created.id);
      }
      navigate(`${url.pathname}${url.search}`);
      return;
    }
    navigate("/accounts");
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!name.trim()) {
      next.name = "Enter account name";
    }
    if (!currency) {
      next.currency = "Please select a currency";
    }
    if (!editing && trackBalance && !balance.trim()) {
      next.balance = "Enter current balance";
    }
    if (!editing && trackBalance && balance.trim()) {
      const option = currencyOption(currency);
      const minorUnits = option?.minorUnits ?? 2;
      if (parseMajorToMinor(balance, minorUnits) === null) {
        next.balance = "Enter a valid amount";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const resolveCommodityId = async () => {
    const listed = commodities.data?.find((item) => item.code === currency);
    if (listed) {
      return listed.id;
    }
    const option = currencyOption(currency);
    try {
      const created = await ensureCommodity.mutateAsync({
        code: currency,
        name: option?.name ?? currency,
        minorUnits: option?.minorUnits ?? 2,
        kind: "currency",
      });
      return created.commodity.id;
    } catch {
      return currency;
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) {
      return;
    }
    try {
      if (editing && existing) {
        await updateAccount.mutateAsync({
          id: existing.id,
          name: name.trim(),
          accountType,
          hidden,
          liquid,
          nativeCommodityId: existing.deletable
            ? await resolveCommodityId()
            : undefined,
        });
        goBack(existing);
        return;
      }
      const option = currencyOption(currency);
      const minorUnits = option?.minorUnits ?? 2;
      const opening = trackBalance ? parseMajorToMinor(balance, minorUnits) : 0n;
      const nativeCommodityId = await resolveCommodityId();
      const created = await createAccount.mutateAsync({
        name: name.trim(),
        accountType,
        nativeCommodityId,
        hidden,
        liquid,
        openingBalanceMinor:
          opening && opening !== 0n ? opening.toString() : undefined,
      });
      goBack(created.account);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save the account.");
    }
  };

  if (accounts.isPending || commodities.isPending) {
    return <LoadingState label={editing ? "Loading account…" : "Loading currencies…"} />;
  }
  if (accounts.isError) {
    return <ErrorState error={accounts.error} onRetry={() => void accounts.refetch()} />;
  }
  if (editing && !existing) {
    return (
      <ErrorState
        title="Account not found."
        error={new Error("This account is no longer in the ledger.")}
        onRetry={() => navigate("/accounts")}
      />
    );
  }

  return (
    <div className="page-stack">
      <Link className="back-link" to="/accounts">
        <ArrowLeft size={16} /> Accounts
      </Link>
      <PageHeader
        eyebrow={editing ? "Edit account" : "New account"}
        title={editing ? existing?.name ?? "Edit account" : "Add account"}
        description={
          editing
            ? "Rename, recategorise, or hide this account. Currency can change only before it has activity."
            : "Create an account, then optionally carry in its current balance."
        }
      />

      <Card>
        <form className="write-form" onSubmit={(event) => void onSubmit(event)}>
          <div className="type-chip-row" role="group" aria-label="Account type">
            {userAccountTypes.map((type) => (
              <button
                key={type}
                type="button"
                className={`picker-chip ${accountType === type ? "picker-chip-active" : ""}`}
                onClick={() => setAccountType(type)}
              >
                {type}
              </button>
            ))}
            {!userAccountTypes.includes(accountType) && (
              <button type="button" className="picker-chip picker-chip-active">
                {accountType}
              </button>
            )}
          </div>

          <Field label="Account name" error={errors.name}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter account name"
              autoComplete="off"
            />
          </Field>

          {(!editing || existing?.deletable) && (
            <Field label="Currency" error={errors.currency}>
              <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                {supportedCurrencies.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code} · {item.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {!editing && trackBalance && (
            <Field
              label="Current balance"
              hint={accountType === "liability" ? "Liabilities should be entered as a negative amount." : undefined}
              error={errors.balance}
            >
              <input
                value={balance}
                onChange={(event) => setBalance(event.target.value)}
                inputMode="decimal"
                placeholder="Enter current balance"
              />
            </Field>
          )}

          <div className="toggle-row">
            <label className="toggle-row-label">
              <strong>Hidden</strong>
              <Switch checked={hidden} onChange={setHidden} label="Hidden" />
            </label>
            <ClickTip
              label="What hidden does"
              text="Hides this account from pickers and moves it to the bottom of Accounts."
            />
          </div>

          <div className="toggle-row">
            <label className="toggle-row-label">
              <strong>Liquid</strong>
              <Switch checked={liquid} onChange={setLiquid} label="Liquid" />
            </label>
            <ClickTip
              label="What liquid does"
              text="Adds this account’s balance to the Liquid total on Overview."
            />
          </div>

          {formError && <p className="form-error">{formError}</p>}

          <div className="form-actions">
            <button className="button button-primary" type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Update" : "Add"}
            </button>
            {editing && existing?.deletable && (
              <button
                className="button button-danger-quiet"
                type="button"
                disabled={pending}
                onClick={() => setConfirm("delete")}
              >
                Delete account
              </button>
            )}
          </div>
        </form>
      </Card>

      {confirm === "delete" && existing && (
        <ConfirmDialog
          title="Confirm"
          confirmLabel="Delete"
          danger
          pending={deleteAccount.isPending}
          error={deleteAccount.error}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            void deleteAccount.mutateAsync(existing.id).then(() => navigate("/accounts"));
          }}
        >
          <p>
            Once you delete an account, you would never get it back, unless you
            restore from a backup.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
