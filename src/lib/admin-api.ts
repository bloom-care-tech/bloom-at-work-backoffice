import { apiFetch, apiFetchBlob } from "./auth/api-client";
import type { BulkQuoteImportPayload } from "./quote-bulk-import.types";
import type { BulkCompanyUserImportPayload } from "./user-bulk-import.types";

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export interface CompanyDto {
  id: string;
  name: string;
  allowedEmailDomains: string[];
  logoUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyUserOrgDto {
  vp: string | null;
  seniorDirectorate: string | null;
  management: string | null;
  subManagement: string | null;
  employeeNumber: string | null;
}

export interface UserListItemDto {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  role: string | null;
  status: string | null;
  companyId: string | null;
  companyName: string | null;
  firstAccessCompleted: boolean;
  createdAt: string;
  vp?: string | null;
  seniorDirectorate?: string | null;
  management?: string | null;
  subManagement?: string | null;
  employeeNumber?: string | null;
  updatedAt?: string;
}

export interface SignupAccessListItemDto {
  id: string;
  companyId: string;
  companyName: string;
  role: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  /** True when the API can rebuild the signup URL (encrypted token on file). */
  accessLinkAvailable: boolean;
}

export interface QuoteDto {
  id: string;
  text: string;
  author: string;
  publicationDate: string;
  companyId: string | null;
  audience: string;
  active: boolean;
}

const q = (params: Record<string, string | number | boolean | undefined>) => {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
};

export async function fetchCompaniesPage(
  page: number,
  limit = 20,
  filters?: { search?: string; active?: boolean },
) {
  return apiFetch<Paginated<CompanyDto>>(`/admin/empresas${q({ page, limit, ...(filters ?? {}) })}`, { auth: true });
}

export async function fetchCompany(id: string) {
  return apiFetch<CompanyDto>(`/admin/empresas/${id}`, { auth: true });
}

export async function createCompany(body: {
  name: string;
  allowedEmailDomains: string[];
  logoUrl?: string | null;
  active?: boolean;
}) {
  return apiFetch<{ id: string }>(`/admin/empresas`, { method: "POST", auth: true, body: JSON.stringify(body) });
}

export async function updateCompany(
  id: string,
  body: Partial<{ name: string; allowedEmailDomains: string[]; logoUrl: string | null; active: boolean }>,
) {
  return apiFetch<{ ok: true }>(`/admin/empresas/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(body) });
}

export async function deleteCompany(id: string) {
  return apiFetch<{ ok: true }>(`/admin/empresas/${id}`, { method: "DELETE", auth: true });
}

export async function fetchUsersPage(
  page: number,
  limit = 20,
  companyId?: string,
  search?: string,
  filters?: {
    status?: string;
    role?: string;
    createdFrom?: string;
    createdTo?: string;
    userScope?: "company" | "platform";
  },
) {
  return apiFetch<Paginated<UserListItemDto>>(`/admin/usuarios${q({ page, limit, companyId, search, ...filters })}`, {
    auth: true,
  });
}

export async function createPlatformAdminUser(body: {
  email: string;
  password: string;
  name?: string | null;
  displayName?: string | null;
}) {
  return apiFetch<{ id: string }>(`/admin/usuarios`, { method: "POST", auth: true, body: JSON.stringify(body) });
}

export async function createCompanyUser(body: {
  email: string;
  password?: string;
  companyId: string;
  role: string;
  name?: string | null;
  displayName?: string | null;
} & Partial<CompanyUserOrgDto>) {
  return apiFetch<{ id: string }>(`/admin/usuarios`, { method: "POST", auth: true, body: JSON.stringify(body) });
}

export async function bulkCreateCompanyUsers(
  companyId: string,
  users: BulkCompanyUserImportPayload[],
) {
  return apiFetch<{ created: number; skipped: number; errors: { index: number; code: string; message: string }[] }>(
    `/admin/usuarios/bulk`,
    { method: "POST", auth: true, body: JSON.stringify({ companyId, users }) },
  );
}

export async function downloadUserImportTemplateXlsx(): Promise<Blob> {
  const { blob } = await apiFetchBlob("/admin/usuarios/bulk/template", { method: "GET", auth: true });
  return blob;
}

export async function fetchUser(id: string) {
  return apiFetch<UserListItemDto>(`/admin/usuarios/${id}`, { auth: true });
}

export async function updateUser(
  id: string,
  body: Partial<{ name: string | null; displayName: string | null; role: string; status: string } & CompanyUserOrgDto>,
) {
  return apiFetch<{ ok: true }>(`/admin/usuarios/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(body) });
}

