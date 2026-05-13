import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PencilSimple } from "@phosphor-icons/react";
import { FadeIn, Eyebrow } from "@/components/bloom/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminCompaniesForSelect } from "@/hooks/use-admin-companies-select";
import { filterSelectCls } from "@/lib/backoffice-filters";
import { fetchUsersPage } from "@/lib/admin-api";

export function UsersListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedCompanyId, setAppliedCompanyId] = useState("");

  const { data: companiesSelect, isLoading: companiesLoading } = useAdminCompaniesForSelect();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["users", page, appliedSearch, appliedCompanyId],
    queryFn: () =>
      fetchUsersPage(page, 15, appliedCompanyId || undefined, appliedSearch || undefined),
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

  return (
    <div className="max-w-6xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Pessoas</Eyebrow>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">Usuários</h1>
        <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">Visualize e edite perfis. O e-mail não pode ser alterado aqui.</p>
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
          <table className="w-full font-ui text-sm min-w-[640px]">
            <thead>
              <tr className="bg-bloom-plum/15 border-b border-bloom-aubergine/10 text-bloom-aubergine/75 text-left text-[11px] uppercase tracking-wide">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-bloom-aubergine/50">
                    Carregando…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-bloom-garnet">
                    Não foi possível carregar.
                  </td>
                </tr>
              )}
              {data?.items.map((u) => (
                <tr key={u.id} className="border-t border-bloom-aubergine/8 hover:bg-bloom-cream/40">
                  <td className="px-4 py-3 text-bloom-aubergine">{u.displayName || u.name || "—"}</td>
                  <td className="px-4 py-3 text-bloom-aubergine/80 max-w-[200px] truncate">{u.email}</td>
                  <td className="px-4 py-3 text-bloom-aubergine/70">{u.companyName ?? "—"}</td>
                  <td className="px-4 py-3">{u.role === "lider" ? "Líder" : u.role === "colaborador" ? "Colaborador" : "—"}</td>
                  <td className="px-4 py-3 capitalize">{u.status ?? "—"}</td>
                  <td className="px-4 py-3">{u.isAdmin ? "Sim" : "Não"}</td>
                  <td className="px-4 py-3">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/usuarios/${u.id}`}>
                        <PencilSimple size={16} />
                      </Link>
                    </Button>
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
