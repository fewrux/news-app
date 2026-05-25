import type { Metadata } from "next";
import "./globals.css";
import { WebVitals } from "./_components/web-vitals";

export const metadata: Metadata = {
  title: "The Daily Brief",
  description: "A minimal news app for testing purposes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
