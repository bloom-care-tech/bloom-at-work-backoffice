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
import { NewPlatformAdminPage } from "@/pages/users/NewPlatformAdminPage";
import { AccessLinksListPage } from "@/pages/access-links/AccessLinksListPage";
import { NewAccessLinkPage } from "@/pages/access-links/NewAccessLinkPage";
import { QuotesListPage } from "@/pages/quotes/QuotesListPage";
import { QuoteEditorPage } from "@/pages/quotes/QuoteEditorPage";
import { WavesListPage } from "@/pages/waves/WavesListPage";
import { WaveEditorPage } from "@/pages/waves/WaveEditorPage";
import { WaveModulesListPage } from "@/pages/wave-modules/WaveModulesListPage";
import { WaveContentsListPage } from "@/pages/wave-contents/WaveContentsListPage";
import { WaveContentEditorPage } from "@/pages/wave-contents/WaveContentEditorPage";
import { SkillsListPage } from "@/pages/skills/SkillsListPage";
import { SkillEditorPage } from "@/pages/skills/SkillEditorPage";
import { SkillItemsListPage } from "@/pages/skills/SkillItemsListPage";
import { SkillItemEditorPage } from "@/pages/skills/SkillItemEditorPage";
import { DocumentCategoriesListPage } from "@/pages/documents/DocumentCategoriesListPage";
import { DocumentCategoryEditorPage } from "@/pages/documents/DocumentCategoryEditorPage";
import { CategoryDocumentsListPage } from "@/pages/documents/CategoryDocumentsListPage";
import { CategoryDocumentEditorPage } from "@/pages/documents/CategoryDocumentEditorPage";
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
              <Route path="usuarios" element={<UsersListPage section="company" />} />
              <Route path="usuarios/:userId" element={<UserEditorPage />} />
              <Route path="administradores" element={<UsersListPage section="platform" />} />
              <Route path="administradores/novo" element={<NewPlatformAdminPage />} />
              <Route path="administradores/:userId" element={<UserEditorPage />} />
              <Route path="links-acesso" element={<AccessLinksListPage />} />
              <Route path="links-acesso/novo" element={<NewAccessLinkPage />} />
              <Route path="convites" element={<Navigate to="/links-acesso" replace />} />
              <Route path="convites/novo" element={<Navigate to="/links-acesso/novo" replace />} />
              <Route path="frases" element={<QuotesListPage />} />
              <Route path="frases/nova" element={<QuoteEditorPage />} />
              <Route path="frases/:quoteId" element={<QuoteEditorPage />} />
              <Route path="ondas/nova" element={<WaveEditorPage />} />
              <Route path="ondas/:ondaId/modulos/:moduloId/conteudos/novo" element={<WaveContentEditorPage />} />
              <Route path="ondas/:ondaId/modulos/:moduloId/conteudos/:conteudoId" element={<WaveContentEditorPage />} />
              <Route path="ondas/:ondaId/modulos/:moduloId/conteudos" element={<WaveContentsListPage />} />
              <Route path="ondas/:ondaId/modulos" element={<WaveModulesListPage />} />
              <Route path="ondas/:ondaId" element={<WaveEditorPage />} />
              <Route path="ondas" element={<WavesListPage />} />
              <Route path="habilidades/nova" element={<SkillEditorPage />} />
              <Route path="habilidades/:skillId/itens/novo" element={<SkillItemEditorPage />} />
              <Route path="habilidades/:skillId/itens/:itemId" element={<SkillItemEditorPage />} />
              <Route path="habilidades/:skillId/itens" element={<SkillItemsListPage />} />
              <Route path="habilidades/:skillId" element={<SkillEditorPage />} />
              <Route path="habilidades" element={<SkillsListPage />} />
              <Route path="mapa-documentos/nova" element={<DocumentCategoryEditorPage />} />
              <Route path="mapa-documentos/:categoryId/documentos/novo" element={<CategoryDocumentEditorPage />} />
              <Route path="mapa-documentos/:categoryId/documentos/:documentId" element={<CategoryDocumentEditorPage />} />
              <Route path="mapa-documentos/:categoryId/documentos" element={<CategoryDocumentsListPage />} />
              <Route path="mapa-documentos/:categoryId" element={<DocumentCategoryEditorPage />} />
              <Route path="mapa-documentos" element={<DocumentCategoriesListPage />} />
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
