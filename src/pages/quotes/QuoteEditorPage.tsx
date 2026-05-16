import { useEffect, useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { useAdminCompaniesForSelect } from "@/hooks/use-admin-companies-select";
import { createQuote, fetchQuote, updateQuote } from "@/lib/admin-api";
import { isoYmdToPtBrInput, ptBrInputToIsoYmd } from "@/lib/format-date";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine placeholder:text-bloom-aubergine/40 focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

export function QuoteEditorPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = useMatch({ path: "/frases/nova", end: true }) != null;
  const { quoteId } = useParams<{ quoteId: string }>();
  const id = isNew ? undefined : quoteId;

  const { data: companies } = useAdminCompaniesForSelect();

  const { data, isLoading } = useQuery({
    queryKey: ["quote", id],
    queryFn: () => fetchQuote(id!),
    enabled: Boolean(id),
  });

  const [text, setText] = useState("");
  const [author, setAuthor] = useState("");
  const [pubDateDisplay, setPubDateDisplay] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [audience, setAudience] = useState("all");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (isNew) {
      const y = new Date().toISOString().slice(0, 10);
      setPubDateDisplay(isoYmdToPtBrInput(y));
    }
  }, [isNew]);

  useEffect(() => {
    if (!data) return;
    setText(data.text);
    setAuthor(data.author);
    setPubDateDisplay(isoYmdToPtBrInput(data.publicationDate));
    setCompanyId(data.companyId ?? "");
    setAudience(data.audience);
    setActive(data.active);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const pubIso = ptBrInputToIsoYmd(pubDateDisplay.trim());
      if (!text.trim() || !author.trim() || !pubIso) {
        throw new Error("Preencha texto, autor e data (dd/mm/aaaa).");
      }
      if (text.length > 280) throw new Error("O texto pode ter no máximo 280 caracteres.");
      if (id) {
        await updateQuote(id, {
          text: text.trim(),
          author: author.trim(),
          publicationDate: pubIso,
          audience,
          active,
          companyId: companyId ? companyId : null,
        });
      } else {
        await createQuote({
          text: text.trim(),
          author: author.trim(),
          publicationDate: pubIso,
          audience,
          active,
          ...(companyId ? { companyId } : {}),
        });
      }
    },
    onSuccess: () => {
      toast(id ? "Frase atualizada." : "Frase criada.");
      void qc.invalidateQueries({ queryKey: ["quotes"] });
      void qc.invalidateQueries({ queryKey: ["quote"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
      navigate("/frases");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro ao salvar."),
  });

  if (!isNew && !quoteId) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Bloom do dia</Eyebrow>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">{isNew ? "Nova frase" : "Editar frase"}</h1>
        <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">Máximo de 280 caracteres no texto.</p>
      </FadeIn>
      {!isNew && isLoading && <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p>}
      {(isNew || data) && (
        <FadeIn delay={0.05}>
          <form
            noValidate
            className="space-y-5 bg-white/90 border border-bloom-aubergine/10 rounded-2xl p-6 md:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label className="font-ui text-bloom-aubergine/80">Texto ({text.length}/280)</Label>
              <Textarea
                className="min-h-[140px] font-ui text-sm bg-bloom-cream-deep border-bloom-aubergine/10 rounded-xl"
                value={text}
                maxLength={280}
                onChange={(e) => setText(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-ui text-bloom-aubergine/80">Autor ou fonte</Label>
              <input className={inputCls} value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="font-ui text-bloom-aubergine/80">Data de publicação</Label>
              <input
                className={inputCls}
                inputMode="numeric"
                autoComplete="off"
                placeholder="dd/mm/aaaa"
                value={pubDateDisplay}
                onChange={(e) => {
                  setPubDateDisplay(e.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-ui text-bloom-aubergine/80">Empresa (opcional — vazio = todas)</Label>
              <select className={inputCls} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                <option value="">Todas as empresas (global)</option>
                {companies?.items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="font-ui text-bloom-aubergine/80">Audiência</Label>
              <select className={inputCls} value={audience} onChange={(e) => setAudience(e.target.value)}>
                <option value="all">Todos</option>
                <option value="leader">Líderes</option>
                <option value="collaborator">Colaboradores</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="quote-active" className="font-ui text-sm text-bloom-aubergine cursor-pointer">
                Frase ativa
              </Label>
              <Switch id="quote-active" checked={active} onCheckedChange={setActive} />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <PillButton type="submit" disabled={save.isPending}>
                {save.isPending ? "Salvando…" : "Salvar"}
              </PillButton>
              <PillButton type="button" variant="ghost-aubergine" onClick={() => navigate("/frases")}>
                Cancelar
              </PillButton>
            </div>
          </form>
        </FadeIn>
      )}
    </div>
  );
}
