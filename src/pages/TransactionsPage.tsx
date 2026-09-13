import { Copy, Plus, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useDeleteTransaction, useAccounts, useInfiniteTransactions } from "../api/queries";
import type { AccountType, TopExpense, ViewTransaction } from "../api/types";
import { ConfirmDialog } from "../components/form";
import { Swipeable } from "../components/Swipeable";
import {
  Card,
  EmptyState,
  ErrorState,
  LiquidMark,
  LoadingState,
  PageHeader,
  SectionHeading,
  Tag,
} from "../components/ui";
import { formatMinor, formatRelativeDate } from "../lib/format";
import { useLedgerTimezone } from "../lib/ledgerTimezone";
import { useLongPress } from "../lib/useLongPress";

export function TransactionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const account = searchParams.get("account") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const query = searchParams.get("q") ?? "";
  const [draftQuery, setDraftQuery] = useState(query);
  const [showFilters, setShowFilters] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ViewTransaction | null>(null);
  const transactions = useInfiniteTransactions({ account, from, to, q: query });
  const accounts = useAccounts();
  const deleteTransaction = useDeleteTransaction();

  useEffect(() => {
    setDraftQuery(query);
  }, [query]);

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = draftQuery.trim();
    setDraftQuery(trimmed);
    const next = new URLSearchParams(searchParams);
    if (trimmed) {
      next.set("q", trimmed);
    } else {
      next.delete("q");
    }
    setSearchParams(next);
  };

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams(searchParams);
    const nextFrom = String(form.get("from") ?? "").trim();
    const nextTo = String(form.get("to") ?? "").trim();
    const nextAccount = String(form.get("account") ?? "").trim();
    if (nextAccount) {
      next.set("account", nextAccount);
    } else {
      next.delete("account");
    }
    if (nextFrom) {
      next.set("from", nextFrom);
    } else {
      next.delete("from");
    }
    if (nextTo) {
      next.set("to", nextTo);
    } else {
      next.delete("to");
    }
    setSearchParams(next);
  };

  const clearSearch = () => {
    setDraftQuery("");
    if (!query) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete("q");
    setSearchParams(next);
  };

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("account");
    next.delete("from");
    next.delete("to");
    setSearchParams(next);
    setShowFilters(false);
  };

  if (transactions.isPending) {
    return <LoadingState label="Loading your transactions…" />;
  }
  if (transactions.isError) {
    return (
      <ErrorState
        error={transactions.error}
        onRetry={() => void transactions.refetch()}
      />
    );
  }

  const entries = transactions.data.pages.flatMap((page) => page.entries);
  const expenses = transactions.data.pages[0]?.topExpenses ?? [];
  const incomes = transactions.data.pages[0]?.topIncomes ?? [];
  const accountOptions = accounts.data?.accounts ?? [];
  const filtersActive = Boolean(account || from || to);
  const selectedAccount = account
    ? accountOptions.find((entry) => entry.id === account)
    : undefined;
  const accountTitle = selectedAccount?.name ??
    entries.find((entry) => entry.from?.id === account)?.from?.name ??
    entries.find((entry) => entry.to?.id === account)?.to?.name;
  const rangeLabel = formatScopeRange(from, to);
  const searchPlaceholder = accountTitle
    ? `Search in ${accountTitle}`
    : rangeLabel
      ? `Search in ${rangeLabel}`
      : "Search accounts, notes, or dates";

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow={
          selectedAccount
            ? selectedAccount.accountType
            : rangeLabel
              ? "Period activity"
              : accountTitle
                ? "Account activity"
                : "Ledger activity"
        }
        title={accountTitle ?? rangeLabel ?? "Transactions"}
        description={
          selectedAccount || rangeLabel
            ? undefined
            : "Search the movement between your accounts, with the ledger detail kept close."
        }
        meta={
          selectedAccount ? (
            <div className="page-header-meta">
              <strong className="page-header-balance">
                {formatMinor(selectedAccount.balanceMinor, selectedAccount.commodity)}
              </strong>
              <span>
                {[selectedAccount.code, selectedAccount.commodity.code]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              {selectedAccount.isHidden && <Tag tone="neutral">Inactive</Tag>}
              {selectedAccount.isLiquid && <LiquidMark size={16} />}
            </div>
          ) : undefined
        }
        action={
          <div className="header-actions">
            <button
              className="button button-primary"
              onClick={() =>
                navigate(
                  account
                    ? `/transactions/new?from=${encodeURIComponent(account)}`
                    : "/transactions/new",
                )
              }
            >
              <Plus size={16} />
              <span className="button-label">Add</span>
            </button>
            <button
              className={`button button-secondary ${showFilters || filtersActive ? "button-active" : ""}`}
              onClick={() => setShowFilters((visible) => !visible)}
            >
              <SlidersHorizontal size={16} /> <span className="button-label">Filters</span>
            </button>
          </div>
        }
      />

      <form className="transaction-toolbar" onSubmit={applySearch}>
        <div className="search-input">
          <Search size={18} />
          <input
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
          {draftQuery && (
            <button
              type="button"
              className="search-clear"
              aria-label="Clear search"
              onClick={clearSearch}
            >
              <X size={15} />
            </button>
          )}
        </div>
        <button className="button button-primary toolbar-submit" type="submit">
          Search
        </button>
      </form>

      {(accountTitle || rangeLabel) && (
        <div className="search-scope">
          <span className="search-scope-label">Searching in</span>
          {accountTitle && <Tag tone="accent">{accountTitle}</Tag>}
          {rangeLabel && <Tag tone="accent">{rangeLabel}</Tag>}
        </div>
      )}

      {showFilters && (
        <form className="filter-panel card" onSubmit={applyFilters}>
          <label>
            <span>Account</span>
            <select name="account" defaultValue={account ?? ""}>
              <option value="">All accounts</option>
              {accountOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name} · {option.commodity.code}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>From</span>
            <input name="from" type="date" defaultValue={from ?? ""} />
          </label>
          <label>
            <span>To</span>
            <input name="to" type="date" defaultValue={to ?? ""} />
          </label>
          <button className="button button-primary" type="submit">
            Apply filters
          </button>
          {(account || from || to) && (
            <button className="button button-quiet" type="button" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </form>
      )}

      {(expenses.length > 0 || incomes.length > 0) && (
        <section className="top-accounts-grid">
          {expenses.length > 0 && (
            <TopAccounts
              title="Top expenses"
              detail="Selected date range"
              items={expenses}
              tone="negative"
            />
          )}
          {incomes.length > 0 && (
            <TopAccounts
              title="Top income"
              detail="Selected date range"
              items={incomes}
              tone="positive"
            />
          )}
        </section>
      )}

      {entries.length === 0 ? (
        <Card>
          <EmptyState
            title="No transactions found."
            description={
              query || from || to
                ? "Try a wider date range or a different search."
                : "Posted transactions will appear here once your ledger has activity."
            }
            action={
              <button className="button button-primary" onClick={() => navigate("/transactions/new")}>
                <Plus size={16} /> Add a transaction
              </button>
            }
          />
        </Card>
      ) : (
        <section className="transaction-list">
          <div className="list-caption">
            <span>{entries.length} transaction{entries.length === 1 ? "" : "s"} loaded</span>
            {query && <Tag tone="accent">Search: {query}</Tag>}
          </div>
          {entries.map((entry) => (
            <TransactionCard
              key={entry.id}
              entry={entry}
              onOpen={() => navigate(`/transactions/${entry.id}`)}
              onDuplicate={() => navigate(`/transactions/${entry.id}/duplicate`)}
              onDelete={() => setPendingDelete(entry)}
            />
          ))}
          <InfiniteScrollSentinel
            hasNextPage={Boolean(transactions.hasNextPage)}
            isFetchingNextPage={transactions.isFetchingNextPage}
            fetchNextPage={transactions.fetchNextPage}
          />
        </section>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Confirm"
          confirmLabel="Delete"
          danger
          pending={deleteTransaction.isPending}
          error={deleteTransaction.error}
          onCancel={() => {
            if (!deleteTransaction.isPending) {
              setPendingDelete(null);
              deleteTransaction.reset();
            }
          }}
          onConfirm={() => {
            void deleteTransaction.mutateAsync(pendingDelete.id).then(() => {
              setPendingDelete(null);
            });
          }}
        >
          <p>
            Once you delete a transaction the balance in related accounts would be
            automatically readjusted.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}

function TransactionCard({
  entry,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  entry: ViewTransaction;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const expense = entry.category === "expense";
  const transfer =
    entry.category === null &&
    isBalanceSheetAccount(entry.from?.accountType) &&
    isBalanceSheetAccount(entry.to?.accountType);
  const tagLabel =
    entry.category === "income"
      ? "Income"
      : expense
        ? "Expense"
        : entry.category === "capital_gains"
          ? "Capital gains"
          : transfer
            ? "Transfer"
            : "Other";
  const crossCurrency =
    entry.commodity && entry.toCommodity && entry.commodity.id !== entry.toCommodity.id;
  const longPress = useLongPress(onDuplicate);
  const timeZone = useLedgerTimezone();

  return (
    <Swipeable onDelete={onDelete} onDragActivity={longPress.cancel}>
      <Card
        className={`transaction-card ${expense ? "transaction-expense" : ""}`}
        as="article"
      >
        <button
          className="transaction-card-button"
          onClick={onOpen}
          onContextMenu={(event) => event.preventDefault()}
          {...longPress.props}
        >
        <div className="transaction-topline">
          <span>
            <span className="transaction-dir">From: </span>
            {entry.from?.name ?? "Unresolved account"}
          </span>
          <time>{formatRelativeDate(entry.date, timeZone)}</time>
          <span>
            <span className="transaction-dir">To: </span>
            {entry.to?.name ?? "Unresolved account"}
          </span>
        </div>
        <div className="transaction-main">
          <div>
            <strong className="transaction-amount">
              {formatMinor(entry.amountMinor, entry.commodity)}
              {crossCurrency && entry.toAmountMinor && entry.toCommodity && (
                <span className="transaction-secondary">
                  → {formatMinor(entry.toAmountMinor, entry.toCommodity)}
                </span>
              )}
            </strong>
            <span className="transaction-description">
              {entry.description || "Untitled transaction"}
            </span>
          </div>
          <div className="transaction-tags">
            <Tag
              tone={
                expense
                  ? "negative"
                  : entry.category === "capital_gains"
                    ? "accent"
                    : entry.category === "income"
                      ? "positive"
                      : "neutral"
              }
            >
              {tagLabel}
            </Tag>
            {entry.postings.length > 2 && (
              <Tag tone="neutral">{entry.postings.length} postings</Tag>
            )}
          </div>
        </div>
      </button>
      <div className="transaction-actions">
        <button
          type="button"
          className="icon-button subtle"
          title="Duplicate transaction"
          aria-label="Duplicate transaction"
          onClick={onDuplicate}
        >
          <Copy size={15} />
        </button>
        <button
          type="button"
          className="icon-button subtle"
          title="Delete transaction"
          aria-label="Delete transaction"
          onClick={onDelete}
        >
          <Trash2 size={15} />
        </button>
      </div>
      </Card>
    </Swipeable>
  );
}

function InfiniteScrollSentinel({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !hasNextPage || isFetchingNextPage) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!hasNextPage && !isFetchingNextPage) {
    return null;
  }

  return (
    <div ref={ref} className="load-more" aria-live="polite">
      {isFetchingNextPage ? "Loading more…" : null}
    </div>
  );
}

function parseCivilDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function formatCivilParts(
  year: number,
  month: number,
  day: number,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(year, month - 1, day));
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function formatScopeRange(from?: string, to?: string) {
  const start = from ? parseCivilDate(from) : null;
  const end = to ? parseCivilDate(to) : null;
  if (!start && !end) {
    return undefined;
  }
  const longDate: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  if (start && end) {
    const sameMonth = start.year === end.year && start.month === end.month;
    const fullMonth =
      sameMonth && start.day === 1 && end.day === lastDayOfMonth(end.year, end.month);
    if (fullMonth) {
      return formatCivilParts(start.year, start.month, 1, {
        month: "long",
        year: "numeric",
      });
    }
    const fullYear =
      start.year === end.year &&
      start.month === 1 &&
      start.day === 1 &&
      end.month === 12 &&
      end.day === 31;
    if (fullYear) {
      return String(start.year);
    }
    return `${formatCivilParts(start.year, start.month, start.day, longDate)} – ${formatCivilParts(end.year, end.month, end.day, longDate)}`;
  }
  if (start) {
    return `From ${formatCivilParts(start.year, start.month, start.day, longDate)}`;
  }
  if (end) {
    return `Until ${formatCivilParts(end.year, end.month, end.day, longDate)}`;
  }
  return undefined;
}

function isBalanceSheetAccount(accountType: AccountType | undefined): boolean {
  return accountType === "asset" || accountType === "liability";
}

function TopAccounts({
  title,
  detail,
  items,
  tone,
}: {
  title: string;
  detail: string;
  items: TopExpense[];
  tone: "positive" | "negative";
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = items.slice(0, 5);
  const extra = items.slice(5, 10);
  const hiddenCount = extra.length;

  return (
    <Card className="top-expenses">
      <SectionHeading title={title} detail={detail} />
      <div className="expense-list">
        {preview.map((item) => (
          <div className="expense-row" key={`${item.accountId}-${item.commodity.id}`}>
            <span>
              <strong>{item.name}</strong>
              <small>{item.commodity.code}</small>
            </span>
            <strong className={tone === "positive" ? "value-positive" : undefined}>
              {formatMinor(item.amountMinor, item.commodity)}
            </strong>
          </div>
        ))}
        {hiddenCount > 0 && (
          <>
            <div className={`expense-list-extra ${expanded ? "is-open" : ""}`}>
              <div className="expense-list-extra-inner">
                {extra.map((item) => (
                  <div className="expense-row" key={`${item.accountId}-${item.commodity.id}`}>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.commodity.code}</small>
                    </span>
                    <strong className={tone === "positive" ? "value-positive" : undefined}>
                      {formatMinor(item.amountMinor, item.commodity)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="balance-list-more"
              aria-expanded={expanded}
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded ? "Show less" : `Show more (+${hiddenCount})`}
            </button>
          </>
        )}
      </div>
    </Card>
  );
}

