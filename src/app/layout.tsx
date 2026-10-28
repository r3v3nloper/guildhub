import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import Link from "next/link";
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
    statusBarStyle: "default",
    title: de.app.name,
  },
  formatDetection: { telephone: false },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#18181b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <PrimeProvider>
          <SerwistProvider
            swUrl="/serwist/sw.js"
            disable={process.env.NODE_ENV === "development"}
          >
            <OfflineBanner />
            <UpdatePrompt />
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <i className="pi pi-shield text-accent" aria-hidden />
                {de.app.name}
              </Link>
              <Suspense fallback={null}>
                <AppNav />
              </Suspense>
            </header>
            <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">
              {children}
            </main>
          </SerwistProvider>
        </PrimeProvider>
      </body>
    </html>
  );
}
