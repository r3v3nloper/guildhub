import type { MetadataRoute } from "next";
import { de } from "@/i18n/de";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: de.app.name,
    short_name: de.app.shortName,
    description: de.app.description,
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0d0b17",
    theme_color: "#110e1e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
