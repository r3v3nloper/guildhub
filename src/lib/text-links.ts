import { isHttpUrl } from "./url";

export type TextPart =
  { kind: "text"; text: string } | { kind: "link"; url: string };

const URL_CANDIDATE = /https?:\/\/[^\s<>"]+/g;
/** Punctuation that ends a sentence rather than the link, e.g. "siehe https://x.de/regeln." */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"»“”]+$/;

/**
 * Splits plain text into text and http(s) links, so notes can show clickable links
 * without any markup language. Everything else stays text.
 */
export function splitTextLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let rest = 0;
  for (const match of text.matchAll(URL_CANDIDATE)) {
    const url = match[0].replace(TRAILING_PUNCTUATION, "");
    if (!isHttpUrl(url)) {
      continue;
    }
    if (match.index > rest) {
      parts.push({ kind: "text", text: text.slice(rest, match.index) });
    }
    parts.push({ kind: "link", url });
    rest = match.index + url.length;
  }
  if (rest < text.length) {
    parts.push({ kind: "text", text: text.slice(rest) });
  }
  return parts;
}
