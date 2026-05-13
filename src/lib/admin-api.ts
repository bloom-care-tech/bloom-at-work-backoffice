import { apiFetch, apiFetchBlob } from "./auth/api-client";

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

export interface UserListItemDto {
  id: string;
  email: string;
  name: string | null;
  displayName: string | null;
  role: string | null;
  status: string | null;
  isAdmin: boolean;
  companyId: string | null;
  companyName: string | null;
  firstAccessCompleted: boolean;
  createdAt: string;
}

export interface InviteListItemDto {
  id: string;
  companyId: string;
  companyName: string;
  role: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
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
  return apiFetch<Paginated<CompanyDto>>(`/admin/companies${q({ page, limit, ...(filters ?? {}) })}`, { auth: true });
}

export async function fetchCompany(id: string) {
  return apiFetch<CompanyDto>(`/admin/companies/${id}`, { auth: true });
}

export async function createCompany(body: {
  name: string;
  allowedEmailDomains: string[];
  logoUrl?: string | null;
  active?: boolean;
}) {
  return apiFetch<{ id: string }>(`/admin/companies`, { method: "POST", auth: true, body: JSON.stringify(body) });
}

export async function updateCompany(
  id: string,
  body: Partial<{ name: string; allowedEmailDomains: string[]; logoUrl: string | null; active: boolean }>,
) {
  return apiFetch<{ ok: true }>(`/admin/companies/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(body) });
}

export async function deleteCompany(id: string) {
  return apiFetch<{ ok: true }>(`/admin/companies/${id}`, { method: "DELETE", auth: true });
}

export async function fetchUsersPage(
  page: number,
  limit = 20,
  companyId?: string,
  search?: string,
  filters?: { status?: string; role?: string; createdFrom?: string; createdTo?: string },
) {
  return apiFetch<Paginated<UserListItemDto>>(`/admin/users${q({ page, limit, companyId, search, ...filters })}`, {
    auth: true,
  });
}

export async function fetchUser(id: string) {
  return apiFetch<UserListItemDto>(`/admin/users/${id}`, { auth: true });
}

export async function updateUser(
  id: string,
  body: Partial<{ name: string | null; displayName: string | null; role: string; status: string; isAdmin: boolean }>,
) {
  return apiFetch<{ ok: true }>(`/admin/users/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(body) });
}

export async function fetchInvitesPage(
  page: number,
  limit = 20,
  companyId?: string,
  status?: "active" | "revoked",
) {
  return apiFetch<Paginated<InviteListItemDto>>(`/admin/signup-invites${q({ page, limit, companyId, status })}`, {
    auth: true,
  });
}

export async function createInvite(body: { companyId: string; role: string; expiresAt?: string }) {
  return apiFetch<{ id: string; inviteUrl: string; companyName: string; role: string; expiresAt: string | null }>(
    `/admin/signup-invites`,
    { method: "POST", auth: true, body: JSON.stringify(body) },
  );
}

export async function revokeInvite(id: string) {
  return apiFetch<{ ok: true }>(`/admin/signup-invites/${id}/revoke`, { method: "POST", auth: true });
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

export async function bulkCreateQuotes(quotes: unknown[]) {
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
  createdAt: string;
  updatedAt: string;
  contentCount: number;
}

export async function fetchWaves() {
  return apiFetch<WaveDto[]>("/admin/waves", { auth: true });
}

export async function fetchWave(id: string) {
  return apiFetch<WaveDto>(`/admin/waves/${id}`, { auth: true });
}

export async function createWave(body: {
  slug: string;
  title: string;
  subtitle: string;
  sortOrder?: number;
  active?: boolean;
}) {
  return apiFetch<{ id: string }>("/admin/waves", { method: "POST", auth: true, body: JSON.stringify(body) });
}

export async function updateWave(
  id: string,
  body: Partial<{ slug: string; title: string; subtitle: string; sortOrder: number; active: boolean }>,
) {
  return apiFetch<{ ok: true }>(`/admin/waves/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(body) });
}

export async function deleteWave(id: string) {
  return apiFetch<{ ok: true }>(`/admin/waves/${id}`, { method: "DELETE", auth: true });
}

export async function reorderWaves(ids: string[]) {
  return apiFetch<{ ok: true }>("/admin/waves/reorder", {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ ids }),
  });
}

export interface DashboardSummaryDto {
  companies: number;
  users: number;
  invitesActive: number;
  quotes: number;
  waves: number;
  waveContents: number;
  skills: number;
  skillItems: number;
  documents: number;
  interactionsLast7Days: number;
}

export async function fetchDashboardSummary() {
  return apiFetch<DashboardSummaryDto>("/admin/dashboard/summary", { auth: true });
}

export interface WaveContentDto {
  id: string;
  waveId: string;
  sortOrder: number;
  kind: string;
  /** Absent on stale clients; coerce with `Boolean(...)`. */
  isExercise?: boolean;
  title: string;
  payload: Record<string, unknown>;
  isNew: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function fetchWaveContentsPage(
  waveId: string,
  page = 1,
  limit = 50,
  filters?: { published?: boolean; kind?: string; search?: string },
) {
  return apiFetch<{ items: WaveContentDto[]; page: number; limit: number; total: number }>(
    `/admin/waves/${waveId}/contents${q({ page, limit, ...filters })}`,
    { auth: true },
  );
}

export async function createWaveContent(
  waveId: string,
  body: {
    kind: string;
    title: string;
    payload: Record<string, unknown>;
    isExercise?: boolean;
    isNew?: boolean;
    publishedAt?: string | null;
  },
) {
  return apiFetch<{ id: string }>(`/admin/waves/${waveId}/contents`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function fetchWaveContent(id: string) {
  return apiFetch<WaveContentDto>(`/admin/contents/${id}`, { auth: true });
}

export async function updateWaveContent(
  id: string,
  body: Partial<{
    kind: string;
    title: string;
    payload: Record<string, unknown>;
    isExercise: boolean;
    isNew: boolean;
    publishedAt: string | null;
  }>,
) {
  return apiFetch<{ ok: true }>(`/admin/contents/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(body) });
}

