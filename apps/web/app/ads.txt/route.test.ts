import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const originalContent = process.env.ADS_TXT_CONTENT;
const originalPublisher = process.env.ADSENSE_PUBLISHER_ID;
afterEach(() => {
  if (originalContent === undefined) delete process.env.ADS_TXT_CONTENT;
  else process.env.ADS_TXT_CONTENT = originalContent;
  if (originalPublisher === undefined) delete process.env.ADSENSE_PUBLISHER_ID;
  else process.env.ADSENSE_PUBLISHER_ID = originalPublisher;
});

describe("ads.txt", () => {
  it("is unavailable until an ad publisher is configured", async () => {
    delete process.env.ADS_TXT_CONTENT;
    delete process.env.ADSENSE_PUBLISHER_ID;
    expect((await GET()).status).toBe(404);
  });

  it("generates the AdSense authorization line from the publisher ID", async () => {
    delete process.env.ADS_TXT_CONTENT;
    process.env.ADSENSE_PUBLISHER_ID = "ca-pub-1234567890123456";
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n");
    expect(response.headers.get("content-type")).toContain("text/plain");
  });

  it("serves custom provider contents", async () => {
    process.env.ADS_TXT_CONTENT = "example.com, account, DIRECT";
    const response = await GET();
    expect(await response.text()).toBe("example.com, account, DIRECT\n");
  });
});
