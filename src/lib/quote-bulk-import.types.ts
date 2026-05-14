/** Payload row for POST /admin/quotes/bulk (matches BulkQuoteItemDto). */
export type BulkQuoteImportPayload = {
  text: string;
  author: string;
  publicationDate: string;
  companyId?: string;
  audience: "all" | "leader" | "collaborator";
};
