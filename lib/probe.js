import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { domainToASCII } from 'node:url';

export function normalizeHost(input) {
  if (typeof input !== 'string') throw new Error('Dominio inválido');
  const host = domainToASCII(input.trim().toLowerCase().replace(/\.$/, ''));
  if (!host || host.length > 253 || !host.endsWith('.pe')) throw new Error('Solo se aceptan dominios .pe');
  const labels = host.split('.');
  if (labels.length < 2 || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) {
    throw new Error('Dominio inválido');
  }
  return host;
}

export function isPublicIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(x => !Number.isInteger(x) || x < 0 || x > 255)) return false;
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 0 || b === 168)) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 192 && b === 0 && c === 2) return false;
  return true;
}

export async function resolvePublicIPv4(host) {
  const addresses = await dns.resolve4(host);
  if (!addresses.length || addresses.some(ip => !isPublicIPv4(ip))) {
    throw new Error('El dominio no resuelve únicamente a direcciones públicas');
  }
  return addresses[0];
}

export function pinnedLookup(ip) {
  return (_hostname, options, callback) => options.all
    ? callback(null, [{ address: ip, family: 4 }])
    : callback(null, ip, 4);
}

export function requestHead(host, ip, secure, timeoutMs = 6000) {
  return new Promise(resolve => {
    const transport = secure ? https : http;
    const request = transport.request({
      hostname: host,
      port: secure ? 443 : 80,
      path: '/',
      method: 'HEAD',
      timeout: timeoutMs,
      agent: false,
      lookup: pinnedLookup(ip),
      headers: { 'User-Agent': 'EscaneaLaWeb/1.0 (+transport-check; HEAD only)' }
    }, response => {
      resolve({ ok: true, status: response.statusCode ?? null, location: response.headers.location ?? null });
      response.destroy();
    });
    request.once('timeout', () => request.destroy(new Error('timeout')));
    request.once('error', error => resolve({ ok: false, error: error.code || 'UNKNOWN' }));
    request.end();
  });
}

export function classify(host, plain, secure) {
  const redirectToHttps = plain.ok && [301, 302, 303, 307, 308].includes(plain.status)
    && typeof plain.location === 'string'
    && /^https:\/\//i.test(plain.location);
  if (secure.ok && redirectToHttps) return { kind: 'redirect', label: 'Redirige a HTTPS', detail: 'La raíz HTTP dirige a HTTPS y HTTPS respondió.' };
  if (secure.ok && plain.ok) return { kind: 'mixed', label: 'HTTP sin redirección', detail: 'La raíz HTTP respondió sin dirigir a HTTPS; HTTPS también está disponible.' };
  if (secure.ok) return { kind: 'https', label: 'HTTPS disponible', detail: 'HTTPS respondió; la raíz HTTP no dio una respuesta verificable.' };
  if (plain.ok) return { kind: 'nohttps', label: 'HTTPS no verificado', detail: 'La raíz HTTP respondió, pero la conexión HTTPS falló en esta comprobación.' };
  return { kind: 'unknown', label: 'No concluyente', detail: 'No hubo respuesta verificable en HTTP ni en HTTPS.' };
}

export async function probeHost(input, { resolve = resolvePublicIPv4, request = requestHead } = {}) {
  const host = normalizeHost(input);
  const ip = await resolve(host);
  if (!isPublicIPv4(ip)) throw new Error('Dirección no pública');
  const [plain, secure] = await Promise.all([
    request(host, ip, false),
    request(host, ip, true)
  ]);
  return {
    host,
    checkedAt: new Date().toISOString(),
    http: { responded: plain.ok, status: plain.status ?? null, redirectsToHttps: plain.ok && /^https:\/\//i.test(plain.location ?? ''), error: plain.ok ? null : plain.error },
    https: { responded: secure.ok, status: secure.status ?? null, error: secure.ok ? null : secure.error },
    ...classify(host, plain, secure)
  };
}
