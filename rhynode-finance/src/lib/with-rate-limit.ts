import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

type RouteContext<T = Record<string, string | string[]>> = {
  params: Promise<T>;
};

export function withRateLimit<T = Record<string, string | string[]>>(
  handler: (request: Request, context?: RouteContext<T>) => Promise<Response> | Response,
  options: { key?: string; maxRequests?: number; windowMs?: number } = {}
) {
  return async function (request: Request, context?: RouteContext<T>): Promise<Response> {
    const ip = getClientIp(request);
    const key = `${options.key || "api"}:${ip}`;
    const limit = rateLimit(key, options.maxRequests ?? 30, options.windowMs ?? 60000);

    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(limit.limit),
            "X-RateLimit-Remaining": String(limit.remaining),
            "X-RateLimit-Reset": String(limit.resetAt),
          },
        }
      );
    }

    const response = await handler(request, context);

    // Attach rate limit headers if possible
    if (response.headers) {
      response.headers.set("X-RateLimit-Limit", String(limit.limit));
      response.headers.set("X-RateLimit-Remaining", String(limit.remaining));
      response.headers.set("X-RateLimit-Reset", String(limit.resetAt));
    }

    return response;
  };
}
