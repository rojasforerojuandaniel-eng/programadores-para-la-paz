# i18n Stage 2 — Localizar el dashboard y auth

> **Estado:** planificado, NO iniciado. Stage 1 (landing es/en) está live en prod
> sin middleware routing (providers por-página). Este plan migra el RESTO de la
> app a next-intl con `[locale]` segment + middleware routing.

## Por qué es grande y arriesgado

- **~43 rutas** hay que mover a `app/[locale]/` (34 dashboard + 9 públicas/auth).
- **88 referencias `Link`/`router.push`/`router.replace`** que apuntan a paths
  absolutos (`/dashboard/...`, `/sign-in`) — hay que hacerlas locale-aware vía
  los helpers de next-intl (`Link` de `next-intl`, `useRouter` con `pathnames`).
- **119 sitios `Intl` hardcodeados es-CO** en el dashboard (NumberFormat,
  DateTimeFormat, toLocaleDateString) — hay que pasarlos a locale dinámico
  (`useFormatter` + locale del request).
- **Strings de UI**: cientos de strings JSX en 34 páginas + componentes del
  dashboard → extraer a `messages/es.json` + `en.json` y traducir a en.
- **Combinar `clerkMiddleware` + `createIntlMiddleware`** con redirects
  locale-aware — toca el handshake de sesión de Clerk. Es la parte más
  arriesgada y **no se puede pre-verificar en preview** (las Clerk keys solo
  están en Production, no Preview).

## Enfoque (decidido)

next-intl con `app/[locale]/...` + `localePrefix: "as-needed"` (es sin prefijo
= URLs actuales intactas para SEO; `/en` con prefijo). Middleware combina Clerk
+ next-intl, con locale-aware sign-in redirect.

## Fases (cada fase = 1 sesión, build-verified antes de avanzar)

### Fase A — Foundation (aislada, no toca prod hasta Fase F)
1. `src/i18n/routing.ts`: añadir `pathnames` con diccionario es/en para rutas con
   segmentos dinámicos (facturas, pagos, etc.).
2. Middleware: combinar `createIntlMiddleware(routing)` + `clerkMiddleware`,
   redirect sign-in locale-aware, matchers públicos con prefijo `/en`.
3. Crear `app/[locale]/layout.tsx` con `setRequestLocale` + `generateStaticParams`
   (es, en) + `NextIntlClientProvider` con `getMessages()`.
4. Mover `app/page.tsx`, `sign-in`, `sign-up`, `sso-callback`, `onboarding`,
   `privacy`, `terms`, `support`, `offline`, `pay/[slug]` a `app/[locale]/`.
5. Eliminar el approach de providers por-página de stage 1 (la landing pasa a
   `app/[locale]/page.tsx`).
6. Reemplazar los 88 `Link`/`router` absolutos por los helpers de next-intl.
7. Build + tsc. **No deployar** (prod se queda en el deploy actual de stage 1).

### Fase B — Dashboard shell + navegación
8. Mover `app/dashboard/layout.tsx` + sidebar/bottom-nav a `app/[locale]/dashboard/`.
9. Extraer strings del shell (sidebar, header, KPI labels genéricos) a messages.
10. Build + tsc.

### Fase C–E — Páginas de dashboard en lotes (3 sesiones)
11. Migrar las 34 páginas en lotes de ~11, por dominio:
    - C: transactions, accounts, categories, budgets, goals, debts, recurring,
      investments, personal/*.
    - D: invoices, clients, projects, tax, payment-links, stats.
    - E: settings, advisor, integrations, leaderboard, achievements, reminders,
      split, etc.
12. Por lote: extraer strings → messages, traducir en, hacer Intl locale-aware.

### Fase F — Verificación + deploy
13. `Intl` 119 sitios → locale dinámico (auditar con grep).
14. Verificar hreflang, lang dinámico, locale switcher en dashboard.
15. Build + tsc + 161 tests + E2E.
16. **Verificación de auth en prod con rollback**: deploy prod, probar sign-in/
    dashboard en es y en, rollback al deploy de stage 1 si algo falla (Clerk
    handshake). Alternativa segura: añadir Clerk keys a Preview y verificar allí
    primero.

## Riesgos y mitigaciones
- **Auth break (Clerk+intl handshake)**: mitigación = Fase F con rollback +
  preferiblemente Clerk keys en Preview para pre-verificar.
- **Links rotos al migrar a [locale]**: mitigación = helpers next-intl + grep
  de paths absolutos + build por fase.
- **SEO**: `as-needed` preserva URLs es (sin prefijo) → sin impacto en URLs
  indexadas actuales.
- **Half-migration en main**: el repo home es un solo git repo (rhynode-finance
  es subdir). Para no ensuciar main con migración a medias, idealmente trabajar
  en un worktree/branch del repo home y mergear solo al terminar Fase F.

## Pendiente de decisión del usuario antes de empezar
- ¿Trabajar en worktree/branch del repo home (recomendado) o directo en main?
- ¿Añadir Clerk keys a Preview para pre-verificar auth (recomendado) o
  verificar a ciegas en prod con rollback?
- ¿Confirmar que el ROI vale la pena para una app enfocada en Colombia (donde el
  dashboard en es ya funciona)?

## Estimación
~4–5 sesiones de trabajo enfocado. No one-shotable.