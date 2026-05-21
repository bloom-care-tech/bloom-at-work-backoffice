import { useEffect, useRef, useState } from "react";
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
import { ApiError } from "@/lib/auth/api-client";
import { filterSelectCls } from "@/lib/backoffice-filters";
import { bulkCreateCompanyUsers, downloadUserImportTemplateXlsx } from "@/lib/admin-api";
import { triggerBlobDownload } from "@/lib/download-blob";
import { parseUserBulkXlsx, USER_BULK_IMPORT_MAX_ROWS } from "@/lib/parse-user-bulk-xlsx";
import type { BulkCompanyUserImportPayload } from "@/lib/user-bulk-import.types";
import { cn } from "@/lib/utils";

const BULK_BATCH = 80;

type CompanyOption = { id: string; name: string };

export type UserBulkImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: CompanyOption[] | undefined;
  companiesLoading: boolean;
  defaultCompanyId?: string;
};

export function UserBulkImportDialog({
  open,
  onOpenChange,
  companies,
  companiesLoading,
  defaultCompanyId = "",
}: UserBulkImportDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importCompanyId, setImportCompanyId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templateBusy, setTemplateBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setImportCompanyId(defaultCompanyId);
      setSelectedFile(null);
    }
  }, [open, defaultCompanyId]);

  const bulkImport = useMutation({
    mutationFn: async ({ companyId, rows }: { companyId: string; rows: BulkCompanyUserImportPayload[] }) => {
      let created = 0;
      let skipped = 0;
      const errors: { index: number; code: string; message: string }[] = [];
      let offset = 0;
      for (let i = 0; i < rows.length; i += BULK_BATCH) {
        const batch = rows.slice(i, i + BULK_BATCH);
        const r = await bulkCreateCompanyUsers(companyId, batch);
        created += r.created;
        skipped += r.skipped;
        for (const err of r.errors) errors.push({ ...err, index: err.index + offset });
        offset += batch.length;
      }
      return { created, skipped, errors };
    },
    onSuccess: (r) => {
      toast(`Importação: ${r.created} criados, ${r.skipped} ignorados.`);
      if (r.errors.length > 0) {
        const sample = r.errors
          .slice(0, 5)
          .map((err) => `Linha ${err.index + 1}: ${err.message}`)
          .join(" · ");
        toast("Algumas linhas falharam", {
          description: `${sample}${r.errors.length > 5 ? "…" : ""}`,
        });
      }
      void queryClient.invalidateQueries({ queryKey: ["users"] });
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
      const blob = await downloadUserImportTemplateXlsx();
      triggerBlobDownload(blob, null, "importar_usuarios_template.xlsx");
      toast("Download iniciado.");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Erro no download.");
    } finally {
      setTemplateBusy(false);
    }
  };

  const processImport = async () => {
    if (!importCompanyId) {
      toast("Selecione a empresa.");
      return;
    }
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
    const parsed = await parseUserBulkXlsx(buf);
    if (!parsed.ok) {
      toast(parsed.message);
      return;
    }
    if (parsed.truncated) {
      toast("Aviso", {
        description: `Foram consideradas no máximo ${USER_BULK_IMPORT_MAX_ROWS} linhas; divida o ficheiro para importar o restante.`,
      });
    }
    bulkImport.mutate({ companyId: importCompanyId, rows: parsed.users });
  };

  const busy = bulkImport.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border border-bloom-aubergine/15 bg-bloom-cream text-bloom-aubergine">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="font-serif-display text-2xl text-bloom-aubergine">Importar usuários</DialogTitle>
          <DialogDescription className="font-ui text-sm text-bloom-aubergine/70">
            Envie uma planilha .xlsx com os colaboradores. Os e-mails devem usar um domínio permitido pela empresa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 font-ui">
          <div className="space-y-2">
            <Label htmlFor="import-company" className="text-bloom-aubergine/80">
              Empresa
            </Label>
            <select
              id="import-company"
              className={cn(filterSelectCls, "max-w-none")}
              value={importCompanyId}
              onChange={(e) => setImportCompanyId(e.target.value)}
              disabled={companiesLoading || busy}
            >
              <option value="">Selecione…</option>
              {companies?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

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
            disabled={busy || !importCompanyId || !selectedFile}
            onClick={() => void processImport()}
          >
            {busy ? "A processar…" : "Processar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
