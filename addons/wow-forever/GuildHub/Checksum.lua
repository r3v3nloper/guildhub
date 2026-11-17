local _, ns = ...

local MOD_ADLER = 65521

-- Adler-32 over the bytes, the same as src/lib/addon/adler32.ts in GuildHub. Formatted as
-- two halves, because WoW's string.format("%x") cannot take numbers above 2^31.
function ns.Adler32(text)
  local a, b = 1, 0
  for i = 1, #text do
    a = (a + text:byte(i)) % MOD_ADLER
    b = (b + a) % MOD_ADLER
  end
  return string.format("%04x%04x", b, a)
end
