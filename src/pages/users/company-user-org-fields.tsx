import { Label } from "@/components/ui/label";

export type CompanyUserOrgForm = {
  vp: string;
  seniorDirectorate: string;
  management: string;
  subManagement: string;
  employeeNumber: string;
};

export function emptyCompanyUserOrgForm(): CompanyUserOrgForm {
  return {
    vp: "",
    seniorDirectorate: "",
    management: "",
    subManagement: "",
    employeeNumber: "",
  };
}

export function companyUserOrgFormFromUser(user: {
  vp?: string | null;
  seniorDirectorate?: string | null;
  management?: string | null;
  subManagement?: string | null;
  employeeNumber?: string | null;
}): CompanyUserOrgForm {
  return {
    vp: user.vp ?? "",
    seniorDirectorate: user.seniorDirectorate ?? "",
    management: user.management ?? "",
    subManagement: user.subManagement ?? "",
    employeeNumber: user.employeeNumber ?? "",
  };
}

export function companyUserOrgPayload(form: CompanyUserOrgForm) {
  return {
    vp: form.vp.trim() || null,
    seniorDirectorate: form.seniorDirectorate.trim() || null,
    management: form.management.trim() || null,
    subManagement: form.subManagement.trim() || null,
    employeeNumber: form.employeeNumber.trim() || null,
  };
}

type Props = {
  value: CompanyUserOrgForm;
  onChange: (next: CompanyUserOrgForm) => void;
  inputCls: string;
};

export function CompanyUserOrgFields({ value, onChange, inputCls }: Props) {
  const set =
    (key: keyof CompanyUserOrgForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...value, [key]: e.target.value });
    };

  return (
    <div className="space-y-4 border-t border-bloom-aubergine/10 pt-5">
      <div>
        <h2 className="font-ui text-sm font-extrabold text-bloom-aubergine">Estrutura organizacional</h2>
        <p className="mt-1 font-ui text-xs text-bloom-aubergine/55">Campos opcionais usados em métricas e importação.</p>
      </div>
      <div className="space-y-2">
        <Label className="font-ui text-bloom-aubergine/80">VP (opcional)</Label>
        <input className={inputCls} value={value.vp} onChange={set("vp")} />
      </div>
      <div className="space-y-2">
        <Label className="font-ui text-bloom-aubergine/80">Diretoria alta (opcional)</Label>
        <input className={inputCls} value={value.seniorDirectorate} onChange={set("seniorDirectorate")} />
      </div>
      <div className="space-y-2">
        <Label className="font-ui text-bloom-aubergine/80">Gerência (opcional)</Label>
        <input className={inputCls} value={value.management} onChange={set("management")} />
      </div>
      <div className="space-y-2">
        <Label className="font-ui text-bloom-aubergine/80">Subgerência (opcional)</Label>
        <input className={inputCls} value={value.subManagement} onChange={set("subManagement")} />
      </div>
      <div className="space-y-2">
        <Label className="font-ui text-bloom-aubergine/80">Matrícula (opcional)</Label>
        <input className={inputCls} value={value.employeeNumber} onChange={set("employeeNumber")} />
      </div>
    </div>
  );
}
