# Rhynode Native — Capuchón Expo

Contenedor nativo liviano (Expo + WebView) que envuelve la PWA de Rhynode y la
extiende con capacidades nativas: biometría, push, cámara y deep links. Sigue
el plan de `docs/native-apps-plan.md` (Opción A: PWA-first + capuchón nativo).

No reemplaza la app web — el 80% del código sigue siendo Next.js. Este shell
solo publica en App Store / Play Store y añade features nativas que Apple/Google
exigen para aprobar una app que no sea "solo un sitio web".

## Estructura

```
native/
├── App.tsx        # WebView + bridge postMessage + biometría + deep links
├── app.json       # Config Expo (scheme rhynode://, permisos, plugins)
├── package.json   # Expo, react-native-webview, expo-notifications, etc.
└── tsconfig.json
```

## Requisitos

- Node 20+, Expo CLI (`npm i -g expo-cli`)
- Para iOS: macOS + Xcode + cuenta Apple Developer ($99/año)
- Para Android: Android Studio + Google Play Console ($25 una vez)

## Puesta en marcha

```bash
cd native
npx expo install         # pina versiones compatibles con tu SDK de Expo
npx expo start           # abre el dev client; pulsa i (iOS) o a (Android)
```

Antes del primer run, coloca los assets (`assets/icon.png`, `assets/splash.png`)
— 1024x1024 para el icono, 1242x2436 para splash.

Variables de entorno:

- `EXPO_PUBLIC_APP_URL` — URL de la app a cargar dentro del WebView.
  Por defecto `https://rhynode-finance.vercel.app`. Apunta a preview/producción.

## Bridge nativo ↔ web

La web app pide features nativas con:

```ts
window.ReactNativeWebView?.postMessage(
  JSON.stringify({ type: "BIOMETRIC", id: "tx-123" })
);
```

Y recibe respuestas registrando un handler global:

```ts
window.__rhynodeNative = (raw: string) => {
  const res = JSON.parse(raw); // { id, ok, error? }
};
```

Mensajes soportados hoy: `BIOMETRIC`. `OPEN_CAMERA` (escaneo de facturas vía
`/api/ai/ocr`) está esqueletizado — la web app mantiene el UI de upload.

## Deep links

`rhynode://dashboard`, `rhynode://invoice/123`, `rhynode://pay/abc` se mapean a
rutas del WebView (`app.json` declara el scheme + `intentFilters`). Universal
links iOS: `applinks:rhynode.finance` (configura el `apple-app-site-association`
en el dominio).

## Push nativas

Usa `expo-notifications`. El backend ya envía web push vía VAPID
(`src/lib/notifications.ts`); para push nativas, registra el Expo push token en
un endpoint nuevo (pendiente) y despacha con el Expo Push API. Las suscripciones
web (`push_subscriptions`) y nativas pueden coexistir.

## Publicación (no incluida en este scaffold)

1. `eas build --platform ios|android` para builds de release.
2. TestFlight (iOS) / Play Console internal testing (Android).
3. Cumplimiento: declarar datos financieros, cámara, Face ID; Apple exige IAP
   para contenido digital — para suscripciones usar RevenueCat con Clerk userId.

## Notas

- Las versiones de `package.json` son referenciales; `npx expo install` las
  ajusta al SDK instalado.
- No almacenar tokens en `localStorage` del WebView — la web app usa cookies
  HttpOnly, que `sharedCookiesEnabled` preserva en el capuchón.