import { ArrowDownRight, ArrowUpRight, Clock3, Droplets, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useDashboard } from "../api/queries";
import type { Commodity, ValuedBalance } from "../api/types";
import { BalanceDonut, NetWorthChart } from "../components/charts";
import {
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionHeading,
  Stat,
} from "../components/ui";
import { formatAbsoluteMinor, formatCivilDate, formatMinor } from "../lib/format";
import { useLedgerTimezone } from "../lib/ledgerTimezone";

const PREVIEW_COUNT = 5;

function compareByReportingDesc(a: ValuedBalance, b: ValuedBalance) {
  const left = absMinor(a.reportingMinor);
  const right = absMinor(b.reportingMinor);
  if (right > left) {
    return 1;
  }
  if (right < left) {
    return -1;
  }
  return (a.accountName ?? "").localeCompare(b.accountName ?? "");
}

function absMinor(value: string) {
  const amount = BigInt(value);
  return amount < 0n ? -amount : amount;
}
export function DashboardPage() {
  const dashboard = useDashboard();
  const navigate = useNavigate();
  const timeZone = useLedgerTimezone();

  if (dashboard.isPending) {
    return <LoadingState />;
  }
  if (dashboard.isError) {
    return <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
  }

  const data = dashboard.data;
  const empty = data.assets.length === 0 && data.liabilities.length === 0;
  const netWorthPositive = BigInt(data.netWorthMinor) >= 0n;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Overview"
        title="Your financial picture"
        description="A measured view of what you own, owe, and keep moving."
        action={
          <button className="button button-primary" onClick={() => navigate("/transactions/new")}>
            <Plus size={16} />
            <span className="button-label">Add transaction</span>
          </button>
        }
      />

      {empty ? (
        <Card className="empty-dashboard">
          <EmptyState
            title="Your ledger is ready for its first story."
            description="Once transactions are posted, Financy will shape them into a net worth timeline and a clear balance sheet."
            action={
              <button className="button button-primary" onClick={() => navigate("/transactions/new")}>
                <Plus size={16} /> Add a transaction
              </button>
            }
          />
        </Card>
      ) : (
        <>
          <section className="dashboard-hero card">
            <div className="hero-copy">
              <div className="hero-label">
                <span className="hero-pulse" />
                Net worth
              </div>
              <strong className={`hero-value ${netWorthPositive ? "" : "value-negative"}`}>
                {formatMinor(data.netWorthMinor, data.currency)}
              </strong>
              <p>
                {netWorthPositive
                  ? "The value of your balance sheet after liabilities."
                  : "Your liabilities currently outweigh your assets."}
              </p>
              <div className="hero-meta">
                <span>
                  <Clock3 size={14} /> As of{" "}
                  {formatCivilDate(data.asOf, timeZone)}
                </span>
                <span className="hero-meta-detail">
                  <Droplets size={14} /> Liquid is the sum of accounts marked liquid.
                </span>
              </div>
            </div>
            <BalanceDonut
              assets={data.totalAssetsMinor}
              liabilities={data.totalLiabilitiesMinor}
              currency={data.currency}
            />
          </section>

          <section className="stats-grid">
            <Card className="stat-card">
              <Stat
                label="Liquid"
                value={formatMinor(data.liquidMinor, data.currency)}
                detail="Accounts marked liquid"
                tone="accent"
              />
              <Droplets className="stat-card-icon" size={21} />
            </Card>
            <Card className="stat-card">
              <Stat
                label="Assets"
                value={formatMinor(data.totalAssetsMinor, data.currency)}
                detail={`${data.assets.length} balance sheet account${data.assets.length === 1 ? "" : "s"}`}
                tone="positive"
              />
              <ArrowUpRight className="stat-card-icon positive" size={21} />
            </Card>
            <Card className="stat-card">
              <Stat
                label="Liabilities"
                value={formatAbsoluteMinor(data.totalLiabilitiesMinor, data.currency)}
                detail={`${data.liabilities.length} account${data.liabilities.length === 1 ? "" : "s"}`}
                tone="negative"
              />
              <ArrowDownRight className="stat-card-icon negative" size={21} />
            </Card>
          </section>

          <Card className="chart-card">
            <SectionHeading
              title="Net worth over time"
              detail={data.trend.length ? `${data.trend.length} monthly points` : undefined}
            />
            <NetWorthChart periods={data.trend} currency={data.currency} />
          </Card>

          <section className="balance-detail-grid">
            <Card>
              <SectionHeading title="Assets" detail={data.currency.code} />
              <BalanceList
                values={data.assets}
                currency={data.currency}
                emptyLabel="No assets recorded."
                tone="positive"
              />
            </Card>
            <Card>
              <SectionHeading title="Liabilities" detail={data.currency.code} />
              <BalanceList
                values={data.liabilities}
                currency={data.currency}
                emptyLabel="No liabilities recorded."
                tone="negative"
              />
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function BalanceList({
  values,
  currency,
  emptyLabel,
  tone,
}: {
  values: ValuedBalance[];
  currency: Commodity;
  emptyLabel: string;
  tone: "positive" | "negative";
}) {
  const [expanded, setExpanded] = useState(false);
  const sorted = [...values].sort(compareByReportingDesc);

  if (sorted.length === 0) {
    return <p className="muted compact-empty">{emptyLabel}</p>;
  }

  const preview = sorted.slice(0, PREVIEW_COUNT);
  const extra = sorted.slice(PREVIEW_COUNT);
  const hiddenCount = extra.length;

  return (
    <div className="balance-list">
      {preview.map((value) => (
        <BalanceRow key={value.accountId} value={value} currency={currency} tone={tone} />
      ))}
      {hiddenCount > 0 && (
        <>
          <div className={`balance-list-extra ${expanded ? "is-open" : ""}`}>
            <div className="balance-list-extra-inner">
              {extra.map((value) => (
                <BalanceRow
                  key={value.accountId}
                  value={value}
                  currency={currency}
                  tone={tone}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            className="balance-list-more"
            aria-expanded={expanded}
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded ? "Show less" : `+${hiddenCount} more accounts`}
          </button>
        </>
      )}
    </div>
  );
}

function BalanceRow({
  value,
  currency,
  tone,
}: {
  value: ValuedBalance;
  currency: Commodity;
  tone: "positive" | "negative";
}) {
  const navigate = useNavigate();
  const name = value.accountName ?? value.accountId.slice(0, 8);
  return (
    <button
      type="button"
      className="balance-row"
      onClick={() =>
        navigate(`/transactions?account=${encodeURIComponent(value.accountId)}`)
      }
    >
      <span className={`balance-dot ${tone}`} />
      <span className="balance-row-name">
        <strong>{name}</strong>
        <small>{value.accountCode ?? value.accountType}</small>
      </span>
      <strong>{formatMinor(value.reportingMinor, currency)}</strong>
    </button>
  );
}

