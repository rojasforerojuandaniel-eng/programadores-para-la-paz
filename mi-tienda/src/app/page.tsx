"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/Toast";
import { formatCurrency } from "@/lib/utils";
import FAQSection from "@/components/FAQSection";
import Image from "next/image";

interface Raffle {
  id: string;
  name: string;
  prize: string;
  description: string | null;
  prizeImageUrl: string | null;
  stickerPrice: number;
  totalNumbers: number;
  soldNumbers: number;
  status: string;
  winningNumber: number | null;
  drawDate: string | null;
  lotteryName: string | null;
}

// Cuenta regresiva en vivo hasta el sorteo (crea urgencia y transparencia).
// drawDate llega como fecha pura (medianoche UTC) → contamos hasta el FINAL de ese
// día, para que el sorteo del 16-oct se muestre completo el 16 (no se corte el 15).
function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const raw = new Date(target).getTime();
  const endOfDay = raw + 86400000 - 1; // 23:59:59.999 del día del sorteo
  const diff = endOfDay - now;
  if (diff <= 0) {
    return (
      <div className="mt-5 inline-flex items-center gap-2 px-5 py-3 bg-white/15 backdrop-blur-sm border border-white/25 rounded-2xl text-white font-bold animate-pulse">
        🎉 ¡Hoy es el sorteo!
      </div>
    );
  }

  const units = [
    { label: "Días", value: Math.floor(diff / 86400000) },
    { label: "Horas", value: Math.floor((diff % 86400000) / 3600000) },
    { label: "Min", value: Math.floor((diff % 3600000) / 60000) },
    { label: "Seg", value: Math.floor((diff % 60000) / 1000) },
  ];

  return (
    <div className="mt-5 flex justify-center gap-2 sm:gap-3">
      {units.map((u) => (
        <div
          key={u.label}
          className="w-16 sm:w-[4.5rem] py-3 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg"
        >
          <p className="text-2xl sm:text-3xl font-black text-white tabular-nums leading-none">
            {String(u.value).padStart(2, "0")}
          </p>
          <p className="text-[10px] text-emerald-100 uppercase tracking-wider mt-1">{u.label}</p>
        </div>
      ))}
    </div>
  );
}

interface WompiPaymentResult {
  transaction?: string;
  id?: string;
}

