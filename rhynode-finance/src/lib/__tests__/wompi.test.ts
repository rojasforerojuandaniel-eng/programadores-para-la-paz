import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyWompiWebhook, type WompiBody } from "@/lib/webhooks/wompi";

const KEY = "test-secret-key";

function sign(body: WompiBody, properties: string[], key = KEY): string {
  const values = properties
    .map((prop) => {
      const parts = prop.split(".");
      let value: unknown = body;
      for (const part of parts) {
        value = (value as Record<string, unknown>)?.[part];
      }
      return value ?? "";
    })
    .join("");
  return crypto.createHmac("sha256", key).update(values).digest("hex");
}

describe("verifyWompiWebhook", () => {
  it("accepts a valid signature", () => {
    const body: WompiBody = {
      event: "transaction.updated",
      data: { transaction: { id: "txn_1", status: "APPROVED", reference: "ref_1" } },
    };
    const properties = ["event", "data.transaction.id", "data.transaction.status"];
    const checksum = sign(body, properties);
    expect(
      verifyWompiWebhook(
        { ...body, signature: { properties, checksum } },
        KEY
      )
    ).toBe(true);
  });

  it("rejects a tampered checksum", () => {
    const body: WompiBody = {
      event: "transaction.updated",
      data: { transaction: { id: "txn_1", status: "APPROVED", reference: "ref_1" } },
    };
    const properties = ["event", "data.transaction.id"];
    const valid = sign(body, properties);
    const alt = valid[0] === "0" ? "1" : "0";
    const checksum = alt + valid.slice(1); // same length, different content
    expect(
      verifyWompiWebhook(
        { ...body, signature: { properties, checksum } },
        KEY
      )
    ).toBe(false);
  });

  it("rejects a signature signed with a different key", () => {
    const body: WompiBody = {
      event: "transaction.updated",
      data: { transaction: { id: "txn_1", status: "APPROVED", reference: "ref_1" } },
    };
    const properties = ["event", "data.transaction.id"];
    const checksum = sign(body, properties, "wrong-key");
    expect(
      verifyWompiWebhook(
        { ...body, signature: { properties, checksum } },
        KEY
      )
    ).toBe(false);
  });

  it("rejects when signature is missing", () => {
    const body: WompiBody = { event: "transaction.updated" };
    expect(verifyWompiWebhook(body, KEY)).toBe(false);
  });

  it("rejects a checksum of different length without throwing", () => {
    const body: WompiBody = {
      event: "transaction.updated",
      data: { transaction: { id: "txn_1", status: "APPROVED", reference: "ref_1" } },
    };
    const properties = ["event"];
    expect(
      verifyWompiWebhook(
        { ...body, signature: { properties, checksum: "short" } },
        KEY
      )
    ).toBe(false);
  });
});