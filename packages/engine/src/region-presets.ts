export const REGION_PRESETS = [
  { id: "global", label: "Global", payments: "Stripe or a provider available in your launch country", notes: "Use the region where most customers and data will live." },
  { id: "nigeria", label: "Nigeria", payments: "Paystack, Flutterwave, or Squad", notes: "Plan for local payment methods, mobile networks, and NGN pricing." },
  { id: "squad", label: "Nigeria · Squad", payments: "Squad", notes: "Use Squad when its supported payment methods match your audience." },
] as const;

export type RegionPreset = typeof REGION_PRESETS[number]["id"];

export function estimateMonthlyCostNgn(options: { stage?: string; lowBandwidth?: boolean } = {}) {
  const stage = (options.stage ?? "mvp").toLowerCase();
  let range = stage.includes("scale") || stage.includes("production")
    ? { min: 150_000, max: 650_000 }
    : stage.includes("prototype") || stage.includes("idea")
      ? { min: 0, max: 25_000 }
      : { min: 35_000, max: 150_000 };
  return { ...range, currency: "NGN" as const, period: "month" as const, estimate: true as const };
}
