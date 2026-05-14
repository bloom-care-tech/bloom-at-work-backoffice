import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PencilSimple, Plus } from "@phosphor-icons/react";
import { FadeIn, Eyebrow } from "@/components/bloom/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { useAdminCompaniesForSelect } from "@/hooks/use-admin-companies-select";
import { ApiError } from "@/lib/auth/api-client";
import { filterSelectCls } from "@/lib/backoffice-filters";
import { fetchUsersPage, updateUser } from "@/lib/admin-api";
import { useBackofficeSession } from "@/lib/backoffice-session";

export type UsersListSection = "company" | "platform";

function userStatusLabel(status: string | null | undefined): string {
  if (status === "ativo") return "Ativo";
  if (status === "pausado") return "Inativo";
  if (status === "desligado") return "Desligado";
  return "—";
}

export function UsersListPage({ section }: { section: UsersListSection }) {
  const isCompany = section === "company";
  const queryClient = useQueryClient();
  const { auth } = useBackofficeSession();
  const selfId = auth?.kind === "backoffice" ? auth.me.id : null;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedCompanyId, setAppliedCompanyId] = useState("");

  const { data: companiesSelect, isLoading: companiesLoading } = useAdminCompaniesForSelect();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["users", section, page, appliedSearch, appliedCompanyId],
    queryFn: () =>
      fetchUsersPage(
        page,
        15,
        isCompany ? appliedCompanyId || undefined : undefined,
        appliedSearch || undefined,
        { userScope: isCompany ? "company" : "platform" },
      ),
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) => updateUser(userId, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      toast("Situação atualizada.");
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Não foi possível atualizar.";
      toast(msg);
    },
  });

  const applyFilters = () => {
    setAppliedSearch(search.trim());
    setAppliedCompanyId(companyId);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setCompanyId("");
    setAppliedSearch("");
    setAppliedCompanyId("");
    setPage(1);
  };

  const basePath = isCompany ? "/usuarios" : "/administradores";

  return (
    <div className="max-w-6xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">{isCompany ? "Empresas" : "Plataforma"}</Eyebrow>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mt-1">
          <div>
            <h1 className="font-serif-display text-3xl text-bloom-aubergine">
              {isCompany ? "Usuários" : "Administradores Bloom"}
            </h1>
            <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">
              {isCompany
                ? "Colaboradores e líderes vinculados a empresas. Novos cadastros entram pelos links de acesso."
                : "Contas com perfil admin da operadora Bloom. O e-mail não pode ser alterado aqui."}
            </p>
          </div>
          {!isCompany && (
            <Button className="rounded-full bg-bloom-garnet hover:bg-bloom-garnet/90 shrink-0" asChild>
              <Link to="/administradores/novo">
                <Plus size={18} className="mr-2 inline" weight="bold" />
                Adicionar administrador
              </Link>
            </Button>
          )}
        </div>
      </FadeIn>
      <FadeIn delay={0.05}>
        <div className="rounded-2xl border border-bloom-aubergine/10 bg-white/90 p-4 md:p-5 space-y-3">
          <p className="font-ui text-xs text-bloom-aubergine/60 uppercase tracking-wide">Filtros</p>
          <div className="flex flex-col xl:flex-row flex-wrap gap-4 xl:items-end">
            <div className="space-y-1 flex-1 min-w-[12rem] max-w-md">
              <Label htmlFor="users-filter-search" className="font-ui text-xs text-bloom-aubergine/70">
                Nome ou nome de exibição
              </Label>
              <Input
                id="users-filter-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar…"
                className="rounded-xl border-bloom-aubergine/15"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyFilters();
                  }
                }}
              />
            </div>
            {isCompany && (
              <div className="space-y-1 w-full max-w-[14rem]">
                <Label htmlFor="users-filter-company" className="font-ui text-xs text-bloom-aubergine/70">
                  Empresa
                </Label>
                <select
                  id="users-filter-company"
                  className={filterSelectCls}
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  disabled={companiesLoading}
                >
                  <option value="">Todas</option>
                  {companiesSelect?.items.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="rounded-full bg-bloom-garnet hover:bg-bloom-garnet/90" onClick={applyFilters}>
                Aplicar
              </Button>
              <Button type="button" variant="outline" className="rounded-full border-bloom-aubergine/20" onClick={clearFilters}>
                Limpar
              </Button>
            </div>
          </div>
        </div>
      </FadeIn>
      <FadeIn delay={0.08}>
        <div className="rounded-2xl border border-bloom-aubergine/10 bg-white/90 overflow-hidden overflow-x-auto">
          <table className="w-full font-ui text-sm min-w-[720px]">
            <thead>
              <tr className="bg-bloom-plum/15 border-b border-bloom-aubergine/10 text-bloom-aubergine/75 text-left text-[11px] uppercase tracking-wide">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                {isCompany && <th className="px-4 py-3">Empresa</th>}
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={isCompany ? 6 : 5} className="px-4 py-8 text-center text-bloom-aubergine/50">
                    Carregando…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={isCompany ? 6 : 5} className="px-4 py-8 text-center text-bloom-garnet">
                    Não foi possível carregar.
                  </td>
                </tr>
              )}
              {data?.items.map((u) => (
                <tr key={u.id} className="border-t border-bloom-aubergine/8 hover:bg-bloom-cream/40">
                  <td className="px-4 py-3 text-bloom-aubergine">{u.displayName || u.name || "—"}</td>
                  <td className="px-4 py-3 text-bloom-aubergine/80 max-w-[200px] truncate">{u.email}</td>
                  {isCompany && <td className="px-4 py-3 text-bloom-aubergine/70">{u.companyName ?? "—"}</td>}
                  <td className="px-4 py-3">
                    {u.role === "admin"
                      ? "Bloom (plataforma)"
                      : u.role === "lider"
                        ? "Líder"
                        : u.role === "colaborador"
                          ? "Colaborador"
                          : "—"}
                  </td>
                  <td className="px-4 py-3">{userStatusLabel(u.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 flex-wrap">
                      {u.status === "ativo" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full border-bloom-aubergine/25 text-bloom-aubergine/90 text-xs h-8"
                          disabled={statusMutation.isPending || u.id === selfId}
                          title={u.id === selfId ? "Use outra conta de administrador para inativar a sua." : undefined}
                          onClick={() => {
                            if (
                              !globalThis.confirm(
                                "Inativar este usuário? Ele não poderá entrar até ser reativado.",
                              )
                            ) {
                              return;
                            }
                            statusMutation.mutate({ userId: u.id, status: "pausado" });
                          }}
                        >
                          Inativar
                        </Button>
                      )}
                      {u.status === "pausado" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full border-bloom-aubergine/25 text-bloom-aubergine/90 text-xs h-8"
                          disabled={statusMutation.isPending}
                          onClick={() => {
                            statusMutation.mutate({ userId: u.id, status: "ativo" });
                          }}
                        >
                          Reativar
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`${basePath}/${u.id}`} aria-label="Editar">
                          <PencilSimple size={16} />
                        </Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data && data.total > data.limit && (
            <div className="flex justify-between items-center px-4 py-3 border-t border-bloom-aubergine/8 bg-bloom-cream/50">
              <span className="font-ui text-xs text-bloom-aubergine/60">
                Página {data.page} de {Math.ceil(data.total / data.limit) || 1}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * data.limit >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      </FadeIn>
    </div>
  );
}
