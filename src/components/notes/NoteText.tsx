import { splitTextLinks } from "@/lib/text-links";

/** Plain note text: line breaks as written, http(s) links clickable. */
export function NoteText({ text }: { text: string }) {
  return (
    <p className="text-[14.5px] leading-relaxed break-words whitespace-pre-line text-soft">
      {splitTextLinks(text).map((part, index) =>
        part.kind === "link" ? (
          <a
            key={index}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent-strong underline-offset-2 hover:text-white hover:underline"
          >
            {part.url}
          </a>
        ) : (
          part.text
        ),
      )}
    </p>
  );
}