export async function fetchSignupAccessPage(
  page: number,
  limit = 20,
  companyId?: string,
  status?: "active" | "revoked",
) {
  return apiFetch<Paginated<SignupAccessListItemDto>>(`/admin/links-acesso${q({ page, limit, companyId, status })}`, {
    auth: true,
  });
}

export async function createSignupAccess(body: { companyId: string; role: string; expiresAt?: string }) {
  return apiFetch<{ id: string; accessUrl: string; companyName: string; role: string; expiresAt: string | null }>(
    `/admin/links-acesso`,
    { method: "POST", auth: true, body: JSON.stringify(body) },
  );
}

export async function revokeSignupAccess(id: string) {
  return apiFetch<{ ok: true }>(`/admin/links-acesso/${id}/revoke`, { method: "POST", auth: true });
}

export async function fetchSignupAccessLink(id: string) {
  return apiFetch<{ accessUrl: string }>(`/admin/links-acesso/${id}/access-link`, { auth: true });
}

export async function fetchQuotesPage(
  page: number,
  limit = 20,
  filters?: Partial<{ companyId: string; audience: string; active: boolean; from: string; to: string; search: string }>,
) {
  return apiFetch<Paginated<QuoteDto>>(`/admin/quotes${q({ page, limit, ...filters })}`, { auth: true });
}

export async function fetchQuote(id: string) {
  return apiFetch<QuoteDto>(`/admin/quotes/${id}`, { auth: true });
}

export async function createQuote(body: {
  text: string;
  author: string;
  publicationDate: string;
  companyId?: string;
  audience: string;
  active?: boolean;
}) {
  return apiFetch<{ id: string }>(`/admin/quotes`, { method: "POST", auth: true, body: JSON.stringify(body) });
}

export async function updateQuote(
  id: string,
  body: Partial<{
    text: string;
    author: string;
    publicationDate: string;
    companyId: string;
    audience: string;
    active: boolean;
  }>,
) {
  return apiFetch<{ ok: true }>(`/admin/quotes/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(body) });
}

export async function deleteQuote(id: string) {
  return apiFetch<{ message: string }>(`/admin/quotes/${id}`, { method: "DELETE", auth: true });
}

export async function bulkCreateQuotes(quotes: BulkQuoteImportPayload[]) {
  return apiFetch<{ created: number; skipped: number; errors: { index: number; code: string; message: string }[] }>(
    `/admin/quotes/bulk`,
    { method: "POST", auth: true, body: JSON.stringify({ quotes }) },
  );
}

export async function downloadQuoteTemplateXlsx(): Promise<Blob> {
  const { blob } = await apiFetchBlob("/admin/quotes/bulk/template", { method: "GET", auth: true });
  return blob;
}

export interface WaveDto {
  id: string;
  sortOrder: number;
  slug: string;
  title: string;
  subtitle: string;
  active: boolean;
  audience: "colaborador" | "lider";
  createdAt: string;
  updatedAt: string;
  contentCount: number;
}

export async function fetchWaves() {
  return apiFetch<WaveDto[]>("/admin/ondas", { auth: true });
}

export async function fetchWave(id: string) {
  return apiFetch<WaveDto>(`/admin/ondas/${id}`, { auth: true });
}

export async function createWave(body: {
  slug: string;
  title: string;
  subtitle: string;
  sortOrder?: number;
  active?: boolean;
  audience?: "colaborador" | "lider";
}) {
  return apiFetch<{ id: string }>("/admin/ondas", { method: "POST", auth: true, body: JSON.stringify(body) });
}

export async function updateWave(
  id: string,
  body: Partial<{
    slug: string;
    title: string;
    subtitle: string;
    sortOrder: number;
    active: boolean;
    audience: "colaborador" | "lider";
  }>,
) {
  return apiFetch<{ ok: true }>(`/admin/ondas/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(body) });
}

