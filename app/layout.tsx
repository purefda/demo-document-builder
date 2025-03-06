import { LeftNav } from "@/components/left-nav";
import { Navbar } from "@/components/navbar";
import { Analytics } from "@vercel/analytics/react";
import { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://ai-sdk-preview-internal-knowledge-base.vercel.app",
  ),
  title: "Pure Global Document Builder",
  description:
    "Extract and analyze document information with AI-powered document processing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-light-white">
        <Toaster position="top-center" />
        <LeftNav />
        <Navbar />
        <main className="ml-56 pt-16 min-h-screen">
          {children}
        </main>
        <Analytics />
      </body>
    </html>
  );
}
