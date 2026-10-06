import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OptiFunds | Analytics Suite",
  description: "Eines per a Inversors Intel·ligents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ca">
      <body className="min-h-screen bg-white text-slate-900 antialiased selection:bg-emerald-100 selection:text-emerald-900">
        {children}
      </body>
    </html>
  );
}