export async function deleteWave(id: string) {
  return apiFetch<{ ok: true }>(`/admin/ondas/${id}`, { method: "DELETE", auth: true });
}

export async function reorderWaves(ids: string[]) {
  return apiFetch<{ ok: true }>("/admin/ondas/reorder", {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ ids }),
  });
}

export interface DashboardSummaryDto {
  companies: number;
  users: number;
  platformAdmins: number;
  signupAccessActive: number;
  quotes: number;
  waves: number;
  waveContents: number;
  skills: number;
  skillItems: number;
  documents: number;
  interactionsLast7Days: number;
}

export async function fetchDashboardSummary() {
  return apiFetch<DashboardSummaryDto>("/admin/painel/resumo", { auth: true });
}

export interface WaveContentDto {
  id: string;
  waveId: string;
  moduleId: string;
  sortOrder: number;
  kind: string;
  title: string;
  payload: Record<string, unknown>;
  isNew: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WaveModuleDto {
  id: string;
  waveId: string;
  slug: string;
  title: string;
  subtitle: string;
  sortOrder: number;
  contentCount: number;
}

export async function fetchWaveModules(waveId: string) {
  return apiFetch<WaveModuleDto[]>(`/admin/ondas/${waveId}/modulos`, { auth: true });
}

export async function fetchWaveModule(waveId: string, moduleId: string) {
  return apiFetch<WaveModuleDto>(`/admin/ondas/${waveId}/modulos/${moduleId}`, { auth: true });
}

export async function createWaveModule(
  waveId: string,
  body: { title: string; subtitle: string; sortOrder?: number; slug?: string },
) {
  return apiFetch<{ id: string }>(`/admin/ondas/${waveId}/modulos`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function updateWaveModule(
  waveId: string,
  moduleId: string,
  body: Partial<{ title: string; subtitle: string; sortOrder: number; slug: string }>,
) {
  return apiFetch<{ ok: true }>(`/admin/ondas/${waveId}/modulos/${moduleId}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function deleteWaveModule(waveId: string, moduleId: string) {
  return apiFetch<{ ok: true }>(`/admin/ondas/${waveId}/modulos/${moduleId}`, { method: "DELETE", auth: true });
}

export async function reorderWaveModules(waveId: string, ids: string[]) {
  return apiFetch<{ ok: true }>(`/admin/ondas/${waveId}/modulos/reorder`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ ids }),
  });
}

export async function fetchWaveContentsPage(
  waveId: string,
  moduleId: string,
  page = 1,
  limit = 50,
  filters?: { published?: boolean; kind?: string; search?: string },
) {
  return apiFetch<{ items: WaveContentDto[]; page: number; limit: number; total: number }>(
    `/admin/ondas/${waveId}/modulos/${moduleId}/conteudos${q({ page, limit, ...filters })}`,
    { auth: true },
  );
}

export async function createWaveContent(
  waveId: string,
  moduleId: string,
  body: {
    kind: string;
    title: string;
    payload: Record<string, unknown>;
    isNew?: boolean;
    publishedAt?: string | null;
  },
) {
  return apiFetch<{ id: string }>(`/admin/ondas/${waveId}/modulos/${moduleId}/conteudos`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function fetchWaveContent(id: string) {
  return apiFetch<WaveContentDto>(`/admin/conteudos/${id}`, { auth: true });
}

export async function updateWaveContent(
  id: string,
  body: Partial<{
    kind: string;
    title: string;
    payload: Record<string, unknown>;
    isNew: boolean;
    publishedAt: string | null;
  }>,
) {
  return apiFetch<{ ok: true }>(`/admin/conteudos/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(body) });
}

export async function deleteWaveContent(id: string) {
  return apiFetch<{ ok: true }>(`/admin/conteudos/${id}`, { method: "DELETE", auth: true });
}

export async function reorderWaveContents(waveId: string, moduleId: string, ids: string[]) {
  return apiFetch<{ ok: true }>(`/admin/ondas/${waveId}/modulos/${moduleId}/conteudos/reorder`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ ids }),
  });
}

