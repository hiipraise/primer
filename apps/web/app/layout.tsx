import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../components/auth-provider";

export const metadata: Metadata = {
  title: "Primer",
  description:
    "Describe what you want to build. Primer hands you the stack, the tools, and a senior-level execution-ready prompt — refined through conversation, saved forever, ready to paste into any AI platform.",
  openGraph: {
    title: "Primer",
    description:
      "Preps you before you build. Stack, tools, and a ready-to-paste prompt.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "placeholder"}'
        />
      </head>
      <body className="min-h-screen antialiased" style={{ backgroundColor: "#211F1C", color: "#EDE9DF" }} suppressHydrationWarning>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
