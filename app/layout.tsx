import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Sahabat Nalar PAI — Platform Belajar PAI-BP",
  description:
    "Platform pembelajaran Pendidikan Agama Islam dan Budi Pekerti Fase E Kelas X bersama asisten belajar AIsyah.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="flex min-h-screen flex-col bg-[#F6F8F7] pb-16 font-sans text-slate-800 antialiased sm:pb-0">
        <Navbar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 sm:py-7">
          {children}
        </main>
        <footer className="no-print mt-auto hidden border-t border-slate-200/70 bg-white py-4 text-center text-xs text-slate-400 sm:block">
          Sahabat Nalar PAI • SMAN 1 Pangkalan Kerinci • TA 2026/2027
        </footer>
      </body>
    </html>
  );
}
