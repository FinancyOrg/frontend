import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { api } from "../api/client";
import { ErrorState, LoadingState } from "../components/ui";
import { DEFAULT_LEDGER_TIMEZONE } from "./money";

const LedgerTimezoneContext = createContext(DEFAULT_LEDGER_TIMEZONE);

export function useLedgerTimezone(): string {
  return useContext(LedgerTimezoneContext);
}

export function LedgerTimezoneProvider({ children }: { children: ReactNode }) {
  const timezone = useQuery({
    queryKey: ["timezone"],
    queryFn: api.timezone,
    staleTime: Infinity,
  });

  if (timezone.isPending) {
    return <LoadingState label="Loading ledger timezone…" />;
  }
  if (timezone.isError) {
    return (
      <ErrorState
        error={timezone.error}
        onRetry={() => void timezone.refetch()}
      />
    );
  }

  return (
    <LedgerTimezoneContext.Provider
      value={timezone.data.timezone || DEFAULT_LEDGER_TIMEZONE}
    >
      {children}
    </LedgerTimezoneContext.Provider>
  );
}
