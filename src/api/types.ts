export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "income"
  | "expense";

export type JournalStatus = "posted" | "draft";

export interface Commodity {
  id: string;
  code: string;
  name: string;
  minorUnits: number;
  kind: "currency" | "security" | "other";
}

export interface AccountRef {
  id: string;
  code: string;
  name: string;
  accountType: AccountType;
  commodity: Commodity;
}

export interface ViewAccount extends AccountRef {
  parentId: string | null;
  nativeCommodityId: string;
  balanceMinor: string;
  isHidden: boolean;
  isLiquid: boolean;
  deletable: boolean;
  createdAt: string;
}

export interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  accountType: AccountType;
  parentId: string | null;
  nativeCommodityId: string;
  createdAt: string;
}

export interface PostedTransaction {
  entry: ViewTransaction;
  transactionCostMinor?: string;
}

export interface ViewPosting {
  account: AccountRef;
  unitsMinor: string;
  commodity: Commodity;
  memo: string | null;
}

export type TransactionCategory = "income" | "expense" | "capital_gains";

export interface ViewTransaction {
  id: string;
  date: string;
  description: string | null;
  status: JournalStatus;
  category: TransactionCategory | null;
  from: AccountRef | null;
  to: AccountRef | null;
  amountMinor: string | null;
  commodity: Commodity | null;
  toAmountMinor: string | null;
  toCommodity: Commodity | null;
  postings: ViewPosting[];
}

export interface TopExpense {
  accountId: string;
  name: string;
  commodity: Commodity;
  amountMinor: string;
}

export type TopIncome = TopExpense;

export interface PeriodMetrics {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
  currencyId: string;
  incomeMinor: string;
  expenseMinor: string;
  capitalGainsMinor: string;
  effectMinor: string;
  netSavingsMinor: string;
  netWorthMinor: string;
  factor: number;
  good: boolean;
}

export interface ValuedBalance {
  accountId: string;
  accountCode?: string;
  accountName?: string;
  accountType: AccountType;
  reportingMinor: string;
  reportingCommodityId: string;
  native: {
    accountId: string;
    commodityId: string;
    minor: string;
  };
}

export interface DashboardView {
  currency: Commodity;
  asOf: string;
  timezone?: string;
  netWorthMinor: string;
  totalAssetsMinor: string;
  totalLiabilitiesMinor: string;
  liquidMinor: string;
  assets: ValuedBalance[];
  liabilities: ValuedBalance[];
  trend: PeriodMetrics[];
}

export interface AccountsView {
  currency: Commodity | null;
  accounts: ViewAccount[];
}

export interface TransactionsView {
  entries: ViewTransaction[];
  topExpenses: TopExpense[];
  topIncomes: TopIncome[];
  hasMore: boolean;
  limit: number;
  offset: number;
}

export interface PeriodsView {
  currency: Commodity;
  timezone?: string;
  months?: PeriodMetrics[];
  years?: PeriodMetrics[];
}

export interface RetranslationView {
  reportingCommodityId: string;
  retranslationMinor: string;
  netWorthMinor: string;
  incomeExpenseMinor: string;
  asOf: string;
}

export interface Session {
  email: string;
}

export type UiTheme = "light" | "dark";

export interface FunctionalChangeJob {
  status: "running" | "done" | "error";
  from: string;
  to: string;
  error?: string;
}

export interface AppConfig {
  commodityId: string | null;
  theme: UiTheme;
  timezone: string;
  postedJournalCount: number;
  functionalChangeEstimatedMs: number;
  functionalChangePollMs: number;
  functionalChange: FunctionalChangeJob | null;
}

