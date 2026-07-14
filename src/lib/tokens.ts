import { customAlphabet } from 'nanoid';

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export const newId = customAlphabet(BASE62, 12);
export const newSlug = customAlphabet(BASE62, 24);
export const newOgId = customAlphabet(BASE62, 10);

export async function hashSlug(slug: string, pepper: string): Promise<string> {
  const data = new TextEncoder().encode(slug + pepper);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
