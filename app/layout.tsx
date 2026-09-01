import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { Providers } from "./providers"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BDOEA Financial System",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex h-screen overflow-hidden bg-bdoea-bg`}>
        <Providers>
          <Sidebar />
          <main className="flex-1 h-full overflow-y-auto">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}