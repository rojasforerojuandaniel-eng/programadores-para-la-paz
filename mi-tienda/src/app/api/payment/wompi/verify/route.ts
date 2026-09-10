import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const WOMPI_BASE_URL =
  process.env.WOMPI_ENVIRONMENT === "sandbox"
    ? "https://sandbox.wompi.co/v1"
    : "https://production.wompi.co/v1";

// Safety guard: log the environment being used for debugging
console.log(`[wompi-verify] Using WOMPI_BASE_URL: ${WOMPI_BASE_URL} (env=${process.env.WOMPI_ENVIRONMENT || "undefined"})`);

export async function POST(req: Request) {
  try {
    const { transactionId, reference } = await req.json();

    if (!transactionId || !reference) {
      return NextResponse.json(
        { error: "transactionId y reference son requeridos" },
        { status: 400 }
      );
    }

    // La transacción se consulta en Wompi con la llave privada: NUNCA confiamos
    // en el callback del widget por sí solo, porque un cliente podría falsificarlo.
    const privateKey = process.env.WOMPI_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: "WOMPI_PRIVATE_KEY no configurada" },
        { status: 500 }
      );
    }

    // Timeout de 10s: si Wompi tarda o cae, no dejamos al cliente esperando
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let res: Response;
    try {
      res = await fetch(`${WOMPI_BASE_URL}/transactions/${transactionId}`, {
        headers: { Authorization: `Bearer ${privateKey}` },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "No se pudo verificar la transacción en Wompi" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const transaction = data?.data?.transaction;

    if (!transaction) {
      return NextResponse.json(
        { error: "Transacción no encontrada en Wompi" },
        { status: 404 }
      );
    }

    // Buscar el pedido por la referencia (usamos el id del pedido como referencia)
    const order = await prisma.order.findUnique({ where: { id: reference } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // El monto y la referencia deben coincidir exactamente con lo que se pidió
    const expectedAmount = order.totalAmount * 100;
    const amountMatches = Number(transaction.amount_in_cents) === expectedAmount;
    const referenceMatches = transaction.reference === reference;

    if (!amountMatches || !referenceMatches) {
      return NextResponse.json(
        { error: "La transacción no corresponde a este pedido" },
        { status: 400 }
      );
    }

    if (transaction.status === "APPROVED") {
      const alreadyPaid = order.paymentStatus === "APPROVED";

      // Si el pedido estaba cancelado (watcher lo canceló) pero el pago
      // llegó, resucitarlo a "confirmed". El usuario pagó, tiene derecho
      // a sus stickers.
      const newStatus = alreadyPaid ? order.status : "confirmed";

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "APPROVED",
          status: newStatus,
          // Guardar el ID confirmado por Wompi (no el que envió el cliente)
          wompiTransactionId: transaction.id || order.wompiTransactionId,
          paidAt: alreadyPaid ? order.paidAt : new Date(),
        },
      });

      // Si el pedido quedó sin stickers (el cron los liberó antes de la
      // confirmación, o nunca se asignaron), re-asignarlos ahora.
      if (!alreadyPaid) {
        const { reassignRaffleTickets } = await import("@/lib/order-utils");
        await reassignRaffleTickets(order.id);
      }

      return NextResponse.json({ approved: true });
    }

    // DECLINED/VOIDED/ERROR: liberamos boletas solo si nunca se pagó.
    // PENDING: NO cancelamos — el webhook lo confirmará cuando llegue.
    if (order.paymentStatus !== "APPROVED" && order.status === "pending") {
      const isDeclined = ["DECLINED", "VOIDED", "ERROR"].includes(transaction.status);
      if (isDeclined) {
        const { cancelOrderAssets } = await import("@/lib/order-utils");
        await cancelOrderAssets(order.id);
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: transaction.status || "DECLINED",
            status: "cancelled",
          },
        });
      }
      // Si es PENDING: no hacemos nada, esperamos el webhook
    }

    return NextResponse.json({ approved: false, status: transaction.status });
  } catch (error) {
    console.error("Error verifying Wompi transaction:", error);
    return NextResponse.json({ error: "Error verifying payment" }, { status: 500 });
  }
}
