export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/utils";

const WOMPI_BASE_URL =
  process.env.WOMPI_ENVIRONMENT === "sandbox"
    ? "https://sandbox.wompi.co/v1"
    : "https://production.wompi.co/v1";

/**
 * Auto-verifica un pedido pendiente contra la API de Wompi.
 * Si la transacción fue aprobada, actualiza el pedido a "confirmed"
 * y re-asigna stickers si es necesario.
 * Devuelve true si el pedido fue confirmado.
 */
async function autoVerifyPendingOrder(orderId: string): Promise<boolean> {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== "pending" || order.paymentStatus !== "PENDING") {
      return false;
    }

    // Solo intentar verificar si tenemos wompiTransactionId
    // (el widget ya procesó algo)
    if (!order.wompiTransactionId) return false;

    const privateKey = process.env.WOMPI_PRIVATE_KEY;
    if (!privateKey) return false;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let res: Response;
    try {
      res = await fetch(`${WOMPI_BASE_URL}/transactions/${order.wompiTransactionId}`, {
        headers: { Authorization: `Bearer ${privateKey}` },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) return false;

    const data = await res.json();
    const transaction = data?.data?.transaction;
    if (!transaction) return false;

    if (transaction.status === "APPROVED") {
      const { reassignRaffleTickets } = await import("@/lib/order-utils");
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "APPROVED",
          status: "confirmed",
          wompiTransactionId: transaction.id || order.wompiTransactionId,
          paidAt: new Date(),
        },
      });
      // Re-asignar stickers si se perdieron
      await reassignRaffleTickets(order.id);
      return true;
    }

    return false;
  } catch (err) {
    console.error(`[TRACK] Auto-verify failed for order ${orderId}:`, err);
    return false;
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const phone = url.searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number required" },
        { status: 400 }
      );
    }

    // Normalizar a 10 dígitos ("+57 300 123 4567" → "3001234567")
    // y buscar SOLO coincidencia exacta: evita que un número parcial
    // (ej: "300123") exponga pedidos de otros clientes.
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json({ error: "Phone number required" }, { status: 400 });
    }

    // Buscar pedidos confirmados Y pendientes:
    // - Los pendientes pueden ser pagos que Wompi no confirmó a tiempo
    //   (webhook lento, verify falló, etc). Los auto-verificamos.
    // - Los cancelados NO se muestran (el usuario no pagó).
    const orders = await prisma.order.findMany({
      where: {
        customerPhone: normalizedPhone,
        status: { in: ["confirmed", "completed", "pending"] },
      },
      include: {
        tickets: true,
        raffle: true,
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Auto-verificar pedidos pendientes que tengan wompiTransactionId
    // (significa que el widget de Wompi ya procesó algo)
    const pendingOrders = orders.filter(
      (o) => o.status === "pending" && o.wompiTransactionId
    );
    if (pendingOrders.length > 0) {
      // Verificar en paralelo (no bloquear la respuesta)
      const results = await Promise.allSettled(
        pendingOrders.map((o) => autoVerifyPendingOrder(o.id))
      );
      const newlyConfirmed = results.filter(
        (r) => r.status === "fulfilled" && r.value === true
      ).length;
      if (newlyConfirmed > 0) {
        // Re-leer los pedidos que cambiaron de estado
        const refreshed = await prisma.order.findMany({
          where: {
            customerPhone: normalizedPhone,
            id: { in: pendingOrders.map((o) => o.id) },
            status: { in: ["confirmed", "completed"] },
          },
          include: { tickets: true, raffle: true, items: true },
        });
        // Actualizar en la lista
        for (const r of refreshed) {
          const idx = orders.findIndex((o) => o.id === r.id);
          if (idx !== -1) orders[idx] = r;
        }
      }
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error tracking orders:", error);
    return NextResponse.json({ error: "Error fetching orders" }, { status: 500 });
  }
}
