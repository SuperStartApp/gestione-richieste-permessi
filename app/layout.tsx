import type { Metadata } from "next";
import "./globals.css";
import Layout from "@/components/Layout";

export const metadata: Metadata = {
  title: "Todde Bus - Gestione Turni",
  description: "Software gestione dipendenti e richieste",
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