import { useEffect, useRef, useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import {
  createDocumentInCategory,
  fetchDocument,
  updateDocument,
  uploadEditorialMediaAsset,
} from "@/lib/admin-api";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine placeholder:text-bloom-aubergine/40 focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

type Audience = "all" | "leader" | "collaborator";
type DocTag = "none" | "new" | "important";

export function CategoryDocumentEditorPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { categoryId, documentId } = useParams<{ categoryId: string; documentId: string }>();
  const isNew = useMatch({ path: "/mapa-documentos/:categoryId/documentos/novo", end: true }) != null;
  const id = isNew ? undefined : documentId;

  const { data, isLoading } = useQuery({
    queryKey: ["document", id],
    queryFn: () => fetchDocument(id!),
    enabled: Boolean(id),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState<Audience>("all");
  const [tag, setTag] = useState<DocTag>("none");
  const [pdfUrl, setPdfUrl] = useState("");
  const [published, setPublished] = useState(true);
  const [mediaUploading, setMediaUploading] = useState(false);
  const pdfFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!data) return;
    setName(data.name);
    setDescription(data.description ?? "");
    setAudience((data.audience as Audience) ?? "all");
    setTag((data.tag as DocTag) ?? "none");
    setPdfUrl(data.pdfUrl ?? "");
    setPublished(Boolean(data.publishedAt));
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!categoryId) throw new Error("Categoria inválida.");
      if (!name.trim()) throw new Error("Informe o nome do documento.");
      const publishedAt = published ? new Date().toISOString() : null;
      if (id) {
        await updateDocument(id, {
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          audience,
          tag,
          pdfUrl: pdfUrl.trim() || null,
          publishedAt,
        });
      } else {
        await createDocumentInCategory(categoryId, {
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          audience,
          tag,
          pdfUrl: pdfUrl.trim() || null,
          publishedAt,
        });
      }
    },
    onSuccess: () => {
      toast(id ? "Documento atualizado." : "Documento criado.");
      void qc.invalidateQueries({ queryKey: ["category-documents", categoryId] });
      void qc.invalidateQueries({ queryKey: ["doc-cats"] });
      void qc.invalidateQueries({ queryKey: ["document"] });
      navigate(`/mapa-documentos/${categoryId}/documentos`);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro ao salvar."),
  });

  async function onPdfFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMediaUploading(true);
    try {
      const { url } = await uploadEditorialMediaAsset(file, {
        context: "document_map",
        kind: "pdf",
      });
      setPdfUrl(url);
      toast("Ficheiro enviado. O endereço foi preenchido automaticamente.");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Falha ao enviar o ficheiro.");
    } finally {
      setMediaUploading(false);
    }
  }

  if (!categoryId) return null;
  if (!isNew && !documentId) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Biblioteca</Eyebrow>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">{isNew ? "Novo documento" : "Editar documento"}</h1>
        <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">
          Indique uma URL https ou envie um PDF — o mesmo armazenamento público usado nos conteúdos de onda.
        </p>
      </FadeIn>
      {!isNew && isLoading && <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p>}
      {(isNew || data) && (
        <FadeIn delay={0.05}>
          <form
            className="space-y-5 bg-white/90 border border-bloom-aubergine/10 rounded-2xl p-6 md:p-8"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="doc-name" className="font-ui text-bloom-aubergine/80">
                Nome
              </Label>
              <input id="doc-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-desc" className="font-ui text-bloom-aubergine/80">
                Descrição (opcional)
              </Label>
              <textarea
                id="doc-desc"
                className={`${inputCls} min-h-[80px]`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-audience" className="font-ui text-bloom-aubergine/80">
                Audiência
              </Label>
              <select id="doc-audience" className={inputCls} value={audience} onChange={(e) => setAudience(e.target.value as Audience)}>
                <option value="all">Todos</option>
                <option value="leader">Líder</option>
                <option value="collaborator">Colaborador</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-tag" className="font-ui text-bloom-aubergine/80">
                Etiqueta
              </Label>
              <select id="doc-tag" className={inputCls} value={tag} onChange={(e) => setTag(e.target.value as DocTag)}>
                <option value="none">Nenhuma</option>
                <option value="new">Novo</option>
                <option value="important">Importante</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-pdf" className="font-ui text-bloom-aubergine/80">
                URL do PDF (opcional)
              </Label>
              <input
                id="doc-pdf"
                className={inputCls}
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                placeholder="https://… (URL externa) ou use o envio abaixo"
                disabled={mediaUploading}
              />
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <input
                  ref={pdfFileInputRef}
                  type="file"
                  className="sr-only"
                  accept="application/pdf,.pdf"
                  aria-hidden
                  tabIndex={-1}
                  onChange={onPdfFileSelected}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  disabled={save.isPending || mediaUploading}
                  onClick={() => pdfFileInputRef.current?.click()}
                >
                  {mediaUploading ? "A enviar…" : "Enviar ficheiro"}
                </Button>
                <p className="font-ui text-xs text-bloom-aubergine/55">
                  Após o envio, o campo acima é preenchido com o endereço público (<code className="text-[11px]">pdfUrl</code>).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="doc-published" className="font-ui text-sm text-bloom-aubergine cursor-pointer">
                Publicado (visível no app)
              </Label>
              <Switch id="doc-published" checked={published} onCheckedChange={setPublished} />
            </div>
            <div className="flex gap-3 pt-2">
              <PillButton type="submit" disabled={save.isPending || mediaUploading}>
                {save.isPending ? "Salvando…" : "Salvar"}
              </PillButton>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => navigate(`/mapa-documentos/${categoryId}/documentos`)}>
                Cancelar
              </Button>
            </div>
          </form>
        </FadeIn>
      )}
    </div>
  );
}
