import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { useAdminCompaniesForSelect } from "@/hooks/use-admin-companies-select";
import { createSignupAccess } from "@/lib/admin-api";
import { ptBrLocalDatetimeToIso } from "@/lib/format-date";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

export function NewAccessLinkPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: companies, isError, isLoading } = useAdminCompaniesForSelect();

  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState("");
  const [expiresDate, setExpiresDate] = useState("");
  const [expiresTime, setExpiresTime] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [roleError, setRoleError] = useState("");

  const create = useMutation({
    mutationFn: () => {
      let expiresIso: string | undefined;
      if (expiresDate.trim()) {
        const time = expiresTime.trim() || "23:59";
        const parsed = ptBrLocalDatetimeToIso(expiresDate.trim(), time);
        if (!parsed) throw new Error("Data ou hora de expiração inválida (dd/mm/aaaa e hh:mm).");
        expiresIso = parsed;
      } else if (expiresTime.trim()) {
        throw new Error("Informe a data de expiração ou limpe a hora.");
      }
      return createSignupAccess({
        companyId,
        role,
        ...(expiresIso ? { expiresAt: expiresIso } : {}),
      });
    },
    onSuccess: (res) => {
      toast("Link de acesso criado. Copie o valor abaixo.");
      void navigator.clipboard.writeText(res.accessUrl).catch(() => {});
      void qc.invalidateQueries({ queryKey: ["signup-access"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
      window.alert(`Link de acesso (copiado para a área de transferência se permitido):\n\n${res.accessUrl}`);
      navigate("/links-acesso");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro ao criar link de acesso."),
  });

  return (
    <div className="max-w-lg space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Links de acesso</Eyebrow>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">Novo link</h1>
        <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">O link leva à tela de cadastro do Bloom@Work.</p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <form
          noValidate
          className="space-y-5 bg-white/90 border border-bloom-aubergine/10 rounded-2xl p-6 md:p-8"
          onSubmit={(e) => {
            e.preventDefault();
            let ok = true;
            if (!companyId) {
              setCompanyError("Selecione a empresa.");
              ok = false;
            } else setCompanyError("");
            if (!role) {
              setRoleError("Selecione o papel.");
              ok = false;
            } else setRoleError("");
            if (!ok) return;
            create.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="access-link-company" className="font-ui text-bloom-aubergine/80">
              Empresa
            </Label>
            <select
              id="access-link-company"
              className={inputCls}
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                if (companyError) setCompanyError("");
              }}
              disabled={isLoading || isError}
            >
              <option value="">
                {isLoading ? "Carregando empresas…" : isError ? "Não foi possível carregar empresas" : "Selecione…"}
              </option>
              {companies?.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {isError && (
              <p className="font-ui text-xs text-bloom-garnet">Verifique a conexão e tente recarregar a página.</p>
            )}
            <FieldError message={companyError} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="access-link-role" className="font-ui text-bloom-aubergine/80">
              Papel do novo usuário
            </Label>
            <select
              id="access-link-role"
              className={inputCls}
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                if (roleError) setRoleError("");
              }}
            >
              <option value="">Selecione…</option>
              <option value="colaborador">Colaborador</option>
              <option value="lider">Líder</option>
            </select>
            <FieldError message={roleError} />
          </div>
          <div className="space-y-2">
            <Label className="font-ui text-bloom-aubergine/80">Expira em (opcional)</Label>
            <p className="font-ui text-xs text-bloom-aubergine/55">
              Data e hora no fuso deste computador. Se preencher só a data, usa 23:59.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <input
                id="access-link-expires-date"
                className={inputCls}
                inputMode="numeric"
                autoComplete="off"
                placeholder="dd/mm/aaaa"
                value={expiresDate}
                onChange={(e) => setExpiresDate(e.target.value)}
                aria-label="Data de expiração (opcional)"
              />
              <input
                id="access-link-expires-time"
                className={inputCls}
                inputMode="numeric"
                autoComplete="off"
                placeholder="hh:mm (24h)"
                value={expiresTime}
                onChange={(e) => setExpiresTime(e.target.value)}
                aria-label="Hora de expiração (opcional)"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <PillButton type="submit" disabled={create.isPending}>
              {create.isPending ? "Gerando…" : "Gerar link"}
            </PillButton>
            <PillButton type="button" variant="ghost-aubergine" onClick={() => navigate("/links-acesso")}>
              Cancelar
            </PillButton>
          </div>
        </form>
      </FadeIn>
    </div>
  );
}
