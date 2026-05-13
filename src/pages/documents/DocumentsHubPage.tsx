import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import {
  createDocument,
  createDocumentCategory,
  deleteDocument,
  deleteDocumentCategory,
  fetchDocumentCategories,
  fetchDocumentsPage,
} from "@/lib/admin-api";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine focus:outline-none focus:border-bloom-garnet";

export function DocumentsHubPage() {
  const qc = useQueryClient();
  const { data: cats, isLoading: lc } = useQuery({ queryKey: ["doc-cats"], queryFn: fetchDocumentCategories });
  const [catPage] = useState(1);
  const { data: docs, isLoading: ld } = useQuery({
    queryKey: ["docs", catPage],
    queryFn: () => fetchDocumentsPage(catPage, 50),
  });

  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [docName, setDocName] = useState("");
  const [docCat, setDocCat] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");

  const addCat = useMutation({
    mutationFn: () => createDocumentCategory({ slug: newSlug.trim().toLowerCase(), name: newName.trim() }),
    onSuccess: () => {
      toast("Categoria criada.");
      setNewSlug("");
      setNewName("");
      void qc.invalidateQueries({ queryKey: ["doc-cats"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Erro."),
  });

  const addDoc = useMutation({
    mutationFn: () =>
      createDocument({
        categoryId: docCat,
        name: docName.trim(),
        pdfUrl: pdfUrl.trim() || null,
        publishedAt: new Date().toISOString(),
      }),
    onSuccess: () => {
      toast("Documento criado.");
      setDocName("");
      setPdfUrl("");
      void qc.invalidateQueries({ queryKey: ["docs"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Erro."),
  });

  return (
    <div className="max-w-4xl space-y-10">
      <FadeIn>
        <Eyebrow tone="garnet">Biblioteca</Eyebrow>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">Mapa de documentos</h1>
        <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">Categorias e PDFs (URL https) por audiência.</p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <h2 className="font-serif-display text-xl text-bloom-aubergine mb-3">Categorias</h2>
        {lc && <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p>}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input className={inputCls} placeholder="slug" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} />
          <input className={inputCls} placeholder="Nome" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <PillButton type="button" disabled={addCat.isPending || !newSlug || !newName} onClick={() => addCat.mutate()}>
            Nova categoria
          </PillButton>
        </div>
        <ul className="space-y-1 font-ui text-sm">
          {(cats ?? []).map((c) => (
            <li key={c.id} className="flex justify-between items-center rounded-lg border border-bloom-aubergine/10 px-3 py-2 bg-white/80">
              <span>
                {c.name} <span className="text-bloom-aubergine/45">({c.slug})</span>
              </span>
              <button
                type="button"
                className="text-bloom-garnet text-xs"
                onClick={() => {
                  if (window.confirm("Excluir categoria? Documentos serão removidos se forçar.")) {
                    void deleteDocumentCategory(c.id, true).then(() => {
                      toast("Categoria removida.");
                      void qc.invalidateQueries({ queryKey: ["doc-cats"] });
                      void qc.invalidateQueries({ queryKey: ["docs"] });
                    });
                  }
                }}
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
      </FadeIn>
      <FadeIn delay={0.08}>
        <h2 className="font-serif-display text-xl text-bloom-aubergine mb-3">Documentos</h2>
        <div className="bg-white/90 border border-bloom-aubergine/10 rounded-2xl p-6 space-y-3 mb-4">
          <div className="space-y-2">
            <Label>Categoria</Label>
            <select className={inputCls} value={docCat} onChange={(e) => setDocCat(e.target.value)}>
              <option value="">Selecione…</option>
              {(cats ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <input className={inputCls} placeholder="Nome do documento" value={docName} onChange={(e) => setDocName(e.target.value)} />
          <input className={inputCls} placeholder="URL https do PDF" value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} />
          <PillButton type="button" disabled={addDoc.isPending || !docCat || !docName.trim()} onClick={() => addDoc.mutate()}>
            Novo documento
          </PillButton>
        </div>
        {ld && <p className="font-ui text-sm text-bloom-aubergine/60">Carregando lista…</p>}
        <ul className="space-y-1 font-ui text-sm">
          {(docs?.items ?? []).map((d) => (
            <li key={d.id} className="flex justify-between items-center rounded-lg border border-bloom-aubergine/10 px-3 py-2 bg-white/80">
              <span>
                {d.name} · {d.categoryName} · {d.audience}
              </span>
              <button
                type="button"
                className="text-bloom-garnet text-xs"
                onClick={() => {
                  if (window.confirm("Excluir documento?")) {
                    void deleteDocument(d.id).then(() => {
                      toast("Removido.");
                      void qc.invalidateQueries({ queryKey: ["docs"] });
                    });
                  }
                }}
              >
                Excluir
              </button>
            </li>
          ))}
        </ul>
      </FadeIn>
    </div>
  );
}
