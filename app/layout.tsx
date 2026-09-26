import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ILAW Lesson Plan Generator",
  description: "Create, edit, save, print, and export DepEd-aligned ILAW lesson plans.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
