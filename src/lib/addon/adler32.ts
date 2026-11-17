const MOD_ADLER = 65521;

/**
 * Adler-32 over the UTF-8 bytes, as 8 hex digits. Chosen over CRC-32 because the addon
 * has to compute the same value in Lua 5.1, which needs no bit operations for it.
 */
export function adler32(text: string): string {
  let a = 1;
  let b = 0;
  for (const byte of new TextEncoder().encode(text)) {
    a = (a + byte) % MOD_ADLER;
    b = (b + a) % MOD_ADLER;
  }
  return (b * 65536 + a).toString(16).padStart(8, "0");
}
