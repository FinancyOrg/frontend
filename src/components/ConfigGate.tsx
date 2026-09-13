import { useEffect, type ReactNode } from "react";

import { useAppConfig } from "../api/queries";
import { OnboardingPage } from "../pages/OnboardingPage";
import { applyTheme } from "../lib/theme";
import { ErrorState, LoadingState } from "./ui";

export function ConfigGate({ children }: { children: ReactNode }) {
  const config = useAppConfig();

  useEffect(() => {
    if (config.data?.commodityId) {
      applyTheme(config.data.theme);
    }
  }, [config.data]);

  if (config.isPending) {
    return (
      <main className="auth-screen">
        <LoadingState label="Loading your preferences…" />
      </main>
    );
  }
  if (config.isError) {
    return (
      <main className="auth-screen">
        <ErrorState error={config.error} onRetry={() => void config.refetch()} />
      </main>
    );
  }

  if (!config.data.commodityId) {
    return <OnboardingPage />;
  }

  return children;
}
