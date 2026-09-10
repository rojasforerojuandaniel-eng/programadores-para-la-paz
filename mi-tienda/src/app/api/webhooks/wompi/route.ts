import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { cancelOrderAssets, reassignRaffleTickets } from "@/lib/order-utils";

export async function POST(req: Request) {
  // Leer el body crudo para verificar el checksum sobre el contenido exacto
  const rawBody = await req.text();
  const eventsSecret = process.env.WOMPI_EVENTS_SECRET;

  if (eventsSecret) {
    const headerChecksum = req.headers.get("x-event-checksum");
    const expectedChecksum = crypto
      .createHash("sha256")
      .update(eventsSecret + rawBody)
      .digest("hex");

    if (!headerChecksum || headerChecksum !== expectedChecksum) {
      console.warn("Webhook Wompi rechazado: checksum inválido");
      return NextResponse.json({ error: "Invalid checksum" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // Fail-closed en producción: sin secreto no se procesa nada
    console.error("WOMPI_EVENTS_SECRET no configurado en producción");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  } else {
    console.warn("WOMPI_EVENTS_SECRET no configurado: webhooks sin verificación de firma (solo dev)");
  }

  try {
    const body = JSON.parse(rawBody);
    const { event, data } = body;

    if (event === "transaction.updated" && data?.transaction) {
      const { id: wompiTransactionId, status, reference } = data.transaction;

      // Buscar el pedido por referencia (usamos el id del pedido como referencia)
      const order = await prisma.order.findFirst({
        where: {
          OR: [{ id: reference }, { wompiTransactionId: wompiTransactionId }],
        },
      });

      if (!order) {
        console.error("Order not found for reference:", reference);
        return new Response("Order not found", { status: 404 });
      }

      let paymentStatus: string;
      let orderStatus: string;

      switch (status) {
        case "APPROVED":
          paymentStatus = "APPROVED";
          orderStatus = "confirmed";
          break;
        case "DECLINED":
        case "VOIDED":
        case "ERROR":
          paymentStatus = status;
          orderStatus = "cancelled";
          break;
        case "PENDING":
        default:
          paymentStatus = "PENDING";
          orderStatus = "pending";
          break;
      }

      const alreadyPaid = order.paymentStatus === "APPROVED";
      const wasCancelled = order.status === "cancelled";

      // Liberar boletas/stock solo si el pago NUNCA se aprobó (rechazo o error inicial).
      // Un VOIDED/refund después de un APPROVED no toca boletas de una rifa ya sorteada.
      if (orderStatus === "cancelled" && !wasCancelled && !alreadyPaid) {
        await cancelOrderAssets(order.id);
      }

      // Resucitar un pedido cancelado si el pago fue aprobado:
      // Esto cubre el caso donde el watcher lo canceló (por timeout del widget)
      // pero el pago PSE/banco llegó después vía webhook.
      let finalOrderStatus = orderStatus;
      if (orderStatus === "confirmed" && wasCancelled && !alreadyPaid) {
        finalOrderStatus = "confirmed"; // Resucitar: el pago llegó, el pedido se confirma
      }

      // paidAt solo se marca en el primer APPROVED (idempotencia)
      const shouldSetPaidAt =
        status === "APPROVED" && !alreadyPaid;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus,
          status: finalOrderStatus,
          wompiTransactionId: wompiTransactionId || order.wompiTransactionId,
          paidAt: shouldSetPaidAt ? new Date() : order.paidAt,
        },
      });

      // Si el pago fue aprobado y el pedido tiene rifa, asegurar que tenga stickers.
      // Cubre el caso donde el cron los liberó antes de que llegara el webhook.
      if (status === "APPROVED" && order.raffleId) {
        console.log(`[WEBHOOK] Payment APPROVED for order ${order.id} - assigning tickets...`);
        const reassignResult = await reassignRaffleTickets(order.id);
        if (reassignResult) {
          console.log(`[WEBHOOK] Tickets assigned successfully for order ${order.id}`);
        } else {
          console.error(`[WEBHOOK] Failed to assign tickets for order ${order.id}`);
        }
      }

      console.log(`[WEBHOOK] Order ${order.id} updated: paymentStatus=${paymentStatus}, orderStatus=${orderStatus}`);
    }

    // Siempre responder 200 para que Wompi no reintente
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    // Responder 200 igualmente para evitar reintentos
    return new Response("OK", { status: 200 });
  }
}
