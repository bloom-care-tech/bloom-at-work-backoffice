import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash } from "@phosphor-icons/react";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { createSkillItem, deleteSkillItem, fetchSkillBySlug, updateSkill } from "@/lib/admin-api";

const ITEM_TYPES = ["audio", "youtube", "book", "movie", "text"] as const;
const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine focus:outline-none focus:border-bloom-garnet";

export function SkillEditorPage() {
  const { slug } = useParams<{ slug: string }>();
  const qc = useQueryClient();
  const decoded = slug ? decodeURIComponent(slug) : "";

  const { data, isLoading } = useQuery({
    queryKey: ["skill", decoded],
    queryFn: () => fetchSkillBySlug(decoded),
    enabled: Boolean(decoded),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [itemType, setItemType] = useState<string>("text");
  const [itemTitle, setItemTitle] = useState("");
  const [itemPayload, setItemPayload] = useState("{}");

  useEffect(() => {
    if (!data) return;
    setTitle(data.title);
    setDescription(data.description ?? "");
    setActive(data.active);
  }, [data]);

  const saveMeta = useMutation({
    mutationFn: () => updateSkill(decoded, { title: title.trim(), description: description.trim() || null, active }),
    onSuccess: () => {
      toast("Habilidade atualizada.");
      void qc.invalidateQueries({ queryKey: ["skill", decoded] });
      void qc.invalidateQueries({ queryKey: ["skills"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Erro ao salvar."),
  });

  const addItem = useMutation({
    mutationFn: async () => {
      const payload = JSON.parse(itemPayload) as Record<string, unknown>;
      await createSkillItem(decoded, { type: itemType, title: itemTitle.trim(), payload });
    },
    onSuccess: () => {
      toast("Item adicionado.");
      setItemTitle("");
      setItemPayload("{}");
      void qc.invalidateQueries({ queryKey: ["skill", decoded] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "JSON inválido ou erro ao criar."),
  });

  const delItem = useMutation({
    mutationFn: (id: string) => deleteSkillItem(id),
    onSuccess: () => {
      toast("Item removido.");
      void qc.invalidateQueries({ queryKey: ["skill", decoded] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Erro."),
  });

  if (!slug) return null;

  return (
    <div className="max-w-3xl space-y-8">
      <FadeIn>
        <Eyebrow tone="garnet">Catálogo</Eyebrow>
        <div className="flex flex-wrap gap-2 mt-2">
          <PillButton asLink="/habilidades" variant="ghost-aubergine">
            Voltar
          </PillButton>
        </div>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-2">{isLoading ? "…" : data?.title}</h1>
      </FadeIn>
      {data && (
        <>
          <FadeIn delay={0.05}>
            <form
              className="space-y-4 bg-white/90 border border-bloom-aubergine/10 rounded-2xl p-6"
              onSubmit={(e) => {
                e.preventDefault();
                saveMeta.mutate();
              }}
            >
              <div className="space-y-2">
                <Label>Título</Label>
                <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <textarea className={`${inputCls} min-h-[80px]`} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="skill-active" className="font-ui text-sm text-bloom-aubergine cursor-pointer">
                  Ativa no app
                </Label>
                <Switch id="skill-active" checked={active} onCheckedChange={setActive} />
              </div>
              <PillButton type="submit" disabled={saveMeta.isPending}>
                Salvar metadados
              </PillButton>
            </form>
          </FadeIn>
          <FadeIn delay={0.08}>
            <h2 className="font-serif-display text-xl text-bloom-aubergine mb-3">Itens</h2>
            <div className="space-y-3 bg-white/90 border border-bloom-aubergine/10 rounded-2xl p-6 mb-6">
              <p className="font-ui text-xs text-bloom-aubergine/60">YouTube: payload {"{"} &quot;youtubeUrl&quot;: &quot;https://…&quot; {"}"}. Áudio: {"{"} &quot;audioUrl&quot;: &quot;https://…&quot; {"}"}. Texto: {"{"} &quot;body&quot;: &quot;…&quot; {"}"}.</p>
              <div className="grid sm:grid-cols-2 gap-2">
                <select className={inputCls} value={itemType} onChange={(e) => setItemType(e.target.value)}>
                  {ITEM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input className={inputCls} placeholder="Título do item" value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} />
              </div>
              <textarea className={`${inputCls} font-mono text-xs min-h-[100px]`} value={itemPayload} onChange={(e) => setItemPayload(e.target.value)} />
              <PillButton type="button" disabled={addItem.isPending || !itemTitle.trim()} onClick={() => addItem.mutate()}>
                Adicionar item
              </PillButton>
            </div>
            <ul className="space-y-2">
              {data.items.map((it) => (
                <li key={it.id} className="flex items-center justify-between rounded-xl border border-bloom-aubergine/10 bg-white/80 px-4 py-3 font-ui text-sm">
                  <span>
                    <span className="text-bloom-aubergine/50">{it.type}</span> · {it.title}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-bloom-garnet"
                    onClick={() => {
                      if (window.confirm("Remover item?")) delItem.mutate(it.id);
                    }}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </FadeIn>
        </>
      )}
    </div>
  );
}