export type EditorialMediaUploadContext = "wave" | "document_map" | "skills" | "company" | "expert";

export async function uploadEditorialMediaAsset(
  file: File,
  options: { context: EditorialMediaUploadContext; kind: "audio" | "pdf" | "image" | "html" },
) {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<{ url: string }>(
    `/admin/conteudos/media/upload${q({ kind: options.kind, context: options.context })}`,
    {
      method: "POST",
      auth: true,
      body: form,
    },
  );
}

export interface EditorialExpertDto {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  photoUrl: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function fetchEditorialExperts(activeOnly?: boolean) {
  const qs = activeOnly === true ? "?activeOnly=true" : "";
  return apiFetch<{ items: EditorialExpertDto[] }>(`/admin/especialistas${qs}`, { method: "GET", auth: true });
}

export async function fetchEditorialExpert(id: string) {
  return apiFetch<EditorialExpertDto>(`/admin/especialistas/${encodeURIComponent(id)}`, { method: "GET", auth: true });
}

export async function createEditorialExpert(body: {
  name: string;
  specialty: string;
  bio?: string;
  photoUrl?: string | null;
  active?: boolean;
}) {
  return apiFetch<{ id: string }>("/admin/especialistas", { method: "POST", auth: true, body: JSON.stringify(body) });
}

export async function updateEditorialExpert(
  id: string,
  body: Partial<{
    name: string;
    specialty: string;
    bio: string;
    photoUrl: string | null;
    active: boolean;
  }>,
) {
  return apiFetch<{ ok: true }>(`/admin/especialistas/${encodeURIComponent(id)}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function deleteEditorialExpert(id: string) {
  return apiFetch<{ ok: true }>(`/admin/especialistas/${encodeURIComponent(id)}`, { method: "DELETE", auth: true });
}

export interface SkillListItemDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export async function fetchSkills() {
  return apiFetch<SkillListItemDto[]>("/admin/habilidades", { auth: true });
}

export async function createSkill(body: {
  slug: string;
  title: string;
  description?: string | null;
  whatItIs?: string;
  scienceSays?: string;
  active?: boolean;
}) {
  return apiFetch<{ id: string; slug: string }>("/admin/habilidades", { method: "POST", auth: true, body: JSON.stringify(body) });
}

export interface SkillDetailDto extends SkillListItemDto {
  whatItIs: string;
  scienceSays: string;
  items: {
    id: string;
    type: string;
    title: string;
    payload: Record<string, unknown>;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
  }[];
}

export async function fetchSkillById(skillId: string) {
  return apiFetch<SkillDetailDto>(`/admin/habilidades/${encodeURIComponent(skillId)}`, { auth: true });
}

export async function updateSkill(
  skillId: string,
  body: Partial<{ title: string; description: string | null; whatItIs: string; scienceSays: string; active: boolean }>,
) {
  return apiFetch<{ ok: true }>(`/admin/habilidades/${encodeURIComponent(skillId)}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function deleteSkill(skillId: string) {
  return apiFetch<{ ok: true }>(`/admin/habilidades/${encodeURIComponent(skillId)}`, { method: "DELETE", auth: true });
}

export async function reorderSkills(ids: string[]) {
  return apiFetch<{ ok: true }>("/admin/habilidades/reorder", {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ ids }),
  });
}

export async function createSkillItem(skillId: string, body: { type: string; title: string; payload: Record<string, unknown> }) {
  return apiFetch<{ id: string }>(`/admin/habilidades/${encodeURIComponent(skillId)}/itens`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function reorderSkillItems(skillId: string, ids: string[]) {
  return apiFetch<{ ok: true }>(`/admin/habilidades/${encodeURIComponent(skillId)}/itens/reorder`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ ids }),
  });
}

