import { ArrowRight } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useMonths } from "../api/queries";
import { PeriodCard } from "../components/PeriodCard";
import { RetranslationNote } from "../components/RetranslationNote";
import {
  Card,
  ErrorState,
  LoadingState,
  PageHeader,
  Tag,
} from "../components/ui";

export function MonthsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const year = searchParams.get("year") ?? undefined;
  const months = useMonths(year);

  if (months.isPending) {
    return <LoadingState label="Calculating monthly insights…" />;
  }
  if (months.isError) {
    return <ErrorState error={months.error} onRetry={() => void months.refetch()} />;
  }

  const periods = months.data.months ?? [];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Insights"
        title={year ? `${year} months` : "Monthly rhythm"}
        description="See how income, spending, gains, and net worth moved together."
        action={
          year ? (
            <button
              className="button button-secondary"
              onClick={() => setSearchParams({})}
            >
              All months <ArrowRight size={16} />
            </button>
          ) : (
            <Tag tone="accent">{periods.length} months</Tag>
          )
        }
      />

      {!year && <RetranslationNote currency={months.data.currency} />}

      {periods.length === 0 ? (
        <Card className="compact-empty-card">
          <p className="muted">Monthly insights will appear after your first posted transaction.</p>
        </Card>
      ) : (
        <div className="period-list">
          {periods.map((period) => (
            <PeriodCard
              key={period.key}
              period={period}
              currency={months.data.currency}
              kind="month"
              onClick={() => {
                navigate(
                  `/transactions?from=${period.startDate}&to=${period.endDate}`,
                );
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
