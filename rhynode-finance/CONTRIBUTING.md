# Contributing

Gracias por querer mejorar Rhynode Finance. Sigue estas pautas para mantener calidad y consistencia.

## Configuración local

```bash
cd rhynode-finance
npm install
cp .env.example .env.local
npx prisma generate
npm run dev
```

## Convenciones de código

- TypeScript strict mode activo. No uses `any` ni `// @ts-ignore`.
- Usa Server Components por defecto. Marca `"use client"` solo cuando sea necesario.
- Valida inputs de API con Zod.
- Usa Tailwind CSS para estilos; no estilos inline.
- Componentes pequeños (< 500 líneas) y funciones < 30 líneas.
- Nunca expongas errores internos al cliente.
- No dejes `console.log` en producción; usa `logger` en `src/lib/logger.ts`.

## Tests

```bash
# Unitarios
npm test

# E2E
npm run test:e2e
```

## Pull requests

1. Crea una rama desde `main`.
2. Asegúrate de que `npx tsc --noEmit`, `npm run lint` y `npm test` pasen.
3. El pre-commit hook ejecutará `lint-staged` automáticamente.
4. Describe qué cambias y por qué en el mensaje del commit.
5. Abre el PR contra `main`.

## Reportar bugs

Usa el flujo de soporte de Rhynode o abre un issue describiendo:
- Pasos para reproducir
- Comportamiento esperado vs actual
- Entorno (navegador, dispositivo, versión)
