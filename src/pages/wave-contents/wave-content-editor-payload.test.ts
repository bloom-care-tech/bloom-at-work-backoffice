import { describe, expect, it } from "vitest";
import { extractArticleEditorHtml, payloadRecordFromUnknown } from "./wave-content-editor-payload";

describe("payloadRecordFromUnknown", () => {
  it("returns empty object for null/undefined", () => {
    expect(payloadRecordFromUnknown(null)).toEqual({});
    expect(payloadRecordFromUnknown(undefined)).toEqual({});
  });

  it("parses JSON object strings", () => {
    const inner = { bodyHtml: "<p>Hi</p>", description: "Sub" };
    expect(payloadRecordFromUnknown(JSON.stringify(inner))).toEqual(inner);
  });

  it("returns object payloads unchanged", () => {
    const o = { bodyHtml: "<p>x</p>" };
    expect(payloadRecordFromUnknown(o)).toBe(o);
  });

  it("returns {} for invalid JSON strings", () => {
    expect(payloadRecordFromUnknown("{not json")).toEqual({});
  });
});

describe("extractArticleEditorHtml", () => {
  it("prefers bodyHtml", () => {
    expect(extractArticleEditorHtml({ bodyHtml: "<p>A</p>", paragrafos: ["B"] })).toBe("<p>A</p>");
  });

  it("builds HTML from secoesArtigo when bodyHtml is absent", () => {
    const html = extractArticleEditorHtml({
      secoesArtigo: [
        { titulo: "Sec 1", paragrafos: ["Line one.", "Line two."] },
        { lista: ["a", "b"] },
      ],
    });
    expect(html).toContain("<h2>Sec 1</h2>");
    expect(html).toContain("Line one.");
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>");
  });
});
