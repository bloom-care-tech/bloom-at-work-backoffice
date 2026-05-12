import { useEffect, useState } from "react";
import { useMatch, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { createCompany, fetchCompany, updateCompany } from "@/lib/admin-api";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine placeholder:text-bloom-aubergine/40 focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

export function CompanyEditorPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = useMatch({ path: "/empresas/nova", end: true }) != null;
  const { companyId } = useParams<{ companyId: string }>();
  const id = isNew ? undefined : companyId;

  const { data, isLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: () => fetchCompany(id!),
    enabled: Boolean(id),
  });

  const [name, setName] = useState("");
  const [domains, setDomains] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!data) return;
    setName(data.name);
    setDomains(data.allowedEmailDomains.join("\n"));
    setLogoUrl(data.logoUrl ?? "");
    setActive(data.active);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const allowedEmailDomains = domains
        .split(/[\n,]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (!name.trim()) throw new Error("Informe o nome.");
      if (allowedEmailDomains.length === 0) throw new Error("Informe ao menos um domínio de e-mail.");
      if (id) {
        await updateCompany(id, {
          name: name.trim(),
          allowedEmailDomains,
          logoUrl: logoUrl.trim() || null,
          active,
        });
      } else {
        await createCompany({
          name: name.trim(),
          allowedEmailDomains,
          logoUrl: logoUrl.trim() || null,
          active,
        });
      }
    },
    onSuccess: () => {
      toast(id ? "Empresa atualizada." : "Empresa criada.");
      void qc.invalidateQueries({ queryKey: ["companies"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
      void qc.invalidateQueries({ queryKey: ["company"] });
      navigate("/empresas");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro ao salvar."),
  });

  if (!isNew && !companyId) {
    return null;
  }

  return (
    <div className="max-w-xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Empresas</Eyebrow>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">
          {isNew ? "Nova empresa" : "Editar empresa"}
        </h1>
        <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">
          Domínios: um por linha (ex.: <span className="italic text-bloom-garnet">grupoboticario.com.br</span>).
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
              <Label className="font-ui text-bloom-aubergine/80">Nome da empresa</Label>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label className="font-ui text-bloom-aubergine/80">Domínios de e-mail permitidos</Label>
              <Textarea
                className="min-h-[120px] font-ui text-sm bg-bloom-cream-deep border-bloom-aubergine/10 rounded-xl"
                value={domains}
                onChange={(e) => setDomains(e.target.value)}
                placeholder={"grupoboticario.com.br\noutrodominio.com.br"}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-ui text-bloom-aubergine/80">URL do logotipo (opcional)</Label>
              <Input className={inputCls} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
            </div>
            <label className="flex items-center gap-3 font-ui text-sm text-bloom-aubergine cursor-pointer">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded border-bloom-aubergine/30" />
              Empresa ativa
            </label>
            <div className="flex flex-wrap gap-3 pt-2">
              <PillButton type="submit" disabled={save.isPending}>
                {save.isPending ? "Salvando…" : "Salvar"}
              </PillButton>
              <PillButton type="button" variant="ghost-aubergine" onClick={() => navigate("/empresas")}>
                Cancelar
              </PillButton>
            </div>
          </form>
        </FadeIn>
      )}
    </div>
  );
}
