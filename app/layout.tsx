
import type { Metadata, Viewport } from "next";
import "./globals.css";
import Layout from "@/components/Layout";

export const metadata: Metadata = {
  title: {
    default: "Todde Bus - Gestionale Aziendale",
    template: "%s | Todde Bus",
  },
  description: "Gestionale aziendale Todde Bus per dipendenti, richieste, turni e note spese.",
  applicationName: "Todde Bus",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Todde Bus",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6e192a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
