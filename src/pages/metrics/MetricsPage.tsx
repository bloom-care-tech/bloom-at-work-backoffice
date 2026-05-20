import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { DownloadSimple, Lock } from "@phosphor-icons/react";
import { FadeIn, Eyebrow } from "@/components/bloom/primitives";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { useAdminCompaniesForSelect } from "@/hooks/use-admin-companies-select";
import {
  downloadContentRankingCsv,
  downloadCohortMetricsCsv,
  downloadEngagementMetricsCsv,
  downloadSkillEngagementHierarchyCsv,
  downloadWaveEngagementHierarchyCsv,
  fetchContentRanking,
  fetchCohortMetrics,
  fetchEngagementMetrics,
  fetchSkillEngagementHierarchy,
  fetchWaveEngagementHierarchy,
  type MetricsHubRoleFilter,
} from "@/lib/admin-api";
import { MetricsHierarchyDrilldown } from "@/pages/metrics/MetricsHierarchyDrilldown";
import { skillHierarchyToNodes, waveHierarchyToNodes } from "@/pages/metrics/metrics-hierarchy-mappers";
import { ApiError } from "@/lib/auth/api-client";
import { filterInputCls, filterSelectCls } from "@/lib/backoffice-filters";
import { cn } from "@/lib/utils";
import { formatPtBrDayMonthFromYmd, formatPtBrNumericDate } from "@/lib/format-date";

function ymdUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function presetYmdRange(days: 7 | 30): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  return { from: ymdUtc(from), to: ymdUtc(to) };
}

function defaultYmdRange(): { from: string; to: string } {
  return presetYmdRange(30);
}

function matchesPresetRange(from: string, to: string, days: 7 | 30): boolean {
  const preset = presetYmdRange(days);
  return from === preset.from && to === preset.to;
}

const CONTENT_TYPE_LABEL: Record<string, string> = {
  wave_content: "Onda (conteúdo)",
  wave_module: "Onda (módulo)",
  skill_item: "Habilidade (item)",
  skill: "Habilidade (página)",
  document: "Documento",
  quote: "Bloom do dia",
  other: "Outro",
};

function sortByCountDesc<T extends { count: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.count - a.count);
}

function truncateChartLabel(text: string, maxLen = 14): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

function topRankingForChart(
  rows: { contentId: string; contentTitle: string; count: number }[],
  limit = 7,
): { key: string; label: string; short: string; count: number }[] {
  return sortByCountDesc(rows)
    .slice(0, limit)
    .map((r) => {
      const label = r.contentTitle.trim() || r.contentId;
      return {
        key: r.contentId,
        label,
        short: truncateChartLabel(label),
        count: r.count,
      };
    });
}

function Panel({
  title,
  description,
  headerRight,
  children,
}: {
  title: string;
  description?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article
      className={cn(
        "overflow-hidden rounded-3xl border border-bloom-aubergine/12 bg-[hsla(0,0%,100%,0.88)] p-5 shadow-[0_24px_80px_rgba(61,26,46,0.10)] backdrop-blur-xl",
      )}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-serif-display text-[1.35rem] leading-tight tracking-tight text-bloom-aubergine">{title}</h2>
          {description ? <p className="mt-1.5 max-w-2xl font-ui text-[13px] leading-snug text-bloom-aubergine/55">{description}</p> : null}
        </div>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </div>
      {children}
    </article>
  );
}

function ListCard({
  title,
  rows,
  emptyLabel,
  rowHint,
}: {
  title: string;
  rows: { label: string; count: number; hint?: string }[];
  emptyLabel: string;
  rowHint?: (row: { label: string; count: number; hint?: string }) => string | undefined;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[1.25rem] border border-bloom-aubergine/12 bg-white/45 p-3.5">
        <h3 className="mb-2 font-ui text-[13px] font-semibold text-bloom-aubergine">{title}</h3>
        <p className="font-ui text-sm text-bloom-aubergine/55">{emptyLabel}</p>
      </div>
    );
  }
  return (
    <div className="rounded-[1.25rem] border border-bloom-aubergine/12 bg-white/45 p-3.5">
      <h3 className="mb-2 font-ui text-[13px] font-semibold tracking-tight text-bloom-aubergine">{title}</h3>
      {rows.map((r, i) => (
        <div
          key={`${r.label}-${i}`}
          title={rowHint?.(r)}
          className="flex justify-between gap-3 border-t border-bloom-aubergine/[0.07] py-2.5 font-ui text-[13px] first:border-t-0 first:pt-0"
        >
          <span className="min-w-0 truncate text-bloom-aubergine/60">{r.label}</span>
          <strong className="shrink-0 text-bloom-aubergine">{r.count}</strong>
        </div>
      ))}
    </div>
  );
}

