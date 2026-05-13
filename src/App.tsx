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
import { WavesListPage } from "@/pages/waves/WavesListPage";
import { WaveEditorPage } from "@/pages/waves/WaveEditorPage";
import { WaveContentsListPage } from "@/pages/wave-contents/WaveContentsListPage";
import { WaveContentEditorPage } from "@/pages/wave-contents/WaveContentEditorPage";
import { SkillsListPage } from "@/pages/skills/SkillsListPage";
import { SkillEditorPage } from "@/pages/skills/SkillEditorPage";
import { DocumentsHubPage } from "@/pages/documents/DocumentsHubPage";
import { MetricsPage } from "@/pages/metrics/MetricsPage";
import { ExternalLinksHelpPage } from "@/pages/links/ExternalLinksHelpPage";

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
              <Route path="ondas/nova" element={<WaveEditorPage />} />
              <Route path="ondas/:ondaId/conteudos/novo" element={<WaveContentEditorPage />} />
              <Route path="ondas/:ondaId/conteudos/:conteudoId" element={<WaveContentEditorPage />} />
              <Route path="ondas/:ondaId/conteudos" element={<WaveContentsListPage />} />
              <Route path="ondas/:ondaId" element={<WaveEditorPage />} />
              <Route path="ondas" element={<WavesListPage />} />
              <Route path="habilidades" element={<SkillsListPage />} />
              <Route path="habilidades/:slug" element={<SkillEditorPage />} />
              <Route path="mapa-documentos" element={<DocumentsHubPage />} />
              <Route path="metricas" element={<MetricsPage />} />
              <Route path="links-externos" element={<ExternalLinksHelpPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BackofficeSessionProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
