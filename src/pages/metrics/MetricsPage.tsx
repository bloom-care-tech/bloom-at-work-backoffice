import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FadeIn, Eyebrow } from "@/components/bloom/primitives";
import { fetchContentRanking, fetchCohortMetrics, fetchEngagementMetrics } from "@/lib/admin-api";

export function MetricsPage() {
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - 30);
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, []);

  const ranking = useQuery({
    queryKey: ["metrics", "ranking", range],
    queryFn: () => fetchContentRanking("month", `${range.from}T00:00:00.000Z`, `${range.to}T23:59:59.999Z`),
  });
  const engagement = useQuery({
    queryKey: ["metrics", "engagement", range],
    queryFn: () => fetchEngagementMetrics(`${range.from}T00:00:00.000Z`, `${range.to}T23:59:59.999Z`),
  });
  const cohorts = useQuery({
    queryKey: ["metrics", "cohorts", range],
    queryFn: () => fetchCohortMetrics(`${range.from}T00:00:00.000Z`, `${range.to}T23:59:59.999Z`),
  });

  return (
    <div className="max-w-4xl space-y-10">
      <FadeIn>
        <Eyebrow tone="garnet">Privacidade</Eyebrow>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">Métricas agregadas</h1>
        <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">
          Apenas contagens agregadas (limiar mínimo no servidor). Período: últimos 30 dias.
        </p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <h2 className="font-serif-display text-lg text-bloom-aubergine mb-2">Ranking de conteúdo</h2>
        {ranking.isLoading && <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p>}
        {ranking.data && (
          <ul className="font-ui text-sm space-y-1 bg-white/80 rounded-xl border border-bloom-aubergine/10 p-4">
            {ranking.data.rows.length === 0 && <li className="text-bloom-aubergine/55">Sem dados acima do limiar.</li>}
            {ranking.data.rows.map((r) => (
              <li key={`${r.contentType}-${r.contentId}`}>
                {r.contentType} · {r.contentId.slice(0, 8)}… · {r.count}
              </li>
            ))}
          </ul>
        )}
      </FadeIn>
      <FadeIn delay={0.08}>
        <h2 className="font-serif-display text-lg text-bloom-aubergine mb-2">Engajamento por tipo</h2>
        {engagement.isLoading && <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p>}
        {engagement.data && (
          <div className="font-ui text-sm bg-white/80 rounded-xl border border-bloom-aubergine/10 p-4 space-y-2">
            <p>Onda: {engagement.data.wave.length} grupos</p>
            <p>Habilidades: {engagement.data.skillItem.length} grupos</p>
            <p>Documentos: {engagement.data.document.length} grupos</p>
          </div>
        )}
      </FadeIn>
      <FadeIn delay={0.1}>
        <h2 className="font-serif-display text-lg text-bloom-aubergine mb-2">Atividade (DAU por dia)</h2>
        {cohorts.isLoading && <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p>}
        {cohorts.data && (
          <div className="font-ui text-sm bg-white/80 rounded-xl border border-bloom-aubergine/10 p-4">
            <p>Usuários distintos no período: {cohorts.data.distinctUsersInRange}</p>
            <p className="mt-2 max-h-48 overflow-y-auto">
              {cohorts.data.dailyActiveUsersByDay.map((d) => (
                <span key={d.day} className="inline-block mr-3 mb-1">
                  {d.day}: {d.users}
                </span>
              ))}
            </p>
          </div>
        )}
      </FadeIn>
    </div>
  );
}
