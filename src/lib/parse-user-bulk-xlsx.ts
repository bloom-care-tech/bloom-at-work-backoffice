import ExcelJS from "exceljs";
import type { BulkCompanyUserImportPayload } from "./user-bulk-import.types";

const TEMPLATE_SHEET_NAMES = ["Usuarios", "Users"];
export const USER_BULK_IMPORT_MAX_ROWS = 2000;

const REQUIRED_CANONICAL = ["email", "role"] as const;
const ROLES = new Set<string>(["colaborador", "lider"]);

function normalizeHeaderKey(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function headerToCanonical(normalizedKey: string): string | null {
  const m: Record<string, string> = {
    email: "email",
    name: "name",
    nome: "name",
    displayname: "displayName",
    display_name: "displayName",
    nomedeexibicao: "displayName",
    role: "role",
    papel: "role",
    vp: "vp",
    seniordirectorate: "seniorDirectorate",
    senior_directorate: "seniorDirectorate",
    diretoriasenior: "seniorDirectorate",
    management: "management",
    gestao: "management",
    submanagement: "subManagement",
    sub_management: "subManagement",
    subgestao: "subManagement",
    employeenumber: "employeeNumber",
    employee_number: "employeeNumber",
    numerodocolaborador: "employeeNumber",
    matricula: "employeeNumber",
  };
  return m[normalizedKey] ?? null;
}

function normalizeRoleForImport(raw: string): string | null {
  let segment = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (segment.includes("|")) {
    const parts = segment.split("|").map((p) => p.trim()).filter(Boolean);
    segment = parts[0] ?? "";
  }
  const map: Record<string, string> = {
    colaborador: "colaborador",
    collaborator: "colaborador",
    lider: "lider",
    leader: "lider",
  };
  return map[segment] ?? null;
}

function cellToTrimmedString(row: ExcelJS.Row, colIndex: number): string {
  const cell = row.getCell(colIndex);
  const v = cell.value;
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v).trim();
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "object" && v !== null && "richText" in v) {
    const rt = (v as { richText?: { text: string }[] }).richText;
    if (Array.isArray(rt)) return rt.map((x) => x.text).join("").trim();
  }
  return (cell.text ?? "").trim();
}

function optionalField(row: ExcelJS.Row, col: number | undefined): string | null {
  if (col === undefined) return null;
  const v = cellToTrimmedString(row, col);
  return v || null;
}

export type ParseUserBulkXlsxSuccess = {
  ok: true;
  users: BulkCompanyUserImportPayload[];
  truncated: boolean;
};

export type ParseUserBulkXlsxFailure = { ok: false; message: string };

export type ParseUserBulkXlsxResult = ParseUserBulkXlsxSuccess | ParseUserBulkXlsxFailure;

export async function parseUserBulkXlsx(buffer: ArrayBuffer): Promise<ParseUserBulkXlsxResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  let sheet: ExcelJS.Worksheet | undefined;
  for (const name of TEMPLATE_SHEET_NAMES) {
    sheet = wb.getWorksheet(name);
    if (sheet) break;
  }
  sheet ??= wb.worksheets[0];
  if (!sheet) {
    return { ok: false, message: "A planilha não contém folhas." };
  }

  const headerRow = sheet.getRow(1);
  const colByCanonical = new Map<string, number>();
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const nk = normalizeHeaderKey(cell.value);
    if (!nk) return;
    const canonical = headerToCanonical(nk);
    if (canonical) colByCanonical.set(canonical, colNumber);
  });

  for (const key of REQUIRED_CANONICAL) {
    if (!colByCanonical.has(key)) {
      return {
        ok: false,
        message:
          "Cabeçalho inválido. Baixe o modelo e mantenha as colunas: email, name, display_name, role, vp, senior_directorate, management, sub_management, employee_number.",
      };
    }
  }

  const users: BulkCompanyUserImportPayload[] = [];
  let truncated = false;

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    if (!row.hasValues) continue;

    const email = cellToTrimmedString(row, colByCanonical.get("email")!);
    if (!email) continue;

    if (users.length >= USER_BULK_IMPORT_MAX_ROWS) {
      truncated = true;
      break;
    }

    const roleRaw = cellToTrimmedString(row, colByCanonical.get("role")!);
    const roleNorm = normalizeRoleForImport(roleRaw);
    if (!roleNorm || !ROLES.has(roleNorm)) {
      return {
        ok: false,
        message: `Linha ${r}: papel inválido. Use colaborador ou líder.`,
      };
    }

    users.push({
      email,
      role: roleNorm as BulkCompanyUserImportPayload["role"],
      name: optionalField(row, colByCanonical.get("name")),
      displayName: optionalField(row, colByCanonical.get("displayName")),
      vp: optionalField(row, colByCanonical.get("vp")),
      seniorDirectorate: optionalField(row, colByCanonical.get("seniorDirectorate")),
      management: optionalField(row, colByCanonical.get("management")),
      subManagement: optionalField(row, colByCanonical.get("subManagement")),
      employeeNumber: optionalField(row, colByCanonical.get("employeeNumber")),
    });
  }

  if (users.length === 0) {
    return { ok: false, message: "Nenhuma linha de dados encontrada após o cabeçalho." };
  }

  return { ok: true, users, truncated };
}