export async function deleteWaveContent(id: string) {
  return apiFetch<{ ok: true }>(`/admin/contents/${id}`, { method: "DELETE", auth: true });
}

export async function reorderWaveContents(waveId: string, ids: string[]) {
  return apiFetch<{ ok: true }>(`/admin/waves/${waveId}/contents/reorder`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ ids }),
  });
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
  return apiFetch<SkillListItemDto[]>("/admin/skills", { auth: true });
}

export async function createSkill(body: { slug: string; title: string; description?: string | null }) {
  return apiFetch<{ id: string; slug: string }>("/admin/skills", { method: "POST", auth: true, body: JSON.stringify(body) });
}

export interface SkillDetailDto extends SkillListItemDto {
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

export async function fetchSkillBySlug(slug: string) {
  return apiFetch<SkillDetailDto>(`/admin/skills/${encodeURIComponent(slug)}`, { auth: true });
}

export async function updateSkill(slug: string, body: Partial<{ title: string; description: string | null; active: boolean }>) {
  return apiFetch<{ ok: true }>(`/admin/skills/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function createSkillItem(slug: string, body: { type: string; title: string; payload: Record<string, unknown> }) {
  return apiFetch<{ id: string }>(`/admin/skills/${encodeURIComponent(slug)}/items`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function updateSkillItem(id: string, body: Partial<{ type: string; title: string; payload: Record<string, unknown> }>) {
  return apiFetch<{ ok: true }>(`/admin/skill-items/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(body) });
}

export async function deleteSkillItem(id: string) {
  return apiFetch<{ ok: true }>(`/admin/skill-items/${id}`, { method: "DELETE", auth: true });
}

export interface DocumentCategoryDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export async function fetchDocumentCategories() {
  return apiFetch<DocumentCategoryDto[]>("/admin/document-categories", { auth: true });
}

export async function createDocumentCategory(body: { slug: string; name: string; description?: string | null }) {
  return apiFetch<{ id: string }>("/admin/document-categories", { method: "POST", auth: true, body: JSON.stringify(body) });
}

export async function updateDocumentCategory(id: string, body: Partial<{ name: string; description: string | null }>) {
  return apiFetch<{ ok: true }>(`/admin/document-categories/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(body) });
}

export async function deleteDocumentCategory(id: string, force?: boolean) {
  return apiFetch<{ ok: true }>(`/admin/document-categories/${id}${q({ force: force ? true : undefined })}`, {
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
    `/admin/documents${q({ page, limit, ...filters })}`,
    { auth: true },
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
  return apiFetch<{ id: string }>("/admin/documents", { method: "POST", auth: true, body: JSON.stringify(body) });
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
  return apiFetch<{ ok: true }>(`/admin/documents/${id}`, { method: "PATCH", auth: true, body: JSON.stringify(body) });
}

export async function deleteDocument(id: string) {
  return apiFetch<{ ok: true }>(`/admin/documents/${id}`, { method: "DELETE", auth: true });
}

export async function fetchContentRanking(period: "week" | "month", from?: string, to?: string, companyId?: string) {
  return apiFetch<{
    period: string;
    from: string;
    to: string;
    suppressionMinCount: number;
    rows: { contentType: string; contentId: string; count: number }[];
  }>(`/admin/metrics/content-ranking${q({ period, from, to, companyId })}`, { auth: true });
}

export async function fetchEngagementMetrics(from?: string, to?: string, companyId?: string) {
  return apiFetch<{
    from: string;
    to: string;
    suppressionMinCount: number;
    wave: { contentId: string; count: number }[];
    skillItem: { contentId: string; count: number }[];
    document: { contentId: string; count: number }[];
  }>(`/admin/metrics/engagement${q({ from, to, companyId })}`, { auth: true });
}

export async function fetchCohortMetrics(from: string, to: string, companyId?: string) {
  return apiFetch<{
    from: string;
    to: string;
    distinctUsersInRange: number;
    weeklyActiveUsersApprox: number;
    dailyActiveUsersByDay: { day: string; users: number }[];
  }>(`/admin/metrics/cohorts/dau-wau-mau${q({ from, to, companyId })}`, { auth: true });
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
  return apiFetch<CompanyHubLinksDto>(`/admin/companies/${companyId}/hub-links`, { auth: true });
}

export async function putCompanyHubLinks(companyId: string, body: Partial<CompanyHubLinksDto>) {
  return apiFetch<{ ok: true }>(`/admin/companies/${companyId}/hub-links`, {
    method: "PUT",
    auth: true,
    body: JSON.stringify(body),
  });
}

export async function offboardUser(userId: string, body?: { reason?: string }) {
  return apiFetch<{ ok: true }>(`/admin/users/${userId}/offboard`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(body ?? {}),
  });
}
