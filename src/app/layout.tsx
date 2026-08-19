import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TMOS — Trader's Mental Operating System",
  description:
    "Personal tracker for trading psychology and performance: risk, stress, attitude, discipline, and decision process.",
};

// Applies the saved theme before first paint to avoid a flash of the wrong mode.
const themeInit = `(function(){try{var t=localStorage.getItem("tmos-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
