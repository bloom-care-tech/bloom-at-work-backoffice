import { useQueries } from "@tanstack/react-query";
import { FadeIn, Eyebrow } from "@/components/bloom/primitives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchCompaniesPage,
  fetchInvitesPage,
  fetchQuotesPage,
  fetchUsersPage,
} from "@/lib/admin-api";

export function DashboardPage() {
  const [companies, users, invites, quotes] = useQueries({
    queries: [
      { queryKey: ["dash", "companies"], queryFn: () => fetchCompaniesPage(1, 1) },
      { queryKey: ["dash", "users"], queryFn: () => fetchUsersPage(1, 1) },
      { queryKey: ["dash", "invites"], queryFn: () => fetchInvitesPage(1, 1) },
      { queryKey: ["dash", "quotes"], queryFn: () => fetchQuotesPage(1, 1) },
    ],
  });

  const tiles = [
    { label: "Empresas", value: companies.data?.total ?? "—", hint: "Organizações cadastradas" },
    { label: "Usuários", value: users.data?.total ?? "—", hint: "Colaboradores com acesso" },
    { label: "Convites", value: invites.data?.total ?? "—", hint: "Links de cadastro" },
    { label: "Frases", value: quotes.data?.total ?? "—", hint: "Bloom do dia" },
  ];

  return (
    <div className="max-w-4xl space-y-8">
      <FadeIn>
        <Eyebrow tone="garnet">Visão geral</Eyebrow>
        <h1 className="font-serif-display text-3xl md:text-4xl text-bloom-aubergine mt-2">Painel administrativo</h1>
        <p className="font-ui text-sm text-bloom-aubergine/70 mt-2 max-w-xl">
          Gerencie empresas, pessoas, convites e as frases exibidas no Bloom do dia. Use o menu à esquerda para navegar.
        </p>
      </FadeIn>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tiles.map((t, i) => (
          <FadeIn key={t.label} delay={0.05 * (i + 1)}>
            <Card className="border-bloom-aubergine/10 bg-white/80">
              <CardHeader className="pb-2">
                <CardTitle className="font-serif-display text-lg text-bloom-aubergine">{t.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-serif-display text-4xl text-bloom-garnet">{t.value}</p>
                <p className="font-ui text-xs text-bloom-aubergine/55 mt-2">{t.hint}</p>
              </CardContent>
            </Card>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
