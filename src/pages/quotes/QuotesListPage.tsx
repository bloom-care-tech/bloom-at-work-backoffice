import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, PencilSimple, Trash, DownloadSimple } from "@phosphor-icons/react";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { deleteQuote, downloadQuoteTemplateXlsx, fetchQuotesPage } from "@/lib/admin-api";
import { triggerBlobDownload } from "@/lib/download-blob";

export function QuotesListPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["quotes", page],
    queryFn: () => fetchQuotesPage(page, 15),
  });

  const del = useMutation({
    mutationFn: deleteQuote,
    onSuccess: (r) => {
      toast(r.message);
      void qc.invalidateQueries({ queryKey: ["quotes"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Erro ao desativar."),
  });

  const download = async () => {
    try {
      const blob = await downloadQuoteTemplateXlsx();
      triggerBlobDownload(blob, null, "quote-bulk-template.xlsx");
      toast("Download iniciado.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro no download.");
    }
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <FadeIn>
          <Eyebrow tone="garnet">Conteúdo</Eyebrow>
          <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">Bloom do dia</h1>
          <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">Frases exibidas no hub, por data e audiência.</p>
        </FadeIn>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-bloom-aubergine/20 font-ui"
            onClick={() => void download()}
          >
            <DownloadSimple size={18} className="mr-2" />
            Modelo em planilha
          </Button>
          <PillButton asLink="/frases/nova">
            <Plus size={18} weight="bold" />
            Nova frase
          </PillButton>
        </div>
      </div>
      <FadeIn delay={0.05}>
        <div className="rounded-2xl border border-bloom-aubergine/10 bg-white/90 overflow-x-auto">
          <table className="w-full font-ui text-sm min-w-[720px]">
            <thead>
              <tr className="bg-bloom-cream-deep/80 text-bloom-aubergine/70 text-left text-[11px] uppercase tracking-wide">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Texto</th>
                <th className="px-4 py-3">Autor</th>
                <th className="px-4 py-3">Audiência</th>
                <th className="px-4 py-3">Ativa</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-bloom-aubergine/50">
                    Carregando…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-bloom-garnet">
                    Não foi possível carregar.
                  </td>
                </tr>
              )}
              {data?.items.map((q) => (
                <tr key={q.id} className="border-t border-bloom-aubergine/8 hover:bg-bloom-cream/40">
                  <td className="px-4 py-3 whitespace-nowrap text-bloom-aubergine">
                    {new Date(q.publicationDate + "T12:00:00").toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-bloom-aubergine max-w-xs truncate">{q.text}</td>
                  <td className="px-4 py-3 text-bloom-aubergine/80">{q.author}</td>
                  <td className="px-4 py-3 capitalize">
                    {q.audience === "all" ? "Todos" : q.audience === "leader" ? "Líderes" : "Colaboradores"}
                  </td>
                  <td className="px-4 py-3">{q.active ? "Sim" : "Não"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/frases/${q.id}`}>
                          <PencilSimple size={16} />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-bloom-garnet"
                        disabled={del.isPending}
                        onClick={() => {
                          if (window.confirm("Desativar esta frase?")) del.mutate(q.id);
                        }}
                      >
                        <Trash size={16} />
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
