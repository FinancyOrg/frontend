import { ArrowDownLeft, ArrowUpRight, EyeOff, Landmark, Pencil, Plus, Wallet } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAccounts, useDeleteAccount } from "../api/queries";
import type { ViewAccount } from "../api/types";
import { ConfirmDialog } from "../components/form";
import { Swipeable } from "../components/Swipeable";
import {
  Card,
  ErrorState,
  LiquidMark,
  LoadingState,
  PageHeader,
  SectionHeading,
  Tag,
} from "../components/ui";
import { currencySymbol, formatMinor } from "../lib/format";
import { useLongPress } from "../lib/useLongPress";

export function AccountsPage() {
  const accounts = useAccounts();
  const navigate = useNavigate();
  const [pendingDelete, setPendingDelete] = useState<ViewAccount | null>(null);
  const deleteAccount = useDeleteAccount();

  if (accounts.isPending) {
    return <LoadingState label="Loading your accounts…" />;
  }
  if (accounts.isError) {
    return <ErrorState error={accounts.error} onRetry={() => void accounts.refetch()} />;
  }

  const visible = accounts.data.accounts.filter((account) => !account.isHidden);
  const balanceSheet = visible.filter((account) =>
    ["asset", "liability", "equity"].includes(account.accountType),
  );
  const incomeExpense = visible.filter((account) =>
    ["income", "expense"].includes(account.accountType),
  );
  const hidden = accounts.data.accounts.filter((account) => account.isHidden);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Accounts"
        title="Where your money lives"
        description="Every account, translated into a view you can scan at a glance."
        action={
          <button className="button button-primary" onClick={() => navigate("/accounts/new")}>
            <Plus size={16} />
            <span className="button-label">Add account</span>
          </button>
        }
      />

      <Card className="view-note">
        <Wallet size={18} />
        <span>
          Available assets still sit on the balance sheet. Mark an account
          liquid to include it in the Overview total. Hidden accounts stay at
          the bottom of this page and stay out of pickers. Tap an account for
          its transactions, long-press to edit it, swipe to delete.
        </span>
      </Card>

      <section>
        <SectionHeading title="Assets and liabilities" detail="Balance sheet" />
        {balanceSheet.length === 0 ? (
          <Card className="compact-empty-card">
            <p className="muted">Accounts yet to be set up.</p>
          </Card>
        ) : (
          <div className="account-card-grid">
            {balanceSheet.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onOpen={() =>
                  navigate(`/transactions?account=${encodeURIComponent(account.id)}`)
                }
                onEdit={() => navigate(`/accounts/${account.id}/edit`)}
                onDelete={() => setPendingDelete(account)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeading title="Income and expenses" detail="Activity accounts" />
        {incomeExpense.length === 0 ? (
          <Card className="compact-empty-card">
            <p className="muted">No income or expense accounts yet.</p>
          </Card>
        ) : (
          <div className="account-chip-grid">
            {incomeExpense.map((account) => (
              <AccountChip
                key={account.id}
                account={account}
                onOpen={() =>
                  navigate(`/transactions?account=${encodeURIComponent(account.id)}`)
                }
                onEdit={() => navigate(`/accounts/${account.id}/edit`)}
                onDelete={() => setPendingDelete(account)}
              />
            ))}
          </div>
        )}
      </section>

      {hidden.length > 0 && (
        <section>
          <SectionHeading title="Inactive accounts" detail="Hidden from the active view" />
          <div className="account-chip-grid">
            {hidden.map((account) => (
              <AccountChip
                key={account.id}
                account={account}
                onOpen={() =>
                  navigate(`/transactions?account=${encodeURIComponent(account.id)}`)
                }
                onEdit={() => navigate(`/accounts/${account.id}/edit`)}
                onDelete={() => setPendingDelete(account)}
                muted
              />
            ))}
          </div>
        </section>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={pendingDelete.deletable ? "Delete account" : "Account can't be deleted"}
          confirmLabel="Delete"
          danger
          pending={deleteAccount.isPending}
          error={deleteAccount.error}
          onCancel={() => {
            if (!deleteAccount.isPending) {
              setPendingDelete(null);
              deleteAccount.reset();
            }
          }}
          onConfirm={
            pendingDelete.deletable
              ? () => {
                  void deleteAccount.mutateAsync(pendingDelete.id).then(() => {
                    setPendingDelete(null);
                  });
                }
              : undefined
          }
        >
          {pendingDelete.deletable ? (
            <p>
              Only accounts with no transactions can be deleted. Once you delete
              an account, you would never get it back, unless you restore from a
              backup.
            </p>
          ) : (
            <p>
              Only accounts with no transactions can be deleted. “
              {pendingDelete.name}” already has transactions posted to it, so it
              can’t be deleted — you can hide it instead.
            </p>
          )}
        </ConfirmDialog>
      )}
    </div>
  );
}

function AccountCard({
  account,
  onOpen,
  onEdit,
  onDelete,
}: {
  account: ViewAccount;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const positiveDirection =
    account.accountType === "asset" || account.accountType === "income";
  const longPress = useLongPress(onEdit);
  return (
    <Swipeable onDelete={onDelete} onDragActivity={longPress.cancel}>
      <div className="account-card-wrap">
        <button
          className="account-card"
          onClick={onOpen}
          onContextMenu={(event) => event.preventDefault()}
          {...longPress.props}
        >
          <div className="account-card-top">
            <span className="account-icon">
              {account.accountType === "asset" ? <Landmark size={18} /> : <Wallet size={18} />}
            </span>
            <span className="account-card-title">
              <span className="account-card-name">{account.name}</span>
              {account.isLiquid && <LiquidMark size={16} />}
            </span>
            <span className={`direction-icon ${positiveDirection ? "positive" : "negative"}`}>
              {positiveDirection ? <ArrowUpRight size={17} /> : <ArrowDownLeft size={17} />}
            </span>
          </div>
          <div className="account-card-bottom">
            <strong>{formatMinor(account.balanceMinor, account.commodity)}</strong>
            <div className="account-card-meta">
              <Tag tone="neutral">{currencySymbol(account.commodity.code)}</Tag>
            </div>
          </div>
        </button>
        <button
          className="icon-button subtle account-edit"
          title={`Edit ${account.name}`}
          aria-label={`Edit ${account.name}`}
          onClick={onEdit}
        >
          <Pencil size={15} />
        </button>
      </div>
    </Swipeable>
  );
}

function AccountChip({
  account,
  onOpen,
  onEdit,
  onDelete,
  muted = false,
}: {
  account: ViewAccount;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  muted?: boolean;
}) {
  const longPress = useLongPress(onEdit);
  return (
    <Swipeable onDelete={onDelete} onDragActivity={longPress.cancel}>
      <div className={`account-chip-wrap ${muted ? "account-chip-muted" : ""}`}>
        <button
          className="account-chip"
          onClick={onOpen}
          onContextMenu={(event) => event.preventDefault()}
          {...longPress.props}
        >
          {muted ? <EyeOff size={15} /> : <span className="chip-currency">{currencySymbol(account.commodity.code)}</span>}
          <span className="account-chip-title">
            <span>{account.name}</span>
            {account.isLiquid && <LiquidMark size={14} />}
          </span>
          <small>{formatMinor(account.balanceMinor, account.commodity)}</small>
        </button>
        <button
          className="icon-button subtle"
          title={`Edit ${account.name}`}
          aria-label={`Edit ${account.name}`}
          onClick={onEdit}
        >
          <Pencil size={14} />
        </button>
      </div>
    </Swipeable>
  );
}
