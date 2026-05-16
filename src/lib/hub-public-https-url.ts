/**
 * Hub / Typeform / RSVP URL rules (SEC-024): HTTPS only, disallow dangerous schemes,
 * block literal localhost and non-public IPs (basic SSRF hardening).
 */
export function getHubPublicHttpsUrlError(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  const schemeGap = trimmed.replace(/^\s+/, '').toLowerCase();
  if (schemeGap.startsWith('javascript:')) {
    return 'Esquema de URL não permitido (use apenas https://).';
  }
  if (schemeGap.startsWith('data:')) {
    return 'Esquema de URL não permitido (use apenas https://).';
  }
  if (schemeGap.startsWith('vbscript:')) {
    return 'Esquema de URL não permitido (use apenas https://).';
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return 'URL inválida.';
  }

  if (parsed.protocol.toLowerCase() !== 'https:') {
    return 'Use apenas https:// — http e outros tipos não são permitidos.';
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) {
    return 'URL inválida: falta o domínio.';
  }

  /** Node keeps brackets around IPv6 (e.g. `[::1]`); browsers usually strip them — normalize before checks. */
  const hostForChecks =
    hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;

  if (hostForChecks === 'localhost' || hostForChecks.endsWith('.localhost')) {
    return 'Não use localhost nem domínios .localhost.';
  }

  if (isProbablyIpv4(hostForChecks)) {
    return isNonPublicIpv4(hostForChecks) ? 'Não use endereços IP privados ou internos.' : null;
  }

  if (isProbablyIpv6(hostForChecks)) {
    return isNonPublicIpv6(hostForChecks) ? 'Não use endereços IP privados ou internos.' : null;
  }

  return null;
}

function isProbablyIpv4(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

function ipv4Parts(hostname: string): number[] | null {
  const parts = hostname.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return nums;
}

function isNonPublicIpv4(hostname: string): boolean {
  const nums = ipv4Parts(hostname);
  if (!nums) return true;
  const [a, b] = nums;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function stripZoneId(hostname: string): string {
  const pct = hostname.indexOf('%');
  return pct === -1 ? hostname : hostname.slice(0, pct);
}

function isProbablyIpv6(hostname: string): boolean {
  return hostname.includes(':');
}

function tryDecodeIpv4MappedSuffix(h: string): string | null {
  const dotted = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(h);
  if (dotted) return dotted[1];
  /** Node normalizes e.g. `[::ffff:192.168.1.1]` to `::ffff:c0a8:101`. */
  const hexPair = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(h);
  if (hexPair) {
    const hi = parseInt(hexPair[1], 16);
    const lo = parseInt(hexPair[2], 16);
    if (hi > 0xffff || lo > 0xffff) return null;
    const n = (hi << 16) | lo;
    return `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`;
  }
  return null;
}

function isNonPublicIpv6(hostname: string): boolean {
  const h = stripZoneId(hostname.toLowerCase());

  const mappedV4 = tryDecodeIpv4MappedSuffix(h);
  if (mappedV4 !== null) {
    return isNonPublicIpv4(mappedV4);
  }

  if (h === '::1') return true;
  if (h.startsWith('fe80:')) return true;
  if (h.startsWith('fc') || h.startsWith('fd')) return true;
  const dottedTail = /^.*:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(h);
  if (dottedTail && h.includes(':') && h.includes('.')) {
    return isNonPublicIpv4(dottedTail[1]);
  }
  return false;
}
