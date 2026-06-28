import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAuthFromRequest } from "@/lib/auth-from-request";
import { withRateLimit } from "@/lib/with-rate-limit";
import { logger } from "@/lib/logger";

export const POST = withRateLimit(
  async (request: Request) => {
    try {
      const auth = await requireAuthFromRequest(request);
      if (!auth?.profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const form = await request.formData();
      const file = form.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
      }

      const blob = await put(`receipts/${auth.profile.id}/${Date.now()}-${file.name}`, file, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      return NextResponse.json({ url: blob.url });
    } catch (error) {
      logger.error("Mobile upload receipt error", { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json({ error: "Failed to upload receipt" }, { status: 500 });
    }
  },
  { key: "mobile-upload-receipt", maxRequests: 30, windowMs: 60000 }
);
