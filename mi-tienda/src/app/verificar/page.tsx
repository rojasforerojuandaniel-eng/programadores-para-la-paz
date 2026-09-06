"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatTicketNumber } from "@/lib/utils";

interface Raffle {
  id: string;
  name: string;
  prize: string;
  totalNumbers: number;
  winningNumber: number | null;
  lotteryName: string | null;
  lotteryDrawNumber: string | null;
  status: string;
}

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  status: string; // pending, confirmed, completed, cancelled
  wompiTransactionId: string | null;
  tickets: { number: number; status: string }[];
  raffle: Raffle | null;
  createdAt: string;
}

export default function VerificarPage() {
  // Prefill desde ?phone= (lo usa el admin para abrir el tracking del cliente)
  const [phone, setPhone] = useState(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("phone") || ""
      : ""
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [reverifying, setReverifying] = useState<string | null>(null);

  const runSearch = async (phoneValue: string) => {
    if (!phoneValue) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/track?phone=${encodeURIComponent(phoneValue)}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Error al consultar");
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    }
    setLoading(false);
    setSearched(true);
  };

  const handleSearch = () => {
    runSearch(phone);
  };

  // Auto-buscar si venimos con ?phone= (todos los setState ocurren tras await)
  useEffect(() => {
    if (!phone) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/orders/track?phone=${encodeURIComponent(phone)}`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Error al consultar");
        }
      } catch {
        if (!cancelled) setError("Error de conexión. Intenta de nuevo.");
      }
      if (!cancelled) {
        setLoading(false);
        setSearched(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-emerald-600 to-green-700">
      <div className="px-4 py-12">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center text-white mb-8">
            <div className="text-5xl mb-4" aria-hidden="true">🔍</div>
            <h1 className="text-3xl font-black mb-2">Mis Stickers</h1>
            <p className="text-green-100">Verifica tus stickers de la rifa</p>
          </div>

          {/* Search */}
          <div className="bg-white rounded-3xl p-6 shadow-2xl mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ingresa tu número de teléfono
            </label>
            <div className="flex gap-3">
              <input
                type="tel"
                placeholder="Ej: 3001234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
              />
              <button
                onClick={handleSearch}
                disabled={loading || !phone}
                aria-label="Buscar stickers por teléfono"
                className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "..." : "🔍"}
              </button>
            </div>
          </div>

          {/* Results */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm text-center mb-6">
              ⚠️ {error}
            </div>
          )}

          {searched && (
            <div className="bg-white rounded-3xl p-6 shadow-2xl">
              {orders.length === 0 && !error ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4" aria-hidden="true">😔</div>
                  <p className="text-gray-500">No se encontraron pedidos con ese teléfono</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-gray-900">
                    Tus pedidos ({orders.length})
                  </h2>

                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="border border-gray-200 rounded-xl p-4"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-gray-900">{order.raffle?.name ?? "Rifa"}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString("es-CO")}
                          </p>
                        </div>
                        {order.raffle && (
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              order.raffle.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {order.raffle.status === "active" ? "🟢 Activa" : "Finalizada"}
                          </span>
                        )}
                      </div>                      {/* Numbers */}
                      {order.tickets.length > 0 && order.status === "confirmed" ? (
                        <div>
                          <p className="text-sm text-gray-500 mb-2">Tus stickers:</p>
                          <div className="flex flex-wrap gap-2">
                            {order.tickets.map((ticket) => {
                              const isWinner =
                                order.raffle?.winningNumber === ticket.number;
                              return (
                                <div
                                  key={ticket.number}
                                  className={`px-3 py-2 rounded-lg font-bold text-sm ${
                                    isWinner
                                      ? "bg-yellow-400 text-yellow-900 animate-pulse"
                                      : "bg-green-100 text-green-700"
                                  }`}>
                                  #{formatTicketNumber(
                                    ticket.number,
                                    order.raffle?.totalNumbers
                                  )}
                                  {isWinner && " 🏆"}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : order.tickets.length > 0 && order.status !== "confirmed" ? (
                        <div>
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
                            <p className="text-sm text-yellow-700 font-medium">
                              ⏳ Stickers pendientes de confirmación de pago
                            </p>
                            <p className="text-xs text-yellow-600 mt-1">
                              Tus números se mostrarán una vez se confirme el pago
                            </p>
                          </div>
                          {order.wompiTransactionId && (
                            <button
                              onClick={async () => {
                                setReverifying(order.id);
                                try {
                                  const res = await fetch(`/api/orders/${order.id}/reverify`, { method: "POST" });
                                  const data = await res.json();
                                  if (data.status === "confirmed") {
                                    // Re-buscar para actualizar los datos
                                    runSearch(phone);
                                  }
                                } catch { /* ignore */ }
                                setReverifying(null);
                              }}
                              disabled={reverifying === order.id}
                              className="w-full px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                              {reverifying === order.id ? (
                                <span className="flex items-center justify-center gap-2">
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Verificando...
                                </span>
                              ) : (
                                "🔄 Re-verificar pago"
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">
                          Stickers pendientes de asignación
                        </p>
                      )}

                      {/* Winner announcement */}
                      {order.raffle?.winningNumber && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-yellow-800 font-semibold text-sm">
                            🏆 Sticker ganador: #
                            {formatTicketNumber(
                              order.raffle.winningNumber,
                              order.raffle.totalNumbers
                            )}
                          </p>
                          {order.raffle.lotteryName && (
                            <p className="text-yellow-700 text-sm mt-1">
                              🎰 {order.raffle.lotteryName}
                              {order.raffle.lotteryDrawNumber && ` · Sorteo #${order.raffle.lotteryDrawNumber}`}
                            </p>
                          )}
                          {order.tickets.some(
                            (t) => t.number === order.raffle!.winningNumber
                          ) && (
                            <p className="text-yellow-700 text-sm mt-1 font-bold">
                              🎉 ¡FELICIDADES! ¡Eres el ganador!
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Back link */}
          <div className="text-center mt-6">
            <Link
              href="/"
              className="text-green-200 hover:text-white font-medium"
            >
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
