import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Prophesy | Prediction Market & AI Oracle",
  description:
    "High-frequency prediction market with CLOB matching engine, PostgreSQL vault, and LangGraph autonomous AI oracle.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
