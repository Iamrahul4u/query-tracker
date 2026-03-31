import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Query Tracker Phase 2",
  description:
    "Query Tracker has moved to Phase 2. Use the new dashboard to continue.",
  icons: {
    icon: "/download.png",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}

