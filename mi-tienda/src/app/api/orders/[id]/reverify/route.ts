export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const WOMPI_BASE_URL =
  process.env.WOMPI_ENVIRONMENT === "sandbox"
    ? "https://sandbox.wompi.co/v1"
    : "https://production.wompi.co/v1";

/**
 * Re-verifica un pedido pendiente contra la API de Wompi.
 * El cliente llama este endpoint cuando un pedido está stuck en "pending".
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    // Solo re-verificar pedidos pendientes
    if (order.status !== "pending") {
      return NextResponse.json({
        status: order.status,
        message: "El pedido ya no está pendiente",
      });
    }

    // Si no tiene wompiTransactionId, no hay nada que verificar
    if (!order.wompiTransactionId) {
      return NextResponse.json({
        status: "pending",
        message: "El pago aún no fue procesado por Wompi",
      });
    }

    const privateKey = process.env.WOMPI_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ error: "WOMPI_PRIVATE_KEY no configurada" }, { status: 500 });
    }

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

    if (!res.ok) {
      return NextResponse.json({ status: "pending", message: "No se pudo verificar con Wompi" });
    }

    const data = await res.json();
    const transaction = data?.data?.transaction;

    if (!transaction) {
      return NextResponse.json({ status: "pending", message: "Transacción no encontrada en Wompi" });
    }

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

      return NextResponse.json({ status: "confirmed", message: "Pago confirmado ✅" });
    }

    if (["DECLINED", "VOIDED", "ERROR"].includes(transaction.status)) {
      const { cancelOrderAssets } = await import("@/lib/order-utils");
      await cancelOrderAssets(order.id);
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: transaction.status, status: "cancelled" },
      });
      return NextResponse.json({ status: "cancelled", message: "Pago no aprobado" });
    }

    // PENDING
    return NextResponse.json({ status: "pending", message: "El pago aún está en proceso" });
  } catch (error) {
    console.error("Error re-verifying order:", error);
    return NextResponse.json({ error: "Error al re-verificar" }, { status: 500 });
  }
}
