import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Foxhound Image Dashboard",
  description: "Internal studio tool for standardized AI image generation"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
