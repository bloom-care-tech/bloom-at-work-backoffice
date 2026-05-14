import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FadeIn, Eyebrow } from "@/components/bloom/primitives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchDashboardSummary } from "@/lib/admin-api";

export function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: fetchDashboardSummary,
  });

  const tiles = data
    ? [
        { label: "Empresas", value: data.companies, hint: "Organizações", to: "/empresas" },
        { label: "Usuários", value: data.users, hint: "Colaboradores e líderes", to: "/usuarios" },
        {
          label: "Administradores Bloom",
          value: data.platformAdmins ?? 0,
          hint: "Contas operadoras",
          to: "/administradores",
        },
        { label: "Links de acesso ativos", value: data.signupAccessActive, hint: "Links não revogados", to: "/links-acesso" },
        { label: "Frases", value: data.quotes, hint: "Bloom do dia", to: "/frases" },
        { label: "Ondas", value: data.waves, hint: "Trilha editorial", to: "/ondas" },
        { label: "Conteúdos de onda", value: data.waveContents, hint: "Itens publicáveis", to: "/ondas" },
        { label: "Habilidades", value: data.skills, hint: "Catálogo socioemocional", to: "/habilidades" },
        { label: "Itens de habilidade", value: data.skillItems, hint: "Recursos por habilidade", to: "/habilidades" },
        { label: "Documentos", value: data.documents, hint: "Mapa GB", to: "/mapa-documentos" },
        {
          label: "Interações (7d)",
          value: data.interactionsLast7Days,
          hint: "Telemetria agregada",
          to: "/metricas",
        },
      ]
    : [];

  return (
    <div className="max-w-5xl space-y-8">
      <FadeIn>
        <Eyebrow tone="garnet">Visão geral</Eyebrow>
        <h1 className="font-serif-display text-3xl md:text-4xl text-bloom-aubergine mt-2">Painel administrativo</h1>
        <p className="font-ui text-sm text-bloom-aubergine/70 mt-2 max-w-xl">
          Totais da plataforma em uma visão. Clique em um cartão para abrir o módulo.
        </p>
      </FadeIn>
      {isLoading && <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p>}
      {isError && <p className="font-ui text-sm text-bloom-garnet">Não foi possível carregar o resumo.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((t, i) => (
          <FadeIn key={t.label} delay={0.04 * (i + 1)}>
            <Link to={t.to}>
              <Card className="border-bloom-aubergine/10 bg-white/80 hover:border-bloom-garnet/30 transition-colors h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="font-serif-display text-lg text-bloom-aubergine">{t.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-serif-display text-4xl text-bloom-garnet">{t.value}</p>
                  <p className="font-ui text-xs text-bloom-aubergine/55 mt-2">{t.hint}</p>
                </CardContent>
              </Card>
            </Link>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}
