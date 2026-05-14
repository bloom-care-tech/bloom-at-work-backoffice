import ExcelJS from "exceljs";
import type { BulkQuoteImportPayload } from "./quote-bulk-import.types";

const TEMPLATE_SHEET_NAMES = ["Frases", "Quotes"];
/** Max rows read from spreadsheet per import (rest ignored with a warning). */
export const QUOTE_BULK_IMPORT_MAX_ROWS = 2000;

const REQUIRED_CANONICAL = ["text", "author", "publicationDate", "audience"] as const;

const AUDIENCES = new Set<string>(["all", "leader", "collaborator"]);

function normalizeHeaderKey(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Maps normalized header label to canonical column id used when reading rows. */
function headerToCanonical(normalizedKey: string): string | null {
  const m: Record<string, string> = {
    text: "text",
    texto: "text",
    author: "author",
    autor: "author",
    autoria: "author",
    publicationdate: "publicationDate",
    datapublicacao: "publicationDate",
    audience: "audience",
    audiencia: "audience",
    companyid: "companyId",
    idempresa: "companyId",
  };
  return m[normalizedKey] ?? null;
}

/** Accepts EN codes, PT labels, and instructional cells like "colaborador | lider" (first segment wins). */
function normalizeAudienceForImport(raw: string): string | null {
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
    todos: "all",
    all: "all",
    lider: "leader",
    leader: "leader",
    colaborador: "collaborator",
    collaborator: "collaborator",
  };
  return map[segment] ?? null;
}

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function cellToTrimmedString(row: ExcelJS.Row, colIndex: number): string {
  const cell = row.getCell(colIndex);
  const v = cell.value;
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v).trim();
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v instanceof Date && !Number.isNaN(v.getTime())) return formatLocalYmd(v);
  if (typeof v === "object" && v !== null && "richText" in v) {
    const rt = (v as { richText?: { text: string }[] }).richText;
    if (Array.isArray(rt)) return rt.map((x) => x.text).join("").trim();
  }
  return (cell.text ?? "").trim();
}

function cellToPublicationDate(row: ExcelJS.Row, colIndex: number): string | null {
  const cell = row.getCell(colIndex);
  const v = cell.value;
  if (v == null || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return formatLocalYmd(v);
  if (typeof v === "number" && Number.isFinite(v)) {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    if (!Number.isNaN(d.getTime())) return formatLocalYmd(d);
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    return `${m[3]}-${month}-${day}`;
  }
  const t = (cell.text ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return null;
}

export type ParseQuoteBulkXlsxSuccess = {
  ok: true;
  quotes: BulkQuoteImportPayload[];
  truncated: boolean;
};

export type ParseQuoteBulkXlsxFailure = { ok: false; message: string };

export type ParseQuoteBulkXlsxResult = ParseQuoteBulkXlsxSuccess | ParseQuoteBulkXlsxFailure;

export async function parseQuoteBulkXlsx(buffer: ArrayBuffer): Promise<ParseQuoteBulkXlsxResult> {
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
          "Cabeçalho inválido. Baixe o modelo e mantenha as colunas: texto, autor, dataPublicacao, audiencia e opcionalmente idEmpresa (nomes em inglês do modelo antigo também são aceitos).",
      };
    }
  }

  const companyCol = colByCanonical.get("companyId");

  const quotes: BulkQuoteImportPayload[] = [];
  let truncated = false;

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    if (!row.hasValues) continue;

    const text = cellToTrimmedString(row, colByCanonical.get("text")!);
    if (!text) continue;

    if (quotes.length >= QUOTE_BULK_IMPORT_MAX_ROWS) {
      truncated = true;
      break;
    }

    const author = cellToTrimmedString(row, colByCanonical.get("author")!);
    const publicationDate = cellToPublicationDate(row, colByCanonical.get("publicationDate")!);
    const audienceRaw = cellToTrimmedString(row, colByCanonical.get("audience")!);
    const audienceNorm = normalizeAudienceForImport(audienceRaw);

    let companyId: string | undefined;
    if (companyCol !== undefined) {
      const cid = cellToTrimmedString(row, companyCol);
      if (cid) companyId = cid;
    }

    if (!author) {
      return { ok: false, message: `Linha ${r}: autor em falta.` };
    }
    if (!publicationDate) {
      return { ok: false, message: `Linha ${r}: data de publicação inválida ou em falta.` };
    }
    if (!audienceNorm || !AUDIENCES.has(audienceNorm)) {
      return {
        ok: false,
        message: `Linha ${r}: audiência inválida. Use todos, colaborador ou líder (ou all, leader, collaborator).`,
      };
    }

    quotes.push({
      text,
      author,
      publicationDate,
      audience: audienceNorm as BulkQuoteImportPayload["audience"],
      ...(companyId ? { companyId } : {}),
    });
  }

  if (quotes.length === 0) {
    return { ok: false, message: "Nenhuma linha de dados encontrada após o cabeçalho." };
  }

  return { ok: true, quotes, truncated };
}
