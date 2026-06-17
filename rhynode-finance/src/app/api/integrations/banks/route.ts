import { withRateLimit } from "@/lib/with-rate-limit";
export const GET = withRateLimit(async function GET() {
  return new Response(JSON.stringify({ banks: [
    { id: "bancolombia", name: "Bancolombia", status: "coming_soon", logo: "/banks/bancolombia.svg" },
    { id: "davivienda", name: "Davivienda", status: "coming_soon", logo: "/banks/davivienda.svg" },
    { id: "nequi", name: "Nequi", status: "coming_soon", logo: "/banks/nequi.svg" },
    { id: "bogota", name: "Banco de Bogotá", status: "coming_soon", logo: "/banks/bogota.svg" },
    { id: "occidente", name: "Banco de Occidente", status: "coming_soon", logo: "/banks/occidente.svg" },
    { id: "popular", name: "Banco Popular", status: "coming_soon", logo: "/banks/popular.svg" },
  ]}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}, {"maxRequests": 100,"windowMs": 60000});
