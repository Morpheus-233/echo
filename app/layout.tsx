import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { ServiceWorkerRegistrar } from "@/components/sw-register";
import { isAuthed } from "@/lib/auth";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Echo — a journal that asks you back",
  description:
    "Write what you learned today. Echo turns it into questions and brings them back on day 2, 3, 7, 16 and 35.",
  applicationName: "Echo",
  appleWebApp: { capable: true, title: "Echo", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f4efe5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAuthed();

  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="flex min-h-dvh flex-col">
        {authed ? <SiteHeader /> : null}
        <main className="mx-auto w-full max-w-[720px] flex-1 px-5 pb-24 pt-8 sm:pt-12">{children}</main>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
