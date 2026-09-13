import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useLedgerTimezone } from "../lib/ledgerTimezone";
import { api } from "./client";
import type { AccountType } from "./types";

const ledgerKeys = [
  "dashboard",
  "accounts",
  "transactions",
  "months",
  "years",
  "retranslation",
] as const;

export async function invalidateLedger(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    ...ledgerKeys.map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
    queryClient.invalidateQueries({ queryKey: ["commodities"] }),
    queryClient.invalidateQueries({ queryKey: ["transaction"] }),
  ]);
}

export function useDashboard() {
  const timeZone = useLedgerTimezone();
  return useQuery({
    queryKey: ["dashboard", timeZone],
    queryFn: api.dashboard,
  });
}

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: api.accounts,
  });
}

export function useCommodities() {
  return useQuery({
    queryKey: ["commodities"],
    queryFn: async () => (await api.commodities()).commodities,
  });
}

export function useAppConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: api.config,
    staleTime: Infinity,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.functionalChange?.status === "running") {
        return data.functionalChangePollMs || 10_000;
      }
      return false;
    },
  });
}

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: ["transaction", id],
    queryFn: () => api.transaction(id!),
    enabled: Boolean(id),
  });
}

export function useSetAppConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.setConfig,
    onSuccess: async (data) => {
      queryClient.setQueryData(["config"], data);
      queryClient.setQueryData(["timezone"], { timezone: data.timezone });
      if (data.functionalChange?.status === "running") {
        return;
      }
      await invalidateLedger(queryClient);
    },
  });
}

export function useSetTimezone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.setTimezone,
    onSuccess: async (data) => {
      queryClient.setQueryData(["timezone"], data);
      await invalidateLedger(queryClient);
    },
  });
}

export function useTransactions(params: {
  account?: string;
  from?: string;
  to?: string;
  q?: string;
  limit?: number;
  offset?: number;
}) {
  const timeZone = useLedgerTimezone();
  return useQuery({
    queryKey: ["transactions", timeZone, params],
    queryFn: () => api.transactions(params),
  });
}

export function useInfiniteTransactions(params: {
  account?: string;
  from?: string;
  to?: string;
  q?: string;
}) {
  const timeZone = useLedgerTimezone();
  return useInfiniteQuery({
    queryKey: ["transactions", "infinite", timeZone, params],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api.transactions({ ...params, limit: 50, offset: pageParam }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.offset + lastPage.entries.length : undefined,
  });
}

export function useMonths(year?: string) {
  const timeZone = useLedgerTimezone();
  return useQuery({
    queryKey: ["months", timeZone, year ?? "all"],
    queryFn: () => api.months(year),
  });
}

export function useYears() {
  const timeZone = useLedgerTimezone();
  return useQuery({
    queryKey: ["years", timeZone],
    queryFn: api.years,
  });
}

export function useRetranslation() {
  return useQuery({
    queryKey: ["retranslation"],
    queryFn: api.retranslation,
  });
}

export function usePostRetranslation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.postRetranslate,
    onSuccess: () => invalidateLedger(queryClient),
  });
}

export function useClearCache() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.clearCache,
    onSuccess: () => invalidateLedger(queryClient),
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createAccount,
    onSuccess: () => invalidateLedger(queryClient),
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      name?: string;
      accountType?: AccountType;
      nativeCommodityId?: string;
      hidden?: boolean;
      liquid?: boolean;
    }) => api.updateAccount(id, input),
    onSuccess: () => invalidateLedger(queryClient),
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteAccount,
    onSuccess: () => invalidateLedger(queryClient),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createTransaction,
    onSuccess: () => invalidateLedger(queryClient),
  });
}

export function useFxRate(params: {
  from?: string;
  to?: string;
  date?: string;
  enabled?: boolean;
}) {
  const enabled =
    Boolean(params.enabled) &&
    Boolean(params.from) &&
    Boolean(params.to) &&
    params.from !== params.to;
  return useQuery({
    queryKey: ["fxRate", params.from, params.to, params.date],
    queryFn: () =>
      api.fxRate({
        from: params.from!,
        to: params.to!,
        date: params.date,
      }),
    enabled,
    staleTime: Infinity,
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: {
      id: string;
      datetime?: string;
      description?: string;
    }) => api.updateTransaction(id, input),
    onSuccess: () => invalidateLedger(queryClient),
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteTransaction,
    onSuccess: () => invalidateLedger(queryClient),
  });
}

export function useEnsureCommodity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createCommodity,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["commodities"] }),
  });
}


