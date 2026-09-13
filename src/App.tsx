import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/AppShell";
import { ConfigGate } from "./components/ConfigGate";
import { AccountFormPage } from "./pages/AccountFormPage";
import { AccountsPage } from "./pages/AccountsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { MonthsPage } from "./pages/MonthsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TransactionFormPage } from "./pages/TransactionFormPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { YearsPage } from "./pages/YearsPage";

export function App() {
  return (
    <ConfigGate>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="accounts/new" element={<AccountFormPage />} />
          <Route path="accounts/:accountId/edit" element={<AccountFormPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="transactions/new" element={<TransactionFormPage />} />
          <Route path="transactions/:entryId/duplicate" element={<TransactionFormPage />} />
          <Route path="transactions/:entryId" element={<TransactionFormPage />} />
          <Route path="months" element={<MonthsPage />} />
          <Route path="years" element={<YearsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ConfigGate>
  );
}
