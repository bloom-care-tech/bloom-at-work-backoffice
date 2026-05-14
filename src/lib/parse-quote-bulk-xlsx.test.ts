import { Workbook } from "exceljs";
import { describe, expect, it } from "vitest";
import { parseQuoteBulkXlsx } from "./parse-quote-bulk-xlsx";

describe("parseQuoteBulkXlsx", () => {
  it("parses template-shaped workbook", async () => {
    const wb = new Workbook();
    const sheet = wb.addWorksheet("Quotes");
    sheet.addRow(["text", "author", "publicationDate", "companyId", "audience"]);
    sheet.addRow(["Hello", "Author One", "2026-06-15", "", "leader"]);
    const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    const result = await parseQuoteBulkXlsx(buffer);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.quotes).toHaveLength(1);
    expect(result.quotes[0]).toMatchObject({
      text: "Hello",
      author: "Author One",
      publicationDate: "2026-06-15",
      audience: "leader",
    });
    expect(result.quotes[0].companyId).toBeUndefined();
    expect(result.truncated).toBe(false);
  });

  it("parses Portuguese Bloom-do-dia template with audience hint cell", async () => {
    const wb = new Workbook();
    const sheet = wb.addWorksheet("Frases");
    sheet.addRow(["texto", "autor", "dataPublicacao", "idEmpresa", "audiencia"]);
    sheet.addRow(["Olá", "Autor Um", "2026-06-15", "", "colaborador | lider"]);
    const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    const result = await parseQuoteBulkXlsx(buffer);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.quotes[0]).toMatchObject({
      text: "Olá",
      author: "Autor Um",
      publicationDate: "2026-06-15",
      audience: "collaborator",
    });
  });

  it("rejects when a required column is missing", async () => {
    const wb = new Workbook();
    const sheet = wb.addWorksheet("Quotes");
    sheet.addRow(["text", "author", "publicationDate"]);
    sheet.addRow(["Hello", "Author One", "2026-06-15"]);
    const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
    const result = await parseQuoteBulkXlsx(buffer);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("Cabeçalho");
  });
});