export interface SkillItemDetailDto {
  id: string;
  skillId: string;
  skillSlug: string;
  skillTitle: string;
  type: string;
  title: string;
  payload: Record<string, unknown>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export async function fetchSkillItemById(id: string) {
  return apiFetch<SkillItemDetailDto>(`/admin/itens-habilidade/${encodeURIComponent(id)}`, { auth: true });
}

export async function updateSkillItem(id: string, body: Partial<{ type: string; title: string; payload: Record<string, unknown> }>) {
  return apiFetch<{ ok: true }>(`/admin/itens-habilidade/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(body) });
}

export async function deleteSkillItem(id: string) {
  return apiFetch<{ ok: true }>(`/admin/itens-habilidade/${id}`, { method: "DELETE", auth: true });
}

export interface DocumentCategoryDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  accentColor: string;
  sortOrder: number;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export async function fetchDocumentCategories() {
  return apiFetch<DocumentCategoryDto[]>("/admin/categorias-documento", { auth: true });
}

export async function fetchDocumentCategory(id: string) {
  return apiFetch<DocumentCategoryDto>(`/admin/categorias-documento/${encodeURIComponent(id)}`, { auth: true });
}

export async function reorderDocumentCategories(ids: string[]) {
  return apiFetch<{ ok: true }>("/admin/categorias-documento/reorder", {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ ids }),
  });
}

export async function createDocumentCategory(body: {
  slug: string;
  name: string;
  description?: string | null;
  accentColor?: string | null;
}) {
  return apiFetch<{ id: string }>("/admin/categorias-documento", { method: "POST", auth: true, body: JSON.stringify(body) });
}

export async function updateDocumentCategory(
  id: string,
  body: Partial<{ name: string; description: string | null; accentColor: string | null }>,
) {
  return apiFetch<{ ok: true }>(`/admin/categorias-documento/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(body) });
}

export async function deleteDocumentCategory(id: string, force?: boolean) {
  return apiFetch<{ ok: true }>(`/admin/categorias-documento/${id}${q({ force: force ? true : undefined })}`, {
    method: "DELETE",
    auth: true,
  });
}

