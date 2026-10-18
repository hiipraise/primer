import Script from "next/script";

/** Cloudflare Web Analytics stays off until an account token is configured. */
export function Analytics() {
  const token = process.env.NEXT_PUBLIC_CLOUDFLARE_BEACON_TOKEN;
  if (!token) return null;

  return (
    <Script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token })}
      strategy="afterInteractive"
    />
  );
}
