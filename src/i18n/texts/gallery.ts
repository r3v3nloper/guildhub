import { GALLERY_CAPTION_MAX } from "@/lib/gallery/gallery-limits";

export const gallery = {
  title: "Galerie",
  intro:
    "Screenshots und Erinnerungen der Gilde. Bilder von Dungeon-Seiten stehen auch hier.",
  dungeonTitle: "Galerie",
  empty: "Noch keine Bilder. Lad das erste hoch!",
  emptyDungeon: "Noch keine Bilder von diesem Dungeon.",
  emptyHidden:
    "Keine allgemeinen Bilder. Dungeon-Bilder sind gerade ausgeblendet.",
  upload: "Bild hochladen",
  uploadSubmit: "Hochladen",
  uploaded: "Bild hochgeladen.",
  fieldImage: "Bild",
  fieldImageHint:
    "JPEG, PNG oder WebP, höchstens 10 MB. Große Bilder werden verkleinert.",
  fieldCaption: "Bildunterschrift",
  fieldCaptionHint: `Optional, höchstens ${GALLERY_CAPTION_MAX} Zeichen.`,
  fieldTakenOn: "Datum",
  fieldTakenOnHint: "Der Tag, den das Bild zeigt.",
  showDungeons: "Dungeon-Bilder anzeigen",
  edit: "Bild bearbeiten",
  menuFor: (caption: string | null) =>
    caption
      ? `Weitere Aktionen für ${caption}`
      : "Weitere Aktionen für das Bild",
  open: (caption: string | null) =>
    caption ? `Bild öffnen: ${caption}` : "Bild öffnen",
  imageAlt: (caption: string | null, date: string) =>
    caption ?? `Bild vom ${date}`,
  byline: (name: string | null, date: string) =>
    name ? `${date} · ${name}` : date,
  fromDungeon: (name: string) => `Aus ${name}`,
  deleteTitle: "Bild löschen",
  deleteHint: "Weg ist weg: Das Bild verschwindet für die ganze Gilde.",
  deleteConfirm: "Dieses Bild löschen?",
  close: "Schließen",
  previous: "Vorheriges Bild",
  next: "Nächstes Bild",
} as const;
