# Performance Audit – Rhynode Finance Mobile

Objetivos y checklist para mantener la app fluida y liviana antes de cada release.

## Métricas objetivo

| Métrica | Objetivo | Notas |
|---------|----------|-------|
| APK debug | < 80 MB | Incluye recursos de desarrollo; release debe ser mucho menor |
| AAB release | < 50 MB | Límite recomendado de Play Store para descargas sin Wi-Fi |
| TTI (Time to Interactive) | < 3 s | Desde `launchApp` hasta dashboard usable |
| JS bundle (prod) | < 3 MB parsed | Medir con `npx expo run:android --variant release` o EAS |
| LCP dashboard | < 2.5 s | Primera carga de balances y próximos pagos |

## Bundle size checklist

- [ ] Auditar dependencias con `npx expo-bundle-analyzer`.
- [ ] Revisar que no haya duplicados de `react`, `react-native`, `@clerk/*`, etc.
- [ ] Verificar que iconos de `lucide-react-native` se importan por nombre (tree-shake-friendly).
- [ ] Revisar assets en `assets/`; comprimir imágenes y usar `expo-asset` lazy cuando sea posible.
- [ ] Eliminar paquetes de desarrollo (`expo-dev-client`, etc.) de builds release.
- [ ] Habilitar Hermes (configurado por defecto en SDK 53).
- [ ] Revisar código muerto con `npx react-native-bundle-visualizer`.

## Librerías a revisar

| Librería | Riesgo | Recomendación |
|------------|--------|---------------|
| `moti` | Animaciones JS; puede impactar TTI en listas largas | Usar solo para micro-interacciones; evitar en scroll views grandes |
| `react-native-reanimated` | Worklets nativos; buen rendimiento pero aumenta tamaño nativo | Mantener actualizado; revisar que no haya versiones duplicadas |
| `lucide-react-native` | Set grande de iconos | Importar iconos específicos, nunca todo el paquete |
| `@sentry/react-native` | Aumenta bundle nativo y JS | Inicializar solo si el usuario dio consentimiento |
| `posthog-react-native` | SDK analytics pesado | Lazy-load o cargar solo tras consentimiento |
| `expo-camera` + OCR | Pesado en memoria al capturar | Comprimir imagen antes de subir (`compressImage`) |

## Lazy load recomendaciones

- Cargar pantallas de **Ajustes**, **Asesor IA** y **Business** con `expo-router` lazy navigation (ya es por defecto con tab routes).
- Demorar la inicialización de analytics, Sentry y PostHog hasta después del primer render del dashboard.
- Usar `React.Suspense` con loaders para listas de transacciones si crecen > 50 ítems.
- Considerar `FlatList` con `windowSize` y `getItemLayout` para transacciones y chats largos.

## Tareas pendientes recomendadas

1. Medir bundle real con EAS build release.
2. Definir SLO de TTI con herramientas de trazabilidad (Sentry performance, Expo Updates).
3. Implementar code-splitting para el chat (`advisor.tsx`) si el bundle JS crece.
4. Reemplazar animaciones `moti` en listas por `reanimated` nativo o por fade simples condicionados a `useReducedMotion`.
