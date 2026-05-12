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

export async function fetchCompaniesPage(page: number, limit = 20) {
  return apiFetch<Paginated<CompanyDto>>(`/admin/companies${q({ page, limit })}`, { auth: true });
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

export async function fetchUsersPage(page: number, limit = 20, companyId?: string, search?: string) {
  return apiFetch<Paginated<UserListItemDto>>(`/admin/users${q({ page, limit, companyId, search })}`, { auth: true });
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

export async function fetchInvitesPage(page: number, limit = 20, companyId?: string) {
  return apiFetch<Paginated<InviteListItemDto>>(`/admin/signup-invites${q({ page, limit, companyId })}`, {
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
