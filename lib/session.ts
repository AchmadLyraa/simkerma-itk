// Web Crypto: aman dipakai di proxy.ts maupun server actions.
export const SESSION_COOKIE = 'simkerma_session'
export const SESSION_MAX_AGE = 60 * 60 * 8

const enc = new TextEncoder()

function getSecret() {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret || secret.length < 32) throw new Error('NEXTAUTH_SECRET wajib diisi (minimal 32 karakter)')
  return secret
}

function importKey() {
  return crypto.subtle.importKey('raw', enc.encode(getSecret()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

function toB64u(bytes: Uint8Array) {
  let s = ''
  bytes.forEach((b) => { s += String.fromCharCode(b) })
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64u(value: string) {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
}

export async function createSessionToken(userId: string) {
  const payload = toB64u(enc.encode(JSON.stringify({ sub: userId, exp: Date.now() + SESSION_MAX_AGE * 1000 })))
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await importKey(), enc.encode(payload)))
  return `${payload}.${toB64u(sig)}`
}

export async function verifySessionToken(token: string): Promise<{ sub: string } | null> {
  try {
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return null
    const ok = await crypto.subtle.verify('HMAC', await importKey(), fromB64u(sig), enc.encode(payload))
    if (!ok) return null
    const data = JSON.parse(new TextDecoder().decode(fromB64u(payload))) as { sub?: string; exp?: number }
    if (!data.sub || !data.exp || data.exp < Date.now()) return null
    return { sub: data.sub }
  } catch {
    return null
  }
}
