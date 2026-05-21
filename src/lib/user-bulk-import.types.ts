export type BulkCompanyUserImportPayload = {
  email: string;
  role: "colaborador" | "lider";
  name?: string | null;
  displayName?: string | null;
  vp?: string | null;
  seniorDirectorate?: string | null;
  management?: string | null;
  subManagement?: string | null;
  employeeNumber?: string | null;
};
