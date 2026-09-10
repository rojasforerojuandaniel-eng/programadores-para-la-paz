import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    order: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

import { GET } from "@/app/api/orders/track/route";

describe("/api/orders/track", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns orders for a phone number", async () => {
    const mockOrders = [
      {
        id: "order-1",
        customerName: "Juan",
        customerPhone: "+573001234567",
        totalAmount: 5000,
        status: "completed",
        paymentMethod: "nequi",
        items: [
          { product: { name: "Sticker Fuego" }, quantity: 3, unitPrice: 1000 },
          { product: { name: "Sticker Luna" }, quantity: 2, unitPrice: 1000 },
        ],
        tickets: [{ number: 5, status: "sold" }, { number: 12, status: "sold" }],
        raffle: { name: "Rifa iPhone", prize: "iPhone 15", totalNumbers: 1000 },
        createdAt: new Date("2026-08-01"),
      },
    ];

    mockPrisma.order.findMany.mockResolvedValue(mockOrders);

    const request = new Request("http://localhost/api/orders/track?phone=%2B573001234567");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.orders).toHaveLength(1);
    expect(data.orders[0].customerName).toBe("Juan");
    expect(data.orders[0].tickets).toHaveLength(2);

    // Busca por coincidencia EXACTA del número normalizado (sin prefijo país),
    // nunca con contains/LIKE que expondría pedidos de otros clientes.
    // Devuelve pedidos pagados (confirmed/completed) y también pending:
    // los pending con wompiTransactionId se auto-verifican contra Wompi aquí
    // mismo, para que el usuario vea sus stickers sin esperar el webhook.
    // Los cancelados (sin pago) NO se muestran.
    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          customerPhone: "3001234567",
          status: { in: ["confirmed", "completed", "pending"] },
        },
      })
    );
  });

  it("normalizes formatted phone numbers (spaces, dashes, +57)", async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);

    // "300 123-4567" y "+573001234567" deben normalizar al mismo valor
    const request = new Request("http://localhost/api/orders/track?phone=300%20123-4567");

    await GET(request);

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          customerPhone: "3001234567",
          status: { in: ["confirmed", "completed", "pending"] },
        },
      })
    );
  });

  it("only queries live orders (confirmed/completed/pending)", async () => {
    // Un pedido que se creó pero nunca se pagó (el usuario cerró Wompi sin pagar)
    // queda como "pending" hasta que el cron lo expire, o "cancelled" si el
    // frontend lo canceló. Cancelled queda excluido del query.
    mockPrisma.order.findMany.mockResolvedValue([]);

    const request = new Request("http://localhost/api/orders/track?phone=%2B573001234567");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    // Verifica que el filtro excluye cancelled
    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          customerPhone: "3001234567",
          status: { in: ["confirmed", "completed", "pending"] },
        },
      })
    );
    expect(data.orders).toEqual([]);
  });

  it("returns empty array when no orders found", async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);

    const request = new Request("http://localhost/api/orders/track?phone=%2B573000000000");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.orders).toHaveLength(0);
  });

  it("returns 400 when phone is missing", async () => {
    const request = new Request("http://localhost/api/orders/track");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Phone number required");
  });

  it("returns 500 on error", async () => {
    mockPrisma.order.findMany.mockRejectedValue(new Error("DB error"));

    const request = new Request("http://localhost/api/orders/track?phone=%2B573001234567");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Error fetching orders");
  });
});
