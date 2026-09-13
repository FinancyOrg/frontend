import type {
  AppConfig,
  AccountsView,
  AccountType,
  Commodity,
  DashboardView,
  LedgerAccount,
  PeriodsView,
  PostedTransaction,
  RetranslationView,
  Session,
  TransactionsView,
  UiTheme,
  ViewTransaction,
} from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : typeof body === "object" &&
            body !== null &&
            "error" in body &&
            typeof body.error === "string"
          ? body.error
          : `Request failed (${status})`;
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers: {
      Accept: "application/json",
      ...init.headers,
    },
  });
  const text = await response.text();
  let body: unknown = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: text };
    }
  }
  if (!response.ok) {
    throw new ApiError(response.status, body);
  }
  return body as T;
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : "";
}

function jsonBody(value: unknown): RequestInit {
  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  };
}

export const api = {
  getSession: () => request<Session>("/api/auth/me"),
  exchangeGoogleCredential: (credential: string) =>
    request<Session>("/api/auth/google", {
      method: "POST",
      ...jsonBody({ credential }),
    }),
  exchangeDevSession: () =>
    request<Session>("/api/auth/dev", { method: "POST" }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  dashboard: () => request<DashboardView>("/api/v1/view/dashboard"),
  accounts: () => request<AccountsView>("/api/v1/view/accounts"),
  commodities: () =>
    request<{ commodities: Commodity[] }>("/api/commodities"),
  createCommodity: (input: {
    code: string;
    name: string;
    minorUnits: number;
    kind?: "currency" | "security" | "other";
  }) =>
    request<{ commodity: Commodity }>("/api/commodities", {
      method: "POST",
      ...jsonBody(input),
    }),
  createAccount: (input: {
    name: string;
    accountType: AccountType;
    code?: string;
    nativeCommodityId?: string;
    openingBalanceMinor?: string;
    hidden?: boolean;
    liquid?: boolean;
  }) =>
    request<{ account: LedgerAccount }>("/api/accounts", {
      method: "POST",
      ...jsonBody(input),
    }),
  updateAccount: (
    id: string,
    input: {
      name?: string;
      accountType?: AccountType;
      nativeCommodityId?: string;
      hidden?: boolean;
      liquid?: boolean;
    },
  ) =>
    request<{ account: LedgerAccount }>(`/api/accounts/${id}`, {
      method: "PATCH",
      ...jsonBody(input),
    }),
  deleteAccount: (id: string) =>
    request<void>(`/api/accounts/${id}`, { method: "DELETE" }),
  transaction: (id: string) =>
    request<ViewTransaction>(`/api/v1/view/transactions/${id}`),
  createTransaction: (input: {
    creditAccountId: string;
    debitAccountId: string;
    creditAmountMinor: string;
    debitAmountMinor?: string;
    datetime?: string;
    description?: string;
  }) =>
    request<PostedTransaction>("/api/v1/transaction", {
      method: "POST",
      ...jsonBody(input),
    }),
  fxRate: (params: { from: string; to: string; date?: string }) =>
    request<{
      fromCommodityId: string;
      toCommodityId: string;
      rateNumerator: string;
      rateDenominator: string;
      observedDate: string;
      asOfDate: string;
    }>(`/api/v1/fx/rate${query(params)}`),
  updateTransaction: (
    id: string,
    input: { datetime?: string; description?: string },
  ) =>
    request<{ entry: { id: string } }>(`/api/v1/transaction/${id}`, {
      method: "PATCH",
      ...jsonBody(input),
    }),
  deleteTransaction: (id: string) =>
    request<void>(`/api/v1/transaction/${id}`, { method: "DELETE" }),
  transactions: (params: {
    account?: string;
    from?: string;
    to?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }) =>
    request<TransactionsView>(
      `/api/v1/view/transactions${query({ ...params })}`,
    ),
  months: (year?: string) =>
    request<PeriodsView>(
      `/api/v1/view/months${query({ year })}`,
    ),
  years: () => request<PeriodsView>("/api/v1/view/years"),
  retranslation: () =>
    request<RetranslationView>("/api/v1/view/retranslation"),
  postRetranslate: () =>
    request<RetranslationView>("/api/v1/retranslate", {
      method: "POST",
      ...jsonBody({}),
    }),
  clearCache: () => request<void>("/api/v1/cache", { method: "DELETE" }),
  config: () => request<AppConfig>("/api/config"),
  setConfig: (input: {
    commodityId: string;
    theme: UiTheme;
    timezone: string;
    confirm?: boolean;
  }) =>
    request<AppConfig>("/api/config", {
      method: "PUT",
      ...jsonBody(input),
    }),
  timezone: () => request<{ timezone: string }>("/api/config/timezone"),
  setTimezone: (timezone: string) =>
    request<{ timezone: string }>("/api/config/timezone", {
      method: "PUT",
      ...jsonBody({ timezone }),
    }),
};

