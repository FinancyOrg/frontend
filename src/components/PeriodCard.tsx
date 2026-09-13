import type { Commodity, PeriodMetrics } from "../api/types";
import { formatMinor } from "../lib/format";
import { ProgressBar } from "./ui";

export function PeriodCard({
  period,
  currency,
  onClick,
  kind,
}: {
  period: PeriodMetrics;
  currency: Commodity;
  onClick: () => void;
  kind: "month" | "year";
}) {
  return (
    <button className="period-card" onClick={onClick}>
      <div className="period-card-heading">
        <strong>{period.label}</strong>
        <span>{kind === "month" ? "View transactions" : "View months"} →</span>
      </div>
      <ProgressBar value={period.factor} good={period.good} />
      <div className="period-metrics">
        <Metric label="Net worth" value={formatMinor(period.netWorthMinor, currency)} emphasis />
        <Metric label="Effect" value={formatMinor(period.effectMinor, currency)} />
        <Metric label="Capital gains" value={formatMinor(period.capitalGainsMinor, currency)} />
        <Metric label="Net savings" value={formatMinor(period.netSavingsMinor, currency)} />
        <Metric label="Income" value={formatMinor(period.incomeMinor, currency)} />
        <Metric label="Expense" value={formatMinor(period.expenseMinor, currency)} />
      </div>
    </button>
  );
}

function Metric({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <span
      className={`period-metric ${emphasis ? "period-metric-emphasis" : ""}`}
    >
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