// Fetch con timeout: si el servidor tarda o cae, no dejamos al usuario
// atascado en "Procesando..." para siempre.
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export default function HomePage() {
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWidget, setShowWidget] = useState(false);
  const [quantity, setQuantity] = useState(0);
  const [form, setForm] = useState({ name: "", phone: "", address: "", email: "" });
  const [purchasing, setPurchasing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [assignedTickets, setAssignedTickets] = useState<{ number: number; status: string }[]>([]);
  const { addToast } = useToast();

  // Ref (no estado) para el pedido pendiente: el callback del widget se crea en
  // un render anterior, y con un estado capturaría un valor viejo (stale
  // closure) haciendo que cancelPendingOrder no hiciera nada.
  const pendingOrderIdRef = useRef<string | null>(null);

  // Marca si el flujo de compra sigue activo (se apaga al cerrar el modal).
  const purchaseActiveRef = useRef(false);
  const widgetWatcherRef = useRef<number | null>(null);

  // Cancela el pedido pendiente en el servidor y libera sus boletas.
  const cancelPendingOrder = async () => {
    const id = pendingOrderIdRef.current;
    if (!id) return;
    pendingOrderIdRef.current = null;
    try {
      await fetch(`/api/orders/${id}/cancel`, { method: "POST" });
    } catch {
      // Silencioso: el cron de expiración lo limpiará igualmente
    }
  };

  // El callback de widget.open() NO siempre se dispara cuando el usuario cierra
  // el widget con la "X" (bug conocido de Wompi). Si el iframe del widget
  // desaparece del DOM sin que el callback corra, el botón quedaría en
  // "Procesando..." para siempre y las boletas reservadas. Este watcher
  // detecta el cierre real del widget (su iframe) y resetea todo.
  const clearWidgetWatcher = () => {
    if (widgetWatcherRef.current !== null) {
      window.clearInterval(widgetWatcherRef.current);
      widgetWatcherRef.current = null;
    }
  };

  // Flag para evitar que el watcher cancele después de que el callback ya procesó.
  const callbackFiredRef = useRef(false);

  const startWidgetWatcher = () => {
    clearWidgetWatcher();
    callbackFiredRef.current = false;
    let sawIframe = false;
    let attempts = 0;
    let disappearCount = 0;
    // Gracia de 120s para redirects PSE/banco: el usuario es redirigido a la
    // página del banco, confirma el pago, y regresa a Wompi. Esto puede tardar
    // 1-2 minutos. 240 intentos × 500ms = 120 segundos.
    // El cron de 30 min limpia pedidos abandonedos, así que no hay riesgo de
    // dejar boletas apartadas para siempre.
    const DISAPPEAR_THRESHOLD = 240;
    // Máximo tiempo total del watcher: 5 minutos (para no correr para siempre).
    const MAX_ATTEMPTS = 600;
    widgetWatcherRef.current = window.setInterval(() => {
      attempts += 1;
      // Si el callback ya se disparó, no hacer nada más.
      if (callbackFiredRef.current) {
        clearWidgetWatcher();
        return;
      }
      // Si se pasó del tiempo máximo, limpiar.
      if (attempts > MAX_ATTEMPTS) {
        clearWidgetWatcher();
        return;
      }
      const iframe = document.querySelector(
        'iframe.waybox-iframe, iframe#waybox-iframe, iframe[src*="checkout.wompi.co"]'
      );
      if (iframe) {
        sawIframe = true;
        disappearCount = 0;
        return;
      }
      if (!sawIframe) {
        // El widget aún no inserta su iframe (está cargando). Máx ~10s.
        if (attempts > 20) {
          // El iframe nunca apareció: falló al abrir el widget.
          clearWidgetWatcher();
          purchaseActiveRef.current = false;
          cancelPendingOrder();
          setPurchasing(false);
        }
        return;
      }
      // El iframe desapareció (posible redirect PSE/banco).
      // Dar gracia de 30s antes de cancelar para no romper pagos en curso.
      disappearCount += 1;
      if (disappearCount >= DISAPPEAR_THRESHOLD) {
        clearWidgetWatcher();
        purchaseActiveRef.current = false;
        cancelPendingOrder();
        setPurchasing(false);
      }
    }, 500);
  };

  useEffect(() => {
    fetch("/api/raffles")
      .then((res) => res.json())
      .then((data) => {
        const active = data.find((r: Raffle) => r.status === "active");
        setRaffle(active || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Limpiar el watcher del widget si el componente se desmonta
  useEffect(() => {
    return () => {
      if (widgetWatcherRef.current !== null) {
        window.clearInterval(widgetWatcherRef.current);
        widgetWatcherRef.current = null;
      }
    };
  }, []);

  const getPackages = () => {
    const pkgs = [];
    pkgs.push({ qty: 1, tickets: 1, label: "1", sub: "1 sticker" });
    pkgs.push({ qty: 2, tickets: 2, label: "2", sub: "2 stickers", popular: true });
    pkgs.push({ qty: 5, tickets: 5, label: "5", sub: "5 stickers" });
    pkgs.push({ qty: 10, tickets: 10, label: "10", sub: "10 stickers" });
    return pkgs;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!raffle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-3">Proximamente</h1>
          <p className="text-emerald-100 text-lg">Nuevas rifas estaran disponibles pronto</p>
        </div>
      </div>
    );
  }

  const totalCost = quantity * raffle.stickerPrice;
  const percentage = Math.round((raffle.soldNumbers / raffle.totalNumbers) * 100);
  const packages = getPackages();

  const openWidget = () => {
    purchaseActiveRef.current = true;
    setQuantity(1);
    setShowWidget(true);
    setSuccess(false);
  };

  const closeWidget = () => {
    purchaseActiveRef.current = false;
    clearWidgetWatcher();
    setShowWidget(false);
    setPurchasing(false);
    setAssignedTickets([]);
    cancelPendingOrder();
  };

  const handlePurchase = async () => {
    if (!form.name || !form.phone || !form.address) {
      addToast("Ingresa nombre, telefono y direccion", "error");
      return;
    }
    // Email obligatorio: es el respaldo de contacto si el teléfono está mal
    // (para avisar al ganador o confirmar el pedido).
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email || !emailRegex.test(form.email.trim())) {
      addToast("Ingresa un email válido", "error");
      return;
    }
    if (quantity < 1) {
      addToast("Minimo 1 sticker", "error");
      return;
    }

    setPurchasing(true);
    try {
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.name,
          customerPhone: form.phone,
          customerEmail: form.email || null,
          totalAmount: totalCost,
          paymentMethod: "wompi",
          deliveryAddress: form.address,
          deliveryCity: "Colombia",
          acceptTerms: true,
          raffleId: raffle.id,
          stickerCount: quantity,
          items: [{ productId: "sticker", quantity, unitPrice: raffle.stickerPrice }],
        }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json();
        throw new Error(err.error || "Error al crear pedido");
      }

      const order = await orderRes.json();
      pendingOrderIdRef.current = order.id;

      // Si el usuario cerró el modal mientras se creaba el pedido, cancelamos
      // el pedido recién creado para no dejar boletas reservadas.
      if (!purchaseActiveRef.current) {
        cancelPendingOrder();
        return;
      }

      const sigRes = await fetch("/api/payment/wompi/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: order.id, amount: totalCost }),
      });
      if (!sigRes.ok) throw new Error("Error al generar pago");
      const { signature } = await sigRes.json();

      if (!purchaseActiveRef.current) {
        cancelPendingOrder();
        return;
      }
      if (!window.WidgetCheckout) {
        throw new Error("Widget de pago no disponible. Recarga la pagina.");
      }

      const widget = new window.WidgetCheckout({
        currency: "COP",
        amountInCents: totalCost * 100,
        reference: order.id,
        publicKey: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY || "",
        signature: { integrity: signature },
      });

      // Vigila el iframe del widget: si desaparece sin que el callback corra
      // (el usuario cerró con la "X"), reseteamos el estado y liberamos boletas.
      startWidgetWatcher();

      widget.open(async (result: WompiPaymentResult) => {
        // Marcar que el callback se disparó ANTES de procesar.
        // Esto previene que el watcher cancele un pago que ya se procesó.
        callbackFiredRef.current = true;
        clearWidgetWatcher();
        try {
          if (result?.transaction === "APPROVED" && result.id) {
            try {
              // Confirmar en el servidor contra Wompi (no confiar solo en el widget)
              const verifyRes = await fetchWithTimeout(
                "/api/payment/wompi/verify",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ transactionId: result.id, reference: order.id }),
                },
                15000
              );
              if (!verifyRes.ok) {
                // No pudimos verificar (el servidor falló/Wompi caído). El widget
                // dijo APPROVED: NO cancelamos un pedido posiblemente pagado.
                // El webhook o /verificar lo confirmarán.
                pendingOrderIdRef.current = null;
                setSuccess(true);
                addToast("Pago recibido. Confirmaremos tus stickers en unos minutos", "success");
              } else {
                const verifyData = await verifyRes.json().catch(() => ({}));
                if (verifyData.approved) {
                  pendingOrderIdRef.current = null;
                  setSuccess(true);
                  addToast("Pago exitoso", "success");
                } else if (verifyData.status === "PENDING") {
                  // Pago en proceso: NO cancelamos, esperamos el webhook
                  pendingOrderIdRef.current = null;
                  setSuccess(true);
                  addToast("Pago recibido. Confirmaremos tus stickers en unos minutos", "success");
                } else {
                  addToast(verifyData.error || "No se pudo confirmar el pago", "error");
                  cancelPendingOrder();
                }
              }
            } catch {
              // No pudimos verificar (red lenta/caída). No cancelamos: el pago
              // puede haber llegado. El webhook o /verificar lo confirmarán, y
              // el cron de 30 min libera las boletas solo si nunca se pagó.
              pendingOrderIdRef.current = null;
              setSuccess(true);
              addToast("Pago recibido. Confirmaremos tus stickers en unos minutos", "success");
            }

            // Tras pago exitoso, obtener los números asignados
            try {
              const trackRes = await fetchWithTimeout(
                `/api/orders/track?phone=${encodeURIComponent(form.phone)}`,
                {},
                10000
              );
              if (trackRes.ok) {
                const trackData = await trackRes.json().catch(() => ({}));
                if (trackData.orders?.length > 0) {
                  const latestOrder = trackData.orders[0];
                  if (latestOrder.tickets?.length > 0) {
                    setAssignedTickets(latestOrder.tickets);
                  }
                }
              }
            } catch {
              // El usuario siempre puede consultar en /verificar
            }
          } else if (result?.transaction === "DECLINED") {
            addToast("Pago rechazado", "error");
            cancelPendingOrder();
          } else {
            // Widget cerrado sin completar (result undefined/null)
            cancelPendingOrder();
          }
        } finally {
          setPurchasing(false);
        }
      });
    } catch (err) {
      addToast(err instanceof Error ? err.message : "Error al procesar", "error");
      // Si el pedido ya se creó pero falló la firma o el widget, liberamos las boletas
      clearWidgetWatcher();
      cancelPendingOrder();
      setPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* HERO GRADIENT */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500">
        {/* Decorative elements */}          <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-400/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" aria-hidden="true" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-emerald-400/15 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
        
        <div className="relative max-w-2xl mx-auto px-6 pt-12 pb-20 md:pt-20 md:pb-28 text-center">
          {/* GANA label */}
          <p className="text-2xl md:text-3xl font-bold text-white/90 mb-2 tracking-widest uppercase">
            Gana
          </p>

          {/* Prize */}
          {raffle.prizeImageUrl ? (
            <div className="mb-4">
              <Image
                src={raffle.prizeImageUrl}
                alt={raffle.prize}
                width={400}
                height={225}
                className="w-full max-w-md mx-auto rounded-2xl shadow-2xl border-4 border-white/20"
                unoptimized
              />
              <p className="text-3xl md:text-4xl font-black text-white mt-4 drop-shadow-lg">
                {raffle.prize}
              </p>
            </div>
          ) : (
            <h1 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tight mb-3 drop-shadow-lg">
              {raffle.prize}
            </h1>
          )}

          {/* Percentage (big, centered) */}
          <div className="mb-10 mt-6">
            <div className="max-w-xs mx-auto">
              <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
            <p className="text-5xl md:text-6xl font-black text-white mt-4 drop-shadow">
              {percentage}%
            </p>
            <p className="text-emerald-100 text-base mt-1 uppercase tracking-wider font-medium">
              Vendido
            </p>
          </div>

          {/* Price */}
          <p className="text-emerald-100 mb-2">Cada sticker</p>
          <p className="text-5xl md:text-6xl font-black text-white mb-8 drop-shadow">
            {formatCurrency(raffle.stickerPrice)}
            <span className="text-lg text-emerald-200 font-normal ml-2">COP</span>
          </p>

          {/* Sorteo: fecha + lotería oficial + cuenta regresiva */}
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white text-sm font-semibold shadow-lg">
              <span aria-hidden="true">🎰</span>
              <span>
                {raffle.drawDate
                  ? (() => {
                      // Formatear el día en UTC (la fecha se guarda a medianoche UTC)
                      // para que en Colombia (UTC-5) no se muestre el día anterior.
                      const label = new Intl.DateTimeFormat("es-CO", {
                        day: "numeric",
                        month: "long",
                        timeZone: "UTC",
                      }).format(new Date(raffle.drawDate!));
                      return `Juega el ${label}`;
                    })()
                  : "Sorteo"}
                {raffle.lotteryName && <span> · {raffle.lotteryName}</span>}
              </span>
            </div>
            {raffle.drawDate && <Countdown target={raffle.drawDate} />}
          </div>

          {/* Banner: sorteo semanal */}
          <div className="mb-8 inline-flex items-center gap-2 px-5 py-3 bg-yellow-400/90 backdrop-blur-sm border border-yellow-300 rounded-2xl text-yellow-900 font-bold text-sm shadow-lg">
            <span aria-hidden="true">💰</span>
            <span>Cada viernes se sortea <strong>$1.000.000</strong></span>
          </div>

          {/* CTA */}
          <button
            onClick={openWidget}
            className="w-full max-w-sm mx-auto block py-5 bg-white text-emerald-600 font-bold text-lg rounded-2xl hover:bg-emerald-50 transition-all shadow-xl shadow-black/20 active:scale-[0.98] transform"
          >
            Comprar ahora
          </button>

          <a
            href="/verificar"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-white/15 backdrop-blur-sm text-white font-semibold text-sm rounded-xl border border-white/20 hover:bg-white/25 hover:border-white/30 transition-all shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Ya tengo stickers
          </a>
        </div>
      </div>

      {/* CONTENT SECTION */}
      <div className="bg-white">
        {/* Trust */}
        <section className="py-16">
          <div className="max-w-2xl mx-auto px-6">
            <div className="grid grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                  <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <p className="font-semibold text-gray-900">100% Seguro</p>
                <p className="text-sm text-gray-500 mt-1">Pago encriptado</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                  <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                </div>
                <p className="font-semibold text-gray-900">Instantaneo</p>
                <p className="text-sm text-gray-500 mt-1">Stickers al momento</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                  <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <p className="font-semibold text-gray-900">Transparente</p>
                <p className="text-sm text-gray-500 mt-1">Sorteo en vivo</p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">Preguntas frecuentes</h2>
            <p className="text-gray-500 text-center mb-10">Todo lo que necesitas saber</p>
            
            <FAQSection />
          </div>
        </section>
      </div>

      {/* FOOTER: lo renderiza ClientLayout (componente Footer) */}

      {/* PURCHASE WIDGET */}
      {showWidget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeWidget}
          />

          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sm:hidden flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-gray-900">Comprar stickers</h3>
              <button
                onClick={closeWidget}
                aria-label="Cerrar panel de compra"
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {success ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6" aria-hidden="true">
                    <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">¡Pago exitoso!</h4>
                  <p className="text-gray-500 mb-4">
                    Recibiste <strong className="text-gray-900">{quantity} sticker(s)</strong>
                  </p>

                  {assignedTickets.length > 0 && (
                    <div className="mb-6">
                      <p className="text-sm text-gray-500 mb-2">Tus stickers:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {assignedTickets.map((ticket) => (
                          <div
                            key={ticket.number}
                            className="px-4 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl font-bold text-base"
                          >
                            #{String(ticket.number).padStart(3, "0")}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <a
                    href={`/verificar?phone=${encodeURIComponent(form.phone)}`}
                    className="block w-full py-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors text-center"
                  >
                    Verificar mis stickers
                  </a>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <p className="text-sm text-gray-500 mb-3">Selecciona tu paquete</p>
                    <div className="grid grid-cols-4 gap-2">
                      {packages.map((pkg, idx) => (
                        <button
                          key={idx}
                          onClick={() => setQuantity(pkg.qty)}
                          className={`relative p-3 rounded-xl border text-center transition-all ${
                            quantity === pkg.qty
                              ? "border-emerald-500 bg-emerald-50 shadow-md"
                              : "border-gray-200 bg-gray-50 hover:border-gray-300"
                          }`}
                        >
                          {pkg.popular && (
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                              Popular
                            </div>
                          )}
                          <p className={`text-lg font-bold ${quantity === pkg.qty ? "text-emerald-600" : "text-gray-900"}`}>
                            {pkg.label}
                          </p>
                          <p className={`text-[10px] ${quantity === pkg.qty ? "text-emerald-500" : "text-gray-400"}`}>
                            {pkg.sub}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 bg-white border border-gray-200 rounded-lg text-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        -
                      </button>
                      <div className="text-center">
                        <span className="text-3xl font-bold text-gray-900">{quantity}</span>
                        <p className="text-xs text-gray-400">sticker(s)</p>
                      </div>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-10 h-10 bg-emerald-600 rounded-lg text-lg font-medium text-white hover:bg-emerald-700 transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <input
                      type="text"
                      placeholder="Nombre completo"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                    />
                    <input
                      type="tel"
                      placeholder="Telefono / WhatsApp"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Direccion"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                    />
                    <input
                      type="email"
                      required
                      placeholder="Email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                    />
                  </div>

                  {quantity > 0 && (
                    <div className="flex justify-between items-center py-4 border-t border-gray-100 mb-6">
                      <span className="text-gray-500">Total</span>
                      <span className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</span>
                    </div>
                  )}

                  <button
                    onClick={handlePurchase}
                    disabled={purchasing || quantity < 1 || !form.name || !form.phone || !form.address || !form.email}
                    className="w-full py-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {purchasing ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Procesando...
                      </span>
                    ) : (
                      `Pagar ${formatCurrency(totalCost)}`
                    )}
                  </button>

                  <p className="text-center text-gray-400 text-xs mt-4">
                    Pago seguro via Wompi
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
