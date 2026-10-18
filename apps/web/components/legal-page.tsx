import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return <main className="legal-page"><Link href="/">Primer</Link><article><p className="eyebrow">Primer policies</p><h1>{title}</h1><p className="legal-updated">Last updated: {updated}</p>{children}<p className="legal-contact">Questions? Contact <a href="mailto:privacy@primer.build">privacy@primer.build</a>.</p><nav className="legal-nav"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/cookies">Cookies</Link></nav></article></main>;
}
