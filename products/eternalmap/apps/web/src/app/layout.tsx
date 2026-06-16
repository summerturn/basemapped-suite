import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EternalMap - Cemetery & Municipality GIS",
  description: "Manage cemeteries, plots, graves, and reports with EternalMap.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
