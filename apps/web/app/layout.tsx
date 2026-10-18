import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../components/auth-provider";
import { cookies } from "next/headers";
import { ConsentProvider } from "../components/consent-provider";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://primer.build"),
  title: "Primer",
  description:
    "Describe what you want to build. Primer hands you the stack, the tools, and a senior-level execution-ready prompt — refined through conversation, saved forever, ready to paste into any AI platform.",
  openGraph: {
    title: "Primer",
    description:
      "Preps you before you build. Stack, tools, and a ready-to-paste prompt.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const consentCookie = (await cookies()).get("primer_consent")?.value;
  const initialChoice = consentCookie === "accepted" || consentCookie === "rejected" ? consentCookie : null;
  return (
    <html lang="en">
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <ConsentProvider initialChoice={initialChoice}>
          <AuthProvider>{children}</AuthProvider>
        </ConsentProvider>
      </body>
    </html>
  );
}
