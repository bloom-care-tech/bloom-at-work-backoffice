import { describe, expect, it } from "vitest";
import {
  articleFormatFromPayload,
  articleHtmlUrlFromPayload,
  extractArticleEditorHtml,
  mediaExtrasFromPayload,
  payloadRecordFromUnknown,
  scientificRefsExtrasFromPayload,
  toolkitExtrasFromPayload,
  toolkitItensFromPayload,
  toolkitSectionTituloFromPayload,
} from "./wave-content-editor-payload";

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

describe("article HTML payload helpers", () => {
  it("defaults existing article payloads to editor format", () => {
    expect(articleFormatFromPayload({ bodyHtml: "<p>A</p>" })).toBe("editor");
  });

  it("detects HTML article payloads and reads their URL/display mode", () => {
    const payload = {
      articleFormat: "html",
      htmlUrl: "https://cdn.example.com/article.html",
      displayMode: "new_tab",
    };
    expect(articleFormatFromPayload(payload)).toBe("html");
    expect(articleHtmlUrlFromPayload(payload)).toBe("https://cdn.example.com/article.html");
  });
});

describe("scientificRefsExtrasFromPayload", () => {
  it("strips referencias and description keys", () => {
    const p = {
      referencias: [{ titulo: "T", autores: "A", fonte: "F", doi: "x" }],
      description: "Intro",
      descricao: "ignored when both",
      extra: 1,
    };
    expect(scientificRefsExtrasFromPayload(p)).toEqual({ extra: 1 });
  });
});

describe("mediaExtrasFromPayload", () => {
  it("keeps Mux metadata while stripping edited video fields", () => {
    expect(
      mediaExtrasFromPayload(
        {
          provider: "mux",
          videoUrl: "https://player.mux.com/playback",
          description: "Intro",
          muxUploadId: "upload-id",
          muxPlaybackId: "playback-id",
        },
        "video",
      ),
    ).toEqual({
      provider: "mux",
      muxUploadId: "upload-id",
      muxPlaybackId: "playback-id",
    });
  });
});

describe("toolkit payload helpers", () => {
  const sample = {
    kind: "toolkit",
    titulo: "Guia para líderes",
    toolkit: {
      titulo: "Linha de cuidado — líder",
      itens: ["A", "B"],
    },
    legacy: 1,
  };

  it("reads toolkit section title and items", () => {
    expect(toolkitSectionTituloFromPayload(sample)).toBe("Linha de cuidado — líder");
    expect(toolkitItensFromPayload(sample)).toEqual(["A", "B"]);
  });

  it("strips known toolkit keys for extras", () => {
    expect(toolkitExtrasFromPayload(sample)).toEqual({ legacy: 1 });
  });

  it("returns one empty item row when toolkit is missing", () => {
    expect(toolkitItensFromPayload({})).toEqual([""]);
    expect(toolkitSectionTituloFromPayload({})).toBe("");
  });
});
