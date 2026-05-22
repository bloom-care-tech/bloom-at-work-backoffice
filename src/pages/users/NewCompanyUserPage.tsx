import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { useAdminCompaniesForSelect } from "@/hooks/use-admin-companies-select";
import { createCompanyUser } from "@/lib/admin-api";
import {
  CompanyUserOrgFields,
  companyUserOrgPayload,
  emptyCompanyUserOrgForm,
} from "@/pages/users/company-user-org-fields";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine placeholder:text-bloom-aubergine/40 focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

export function NewCompanyUserPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: companies, isLoading: companiesLoading } = useAdminCompaniesForSelect();

  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [role, setRole] = useState("colaborador");
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [orgFields, setOrgFields] = useState(emptyCompanyUserOrgForm);
  const [emailError, setEmailError] = useState("");
  const [companyError, setCompanyError] = useState("");

  const createUser = useMutation({
    mutationFn: () =>
      createCompanyUser({
        email: email.trim(),
        companyId,
        role,
        name: name.trim() || null,
        displayName: displayName.trim() || null,
        ...companyUserOrgPayload(orgFields),
      }),
    onSuccess: (res) => {
      toast("Usuário criado.");
      void qc.invalidateQueries({ queryKey: ["users"] });
      void qc.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      navigate(`/usuarios/${res.id}`);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Erro ao criar."),
  });

  return (
    <div className="max-w-xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Usuários</Eyebrow>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">Novo usuário</h1>
        <p className="font-ui text-sm text-bloom-aubergine/65 mt-1">
          Colaborador ou líder vinculado a uma empresa. O e-mail deve usar um domínio permitido pela empresa.
        </p>
      </FadeIn>
      <FadeIn delay={0.05}>
        <form
          noValidate
          className="space-y-5 bg-white/90 border border-bloom-aubergine/10 rounded-2xl p-6 md:p-8"
          onSubmit={(e) => {
            e.preventDefault();
            let ok = true;
            if (!email.trim()) {
              setEmailError("Informe o e-mail.");
              ok = false;
            } else {
              setEmailError("");
            }
            if (!companyId) {
              setCompanyError("Selecione a empresa.");
              ok = false;
            } else {
              setCompanyError("");
            }
            if (!ok) return;
            createUser.mutate();
          }}
        >
          <div className="space-y-2">
            <Label className="font-ui text-bloom-aubergine/80">Empresa</Label>
            <select
              className={inputCls}
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                if (companyError) setCompanyError("");
              }}
              disabled={companiesLoading}
            >
              <option value="">Selecione…</option>
              {companies?.items.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <FieldError message={companyError} />
          </div>
          <div className="space-y-2">
            <Label className="font-ui text-bloom-aubergine/80">Papel</Label>
            <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="colaborador">Colaborador</option>
              <option value="lider">Líder</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="font-ui text-bloom-aubergine/80">E-mail</Label>
            <input
              className={inputCls}
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
            />
            <FieldError message={emailError} />
          </div>
          <div className="space-y-2">
            <Label className="font-ui text-bloom-aubergine/80">Nome (opcional)</Label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="font-ui text-bloom-aubergine/80">Como prefere ser chamado (opcional)</Label>
            <input className={inputCls} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <CompanyUserOrgFields value={orgFields} onChange={setOrgFields} inputCls={inputCls} />
          <div className="flex flex-wrap gap-3 pt-2">
            <PillButton type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? "Criando…" : "Criar usuário"}
            </PillButton>
            <PillButton type="button" variant="ghost-aubergine" onClick={() => navigate("/usuarios")}>
              Voltar
            </PillButton>
          </div>
        </form>
      </FadeIn>
    </div>
  );
}
