import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCb) as unknown as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>
const KEYLEN = 64

export async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = await scrypt(password.normalize('NFKC'), salt, KEYLEN)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, saltB64, hashB64] = stored.split('$')
  if (alg !== 'scrypt' || !saltB64 || !hashB64) return false
  const expected = Buffer.from(hashB64, 'base64')
  const actual = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