export interface DocumentDto {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  audience: string;
  tag: string;
  pdfUrl: string | null;
  sortOrder: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchDocumentsPage(
  page: number,
  limit = 20,
  filters?: { categoryId?: string; audience?: string; tag?: string; search?: string },
) {
  return apiFetch<{ items: DocumentDto[]; page: number; limit: number; total: number }>(
    `/admin/documentos${q({ page, limit, ...filters })}`,
    { auth: true },
  );
}

export async function fetchDocumentsInCategory(categoryId: string, page = 1, limit = 200) {
  return apiFetch<{ items: DocumentDto[]; page: number; limit: number; total: number }>(
    `/admin/categorias-documento/${encodeURIComponent(categoryId)}/documentos${q({ page, limit })}`,
    { auth: true },
  );
}

export async function reorderDocumentsInCategory(categoryId: string, ids: string[]) {
  return apiFetch<{ ok: true }>(
    `/admin/categorias-documento/${encodeURIComponent(categoryId)}/documentos/reorder`,
    { method: "PATCH", auth: true, body: JSON.stringify({ ids }) },
  );
}

export async function createDocument(body: {
  categoryId: string;
  name: string;
  description?: string | null;
  audience?: string;
  tag?: string;
  pdfUrl?: string | null;
  publishedAt?: string | null;
}) {
  return apiFetch<{ id: string }>("/admin/documentos", { method: "POST", auth: true, body: JSON.stringify(body) });
}

export async function createDocumentInCategory(
  categoryId: string,
  body: {
    name: string;
    description?: string | null;
    audience?: string;
    tag?: string;
    pdfUrl?: string | null;
    publishedAt?: string | null;
  },
) {
  return apiFetch<{ id: string }>(
    `/admin/categorias-documento/${encodeURIComponent(categoryId)}/documentos`,
    { method: "POST", auth: true, body: JSON.stringify(body) },
  );
}

export async function fetchDocument(id: string) {
  return apiFetch<DocumentDto>(`/admin/documentos/${encodeURIComponent(id)}`, { auth: true });
}

export async function updateDocument(
  id: string,
  body: Partial<{
    name: string;
    description: string | null;
    audience: string;
    tag: string;
    pdfUrl: string | null;
    publishedAt: string | null;
  }>,
) {
  return apiFetch<{ ok: true }>(`/admin/documentos/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(body) });
}

export async function deleteDocument(id: string) {
  return apiFetch<{ ok: true }>(`/admin/documentos/${id}`, { method: "DELETE", auth: true });
}

/** Hub role filter for aggregated metrics (`Interaction.roleSnapshot`). */
export type MetricsHubRoleFilter = "lider" | "colaborador";

export interface MetricsOrganizationFilters {
  vp?: string;
  seniorDirectorate?: string;
  management?: string;
  subManagement?: string;
}

export type MetricsOrganizationFilterOptions = Record<keyof MetricsOrganizationFilters, string[]>;

export async function fetchMetricsOrganizationFilterOptions(
  from?: string,
  to?: string,
  companyId?: string,
  role?: MetricsHubRoleFilter,
  organizationFilters?: MetricsOrganizationFilters,
) {
  return apiFetch<MetricsOrganizationFilterOptions>(
    `/admin/metricas/organization-filter-options${q({ from, to, companyId, role, ...organizationFilters })}`,
    { auth: true },
  );
}

export async function fetchContentRanking(
  period: "week" | "month",
  from?: string,
  to?: string,
  companyId?: string,
  role?: MetricsHubRoleFilter,
  organizationFilters?: MetricsOrganizationFilters,
) {
  return apiFetch<{
    period: string;
    from: string;
    to: string;
    rows: { contentType: string; contentId: string; contentTitle: string; count: number }[];
  }>(`/admin/metricas/content-ranking${q({ period, from, to, companyId, role, ...organizationFilters })}`, { auth: true });
}

export async function fetchWaveEngagementHierarchy(
  from?: string,
  to?: string,
  companyId?: string,
  role?: MetricsHubRoleFilter,
  organizationFilters?: MetricsOrganizationFilters,
) {
  return apiFetch<{
    from: string;
    to: string;
    waves: {
      waveId: string;
      title: string;
      count: number;
      sortOrder: number;
      modules: {
        moduleId: string;
        title: string;
        count: number;
        sortOrder: number;
        contents: { contentId: string; title: string; kind: string; count: number; sortOrder: number }[];
      }[];
    }[];
  }>(`/admin/metricas/waves/hierarchy${q({ from, to, companyId, role, ...organizationFilters })}`, { auth: true });
}

export async function fetchSkillEngagementHierarchy(
  from?: string,
  to?: string,
  companyId?: string,
  role?: MetricsHubRoleFilter,
  organizationFilters?: MetricsOrganizationFilters,
) {
  return apiFetch<{
    from: string;
    to: string;
    skills: {
      skillId: string;
      title: string;
      slug: string;
      count: number;
      sortOrder: number;
      pageCount: number;
      items: { itemId: string; title: string; count: number; sortOrder: number }[];
    }[];
  }>(`/admin/metricas/skills/hierarchy${q({ from, to, companyId, role, ...organizationFilters })}`, { auth: true });
}

export async function fetchEngagementMetrics(
  from?: string,
  to?: string,
  companyId?: string,
  role?: MetricsHubRoleFilter,
  organizationFilters?: MetricsOrganizationFilters,
) {
  return apiFetch<{
    from: string;
    to: string;
    wave: { contentId: string; contentTitle: string; count: number }[];
    waveModule: { contentId: string; contentTitle: string; count: number }[];
    skillItem: { contentId: string; contentTitle: string; count: number }[];
    skill: { contentId: string; contentTitle: string; count: number }[];
    document: { contentId: string; contentTitle: string; count: number }[];
    documentByCategory: { categoryId: string; categoryName: string; count: number }[];
    quote: { contentId: string; contentTitle: string; count: number }[];
  }>(`/admin/metricas/engagement${q({ from, to, companyId, role, ...organizationFilters })}`, { auth: true });
}

export async function fetchCohortMetrics(
  from: string,
  to: string,
  companyId?: string,
  role?: MetricsHubRoleFilter,
  organizationFilters?: MetricsOrganizationFilters,
) {
  return apiFetch<{
    from: string;
    to: string;
    distinctUsersInRange: number;
    weeklyActiveUsersApprox: number;
    wau7DistinctUsers: number;
    wau7WindowFrom: string;
    wau7WindowTo: string;
    mau30DistinctUsers: number;
    mau30WindowFrom: string;
    mau30WindowTo: string;
    dailyActiveUsersByDay: { day: string; users: number }[];
  }>(`/admin/metricas/cohorts/dau-wau-mau${q({ from, to, companyId, role, ...organizationFilters })}`, { auth: true });
}

async function downloadAdminMetricsCsv(path: string, fallbackFilename: string): Promise<void> {
  const { blob, contentDisposition } = await apiFetchBlob(path, { auth: true });
  const header = contentDisposition ?? "";
  const match = /filename\*?=(?:UTF-8''|)([^;\n]+)/i.exec(header) ?? /filename="([^"]+)"/i.exec(header);
  let name = fallbackFilename;
  if (match?.[1]) {
    try {
      name = decodeURIComponent(match[1].trim().replace(/^"|"$/g, ""));
    } catch {
      name = match[1].trim().replace(/^"|"$/g, "") || fallbackFilename;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name || fallbackFilename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadContentRankingCsv(
  period: "week" | "month",
  from?: string,
  to?: string,
  companyId?: string,
  role?: MetricsHubRoleFilter,
  organizationFilters?: MetricsOrganizationFilters,
): Promise<void> {
  await downloadAdminMetricsCsv(
    `/admin/metricas/content-ranking/export${q({ period, from, to, companyId, role, ...organizationFilters })}`,
    `content-ranking-${period}.csv`,
  );
}

export async function downloadEngagementMetricsCsv(
  from?: string,
  to?: string,
  companyId?: string,
  role?: MetricsHubRoleFilter,
  organizationFilters?: MetricsOrganizationFilters,
): Promise<void> {
  await downloadAdminMetricsCsv(
    `/admin/metricas/engagement/export${q({ from, to, companyId, role, ...organizationFilters })}`,
    "engagement.csv",
  );
}

export async function downloadWaveEngagementHierarchyCsv(
  from?: string,
  to?: string,
  companyId?: string,
  role?: MetricsHubRoleFilter,
  organizationFilters?: MetricsOrganizationFilters,
): Promise<void> {
  await downloadAdminMetricsCsv(
    `/admin/metricas/waves/hierarchy/export${q({ from, to, companyId, role, ...organizationFilters })}`,
    "waves-hierarchy.csv",
  );
}

export async function downloadSkillEngagementHierarchyCsv(
  from?: string,
  to?: string,
  companyId?: string,
  role?: MetricsHubRoleFilter,
  organizationFilters?: MetricsOrganizationFilters,
): Promise<void> {
  await downloadAdminMetricsCsv(
    `/admin/metricas/skills/hierarchy/export${q({ from, to, companyId, role, ...organizationFilters })}`,
    "skills-hierarchy.csv",
  );
}

export async function downloadCohortMetricsCsv(
  from: string,
  to: string,
  companyId?: string,
  role?: MetricsHubRoleFilter,
  organizationFilters?: MetricsOrganizationFilters,
): Promise<void> {
  await downloadAdminMetricsCsv(
    `/admin/metricas/cohorts/dau-wau-mau/export${q({ from, to, companyId, role, ...organizationFilters })}`,
    "cohorts-dau-wau-mau.csv",
  );
}

export interface CompanyHubLinksDto {
  companyId: string;
  suggestionsTypeformUrl: string | null;
  weeklyCheckinTypeformUrl: string | null;
  leaderNextEventTitle: string | null;
  leaderNextEventGuest: string | null;
  leaderNextEventAt: string | null;
  leaderNextEventRsvpUrl: string | null;
  collaboratorNextEventTitle: string | null;
  collaboratorNextEventGuest: string | null;
  collaboratorNextEventAt: string | null;
  collaboratorNextEventRsvpUrl: string | null;
  updatedAt: string | null;
}

export async function fetchCompanyHubLinks(companyId: string) {
  return apiFetch<CompanyHubLinksDto>(`/admin/empresas/${companyId}/links-externos`, { auth: true });
}

export async function putCompanyHubLinks(companyId: string, body: Partial<CompanyHubLinksDto>) {
  return apiFetch<{ ok: true }>(`/admin/empresas/${companyId}/links-externos`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function offboardUser(userId: string, body?: { reason?: string }) {
  return apiFetch<{ ok: true }>(`/admin/usuarios/${userId}/offboard`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(body ?? {}),
  });
}
