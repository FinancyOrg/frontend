import type { Commodity, PeriodMetrics } from "../api/types";
import { DEFAULT_LEDGER_TIMEZONE, parseInstant } from "./money";

const symbolCache = new Map<string, string>();

/**
 * Resolves an ISO 4217 code to its display symbol via Intl.NumberFormat,
 * which ships Unicode CLDR data — the authoritative source for currency
 * symbols. Falls back to the code itself for non-currency commodities
 * (stock tickers, crypto, …) that CLDR does not know.
 */
export function currencySymbol(code: string): string {
  const cached = symbolCache.get(code);
  if (cached !== undefined) {
    return cached;
  }
  let symbol = code;
  try {
    const part = new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(0)
      .find((p) => p.type === "currency");
    if (part) {
      symbol = part.value;
    }
  } catch {
    // Not a valid ISO 4217 code — keep the code as its own symbol.
  }
  symbolCache.set(code, symbol);
  return symbol;
}

function symbolPrefix(code: string): string {
  const symbol = currencySymbol(code);
  return symbol === code ? `${code} ` : symbol;
}

function groupDigits(value: string): string {
  let grouped = "";
  for (let index = 0; index < value.length; index += 1) {
    if (index > 0 && (value.length - index) % 3 === 0) {
      grouped += ",";
    }
    grouped += value[index];
  }
  return grouped;
}

export function formatMinor(
  value: string | null | undefined,
  commodity: Pick<Commodity, "code" | "minorUnits"> | null | undefined,
): string {
  if (value === null || value === undefined) {
    return "—";
  }
  const currency = commodity ?? { code: "", minorUnits: 2 };
  const raw = BigInt(value);
  const negative = raw < 0n;
  const digits = (negative ? -raw : raw).toString();
  const scale = Math.max(0, currency.minorUnits);
  const padded = digits.padStart(scale + 1, "0");
  const major = padded.slice(0, padded.length - scale) || "0";
  const fraction = scale > 0 ? `.${padded.slice(-scale)}` : "";
  const prefix = symbolPrefix(currency.code);
  return `${negative ? "-" : ""}${prefix}${groupDigits(major)}${fraction}`;
}

export function formatSignedMinor(
  value: string | null | undefined,
  commodity: Pick<Commodity, "code" | "minorUnits"> | null | undefined,
): string {
  return formatMinor(value, commodity).replace(/^-/, "");
}

export function formatAbsoluteMinor(
  value: string | null | undefined,
  commodity: Pick<Commodity, "code" | "minorUnits"> | null | undefined,
): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return formatMinor((BigInt(value) < 0n ? -BigInt(value) : BigInt(value)).toString(), commodity);
}

export function formatCivilDate(value: string, timeZone: string = DEFAULT_LEDGER_TIMEZONE): string {
  const date = parseInstant(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(date);
}

export function formatRelativeDate(value: string, timeZone: string = DEFAULT_LEDGER_TIMEZONE): string {
  const date = parseInstant(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const difference = Date.now() - date.getTime();
  if (difference < 60 * 60 * 1000) {
    return "moments ago";
  }
  if (difference < 24 * 60 * 60 * 1000) {
    return `${Math.floor(difference / (60 * 60 * 1000))}h ago`;
  }
  if (difference < 48 * 60 * 60 * 1000) {
    return "yesterday";
  }
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(date);
}

export function formatFullDate(value: string, timeZone: string = DEFAULT_LEDGER_TIMEZONE): string {
  const date = parseInstant(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

export function formatCompactMinor(
  value: string,
  commodity: Pick<Commodity, "code" | "minorUnits">,
): string {
  const amount = Number(value) / 10 ** commodity.minorUnits;
  if (!Number.isFinite(amount)) {
    return formatMinor(value, commodity);
  }
  const sign = amount < 0 ? "-" : "";
  const absolute = Math.abs(amount);
  const suffix = absolute >= 1_000_000
    ? `${(absolute / 1_000_000).toFixed(1)}m`
    : absolute >= 1_000
      ? `${(absolute / 1_000).toFixed(1)}k`
      : absolute.toFixed(0);
  return `${sign}${symbolPrefix(commodity.code)}${suffix}`;
}

export function periodYear(period: PeriodMetrics): string {
  return period.key.slice(0, 4);
}

