import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Commit Voice",
  description: "AI agent that turns GitHub commits into social media posts",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
