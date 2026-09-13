const amountPattern = /^-?\d+(\.\d+)?$/;

export function parseMajorToMinor(
  text: string,
  minorUnits: number,
): bigint | null {
  const trimmed = text.trim().replace(/,/g, "");
  if (!trimmed || !amountPattern.test(trimmed)) {
    return null;
  }
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [whole, fraction = ""] = unsigned.split(".");
  if (fraction.length > minorUnits) {
    return null;
  }
  const padded = fraction.padEnd(Math.max(0, minorUnits), "0");
  const digits = `${whole || "0"}${padded}`;
  const minor = BigInt(digits || "0");
  return negative ? -minor : minor;
}

export function minorToMajorInput(
  minor: string | bigint,
  minorUnits: number,
): string {
  const raw = typeof minor === "bigint" ? minor : BigInt(minor);
  const negative = raw < 0n;
  const digits = (negative ? -raw : raw).toString().padStart(minorUnits + 1, "0");
  if (minorUnits <= 0) {
    return `${negative ? "-" : ""}${digits}`;
  }
  const whole = digits.slice(0, digits.length - minorUnits) || "0";
  const fraction = digits.slice(-minorUnits).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

function absBig(n: bigint): bigint {
  return n < 0n ? -n : n;
}

function gcdBig(a: bigint, b: bigint): bigint {
  let x = absBig(a);
  let y = absBig(b);
  while (y !== 0n) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x;
}

/** Matches domain.RoundHalfAwayFromZero — ties round away from zero. */
export function roundHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint | null {
  let num = numerator;
  let den = denominator;
  if (den === 0n) {
    return null;
  }
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  const quotient = num / den;
  const remainder = num % den;
  if (remainder === 0n) {
    return quotient;
  }
  const twice = absBig(remainder) * 2n;
  if (twice >= den) {
    return num >= 0n ? quotient + 1n : quotient - 1n;
  }
  return quotient;
}

/**
 * Converts a native minor-unit amount through an FX rate into another
 * commodity's minor units. Mirrors domain.ConvertMinorAtRate.
 *
 * rate is to-per-from as numerator/denominator.
 */
export function convertMinorAtRate(
  fromMinor: bigint,
  rateNumerator: bigint,
  rateDenominator: bigint,
  fromMinorUnits: number,
  toMinorUnits: number,
): bigint | null {
  let num = rateNumerator;
  let den = rateDenominator;
  if (den === 0n) {
    return null;
  }
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  const g = gcdBig(num, den);
  num /= g;
  den /= g;

  let product = fromMinor * num;
  let divisor = den;
  const scaleDiff = toMinorUnits - fromMinorUnits;
  if (scaleDiff > 0) {
    product *= 10n ** BigInt(scaleDiff);
  } else if (scaleDiff < 0) {
    divisor *= 10n ** BigInt(-scaleDiff);
  }
  return roundHalfAwayFromZero(product, divisor);
}

export const DEFAULT_LEDGER_TIMEZONE = "Europe/Berlin";

export function civilDateFromDateTimeLocal(
  value: string,
  timeZone: string = DEFAULT_LEDGER_TIMEZONE,
): string {
  const parts = parseDateTimeLocal(value);
  if (!parts) {
    const now = partsInTimeZone(new Date(), timeZone);
    return `${now.year}-${pad2(now.month)}-${pad2(now.day)}`;
  }
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

const DATETIME_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

export type DateTimeLocalParts = {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function parseDateTimeLocal(value: string): DateTimeLocalParts | null {
  const match = DATETIME_LOCAL_RE.exec(value);
  if (!match) {
    return null;
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hours: Number(match[4]),
    minutes: Number(match[5]),
  };
}

export function formatDateTimeLocal(parts: DateTimeLocalParts): string {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}T${pad2(parts.hours)}:${pad2(parts.minutes)}`;
}

function dateTimeLocalPartsOrNow(value: string, timeZone: string): DateTimeLocalParts {
  return parseDateTimeLocal(value) ?? partsInTimeZone(new Date(), timeZone);
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function partsInTimeZone(date: Date, timeZone: string): DateTimeLocalParts {
  const map: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hours: Number(map.hour),
    minutes: Number(map.minute),
  };
}

function wallUtcMs(parts: DateTimeLocalParts): number {
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hours, parts.minutes);
}

function zoneOffsetMs(date: Date, timeZone: string): number {
  return wallUtcMs(partsInTimeZone(date, timeZone)) - wallUtcMs(partsInTimeZone(date, "UTC"));
}

/** Calendar month `monthOffset` from today in the ledger timezone. 0 is this month; month is 1-indexed. */
export function calendarMonthFromNow(
  monthOffset: number,
  timeZone: string = DEFAULT_LEDGER_TIMEZONE,
): { year: number; month: number } {
  const now = partsInTimeZone(new Date(), timeZone);
  const date = new Date(Date.UTC(now.year, now.month - 1 + monthOffset, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

/** Keep day (clamped) and time; set the calendar month. `month` is 1-indexed. */
export function withDateTimeLocalMonth(value: string, year: number, month: number, timeZone: string = DEFAULT_LEDGER_TIMEZONE): string {
  const parts = dateTimeLocalPartsOrNow(value, timeZone);
  return formatDateTimeLocal({
    ...parts,
    year,
    month,
    day: Math.min(parts.day, lastDayOfMonth(year, month)),
  });
}

/** End of ledger-timezone today, for datetime-local max. */
export function dateTimeLocalMax(timeZone: string = DEFAULT_LEDGER_TIMEZONE): string {
  const now = partsInTimeZone(new Date(), timeZone);
  return formatDateTimeLocal({
    year: now.year,
    month: now.month,
    day: now.day,
    hours: 23,
    minutes: 59,
  });
}

export function isDateTimeLocalFutureDate(
  value: string,
  timeZone: string = DEFAULT_LEDGER_TIMEZONE,
  now = new Date(),
): boolean {
  const parts = parseDateTimeLocal(value);
  if (!parts) {
    return false;
  }
  const today = partsInTimeZone(now, timeZone);
  const selected = parts.year * 10000 + parts.month * 100 + parts.day;
  const todayKey = today.year * 10000 + today.month * 100 + today.day;
  return selected > todayKey;
}

/** Set the calendar date to today in the ledger timezone; keep time. */
export function withDateTimeLocalToday(value: string, timeZone: string = DEFAULT_LEDGER_TIMEZONE): string {
  const parts = dateTimeLocalPartsOrNow(value, timeZone);
  const now = partsInTimeZone(new Date(), timeZone);
  return formatDateTimeLocal({
    year: now.year,
    month: now.month,
    day: now.day,
    hours: parts.hours,
    minutes: parts.minutes,
  });
}

export function parseInstant(value: string): Date {
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date;
  }
  return new Date(value.replace(/(\.\d{3})\d+/, "$1"));
}

export function toDateTimeLocal(
  value?: string | null,
  timeZone: string = DEFAULT_LEDGER_TIMEZONE,
): string {
  const date = value ? parseInstant(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return formatDateTimeLocal(partsInTimeZone(date, timeZone));
}

export function fromDateTimeLocal(
  value: string,
  timeZone: string = DEFAULT_LEDGER_TIMEZONE,
): string {
  const parts = parseDateTimeLocal(value);
  if (!parts) {
    return new Date().toISOString();
  }
  const naive = wallUtcMs(parts);
  let instant = naive;
  for (let step = 0; step < 2; step += 1) {
    instant = naive - zoneOffsetMs(new Date(instant), timeZone);
  }
  return new Date(instant).toISOString();
}

export function duplicateDateTimeLocal(
  value?: string | null,
  timeZone: string = DEFAULT_LEDGER_TIMEZONE,
): string {
  const original = value
    ? partsInTimeZone(parseInstant(value), timeZone)
    : partsInTimeZone(new Date(), timeZone);
  const now = partsInTimeZone(new Date(), timeZone);
  if (value && Number.isNaN(parseInstant(value).getTime())) {
    return toDateTimeLocal(undefined, timeZone);
  }
  const lastDay = lastDayOfMonth(now.year, now.month);
  const formatted = formatDateTimeLocal({
    year: now.year,
    month: now.month,
    day: Math.min(original.day, lastDay),
    hours: original.hours,
    minutes: original.minutes,
  });
  if (isDateTimeLocalFutureDate(formatted, timeZone)) {
    return withDateTimeLocalToday(formatted, timeZone);
  }
  return formatted;
}
