import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DownloadSimple, FileXls, UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { bulkCreateQuotes, downloadQuoteTemplateXlsx } from "@/lib/admin-api";
import { ApiError } from "@/lib/auth/api-client";
import { triggerBlobDownload } from "@/lib/download-blob";
import { parseQuoteBulkXlsx, QUOTE_BULK_IMPORT_MAX_ROWS } from "@/lib/parse-quote-bulk-xlsx";
import type { BulkQuoteImportPayload } from "@/lib/quote-bulk-import.types";
import { cn } from "@/lib/utils";

const BULK_BATCH = 80;

export type QuoteBulkImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function QuoteBulkImportDialog({ open, onOpenChange }: QuoteBulkImportDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templateBusy, setTemplateBusy] = useState(false);

  const bulkImport = useMutation({
    mutationFn: async (rows: BulkQuoteImportPayload[]) => {
      let created = 0;
      let skipped = 0;
      const errors: { index: number; code: string; message: string }[] = [];
      let offset = 0;
      for (let i = 0; i < rows.length; i += BULK_BATCH) {
        const batch = rows.slice(i, i + BULK_BATCH);
        const r = await bulkCreateQuotes(batch);
        created += r.created;
        skipped += r.skipped;
        for (const err of r.errors) errors.push({ ...err, index: err.index + offset });
        offset += batch.length;
      }
      return { created, skipped, errors };
    },
    onSuccess: (r) => {
      toast(`Importação: ${r.created} criadas, ${r.skipped} ignoradas.`);
      if (r.errors.length > 0) {
        const sample = r.errors
          .slice(0, 5)
          .map((err) => `Linha ${err.index + 1}: ${err.message}`)
          .join(" · ");
        toast("Algumas linhas falharam", {
          description: `${sample}${r.errors.length > 5 ? "…" : ""}`,
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["quotes"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] });
      onOpenChange(false);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Erro ao importar.";
      toast(msg);
    },
  });

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast("Use um ficheiro .xlsx.");
      return;
    }
    setSelectedFile(file);
  };

  const downloadTemplate = async () => {
    setTemplateBusy(true);
    try {
      const blob = await downloadQuoteTemplateXlsx();
      triggerBlobDownload(blob, null, "importar_quotes_template.xlsx");
      toast("Download iniciado.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro no download.");
    } finally {
      setTemplateBusy(false);
    }
  };

  const processImport = async () => {
    if (!selectedFile) {
      toast("Selecione o ficheiro .xlsx.");
      return;
    }
    let buf: ArrayBuffer;
    try {
      buf = await selectedFile.arrayBuffer();
    } catch {
      toast("Não foi possível ler o ficheiro.");
      return;
    }
    const parsed = await parseQuoteBulkXlsx(buf);
    if (!parsed.ok) {
      toast(parsed.message);
      return;
    }
    if (parsed.truncated) {
      toast("Aviso", {
        description: `Foram consideradas no máximo ${QUOTE_BULK_IMPORT_MAX_ROWS} linhas; divida o ficheiro para importar o restante.`,
      });
    }
    bulkImport.mutate(parsed.quotes);
  };

  const busy = bulkImport.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setSelectedFile(null);
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-lg border border-bloom-aubergine/15 bg-bloom-cream text-bloom-aubergine">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="font-serif-display text-2xl text-bloom-aubergine">Importar frases</DialogTitle>
          <DialogDescription className="font-ui text-sm text-bloom-aubergine/70">
            Envie uma planilha .xlsx com as frases do Bloom do dia. Use o modelo para manter texto, autor, data e audiência
            no formato esperado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 font-ui">
          <div className="space-y-2">
            <Label className="text-bloom-aubergine/80">Planilha</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              aria-label="Selecionar planilha Excel"
              disabled={busy}
              onChange={(e) => {
                pickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (busy) return;
                pickFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "w-full rounded-2xl border-2 border-dashed border-bloom-aubergine/20 bg-white/80 px-4 py-8",
                "flex flex-col items-center gap-2 text-center transition-colors",
                "hover:border-bloom-garnet/40 hover:bg-bloom-cream-deep/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-bloom-garnet/30",
                busy && "opacity-60 pointer-events-none",
              )}
            >
              <UploadSimple size={28} className="text-bloom-aubergine/50" />
              <span className="text-sm text-bloom-aubergine/80">
                {selectedFile ? selectedFile.name : "Clique ou arraste o ficheiro .xlsx"}
              </span>
              {selectedFile && (
                <span className="text-xs text-bloom-aubergine/55 flex items-center gap-1">
                  <FileXls size={14} />
                  {(selectedFile.size / 1024).toFixed(0)} KB
                </span>
              )}
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full rounded-full border-bloom-aubergine/20 font-ui"
            disabled={templateBusy || busy}
            onClick={() => void downloadTemplate()}
          >
            <DownloadSimple size={18} className="mr-2" />
            {templateBusy ? "A descarregar…" : "Baixar modelo"}
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-bloom-aubergine/20 font-ui"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="rounded-full bg-bloom-garnet hover:bg-bloom-garnet/90 font-ui"
            disabled={busy || !selectedFile}
            onClick={() => void processImport()}
          >
            {busy ? "A processar…" : "Processar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
