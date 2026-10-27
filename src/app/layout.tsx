import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { UserMenu } from "@/components/auth/UserMenu";
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
        <SerwistProvider
          swUrl="/serwist/sw.js"
          disable={process.env.NODE_ENV === "development"}
        >
          <OfflineBanner />
          <UpdatePrompt />
          <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <span className="font-semibold">{de.app.name}</span>
            <Suspense fallback={null}>
              <UserMenu />
            </Suspense>
          </header>
          <main className="flex flex-1 flex-col px-4 py-6">{children}</main>
        </SerwistProvider>
      </body>
    </html>
  );
}
