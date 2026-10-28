import "@fontsource-variable/fredoka";
import "@fontsource-variable/plus-jakarta-sans";
import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { AppNav } from "@/components/nav/AppNav";
import { PrimeProvider } from "@/components/ui/PrimeProvider";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { UpdatePrompt } from "@/components/pwa/UpdatePrompt";
import { de } from "@/i18n/de";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: de.app.name,
  title: { default: de.app.name, template: `%s · ${de.app.name}` },
  description: de.app.description,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: de.app.name,
  },
  formatDetection: { telephone: false },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#110e1e",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-dvh bg-background font-sans text-foreground">
        <PrimeProvider>
          <SerwistProvider
            swUrl="/serwist/sw.js"
            disable={process.env.NODE_ENV === "development"}
          >
            <OfflineBanner />
            <UpdatePrompt />
            <div className="flex min-h-dvh flex-col md:flex-row">
              <Suspense fallback={<NavPlaceholder />}>
                <AppNav />
              </Suspense>
              {/* Bottom padding on phones keeps the last card clear of the tab bar. */}
              <main className="flex w-full min-w-0 flex-1 flex-col px-4 pt-5 pb-28 md:px-10 md:pt-9 md:pb-12">
                <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
                  {children}
                </div>
              </main>
            </div>
          </SerwistProvider>
        </PrimeProvider>
      </body>
    </html>
  );
}

/** Keeps the content from jumping sideways while the sidebar streams in. */
function NavPlaceholder() {
  return (
    <div className="hidden w-64 shrink-0 border-r border-border bg-sidebar md:block" />
  );
}
