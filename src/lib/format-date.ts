/** Stable pt-BR numeric calendar date (dd/MM/yyyy), independent of browser default locale. */
export const PT_BR_NUMERIC_DATE: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

export function formatPtBrNumericDate(isoOrDate: string | Date, timeZone?: string): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", timeZone ? { ...PT_BR_NUMERIC_DATE, timeZone } : PT_BR_NUMERIC_DATE);
}

/** Parse `yyyy-MM-dd` from APIs without UTC midnight shifting the calendar day. */
export function parseApiDateOnly(ymd: string): Date {
  return new Date(`${ymd}T12:00:00.000Z`);
}

export function formatPtBrNumericDateFromYmd(ymd: string, timeZone?: string): string {
  return formatPtBrNumericDate(parseApiDateOnly(ymd), timeZone);
}

const ISO_YMD = /^(\d{4})-(\d{2})-(\d{2})$/;

/** API `yyyy-MM-dd` → `dd/MM` for compact labels (no year, no locale variance). */
export function formatPtBrDayMonthFromYmd(ymd: string): string {
  const m = ymd.trim().match(ISO_YMD);
  if (!m) return "—";
  return `${m[3]}/${m[2]}`;
}

/** API `yyyy-MM-dd` → `dd/MM/yyyy` for text fields (inverse: {@link ptBrInputToIsoYmd}). */
export function isoYmdToPtBrInput(ymd: string): string {
  const m = ymd.trim().match(ISO_YMD);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Parse strict `dd/MM/yyyy` from backoffice text inputs to API `yyyy-MM-dd`. */
export function ptBrInputToIsoYmd(display: string): string | null {
  const m = display.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  const d = parseApiDateOnly(iso);
  if (Number.isNaN(d.getTime())) return null;
  if (d.toISOString().slice(0, 10) !== iso) return null;
  return iso;
}

/** Split an ISO instant into local calendar date + `HH:mm` (24h) for backoffice datetime fields. */
export function isoToPtBrDatetimeLocalParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  return {
    date: formatPtBrNumericDate(d),
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
}

/**
 * Combine local `dd/MM/yyyy` + `H:mm` or `HH:mm` into an ISO instant (same semantics as `new Date` on datetime-local).
 */
export function ptBrLocalDatetimeToIso(dateDdMmYyyy: string, timeHhMm: string): string | null {
  const isoDate = ptBrInputToIsoYmd(dateDdMmYyyy.trim());
  if (!isoDate) return null;
  const tm = timeHhMm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!tm) return null;
  const h = parseInt(tm[1], 10);
  const mi = parseInt(tm[2], 10);
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  const [yS, moS, dS] = isoDate.split("-");
  const y = parseInt(yS, 10);
  const mo = parseInt(moS, 10) - 1;
  const da = parseInt(dS, 10);
  const d = new Date(y, mo, da, h, mi, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== da) return null;
  return d.toISOString();
}
