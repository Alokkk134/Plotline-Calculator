// Share-link encoding: JSON -> UTF-8 -> deflate-raw (if available) -> base64url.
// A one-char prefix records the mode: "z" = deflated, "r" = raw.
import type { CalculatorId } from '../shell/types';
import { isCalculatorId } from './store';

export interface SharePayload {
  c: CalculatorId;
  t: string;
  s: unknown;
}

function toB64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(s: string): Uint8Array {
  let b = s.replace(/-/g, '+').replace(/_/g, '/');
  while (b.length % 4) b += '=';
  const bin = atob(b);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(
  bytes: Uint8Array,
  stream: { writable: WritableStream<any>; readable: ReadableStream<any> },
): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  writer.write(bytes).catch(() => {});
  writer.close().catch(() => {});
  const buf = await new Response(stream.readable).arrayBuffer();
  return new Uint8Array(buf);
}

export async function encodeShare(payload: SharePayload): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  if (typeof CompressionStream !== 'undefined') {
    try {
      const z = await pipe(bytes, new CompressionStream('deflate-raw'));
      return 'z' + toB64Url(z);
    } catch {
      /* fall back to raw */
    }
  }
  return 'r' + toB64Url(bytes);
}

/** Returns null for anything malformed. */
export async function decodeShare(data: string): Promise<SharePayload | null> {
  try {
    const mode = data[0];
    let bytes = fromB64Url(data.slice(1));
    if (mode === 'z') {
      if (typeof DecompressionStream === 'undefined') return null;
      bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    } else if (mode !== 'r') return null;
    const obj: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!obj || typeof obj !== 'object') return null;
    const o = obj as Record<string, unknown>;
    if (!isCalculatorId(o.c) || !('s' in o)) return null;
    return { c: o.c, t: typeof o.t === 'string' && o.t ? o.t : 'Untitled Graph', s: o.s };
  } catch {
    return null;
  }
}

export function buildShareUrl(c: CalculatorId, data: string): string {
  return `${location.origin}${location.pathname}#/${c}?s=${data}`;
}

/** Extract the `s` param from a hash, or null. */
export function readShareParam(hash: string): string | null {
  const i = hash.indexOf('?');
  if (i < 0) return null;
  return new URLSearchParams(hash.slice(i + 1)).get('s');
}

/** Hash with the `s` param removed. */
export function stripShareParam(hash: string): string {
  const i = hash.indexOf('?');
  if (i < 0) return hash;
  const p = new URLSearchParams(hash.slice(i + 1));
  p.delete('s');
  const rest = p.toString();
  return hash.slice(0, i) + (rest ? '?' + rest : '');
}
