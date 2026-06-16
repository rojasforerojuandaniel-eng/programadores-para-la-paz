# Plan de apps nativas: Rhynode iOS y Android

## Resumen ejecutivo

Estrategia de dos fases para llevar Rhynode a iOS y Android sin duplicar lógica de negocio:

1. **Fase 1 (ahora)**: consolidar la PWA como "app de verdad" en móvil: icono en home screen, bottom nav, offline, push, add-to-home-screen.
2. **Fase 2 (Q4 2026 / Q1 2027)**: envolver la PWA en un contenedor nativo liviano con Expo + WebView capuchoneada, luego migrar progresivamente pantallas críticas a componentes nativos de React Native.

---

## ¿Por qué no React Native puro desde el día 1?

- **Velocidad de desarrollo**: la app web actual ya tiene 70+ rutas, Prisma, Clerk, Stripe/Wompi, webhooks. Reescribir todo en React Native retrasa el lanzamiento 6-12 meses.
- **Equipo**: un solo equipo full-stack Next.js puede mantener PWA + API + "capuchón" nativo sin aprender Swift/Kotlin.
- **Paridad de features**: cada feature nueva se lanza web y móvil simultáneamente si vive como PWA.
- **Costo de distribución**: App Store y Play Store requieren cuentas de desarrollador, builds, revisión y cumplimiento.

---

## Arquitectura propuesta

### Opción A recomendada: PWA-first + capuchón nativo (Expo)

```
Usuario abre "Rhynode" desde App Store
  ↓
Expo app (React Native) con WebView
  ↓
Carga https://app.rhynode.finance/dashboard
  ↓
Comunicación bridge JS ↔ native:
  - Push notifications (Expo Notifications)
  - Biometría (Expo LocalAuthentication)
  - Cámara para escanear facturas (Expo Camera)
  - Deep links (Expo Linking)
  - Contactos para clientes (con permiso)
```

Pros:
- 80% del código sigue siendo Next.js.
- Se publica en App Store/Play Store en semanas, no meses.
- Se aprovechan capacidades nativas críticas.

Contras:
- WebView no es tan fluida como nativa pura.
- Apple puede rechazar apps que son "solo un sitio web". Solución: agregar funcionalidad nativa real (biometría, notificaciones push, escaneo).

### Opción B a futuro: migración progresiva a React Native

A medida que crezca el equipo, se reescriben pantallas de alto uso en React Native nativo:

- Dashboard home
- Transacciones (lista + crear)
- Facturas (lista + crear)
- Notificaciones push

El resto permanece en WebView como fallback.

---

## Roadmap de implementación

### Preparación en el backend/web (ya en curso)

| Tarea | Estado | Archivo clave |
|-------|--------|---------------|
| Manifest v2 con branding nuevo | ✅ Hecho | `public/manifest.json` |
| Service worker con cache offline | ✅ Hecho | `public/sw.js` |
| Bottom nav mobile-first | ✅ Hecho | `src/components/dashboard/sidebar.tsx` |
| Touch targets >= 44px | En progreso | Todos los dashboards |
| API REST consistente para móvil | Parcial | `/api/*` |
| Deep links para facturas/pagos | Pendiente | `src/lib/deep-links.ts` |

### Capuchón nativo (Q4 2026)

1. Crear repo `rhynode-native` con Expo.
2. WebView que carga `https://app.rhynode.finance`.
3. Configurar deep links: `rhynode://dashboard`, `rhynode://invoice/123`.
4. Integrar Expo Notifications para push.
5. Integrar Expo LocalAuthentication para login biométrico.
6. Escanear facturas con Expo Camera + OCR propio.
7. Splash screen y iconos adaptativos.
8. Publicar en TestFlight y Play Console internal testing.

### Migración progresiva (Q1 2027)

1. Auth nativo con Clerk Expo SDK.
2. Dashboard home en React Native con datos del API.
3. Lista de transacciones nativa.
4. Lista de facturas nativa.
5. Offline-first con SQLite local + sync.

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Contenedor | Expo (React Native) |
| WebView | `react-native-webview` |
| Push | Expo Notifications |
| Biometría | `expo-local-authentication` |
| Cámara / OCR | `expo-camera` + API `/api/ai/ocr` |
| Deep links | `expo-linking` |
| Auth | Clerk Expo SDK |
| State sync | TanStack Query + SQLite |

---

## Consideraciones de App Store / Play Store

- **Cuentas de desarrollador**: Apple Developer Program ($99/año), Google Play Console ($25 una vez).
- **Privacidad**: declarar financieros, datos de contacto, identificadores.
- **Seguridad**: prohibir almacenar tokens en WebView localStorage; usar cookies HttpOnly + refresh.
- **Contenido**: la app debe ofrecer valor nativo real, no solo embeber el sitio.
- **Pagos in-app**: Apple exige IAP para contenido digital. Para suscripciones se recomienda usar RevenueCat con Clerk userId.

---

## Métricas de éxito

- PWA install rate > 15% de usuarios activos mensuales.
- Tiempo de carga del WebView capuchón < 2s en 4G.
- Rating App Store/Play > 4.2.
- Tasa de retención día 7 en móvil > 25%.

---

## Próximos pasos inmediatos

1. Terminar rediseño mobile-first de toda la app web.
2. Generar iconos PWA 192/512 con nuevo branding.
3. Crear pantallas de "offline" y "add to home screen".
4. Configurar push notifications en producción.
5. Preparar repo `rhynode-native` con Expo template.
