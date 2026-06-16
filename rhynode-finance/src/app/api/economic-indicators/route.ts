import { NextResponse } from "next/server";

interface EconomicIndicator {
  name: string;
  value: number;
  unit: string;
  date: string;
  source: string;
}

export async function GET() {
  try {
    const indicators: EconomicIndicator[] = [
      {
        name: "TRM",
        value: 3950,
        unit: "COP/USD",
        date: "2026-06-13",
        source: "Banco de la República",
      },
      {
        name: "Tasa de Intervención",
        value: 11.25,
        unit: "%",
        date: "2026-06-13",
        source: "Banco de la República",
      },
      {
        name: "IPC Anual",
        value: 7.18,
        unit: "%",
        date: "2026-05",
        source: "DANE",
      },
      {
        name: "DTF",
        value: 10.85,
        unit: "%",
        date: "2026-06-13",
        source: "Banco de la República",
      },
      {
        name: "UVR",
        value: 320.45,
        unit: "COP",
        date: "2026-06-13",
        source: "Banco de la República",
      },
    ];

    return NextResponse.json({
      indicators,
      lastUpdated: "2026-06-13T12:00:00Z",
    });
  } catch (error) {
    console.error("Failed to fetch economic indicators:", error);
    return NextResponse.json(
      { error: "Failed to fetch economic indicators" },
      { status: 500 }
    );
  }
}
