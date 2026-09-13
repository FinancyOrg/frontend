export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
  minorUnits: number;
}

export const supportedCurrencies: CurrencyOption[] = [
  { code: "AUD", name: "Australian Dollar", symbol: "A$", minorUnits: 2 },
  { code: "BGN", name: "Bulgarian Lev", symbol: "лв", minorUnits: 2 },
  { code: "BRL", name: "Brazilian Real", symbol: "R$", minorUnits: 2 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", minorUnits: 2 },
  { code: "CHF", name: "Swiss Franc", symbol: "Fr", minorUnits: 2 },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", minorUnits: 2 },
  { code: "CZK", name: "Czech Koruna", symbol: "Kč", minorUnits: 2 },
  { code: "DKK", name: "Danish Krone", symbol: "kr", minorUnits: 2 },
  { code: "EUR", name: "Euro", symbol: "€", minorUnits: 2 },
  { code: "GBP", name: "British Pound", symbol: "£", minorUnits: 2 },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", minorUnits: 2 },
  { code: "HUF", name: "Hungarian Forint", symbol: "Ft", minorUnits: 2 },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", minorUnits: 2 },
  { code: "ILS", name: "Israeli New Shekel", symbol: "₪", minorUnits: 2 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", minorUnits: 2 },
  { code: "ISK", name: "Icelandic Króna", symbol: "kr", minorUnits: 0 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", minorUnits: 0 },
  { code: "KRW", name: "South Korean Won", symbol: "₩", minorUnits: 0 },
  { code: "MXN", name: "Mexican Peso", symbol: "Mex$", minorUnits: 2 },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", minorUnits: 2 },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr", minorUnits: 2 },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", minorUnits: 2 },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", minorUnits: 2 },
  { code: "PLN", name: "Polish Zloty", symbol: "zł", minorUnits: 2 },
  { code: "RON", name: "Romanian Leu", symbol: "lei", minorUnits: 2 },
  { code: "SEK", name: "Swedish Krona", symbol: "kr", minorUnits: 2 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", minorUnits: 2 },
  { code: "THB", name: "Thai Baht", symbol: "฿", minorUnits: 2 },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", minorUnits: 2 },
  { code: "USD", name: "United States Dollar", symbol: "$", minorUnits: 2 },
  { code: "ZAR", name: "South African Rand", symbol: "R", minorUnits: 2 },
];

export function currencyOption(code: string): CurrencyOption | undefined {
  return supportedCurrencies.find((currency) => currency.code === code);
}

export function mergeCurrencyOptions(existingCodes: string[]): CurrencyOption[] {
  const fromCatalog = existingCodes
    .map((code) => currencyOption(code) ?? { code, name: code, symbol: code, minorUnits: 2 })
    .sort((a, b) => a.code.localeCompare(b.code));
  const extras = supportedCurrencies.filter(
    (item) => !existingCodes.includes(item.code),
  );
  return [...fromCatalog, ...extras];
}

const localeRegionCurrency: Record<string, string> = {
  US: "USD",
  CA: "CAD",
  GB: "GBP",
  IN: "INR",
  JP: "JPY",
  AU: "AUD",
  NZ: "NZD",
  SG: "SGD",
  CH: "CHF",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
  PL: "PLN",
  CZ: "CZK",
  HU: "HUF",
  RO: "RON",
  TR: "TRY",
  BR: "BRL",
  MX: "MXN",
  ZA: "ZAR",
  CN: "CNY",
  HK: "HKD",
  KR: "KRW",
  TH: "THB",
  ID: "IDR",
  MY: "MYR",
  PH: "PHP",
  IL: "ILS",
  IS: "ISK",
  AT: "EUR",
  BE: "EUR",
  HR: "EUR",
  CY: "EUR",
  EE: "EUR",
  FI: "EUR",
  FR: "EUR",
  DE: "EUR",
  GR: "EUR",
  IE: "EUR",
  IT: "EUR",
  LV: "EUR",
  LT: "EUR",
  LU: "EUR",
  MT: "EUR",
  NL: "EUR",
  PT: "EUR",
  SK: "EUR",
  SI: "EUR",
  ES: "EUR",
};

export function guessCurrency(supportedCodes: string[]): string {
  const supported = new Set(supportedCodes);
  try {
    const locale = new Intl.Locale(Intl.DateTimeFormat().resolvedOptions().locale);
    const mapped = locale.region ? localeRegionCurrency[locale.region] : undefined;
    if (mapped && supported.has(mapped)) {
      return mapped;
    }
  } catch {
    // Older engines.
  }
  return supportedCodes[0] ?? "";
}
