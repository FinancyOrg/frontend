import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Commodity, PeriodMetrics } from "../api/types";
import { formatCompactMinor, formatMinor } from "../lib/format";

function chartValue(value: string, currency: Commodity): number {
  return Number(value) / 10 ** currency.minorUnits;
}

function formatMonthTick(key: string, index: number): string {
  const date = new Date(`${key}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return key;
  }
  const month = date.toLocaleString(undefined, { month: "short", timeZone: "UTC" });
  if (index === 0 || key.endsWith("-01")) {
    return `${month} ${String(date.getUTCFullYear()).slice(2)}`;
  }
  return month;
}

export function NetWorthChart({
  periods,
  currency,
}: {
  periods: PeriodMetrics[];
  currency: Commodity;
}) {
  const data = [...periods]
    .reverse()
    .map((period) => ({
      key: period.key,
      label: period.label,
      value: chartValue(period.netWorthMinor, currency),
      formatted: formatMinor(period.netWorthMinor, currency),
    }));

  if (data.length === 0) {
    return <div className="chart-empty">Your net worth history will appear here.</div>;
  }

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 6, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="netWorthFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#45c7a5" stopOpacity={0.38} />
              <stop offset="100%" stopColor="#45c7a5" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid />
          <XAxis
            dataKey="key"
            tickLine={false}
            axisLine={false}
            minTickGap={18}
            tickFormatter={formatMonthTick}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) =>
              `${value < 0 ? "-" : ""}${currency.code} ${Math.abs(value) >= 1000 ? `${(Math.abs(value) / 1000).toFixed(0)}k` : Math.abs(value).toFixed(0)}`
            }
          />
          <Tooltip
            cursor={{ stroke: "rgba(246, 184, 94, 0.55)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) {
                return null;
              }
              const point = payload[0].payload as { label: string; formatted: string };
              return (
                <div className="chart-tooltip">
                  <span>{point.label}</span>
                  <strong>{point.formatted}</strong>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#45c7a5"
            strokeWidth={3}
            fill="url(#netWorthFill)"
            activeDot={{ r: 5, fill: "#f6b85e", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BalanceDonut({
  assets,
  liabilities,
  currency,
}: {
  assets: string;
  liabilities: string;
  currency: Commodity;
}) {
  const assetValue = Math.abs(chartValue(assets, currency));
  const liabilityValue = Math.abs(chartValue(liabilities, currency));
  const total = assetValue + liabilityValue;
  const data = [
    { name: "Assets", value: assetValue, color: "#45c7a5" },
    { name: "Liabilities", value: liabilityValue, color: "#f07878" },
  ];

  if (total === 0) {
    return <div className="donut-empty">No balance sheet yet</div>;
  }

  return (
    <div className="donut-wrap">
      <ResponsiveContainer width="100%" height={190}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={78}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => {
              const numeric = typeof value === "number" ? value : Number(value ?? 0);
              return [
                `${currency.code} ${numeric.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                String(name),
              ];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-center">
        <strong>{formatCompactMinor(assets, currency)}</strong>
        <span>assets</span>
      </div>
    </div>
  );
}

