import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { BackofficeSessionProvider } from "@/lib/backoffice-session";
import { LoginPage } from "@/pages/LoginPage";
import { ProtectedLayout } from "@/pages/ProtectedLayout";
import { DashboardPage } from "@/pages/DashboardPage";
import { CompaniesListPage } from "@/pages/companies/CompaniesListPage";
import { CompanyEditorPage } from "@/pages/companies/CompanyEditorPage";
import { UsersListPage } from "@/pages/users/UsersListPage";
import { UserEditorPage } from "@/pages/users/UserEditorPage";
import { InvitesListPage } from "@/pages/invites/InvitesListPage";
import { InviteCreatePage } from "@/pages/invites/InviteCreatePage";
import { QuotesListPage } from "@/pages/quotes/QuotesListPage";
import { QuoteEditorPage } from "@/pages/quotes/QuoteEditorPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <BackofficeSessionProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="empresas" element={<CompaniesListPage />} />
              <Route path="empresas/nova" element={<CompanyEditorPage />} />
              <Route path="empresas/:companyId" element={<CompanyEditorPage />} />
              <Route path="usuarios" element={<UsersListPage />} />
              <Route path="usuarios/:userId" element={<UserEditorPage />} />
              <Route path="convites" element={<InvitesListPage />} />
              <Route path="convites/novo" element={<InviteCreatePage />} />
              <Route path="frases" element={<QuotesListPage />} />
              <Route path="frases/nova" element={<QuoteEditorPage />} />
              <Route path="frases/:quoteId" element={<QuoteEditorPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BackofficeSessionProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
