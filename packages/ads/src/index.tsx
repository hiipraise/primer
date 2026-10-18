"use client";

import { useEffect, useRef, useState } from "react";

let providerScriptPromise: Promise<void> | null = null;
function loadProviderScript(src: string, clientId?: string): Promise<void> {
  if (providerScriptPromise) return providerScriptPromise;
  const current = document.getElementById("primer-ad-provider") as HTMLScriptElement | null;
  if (current?.dataset.loaded === "true") return Promise.resolve();
  providerScriptPromise = new Promise((resolve, reject) => {
    const script = current ?? document.createElement("script");
    script.id = "primer-ad-provider";
    script.async = true;
    if (clientId) script.dataset.adClient = clientId;
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = () => { script.remove(); providerScriptPromise = null; reject(new Error("Ad provider script failed to load.")); };
    if (!current) { script.src = src; document.head.appendChild(script); }
  });
  return providerScriptPromise;
}

function slotFor(position: string) {
  const slots: Record<string, string | undefined> = {
    "generation-result": process.env.NEXT_PUBLIC_ADSENSE_SLOT_GENERATION_RESULT,
    "public-prompt-sidebar": process.env.NEXT_PUBLIC_ADSENSE_SLOT_PUBLIC_PROMPT_SIDEBAR,
    "explore-sidebar": process.env.NEXT_PUBLIC_ADSENSE_SLOT_EXPLORE_SIDEBAR,
  };
  return slots[position];
}

export function AdSlot({
  position,
  width = 320,
  height = 100,
  consentGranted = false,
}: {
  position: string;
  width?: number;
  height?: number;
  consentGranted?: boolean;
}) {
  const enabled = process.env.NEXT_PUBLIC_ADS_ENABLED === "true";
  const provider = process.env.NEXT_PUBLIC_AD_PROVIDER ?? "adsense";
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const scriptUrl = provider === "adsense"
    ? clientId ? `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}` : undefined
    : process.env.NEXT_PUBLIC_AD_SCRIPT_URL;
  const slot = slotFor(position);
  const canRender = enabled && consentGranted && Boolean(scriptUrl) && (provider !== "adsense" || Boolean(clientId && slot));
  const [inView, setInView] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const size = `${width}x${height}`;

  useEffect(() => {
    if (!canRender) initialized.current = false;
  }, [canRender]);

  useEffect(() => {
    const element = host.current;
    if (!element || !canRender || inView) return;
    if (!("IntersectionObserver" in window)) { setInView(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setInView(true);
        observer.disconnect();
      }
    }, { rootMargin: "200px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, [canRender, inView]);

  useEffect(() => {
    if (!canRender || !inView || !scriptUrl) return;
    let active = true;
    void loadProviderScript(scriptUrl, provider === "adsense" ? clientId : undefined).then(() => {
      if (!active || provider !== "adsense" || initialized.current) return;
      const ads = window as Window & { adsbygoogle?: Array<Record<string, never>> };
      ads.adsbygoogle = ads.adsbygoogle || [];
      ads.adsbygoogle.push({});
      initialized.current = true;
    }).catch((error: unknown) => console.error("[ads] Provider could not initialize", error));
    return () => { active = false; initialized.current = false; };
  }, [canRender, clientId, inView, provider, scriptUrl]);

  if (!enabled) return null;
  return <div ref={host} data-ad-position={position} data-ad-size={size} className="primer-ad-slot" aria-label={canRender ? "Advertisement" : undefined} aria-hidden={!canRender}>
    {canRender && inView && provider === "adsense" && <ins className="adsbygoogle" data-ad-client={clientId} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />}
    {canRender && inView && provider !== "adsense" && <div className="primer-custom-ad" data-ad-provider={provider} data-ad-position={position} />}
  </div>;
}
