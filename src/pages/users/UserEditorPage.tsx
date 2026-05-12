import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FadeIn, Eyebrow, PillButton } from "@/components/bloom/primitives";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { ApiError } from "@/lib/auth/api-client";
import { fetchUser, updateUser } from "@/lib/admin-api";

const inputCls =
  "w-full bg-bloom-cream-deep border border-bloom-aubergine/10 rounded-xl px-4 py-3 font-ui text-sm text-bloom-aubergine placeholder:text-bloom-aubergine/40 focus:outline-none focus:border-bloom-garnet transition-colors duration-260 ease-bloom";

export function UserEditorPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => fetchUser(userId!),
    enabled: Boolean(userId),
  });

  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<string>("colaborador");
  const [status, setStatus] = useState<string>("ativo");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!data) return;
    setName(data.name ?? "");
    setDisplayName(data.displayName ?? "");
    setRole(data.role ?? "colaborador");
    setStatus(data.status ?? "ativo");
    setIsAdmin(data.isAdmin);
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      updateUser(userId!, {
        name: name.trim() || null,
        displayName: displayName.trim() || null,
        role,
        status,
        isAdmin,
      }),
    onSuccess: () => {
      toast("Usuário atualizado.");
      void qc.invalidateQueries({ queryKey: ["users"] });
      void qc.invalidateQueries({ queryKey: ["dash"] });
      navigate("/usuarios");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Erro ao salvar."),
  });

  if (!userId) return null;

  return (
    <div className="max-w-xl space-y-6">
      <FadeIn>
        <Eyebrow tone="garnet">Usuários</Eyebrow>
        <h1 className="font-serif-display text-3xl text-bloom-aubergine mt-1">Editar usuário</h1>
        {data && (
          <p className="font-ui text-sm text-bloom-aubergine/60 mt-1">
            {data.email} · {data.companyName ?? "sem empresa"}
          </p>
        )}
      </FadeIn>
      {isLoading && <p className="font-ui text-sm text-bloom-aubergine/60">Carregando…</p>}
      {data && (
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
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="font-ui text-bloom-aubergine/80">Como prefere ser chamado</Label>
              <input className={inputCls} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="font-ui text-bloom-aubergine/80">Papel</Label>
              <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="lider">Líder</option>
                <option value="colaborador">Colaborador</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="font-ui text-bloom-aubergine/80">Situação</Label>
              <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="ativo">Ativo</option>
                <option value="pausado">Pausado</option>
                <option value="desligado">Desligado</option>
              </select>
            </div>
            <label className="flex items-center gap-3 font-ui text-sm text-bloom-aubergine cursor-pointer">
              <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="rounded border-bloom-aubergine/30" />
              Administrador da plataforma
            </label>
            <div className="flex flex-wrap gap-3 pt-2">
              <PillButton type="submit" disabled={save.isPending}>
                {save.isPending ? "Salvando…" : "Salvar"}
              </PillButton>
              <PillButton type="button" variant="ghost-aubergine" onClick={() => navigate("/usuarios")}>
                Voltar
              </PillButton>
            </div>
          </form>
        </FadeIn>
      )}
    </div>
  );
}
