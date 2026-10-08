import { LedgerEntry, VerificationResult } from '../types';

export const GENESIS_PREV_HASH = '0'.repeat(64);

/**
 * Recursively canonicalize JavaScript objects:
 * - Object keys sorted alphabetically at every nesting level
 * - No whitespace
 * - Standard JSON serialization
 */
export function canonicalJson(v: any): string {
  if (Array.isArray(v)) {
    return '[' + v.map(canonicalJson).join(',') + ']';
  }
  if (v !== null && typeof v === 'object') {
    const sortedKeys = Object.keys(v).sort();
    return '{' + sortedKeys.map(k => JSON.stringify(k) + ':' + canonicalJson(v[k])).join(',') + '}';
  }
  return JSON.stringify(v);
}

/**
 * Computes SHA-256 hex string (lowercase 64 chars) via Web Crypto API.
 * Works seamlessly in both modern browsers and modern Node.js environments.
 */
export async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Computes an entry's hash according to the AgentBlackBox spec:
 * entry_hash = SHA256( prev_hash + '|' + seq + '|' + event_type + '|' + canonical_json(payload) + '|' + created_at )
 */
export async function computeEntryHash(
  prevHash: string,
  seq: number,
  eventType: string,
  payload: any,
  createdAt: string
): Promise<string> {
  const canonicalPayload = canonicalJson(payload);
  const rawString = `${prevHash}|${seq}|${eventType}|${canonicalPayload}|${createdAt}`;
  return sha256Hex(rawString);
}

export const entryHash = computeEntryHash;

/**
 * Full sequential ledger cryptographic integrity audit.
 * Recomputes all hashes from Genesis to Head.
 * Stops and returns the exact point of tampering if any mismatch occurs.
 */
export async function verifyLedger(entries: LedgerEntry[]): Promise<VerificationResult> {
  if (entries.length === 0) {
    return { isValid: true, totalEntries: 0 };
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expectedSeq = i + 1;

    // Check sequence ordering
    if (entry.seq !== expectedSeq) {
      return {
        isValid: false,
        totalEntries: entries.length,
        brokenSeq: entry.seq,
        reason: `Sequence gap or mismatch: expected seq ${expectedSeq}, found ${entry.seq}`,
      };
    }

    // Check prev_hash linking
    const expectedPrevHash = i === 0 ? GENESIS_PREV_HASH : entries[i - 1].entry_hash;
    if (entry.prev_hash !== expectedPrevHash) {
      return {
        isValid: false,
        totalEntries: entries.length,
        brokenSeq: entry.seq,
        actualHash: entry.prev_hash,
        expectedHash: expectedPrevHash,
        reason: `Previous hash pointer broken at entry #${entry.seq}`,
      };
    }

    // Recompute entry hash from payload and headers
    const recomputedHash = await computeEntryHash(
      entry.prev_hash,
      entry.seq,
      entry.event_type,
      entry.payload,
      entry.created_at
    );

    if (recomputedHash !== entry.entry_hash) {
      return {
        isValid: false,
        totalEntries: entries.length,
        brokenSeq: entry.seq,
        expectedHash: recomputedHash,
        actualHash: entry.entry_hash,
        reason: `Cryptographic hash mismatch at entry #${entry.seq}: stored data does not match hash!`,
      };
    }
  }

  return {
    isValid: true,
    totalEntries: entries.length,
  };
}
