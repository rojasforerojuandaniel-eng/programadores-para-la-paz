import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { z } from "zod";
// Supports both live camera and offline-sync reconstructed multipart uploads.
import { requireAuthFromRequest } from "@/lib/auth-from-request";
import { clerkUserIdFromRequest } from "@/lib/auth";
import { withRateLimit } from "@/lib/with-rate-limit";
import { logger } from "@/lib/logger";

const MAX_RECEIPT_SIZE = 4.5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

function sanitizeFileName(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "receipt";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
}

const uploadReceiptSchema = z.object({
  file: z
    .instanceof(File)
    .refine((f) => f.size > 0, {
      message: "File must not be empty",
    })
    .refine((f) => ALLOWED_MIME_TYPES.has(f.type), {
      message: "Invalid file type. Allowed: JPEG, PNG, WebP, PDF",
    }),
});

export const POST = withRateLimit(
  async (request: Request) => {
    try {
      const auth = await requireAuthFromRequest(request);
      if (!auth?.profile) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const form = await request.formData();
      const file = form.get("file");

      const parseResult = uploadReceiptSchema.safeParse({ file });
      if (!parseResult.success) {
        return NextResponse.json(
          { error: "Invalid input", details: parseResult.error.flatten() },
          { status: 400 }
        );
      }

      const validatedFile = parseResult.data.file;
      if (validatedFile.size > MAX_RECEIPT_SIZE) {
        return NextResponse.json(
          { error: "File too large", maxBytes: MAX_RECEIPT_SIZE },
          { status: 413 }
        );
      }

      const safeName = sanitizeFileName(validatedFile.name);
      const blob = await put(
        `receipts/${auth.profile.id}/${Date.now()}-${safeName}`,
        validatedFile,
        {
          // Public so the OCR/AI provider can fetch the image; path is scoped to the user.
          access: "public",
          token: process.env.BLOB_READ_WRITE_TOKEN,
        }
      );

      return NextResponse.json({ url: blob.url });
    } catch (error) {
      logger.error("Mobile upload receipt error", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Failed to upload receipt" },
        { status: 500 }
      );
    }
  },
  {
    key: "mobile-upload-receipt",
    maxRequests: 10,
    windowMs: 60000,
    identifier: clerkUserIdFromRequest,
  }
);
