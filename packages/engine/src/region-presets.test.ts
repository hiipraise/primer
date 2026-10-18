import { describe, expect, it } from "vitest";
import { estimateMonthlyCostNgn, REGION_PRESETS } from "./region-presets";

describe("region presets and cost estimate", () => {
  it("includes the Nigeria payment preset without forcing a provider", () => {
    expect(REGION_PRESETS.find((region) => region.id === "nigeria")?.payments).toContain("Squad");
  });
  it("returns stage-based NGN monthly planning ranges", () => {
    expect(estimateMonthlyCostNgn({ stage: "prototype" })).toMatchObject({ min: 0, max: 25_000, currency: "NGN", period: "month" });
    expect(estimateMonthlyCostNgn({ stage: "production" }).max).toBeGreaterThan(estimateMonthlyCostNgn({ stage: "mvp" }).max);
    expect(estimateMonthlyCostNgn({ stage: "mvp", usdNgnRate: 1_000 })).toMatchObject({ usdMin: 35, usdMax: 150, usdNgnRate: 1_000 });
  });
});
