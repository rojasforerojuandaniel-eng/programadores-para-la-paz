import { describe, it, expect, vi } from "vitest";
import { withRateLimit } from "@/lib/with-rate-limit";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("withRateLimit", () => {
  it("calls handler and attaches rate limit headers", async () => {
    const handler = vi.fn(async () => new Response("ok"));
    const wrapped = withRateLimit(handler, {
      key: `headers-${Date.now()}`,
      maxRequests: 5,
      windowMs: 10000,
    });

    const res = await wrapped(new Request("http://localhost/api/test"));

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
    expect(Number(res.headers.get("X-RateLimit-Remaining"))).toBeGreaterThanOrEqual(0);
  });

  it("blocks requests after maxRequests using IP fallback", async () => {
    const handler = vi.fn(async () => new Response("ok"));
    const wrapped = withRateLimit(handler, {
      key: `ip-${Date.now()}`,
      maxRequests: 2,
      windowMs: 10000,
    });

    const req = new Request("http://localhost/api/test");
    expect((await wrapped(req)).status).toBe(200);
    expect((await wrapped(req)).status).toBe(200);

    const blocked = await wrapped(req);
    expect(blocked.status).toBe(429);
    const body = (await blocked.json()) as { error?: string };
    expect(body.error).toMatch(/too many requests/i);
  });

  it("uses the provided identifier instead of IP", async () => {
    const handler = vi.fn(async () => new Response("ok"));
    const wrapped = withRateLimit(handler, {
      key: `id-${Date.now()}`,
      maxRequests: 1,
      windowMs: 10000,
      identifier: () => "user-a",
    });

    const reqA = new Request("http://localhost/api/test");
    const reqB = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });

    expect((await wrapped(reqA)).status).toBe(200);
    expect((await wrapped(reqB)).status).toBe(429);
  });

  it("resets the counter after the window passes", async () => {
    const handler = vi.fn(async () => new Response("ok"));
    const wrapped = withRateLimit(handler, {
      key: `window-${Date.now()}`,
      maxRequests: 1,
      windowMs: 50,
    });

    const req = new Request("http://localhost/api/test");
    expect((await wrapped(req)).status).toBe(200);
    expect((await wrapped(req)).status).toBe(429);

    await sleep(60);
    expect((await wrapped(req)).status).toBe(200);
  });

  it("isolates different keys", async () => {
    const handler = vi.fn(async () => new Response("ok"));
    const wrappedA = withRateLimit(handler, {
      key: `isolate-a-${Date.now()}`,
      maxRequests: 1,
      windowMs: 10000,
    });
    const wrappedB = withRateLimit(handler, {
      key: `isolate-b-${Date.now()}`,
      maxRequests: 1,
      windowMs: 10000,
    });

    const req = new Request("http://localhost/api/test");
    expect((await wrappedA(req)).status).toBe(200);
    expect((await wrappedB(req)).status).toBe(200);
  });
});