export function MetricsPage() {
  const [{ from: dateFrom, to: dateTo }, setRange] = useState(defaultYmdRange);
  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState<"" | MetricsHubRoleFilter>("");
  const [csvBusy, setCsvBusy] = useState(false);

  const companies = useAdminCompaniesForSelect();

  const rangeInvalid = dateFrom > dateTo;
  const fromIso = `${dateFrom}T00:00:00.000Z`;
  const toIso = `${dateTo}T23:59:59.999Z`;
  const companyParam = companyId || undefined;
  const roleParam = role || undefined;

  const filterKey = useMemo(
    () => ({
      fromIso,
      toIso,
      companyParam,
      roleParam,
      enabled: !rangeInvalid,
    }),
    [fromIso, toIso, companyParam, roleParam, rangeInvalid],
  );

  const ranking = useQuery({
    queryKey: ["metrics", "ranking", filterKey],
    queryFn: () =>
      fetchContentRanking("month", filterKey.fromIso, filterKey.toIso, filterKey.companyParam, filterKey.roleParam),
    enabled: filterKey.enabled,
  });

  const engagement = useQuery({
    queryKey: ["metrics", "engagement", filterKey],
    queryFn: () => fetchEngagementMetrics(filterKey.fromIso, filterKey.toIso, filterKey.companyParam, filterKey.roleParam),
    enabled: filterKey.enabled,
  });

  const cohorts = useQuery({
    queryKey: ["metrics", "cohorts", filterKey],
    queryFn: () => fetchCohortMetrics(filterKey.fromIso, filterKey.toIso, filterKey.companyParam, filterKey.roleParam),
    enabled: filterKey.enabled,
  });

  const waveHierarchy = useQuery({
    queryKey: ["metrics", "waves-hierarchy", filterKey],
    queryFn: () =>
      fetchWaveEngagementHierarchy(filterKey.fromIso, filterKey.toIso, filterKey.companyParam, filterKey.roleParam),
    enabled: filterKey.enabled,
  });

  const skillHierarchy = useQuery({
    queryKey: ["metrics", "skills-hierarchy", filterKey],
    queryFn: () =>
      fetchSkillEngagementHierarchy(filterKey.fromIso, filterKey.toIso, filterKey.companyParam, filterKey.roleParam),
    enabled: filterKey.enabled,
  });

  const waveHierarchyNodes = useMemo(
    () => (waveHierarchy.data ? waveHierarchyToNodes(waveHierarchy.data) : []),
    [waveHierarchy.data],
  );

  const skillHierarchyNodes = useMemo(
    () => (skillHierarchy.data ? skillHierarchyToNodes(skillHierarchy.data) : []),
    [skillHierarchy.data],
  );

  const activeDaysPreset = useMemo((): 7 | 30 | null => {
    if (matchesPresetRange(dateFrom, dateTo, 7)) return 7;
    if (matchesPresetRange(dateFrom, dateTo, 30)) return 30;
    return null;
  }, [dateFrom, dateTo]);

  const applyPreset = (days: 7 | 30) => {
    setRange(presetYmdRange(days));
  };

  const clearFilters = () => {
    setRange(defaultYmdRange());
    setCompanyId("");
    setRole("");
  };

  const onExportCsv = async () => {
    if (rangeInvalid) return;
    setCsvBusy(true);
    try {
      await downloadContentRankingCsv("month", fromIso, toIso, companyParam, roleParam);
      toast("Exportação CSV iniciada.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Não foi possível exportar o ranking.");
    } finally {
      setCsvBusy(false);
    }
  };

  const onExportEngagementCsv = async () => {
    if (rangeInvalid) return;
    setCsvBusy(true);
    try {
      await downloadEngagementMetricsCsv(fromIso, toIso, companyParam, roleParam);
      toast("Exportação CSV iniciada.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Não foi possível exportar o engajamento.");
    } finally {
      setCsvBusy(false);
    }
  };

  const onExportWaveHierarchyCsv = async () => {
    if (rangeInvalid) return;
    setCsvBusy(true);
    try {
      await downloadWaveEngagementHierarchyCsv(fromIso, toIso, companyParam, roleParam);
      toast("Exportação CSV iniciada.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Não foi possível exportar as ondas.");
    } finally {
      setCsvBusy(false);
    }
  };

  const onExportSkillHierarchyCsv = async () => {
    if (rangeInvalid) return;
    setCsvBusy(true);
    try {
      await downloadSkillEngagementHierarchyCsv(fromIso, toIso, companyParam, roleParam);
      toast("Exportação CSV iniciada.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Não foi possível exportar as habilidades.");
    } finally {
      setCsvBusy(false);
    }
  };

  const onExportCohortsCsv = async () => {
    if (rangeInvalid) return;
    setCsvBusy(true);
    try {
      await downloadCohortMetricsCsv(fromIso, toIso, companyParam, roleParam);
      toast("Exportação CSV iniciada.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Não foi possível exportar a recorrência.");
    } finally {
      setCsvBusy(false);
    }
  };

  const rankingRows =
    ranking.data?.rows.map((r, idx) => ({
      pos: idx + 1,
      tipo: CONTENT_TYPE_LABEL[r.contentType] ?? r.contentType,
      titulo: r.contentTitle,
      contentId: r.contentId,
      count: r.count,
    })) ?? [];

  const barBuckets = useMemo(
    () => topRankingForChart(ranking.data?.rows ?? []),
    [ranking.data?.rows],
  );
  const barMax = barBuckets.length ? Math.max(...barBuckets.map((b) => b.count), 1) : 1;

  const waveRows = sortByCountDesc(engagement.data?.wave ?? []).map((r) => ({
    titulo: r.contentTitle,
    count: r.count,
    contentId: r.contentId,
  }));
  const waveModuleRows = sortByCountDesc(engagement.data?.waveModule ?? []).map((r) => ({
    titulo: r.contentTitle,
    count: r.count,
    contentId: r.contentId,
  }));
  const skillRows = sortByCountDesc(engagement.data?.skillItem ?? []).map((r) => ({
    titulo: r.contentTitle,
    count: r.count,
    contentId: r.contentId,
  }));
  const docRows = sortByCountDesc(engagement.data?.document ?? []).map((r) => ({
    titulo: r.contentTitle,
    count: r.count,
    contentId: r.contentId,
  }));
  const mapRows = sortByCountDesc(engagement.data?.documentByCategory ?? []).map((r) => ({
    categoria: r.categoryName,
    count: r.count,
    categoryId: r.categoryId,
  }));
  const skillPageRows = sortByCountDesc(engagement.data?.skill ?? []).map((r) => ({
    titulo: r.contentTitle,
    count: r.count,
    contentId: r.contentId,
  }));
  const quoteRows = sortByCountDesc(engagement.data?.quote ?? []).map((r) => ({
    titulo: r.contentTitle,
    count: r.count,
    contentId: r.contentId,
  }));

  const lastDayDau =
    cohorts.data?.dailyActiveUsersByDay.length ?
      cohorts.data.dailyActiveUsersByDay[cohorts.data.dailyActiveUsersByDay.length - 1]
    : null;
  const dailyMax = cohorts.data?.dailyActiveUsersByDay.length
    ? Math.max(...cohorts.data.dailyActiveUsersByDay.map((d) => d.users), 1)
    : 1;

  const topDocTitle = docRows[0]?.titulo;
  const topMapCategory = mapRows[0]?.categoria;

  return (
    <div
      className={cn(
        "min-h-[calc(100vh-4rem)] pb-14 pt-2",
        "bg-[radial-gradient(circle_at_20%_0%,rgba(123,27,70,0.12),transparent_34rem),radial-gradient(circle_at_95%_12%,rgba(220,233,234,0.95),transparent_28rem),linear-gradient(180deg,#F6EFE8_0%,hsl(var(--bloom-cream))_48%,#EFE5D8_100%)]",
      )}
    >
      <div className="mx-auto w-[min(90rem,calc(100%-1.75rem))] space-y-5">
        <FadeIn>
          <Eyebrow tone="garnet">Privacidade</Eyebrow>
          <h1 className="mt-1 font-serif-display text-3xl text-bloom-aubergine">Métricas agregadas</h1>
          <p className="mt-1 max-w-3xl font-ui text-sm text-bloom-aubergine/65">
            Dados anonimizados e agregados a partir das interações registradas no hub.
          </p>
          <div className="mt-3 inline-flex items-center gap-2.5 rounded-full border border-bloom-garnet/16 bg-bloom-garnet/[0.07] px-3.5 py-2 font-ui text-xs font-extrabold text-bloom-garnet">
            <Lock size={16} weight="duotone" aria-hidden className="shrink-0" />
            Nenhum dado individual é exibido para a empresa
          </div>
        </FadeIn>

        <FadeIn delay={0.03}>
          <section
            className="flex flex-wrap items-end gap-3 rounded-[1.75rem] border border-bloom-aubergine/12 bg-[hsla(40,43%,98%,0.78)] p-[18px] backdrop-blur-md"
            aria-label="Filtros"
          >
            <Button
              type="button"
              size="sm"
              variant={activeDaysPreset === 7 ? "default" : "secondary"}
              className={cn("h-11 rounded-[0.875rem] px-4", activeDaysPreset === 7 && "shadow-md")}
              onClick={() => applyPreset(7)}
            >
              Últimos 7 dias
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeDaysPreset === 30 ? "default" : "secondary"}
              className={cn("h-11 rounded-[0.875rem] px-4", activeDaysPreset === 30 && "shadow-md")}
              onClick={() => applyPreset(30)}
            >
              Últimos 30 dias
            </Button>
            <div className="min-w-[10rem] flex-1">
              <Label htmlFor="metrics-from" className="mb-2 block font-ui text-[12px] font-extrabold text-bloom-aubergine/55">
                De (inclusivo)
              </Label>
              <input
                id="metrics-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                className={cn(filterInputCls, "h-11 w-full max-w-none rounded-[0.875rem]")}
              />
            </div>
            <div className="min-w-[10rem] flex-1">
              <Label htmlFor="metrics-to" className="mb-2 block font-ui text-[12px] font-extrabold text-bloom-aubergine/55">
                Até (inclusivo)
              </Label>
              <input
                id="metrics-to"
                type="date"
                value={dateTo}
                onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                className={cn(filterInputCls, "h-11 w-full max-w-none rounded-[0.875rem]")}
              />
            </div>
            <div className="min-w-[10rem] flex-1">
              <Label htmlFor="metrics-company" className="mb-2 block font-ui text-[12px] font-extrabold text-bloom-aubergine/55">
                Empresa
              </Label>
              <select
                id="metrics-company"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                disabled={companies.isLoading}
                className={cn(filterSelectCls, "h-11 w-full max-w-none rounded-[0.875rem]")}
              >
                <option value="">Todas as empresas</option>
                {(companies.data?.items ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[10rem] flex-1">
              <Label htmlFor="metrics-role" className="mb-2 block font-ui text-[12px] font-extrabold text-bloom-aubergine/55">
                Papel (snapshot na interação)
              </Label>
              <select
                id="metrics-role"
                value={role}
                onChange={(e) => setRole(e.target.value as "" | MetricsHubRoleFilter)}
                className={cn(filterSelectCls, "h-11 w-full max-w-none rounded-[0.875rem]")}
              >
                <option value="">Todos</option>
                <option value="lider">Líder</option>
                <option value="colaborador">Colaborador</option>
              </select>
            </div>
            <Button type="button" variant="secondary" size="sm" className="h-11 rounded-[0.875rem]" onClick={clearFilters}>
              Limpar
            </Button>
            {rangeInvalid ? (
              <p className="w-full font-ui text-sm text-red-700">A data inicial deve ser anterior ou igual à data final.</p>
            ) : null}
          </section>
        </FadeIn>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.85fr)]">
          <div className="space-y-5">
            <FadeIn delay={0.06}>
              <Panel
                title="Conteúdos mais acessados"
                description="Principais conteúdos do ranking por volume de acesso no período filtrado."
              >
                {ranking.isLoading ? <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p> : null}
                {ranking.isError ? (
                  <p className="font-ui text-sm text-red-700">
                    {ranking.error instanceof ApiError ? ranking.error.message : "Erro ao carregar o ranking."}
                  </p>
                ) : null}
                {ranking.data ? (
                  <>
                    <p className="mb-3 font-ui text-[11px] text-bloom-aubergine/50">
                      Janela: {formatPtBrNumericDate(ranking.data.from)} — {formatPtBrNumericDate(ranking.data.to)}
                    </p>
                    <div
                      className={cn(
                        "relative min-h-[17.5rem] rounded-[1.375rem] border border-bloom-aubergine/12 px-3.5 pb-3 pt-5",
                        "bg-[linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,255,255,0.2)),repeating-linear-gradient(to_top,transparent_0_45px,rgba(61,26,46,0.06)_46px_47px)]",
                      )}
                    >
                      {barBuckets.length === 0 ? (
                        <p className="font-ui text-sm text-bloom-aubergine/55">Sem conteúdos no período.</p>
                      ) : (
                        <div
                          className="grid h-56 gap-2 sm:gap-3"
                          style={{ gridTemplateColumns: `repeat(${barBuckets.length}, minmax(0, 1fr))` }}
                        >
                          {barBuckets.map((b, i) => {
                            const hPct = b.count / barMax;
                            const barPx = Math.max(14, Math.round(hPct * 200));
                            const tone =
                              i % 3 === 0 ?
                                "from-bloom-garnet to-bloom-garnet/30 shadow-[0_14px_30px_rgba(123,27,70,0.16)]"
                              : i % 3 === 1 ?
                                "from-[#9A5D46] to-[#9A5D46]/25 shadow-[0_14px_30px_rgba(154,93,70,0.14)]"
                              : "from-[#6F8182] to-[#6F8182]/22 shadow-[0_14px_24px_rgba(111,129,130,0.12)]";
                            return (
                              <div key={b.key} title={b.label} className="flex min-w-0 flex-col items-center justify-end gap-2">
                                <div
                                  className={cn(
                                    "w-full max-w-[3.25rem] rounded-t-2xl rounded-b-lg bg-gradient-to-b",
                                    tone,
                                  )}
                                  style={{ height: barPx }}
                                />
                                <div className="font-ui text-[12px] font-extrabold text-bloom-aubergine">{b.count}</div>
                                <div className="max-w-full truncate font-ui text-[11px] font-extrabold text-bloom-aubergine/55">
                                  {b.short}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.25rem] border border-bloom-aubergine/10 bg-white/55 p-4 shadow-none backdrop-blur-sm">
                        <strong className="block truncate font-serif-display text-xl tracking-tight text-bloom-aubergine">
                          {topDocTitle ?? "—"}
                        </strong>
                        <span className="font-ui text-[12px] font-bold text-bloom-aubergine/55">Documento mais acessado</span>
                      </div>
                      <div className="rounded-[1.25rem] border border-bloom-aubergine/10 bg-white/55 p-4 shadow-none backdrop-blur-sm">
                        <strong className="block truncate font-serif-display text-xl tracking-tight text-bloom-aubergine">
                          {topMapCategory ?? "—"}
                        </strong>
                        <span className="font-ui text-[12px] font-bold text-bloom-aubergine/55">Categoria líder (Mapa GB)</span>
                      </div>
                    </div>
                  </>
                ) : null}
              </Panel>
            </FadeIn>

            <FadeIn delay={0.07}>
              <Panel
                title="Ranking geral"
                description="Itens com maior volume de acesso. Exportação disponível para análise agregada."
                headerRight={
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-10 rounded-[0.875rem]"
                    disabled={csvBusy || rangeInvalid || !filterKey.enabled}
                    onClick={() => void onExportCsv()}
                  >
                    <DownloadSimple size={18} weight="duotone" aria-hidden className="mr-1.5 inline" />
                    Exportar CSV
                  </Button>
                }
              >
                {ranking.data && rankingRows.length === 0 ? (
                  <p className="font-ui text-sm text-bloom-aubergine/55">Sem dados para os filtros atuais.</p>
                ) : null}
                {ranking.data && rankingRows.length > 0 ? (
                  <div className="overflow-hidden rounded-[1.25rem] border border-bloom-aubergine/12 bg-white/45">
                    <div className="max-h-[22rem] overflow-auto">
                      <table className="w-full min-w-[36rem] border-collapse font-ui text-[13px]">
                        <thead className="sticky top-0 z-[1] bg-bloom-cream-deep/80 backdrop-blur-sm">
                          <tr>
                            <th className="px-3.5 py-3 text-left font-ui text-[11px] font-extrabold uppercase tracking-wide text-bloom-aubergine/55">
                              #
                            </th>
                            <th className="px-3.5 py-3 text-left font-ui text-[11px] font-extrabold uppercase tracking-wide text-bloom-aubergine/55">
                              Tipo
                            </th>
                            <th className="px-3.5 py-3 text-left font-ui text-[11px] font-extrabold uppercase tracking-wide text-bloom-aubergine/55">
                              Título
                            </th>
                            <th className="px-3.5 py-3 text-right font-ui text-[11px] font-extrabold uppercase tracking-wide text-bloom-aubergine/55">
                              Acessos
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {rankingRows.map((r) => (
                            <tr key={`${r.contentId}-${r.pos}`} title={`Identificador: ${r.contentId}`} className="even:bg-bloom-cream/35">
                              <td className="border-t border-bloom-aubergine/[0.075] px-3.5 py-3 align-middle">
                                <span className="inline-flex size-[1.625rem] items-center justify-center rounded-[0.625rem] bg-bloom-garnet/[0.08] font-extrabold text-bloom-garnet">
                                  {r.pos}
                                </span>
                              </td>
                              <td className="border-t border-bloom-aubergine/[0.075] px-3.5 py-3 align-middle">
                                <span className="inline-flex items-center rounded-full bg-bloom-aubergine/[0.06] px-2.5 py-1 font-ui text-[11px] font-extrabold text-bloom-aubergine/65">
                                  {r.tipo}
                                </span>
                              </td>
                              <td className="max-w-[min(32rem,50vw)] border-t border-bloom-aubergine/[0.075] px-3.5 py-3 align-middle font-bold text-bloom-aubergine">
                                <span className="block truncate">{r.titulo}</span>
                              </td>
                              <td className="border-t border-bloom-aubergine/[0.075] px-3.5 py-3 text-right align-middle font-extrabold text-bloom-aubergine">
                                {r.count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </Panel>
            </FadeIn>

          </div>

          <aside className="space-y-5">
            <FadeIn delay={0.06}>
              <Panel
                title="Recorrência"
                description="DAU no último dia disponível, WAU e MAU com janelas deslizantes."
                headerRight={
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-10 rounded-[0.875rem]"
                    disabled={csvBusy || rangeInvalid || !filterKey.enabled}
                    onClick={() => void onExportCohortsCsv()}
                  >
                    <DownloadSimple size={18} weight="duotone" aria-hidden className="mr-1.5 inline" />
                    CSV
                  </Button>
                }
              >
                {cohorts.isLoading ? <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p> : null}
                {cohorts.isError ? (
                  <p className="font-ui text-sm text-red-700">
                    {cohorts.error instanceof ApiError ? cohorts.error.message : "Erro ao carregar recorrência."}
                  </p>
                ) : null}
                {cohorts.data ? (
                  <div className="grid items-center gap-5 sm:grid-cols-[10rem_1fr]">
                    <div
                      className="relative mx-auto size-40 shrink-0 rounded-full bg-[conic-gradient(hsl(var(--bloom-garnet))_0_34%,#9A5D46_34%_58%,#6F8182_58%_78%,hsl(var(--bloom-cream-deep))_78%_100%)] shadow-[inset_0_0_0_1px_rgba(61,26,46,0.1),0_18px_44px_rgba(61,26,46,0.1)]"
                      aria-hidden
                    >
                      <div className="absolute inset-[1.65rem] flex items-center justify-center rounded-full bg-[#fffaf5] font-ui text-[2rem] font-black tracking-tighter text-bloom-aubergine">
                        {cohorts.data.distinctUsersInRange}
                      </div>
                    </div>
                    <div className="grid gap-2.5 font-ui text-[13px] font-bold">
                      <div className="grid grid-cols-[0.75rem_1fr_auto] items-center gap-2.5 text-bloom-aubergine/60">
                        <span className="size-3 rounded-full bg-bloom-garnet" />
                        <span>Último dia (DAU)</span>
                        <strong className="text-bloom-aubergine">{lastDayDau?.users ?? "—"}</strong>
                      </div>
                      <div className="grid grid-cols-[0.75rem_1fr_auto] items-center gap-2.5 text-bloom-aubergine/60">
                        <span className="size-3 rounded-full bg-[#9A5D46]" />
                        <span>WAU (7 dias)</span>
                        <strong className="text-bloom-aubergine">{cohorts.data.wau7DistinctUsers}</strong>
                      </div>
                      <div className="grid grid-cols-[0.75rem_1fr_auto] items-center gap-2.5 text-bloom-aubergine/60">
                        <span className="size-3 rounded-full bg-[#6F8182]" />
                        <span>MAU (30 dias)</span>
                        <strong className="text-bloom-aubergine">{cohorts.data.mau30DistinctUsers}</strong>
                      </div>
                      <div className="grid grid-cols-[0.75rem_1fr_auto] items-center gap-2.5 text-bloom-aubergine/60">
                        <span className="size-3 rounded-full border border-bloom-aubergine/15 bg-bloom-cream-deep" />
                        <span>WAU · janela</span>
                        <strong className="max-w-[10rem] truncate text-right text-xs font-extrabold normal-case text-bloom-aubergine">
                          {formatPtBrNumericDate(cohorts.data.wau7WindowFrom)} — {formatPtBrNumericDate(cohorts.data.wau7WindowTo)}
                        </strong>
                      </div>
                    </div>
                  </div>
                ) : null}
              </Panel>
            </FadeIn>

            <FadeIn delay={0.07}>
              <Panel title="Série diária" description="Usuários distintos por dia (UTC) no período filtrado.">
                {cohorts.data ? (
                  cohorts.data.dailyActiveUsersByDay.length === 0 ?
                    <p className="font-ui text-sm text-bloom-aubergine/55">Sem pontos no período.</p>
                  : <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
                      {cohorts.data.dailyActiveUsersByDay.map((d) => {
                        const ratio = d.users / dailyMax;
                        const heat =
                          ratio >= 0.85 ? "border-bloom-garnet/45 bg-bloom-garnet/24"
                          : ratio >= 0.55 ? "border-[#9A5D46]/38 bg-[#9A5D46]/20"
                          : "border-bloom-aubergine/20 bg-bloom-aubergine/[0.10]";
                        return (
                          <div
                            key={d.day}
                            className={cn(
                              "flex min-h-[4rem] flex-col items-center justify-center rounded-2xl border p-2.5 text-center font-ui transition-colors",
                              heat,
                            )}
                          >
                            <small className="block text-[10px] font-extrabold text-bloom-aubergine/45">
                              {formatPtBrDayMonthFromYmd(d.day)}
                            </small>
                            <strong className="mt-2 block text-lg tracking-tight text-bloom-aubergine">{d.users}</strong>
                          </div>
                        );
                      })}
                    </div>

                ) : null}
                {cohorts.data ? (
                  <p className="mt-3 font-ui text-[11px] leading-snug text-bloom-aubergine/45">
                    Referência legada no payload: usuários distintos em todo o intervalo ≈ {cohorts.data.weeklyActiveUsersApprox}.
                  </p>
                ) : null}
              </Panel>
            </FadeIn>

          </aside>
        </div>

        <FadeIn delay={0.08}>
          <Panel
            title="Engajamento por área"
            description="O que as pessoas estão acessando por onda, habilidade, documentos e Mapa de Documentos (amostra dos principais itens)."
            headerRight={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-10 rounded-[0.875rem]"
                disabled={csvBusy || rangeInvalid || !filterKey.enabled}
                onClick={() => void onExportEngagementCsv()}
              >
                <DownloadSimple size={18} weight="duotone" aria-hidden className="mr-1.5 inline" />
                Exportar engajamento
              </Button>
            }
          >
            {engagement.isLoading ? <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p> : null}
            {engagement.isError ? (
              <p className="font-ui text-sm text-red-700">
                {engagement.error instanceof ApiError ? engagement.error.message : "Erro ao carregar engajamento."}
              </p>
            ) : null}
            {engagement.data ? (
              <>
                <p className="mb-4 font-ui text-[11px] text-bloom-aubergine/50">
                  Período: {formatPtBrNumericDate(engagement.data.from)} — {formatPtBrNumericDate(engagement.data.to)}
                </p>
                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <ListCard
                    title="Onda · conteúdo"
                    rows={waveRows.slice(0, 5).map((r) => ({ label: r.titulo, count: r.count, hint: r.contentId }))}
                    rowHint={(row) => `Identificador: ${row.hint}`}
                    emptyLabel="Sem dados no período."
                  />
                  <ListCard
                    title="Onda · módulo (página)"
                    rows={waveModuleRows.slice(0, 5).map((r) => ({ label: r.titulo, count: r.count, hint: r.contentId }))}
                    rowHint={(row) => `Identificador: ${row.hint}`}
                    emptyLabel="Sem dados no período."
                  />
                  <ListCard
                    title="Habilidades · itens"
                    rows={skillRows.slice(0, 5).map((r) => ({ label: r.titulo, count: r.count, hint: r.contentId }))}
                    rowHint={(row) => `Identificador: ${row.hint}`}
                    emptyLabel="Sem dados no período."
                  />
                  <ListCard
                    title="Documentos"
                    rows={docRows.slice(0, 5).map((r) => ({ label: r.titulo, count: r.count, hint: r.contentId }))}
                    rowHint={(row) => `Identificador: ${row.hint}`}
                    emptyLabel="Sem dados no período."
                  />
                  <ListCard
                    title="Mapa de documentos · categorias"
                    rows={mapRows.slice(0, 5).map((r) => ({ label: r.categoria, count: r.count, hint: r.categoryId }))}
                    rowHint={(row) => `Identificador: ${row.hint}`}
                    emptyLabel="Sem dados no período."
                  />
                  <ListCard
                    title="Habilidades · página (slug)"
                    rows={skillPageRows.slice(0, 5).map((r) => ({ label: r.titulo, count: r.count, hint: r.contentId }))}
                    rowHint={(row) => `Slug: ${row.hint}`}
                    emptyLabel="Sem dados no período."
                  />
                  <ListCard
                    title="Bloom do dia · citações"
                    rows={quoteRows.slice(0, 5).map((r) => ({ label: r.titulo, count: r.count, hint: r.contentId }))}
                    rowHint={(row) => `Identificador: ${row.hint}`}
                    emptyLabel="Sem dados no período."
                  />
                </div>
              </>
            ) : null}
          </Panel>
        </FadeIn>

        <FadeIn delay={0.075}>
          <div className="grid w-full gap-5 lg:grid-cols-2">
            <Panel
              title="Ondas · hierarquia"
              description="Expanda cada onda e módulo para ver o volume de acesso até o conteúdo individual."
              headerRight={
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-10 rounded-[0.875rem]"
                  disabled={csvBusy || rangeInvalid || !filterKey.enabled}
                  onClick={() => void onExportWaveHierarchyCsv()}
                >
                  <DownloadSimple size={18} weight="duotone" aria-hidden className="mr-1.5 inline" />
                  Exportar CSV
                </Button>
              }
            >
              {waveHierarchy.isLoading ? <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p> : null}
              {waveHierarchy.isError ? (
                <p className="font-ui text-sm text-red-700">
                  {waveHierarchy.error instanceof ApiError ? waveHierarchy.error.message : "Erro ao carregar ondas."}
                </p>
              ) : null}
              {waveHierarchy.data ? (
                <>
                  <p className="mb-4 font-ui text-[11px] text-bloom-aubergine/50">
                    Período: {formatPtBrNumericDate(waveHierarchy.data.from)} —{" "}
                    {formatPtBrNumericDate(waveHierarchy.data.to)}
                  </p>
                  <MetricsHierarchyDrilldown
                    roots={waveHierarchyNodes}
                    emptyLabel="Sem acessos em ondas no período."
                  />
                </>
              ) : null}
            </Panel>

            <Panel
              title="Habilidades · hierarquia"
              description="Expanda cada habilidade para ver acessos na página e nos itens de conteúdo."
              headerRight={
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-10 rounded-[0.875rem]"
                  disabled={csvBusy || rangeInvalid || !filterKey.enabled}
                  onClick={() => void onExportSkillHierarchyCsv()}
                >
                  <DownloadSimple size={18} weight="duotone" aria-hidden className="mr-1.5 inline" />
                  Exportar CSV
                </Button>
              }
            >
              {skillHierarchy.isLoading ? <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p> : null}
              {skillHierarchy.isError ? (
                <p className="font-ui text-sm text-red-700">
                  {skillHierarchy.error instanceof ApiError ? skillHierarchy.error.message : "Erro ao carregar habilidades."}
                </p>
              ) : null}
              {skillHierarchy.data ? (
                <>
                  <p className="mb-4 font-ui text-[11px] text-bloom-aubergine/50">
                    Período: {formatPtBrNumericDate(skillHierarchy.data.from)} —{" "}
                    {formatPtBrNumericDate(skillHierarchy.data.to)}
                  </p>
                  <MetricsHierarchyDrilldown
                    roots={skillHierarchyNodes}
                    emptyLabel="Sem acessos em habilidades no período."
                  />
                </>
              ) : null}
            </Panel>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="flex items-center gap-3 rounded-[1.25rem] border border-bloom-aubergine/12 bg-bloom-aubergine/[0.06] px-4 py-4 font-ui text-[13px] font-bold text-bloom-aubergine/65">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-bloom-garnet/10 text-bloom-garnet">
              <Lock size={18} weight="duotone" aria-hidden />
            </span>
            <span>
              Acesso restrito ao painel administrativo. Métricas sempre agregadas e anonimizadas.
            </span>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
