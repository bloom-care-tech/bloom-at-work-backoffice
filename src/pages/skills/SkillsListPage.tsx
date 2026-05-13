import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "@phosphor-icons/react";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { createSkill, fetchSkills } from "@/lib/admin-api";

export function SkillsListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ["skills"], queryFn: fetchSkills });
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");

  const create = useMutation({
    mutationFn: () => createSkill({ slug: slug.trim().toLowerCase(), title: title.trim() }),
    onSuccess: (res) => {
      toast("Habilidade criada.");
      setSlug("");
      setTitle("");
      void qc.invalidateQueries({ queryKey: ["skills"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
      navigate(`/habilidades/${encodeURIComponent(res.slug)}`);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Erro ao criar."),
  });

  return (
    <div className="max-w-4xl space-y-8">
      <FadeIn>
        <Eyebrow tone="garnet">Catálogo</Eyebrow>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">Habilidades socioemocionais</h1>
        <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">Cada habilidade agrupa itens (áudio, YouTube, livro, filme, texto).</p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <div className="bg-white/90 border border-bloom-aubergine/10 rounded-2xl p-6 space-y-3">
          <p className="font-ui text-sm text-bloom-aubergine/80 font-medium">Nova habilidade</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="flex-1 rounded-xl border border-bloom-aubergine/15 px-3 py-2 font-ui text-sm"
              placeholder="slug (ex.: escuta-ativa)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <input
              className="flex-1 rounded-xl border border-bloom-aubergine/15 px-3 py-2 font-ui text-sm"
              placeholder="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <PillButton type="button" disabled={create.isPending || !slug.trim() || !title.trim()} onClick={() => create.mutate()}>
              <Plus className="inline mr-1" size={16} weight="bold" />
              Criar
            </PillButton>
          </div>
        </div>
      </FadeIn>
      {isLoading && <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p>}
      {isError && <p className="font-ui text-sm text-bloom-garnet">Erro ao carregar.</p>}
      {data && data.length > 0 && (
        <FadeIn delay={0.08}>
          <ul className="space-y-2">
            {data.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/habilidades/${encodeURIComponent(s.slug)}`}
                  className="block rounded-xl border border-bloom-aubergine/10 bg-white/90 px-4 py-3 font-ui text-sm text-bloom-aubergine hover:border-bloom-garnet/40 transition-colors"
                >
                  <span className="font-medium">{s.title}</span>
                  <span className="text-bloom-aubergine/50 ml-2">({s.slug})</span>
                  <span className="float-right text-bloom-aubergine/45">{s.itemCount} itens</span>
                </Link>
              </li>
            ))}
          </ul>
        </FadeIn>
      )}
    </div>
  );
}
