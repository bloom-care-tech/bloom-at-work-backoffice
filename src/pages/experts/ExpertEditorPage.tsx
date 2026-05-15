import { useEffect, useRef, useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import {
  createEditorialExpert,
  fetchEditorialExpert,
  updateEditorialExpert,
  uploadEditorialMediaAsset,
} from "@/lib/admin-api";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine placeholder:text-bloom-aubergine/40 focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

export function ExpertEditorPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = useMatch({ path: "/especialistas/novo", end: true }) != null;
  const { expertId } = useParams<{ expertId: string }>();
  const id = isNew ? undefined : expertId;

  const { data, isLoading } = useQuery({
    queryKey: ["editorial-expert", id],
    queryFn: () => fetchEditorialExpert(id!),
    enabled: Boolean(id),
  });

  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [active, setActive] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!data) return;
    setName(data.name);
    setSpecialty(data.specialty);
    setBio(data.bio ?? "");
    setPhotoUrl(data.photoUrl ?? "");
    setActive(data.active);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim() || !specialty.trim()) throw new Error("Preencha nome e especialidade.");
      const photo = photoUrl.trim() || null;
      if (id) {
        await updateEditorialExpert(id, {
          name: name.trim(),
          specialty: specialty.trim(),
          bio: bio.trim(),
          photoUrl: photo,
          active,
        });
      } else {
        await createEditorialExpert({
          name: name.trim(),
          specialty: specialty.trim(),
          bio: bio.trim(),
          photoUrl: photo,
          active,
        });
      }
    },
    onSuccess: () => {
      toast(id ? "Especialista atualizado." : "Especialista criado.");
      void qc.invalidateQueries({ queryKey: ["editorial-experts"] });
      void qc.invalidateQueries({ queryKey: ["editorial-expert"] });
      navigate("/especialistas");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro ao salvar."),
  });

  async function onPhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoUploading(true);
    try {
      const { url } = await uploadEditorialMediaAsset(file, { context: "expert", kind: "image" });
      setPhotoUrl(url);
      toast("Foto enviada. O endereço foi preenchido automaticamente.");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Falha ao enviar.");
    } finally {
      setPhotoUploading(false);
    }
  }

  if (!isNew && !expertId) return null;

  return (
    <div className="max-w-xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Especialistas</Eyebrow>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">
          {isNew ? "Novo especialista" : "Editar especialista"}
        </h1>
        <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">
          URL da foto ou envio de imagem (PNG, JPEG, WebP ou GIF).
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
              <Label className="font-ui text-bloom-aubergine/80">Nome</Label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label className="font-ui text-bloom-aubergine/80">Especialidade</Label>
              <input
                className={inputCls}
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Ex.: psiquiatra, psicóloga do trabalho"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-ui text-bloom-aubergine/80">Bio</Label>
              <Textarea
                className={`${inputCls} min-h-[100px] resize-y py-3`}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Short biography (optional)"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-ui text-bloom-aubergine/80">URL da foto</Label>
              <input
                className={inputCls}
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://… ou deixe vazio após envio"
                disabled={photoUploading}
              />
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <input
                  ref={photoInputRef}
                  type="file"
                  className="sr-only"
                  accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"
                  aria-hidden
                  tabIndex={-1}
                  onChange={onPhotoSelected}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  disabled={save.isPending || photoUploading}
                  onClick={() => photoInputRef.current?.click()}
                >
                  {photoUploading ? "A enviar…" : "Enviar imagem"}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="expert-active" className="font-ui text-sm text-bloom-aubergine cursor-pointer">
                Ativo
              </Label>
              <Switch id="expert-active" checked={active} onCheckedChange={setActive} />
            </div>
            <div className="flex gap-3 pt-2">
              <PillButton type="submit" disabled={save.isPending}>
                {save.isPending ? "Salvando…" : "Salvar"}
              </PillButton>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => navigate("/especialistas")}>
                Cancelar
              </Button>
            </div>
          </form>
        </FadeIn>
      )}
    </div>
  );
}
