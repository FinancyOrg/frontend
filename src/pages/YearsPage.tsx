import { useNavigate } from "react-router-dom";

import { useYears } from "../api/queries";
import { PeriodCard } from "../components/PeriodCard";
import { RetranslationNote } from "../components/RetranslationNote";
import {
  Card,
  ErrorState,
  LoadingState,
  PageHeader,
  Tag,
} from "../components/ui";

export function YearsPage() {
  const years = useYears();
  const navigate = useNavigate();

  if (years.isPending) {
    return <LoadingState label="Calculating yearly insights…" />;
  }
  if (years.isError) {
    return <ErrorState error={years.error} onRetry={() => void years.refetch()} />;
  }

  const periods = years.data.years ?? [];
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Insights"
        title="Year in review"
        description="A longer lens on the habits and momentum in your ledger."
        action={<Tag tone="accent">{periods.length} years</Tag>}
      />
      <RetranslationNote currency={years.data.currency} />
      {periods.length === 0 ? (
        <Card className="compact-empty-card">
          <p className="muted">Yearly insights will appear after your first posted transaction.</p>
        </Card>
      ) : (
        <div className="period-list">
          {periods.map((period) => (
            <PeriodCard
              key={period.key}
              period={period}
              currency={years.data.currency}
              kind="year"
              onClick={() => navigate(`/months?year=${period.key}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

