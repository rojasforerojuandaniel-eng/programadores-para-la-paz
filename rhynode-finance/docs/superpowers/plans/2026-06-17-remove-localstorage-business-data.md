# Fase 4: Remove localStorage for business data — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task inline. Tareas acopladas (rules-engine afecta a transaction-form); ejecutar secuencialmente, no en paralelo.

**Goal:** Migrar todo dato de negocio/usuario que hoy vive en `localStorage` al backend (DB vía Server Actions o API routes), conservando solo preferencias puramente locales de UI.

**Architecture:** Usar `UserProfile.metadata` JSON y endpoints/API existentes como almacén unificado cross-device. Eliminar lectura/escritura localStorage de cada feature; reemplazar por fetch inicial + mutación al servidor.

**Tech Stack:** Next.js App Router, TypeScript strict, Prisma, Zod, Tailwind, shadcn/ui.

---

## Current state

20 usages de `localStorage`/`sessionStorage` en 7 archivos:

1. `src/components/onboarding/checklist-card.tsx` — onboarding checklist progress
2. `src/lib/rules-engine.ts` — business rules engine persistence
3. `src/lib/scope-context.tsx` — selected scope (PERSONAL/BUSINESS/BOTH)
4. `src/components/pwa/install-prompt.tsx` — PWA install banner dismissal
5. `src/components/dashboard/ai-copilot-client.tsx` — dismissed AI nudges
6. `src/components/dashboard/command-palette.tsx` — recent commands
7. `src/app/dashboard/integrations/page.tsx` — integration waitlist entries

---

## Decision matrix

| File | Decision | Destination | Notes |
|------|----------|-------------|-------|
| `onboarding/checklist-card.tsx` | **MIGRATE** | `/api/onboarding/progress` + `initialItems` prop | Ya existe API; quitar localStorage |
| `lib/rules-engine.ts` | **MIGRATE** | `/api/personal/rules` + `rules-store.ts` | Ya existe DB store; quitar localStorage, `applyRules` recibe rules explícito |
| `lib/scope-context.tsx` | **MIGRATE** | `updateUserScope` Server Action + `profile.scope` | Ya existe server action; quitar localStorage |
| `pwa/install-prompt.tsx` | **KEEP** | localStorage | Client-only UI preference; no cross-device needed |
| `dashboard/ai-copilot-client.tsx` | **MIGRATE** | `UserProfile.metadata.dismissedNudges` | Nuevo endpoint `/api/personal/preferences` |
| `dashboard/command-palette.tsx` | **KEEP** | localStorage | Recent commands = local UI convenience; no business data |
| `dashboard/integrations/page.tsx` | **MIGRATE** | `UserProfile.metadata.integrationWaitlist` | Nuevo endpoint `/api/personal/preferences` |

---

## Files created

- `src/app/api/personal/preferences/route.ts` — GET/POST de preferencias de usuario en `UserProfile.metadata` (dismissedNudges, integrationWaitlist)

---

## Files modified

- `src/components/onboarding/checklist-card.tsx` — quitar `STORAGE_KEY` y lectura/escritura localStorage; confiar en `initialItems` + API
- `src/lib/rules-engine.ts` — eliminar `getRules()`/`saveRules()` localStorage; cambiar `applyRules(transaction, rules)` a requerir `rules`
- `src/components/dashboard/transaction-form.tsx` — cargar reglas vía `/api/personal/rules` en mount y pasar a `applyRules`
- `src/lib/scope-context.tsx` — eliminar `getStoredScope()` y persistencia localStorage; mantener estado React
- `src/components/dashboard/ai-copilot-client.tsx` — leer/escribir dismissed nudges vía `/api/personal/preferences`
- `src/app/dashboard/integrations/page.tsx` — leer/escribir waitlist vía `/api/personal/preferences`

---

## Task 1: Generic user preferences API

**Files:**
- Create: `src/app/api/personal/preferences/route.ts`

**Step 1:** Crear endpoint con Zod para dos keys: `dismissedNudges: string[]` e `integrationWaitlist: Record<string, {name,email,joinedAt}>`.

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, getUserProfile } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { withRateLimit } from "@/lib/with-rate-limit";

const preferencesSchema = z.object({
  dismissedNudges: z.array(z.string()).optional(),
  integrationWaitlist: z.record(
    z.string(),
    z.object({ name: z.string(), email: z.string(), joinedAt: z.string() })
  ).optional(),
});

function getMetadataPrefs(profile: { metadata: unknown }) {
  const metadata = (profile.metadata ?? {}) as Record<string, unknown>;
  const prefs = metadata.preferences ?? {};
  return {
    metadata,
    preferences: preferencesSchema.safeParse(prefs).success
      ? preferencesSchema.parse(prefs)
      : {},
  };
}

export const GET = withRateLimit(async () => {
  const profile = await getUserProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { preferences } = getMetadataPrefs(profile);
  return NextResponse.json(preferences);
}, { maxRequests: 60, windowMs: 60000 });

export const POST = withRateLimit(async (request: Request) => {
  const profile = await getUserProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = preferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { metadata, preferences } = getMetadataPrefs(profile);
  const nextPreferences = { ...preferences, ...parsed.data };
  metadata.preferences = nextPreferences;

  const prisma = getPrisma();
  await prisma.userProfile.update({
    where: { id: profile.id },
    data: { metadata: metadata as unknown as Prisma.InputJsonValue },
  });

  return NextResponse.json(nextPreferences);
}, { maxRequests: 60, windowMs: 60000 });
```

**Step 2:** Verificar import de `requireAuth` no se usa (borrar si queda).

**Step 3:** No hay test nuevo. Verificar con build/lint.

---

## Task 2: Onboarding checklist — remove localStorage

**Files:**
- Modify: `src/components/onboarding/checklist-card.tsx`

**Step 1:** Eliminar constante `STORAGE_KEY`, función `defaultItems()` permanece.

**Step 2:** Cambiar inicialización de estado para no leer localStorage:

```ts
const [items, setItems] = useState<Record<string, boolean>>({
  ...defaultItems(),
  ...initialItems,
});
```

**Step 3:** Eliminar `localStorage.setItem` en `toggle`. Mantener la llamada POST a `/api/onboarding/progress` y toast. Mantener `useEffect` de fetch.

**Step 4:** Borrar imports no usados que queden.

---

## Task 3: Rules engine — remove localStorage

**Files:**
- Modify: `src/lib/rules-engine.ts`
- Modify: `src/components/dashboard/transaction-form.tsx`

**Step 1:** En `src/lib/rules-engine.ts`:
- Eliminar `STORAGE_KEY`.
- Eliminar `getRules()` y `saveRules()`.
- Cambiar `applyRules(transaction, rules?)` a `applyRules(transaction: TransactionLike, rules: Rule[])`.

```ts
export function applyRules(transaction: TransactionLike, rules: Rule[]): Suggestion[] {
  const activeRules = rules.filter((rule) => rule.enabled);
  // ... resto igual
}
```

**Step 2:** En `src/components/dashboard/transaction-form.tsx`:
- Añadir estado `const [rules, setRules] = useState<Rule[]>([]);`
- Importar `Rule` desde `@/lib/rules-engine`.
- Añadir `useEffect` al montar que llame `/api/personal/rules`:

```ts
useEffect(() => {
  fetch("/api/personal/rules")
    .then((res) => (res.ok ? res.json() : null))
    .then((data: unknown) => {
      if (data && typeof data === "object" && "rules" in data && Array.isArray(data.rules)) {
        setRules(data.rules as Rule[]);
      }
    })
    .catch(() => null);
}, []);
```

**Step 3:** Actualizar `useMemo` de suggestions:

```ts
return applyRules(
  { type: form.type, amount, description: form.description, category: form.category },
  rules
).filter((s) => !appliedSuggestionIds.has(s.ruleId));
```

**Step 4:** Añadir `rules` a dependency array del `useMemo`.

---

## Task 4: Scope context — remove localStorage

**Files:**
- Modify: `src/lib/scope-context.tsx`

**Step 1:** Eliminar `STORAGE_KEY` y función `getStoredScope()`.

**Step 2:** Inicializar estado directamente:

```ts
const [scope, setScopeState] = useState<UserScope>(initialScope);
```

**Step 3:** En `setScope`, solo actualizar React state:

```ts
const setScope = useCallback((newScope: UserScope) => {
  setScopeState(newScope);
}, []);
```

**Step 4:** Confirmar que `scope-toggle.tsx` ya llama `updateUserScope(newScope)` server action.

---

## Task 5: AI copilot dismissed nudges — migrate to DB

**Files:**
- Modify: `src/components/dashboard/ai-copilot-client.tsx`

**Step 1:** Reemplazar `readDismissed`/`writeDismissed` localStorage por fetch de `/api/personal/preferences`.

**Step 2:** Mantener el `dismissedStore` con `useSyncExternalStore`, pero cambiar implementación:

```ts
let dismissedCache: string[] = [];

async function loadDismissed(): Promise<string[]> {
  try {
    const res = await fetch("/api/personal/preferences");
    if (!res.ok) return [];
    const data = (await res.json()) as { dismissedNudges?: string[] };
    return Array.isArray(data.dismissedNudges) ? data.dismissedNudges : [];
  } catch { return []; }
}

async function saveDismissed(ids: string[]) {
  try {
    await fetch("/api/personal/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismissedNudges: ids }),
    });
  } catch { /* ignore */ }
}

const dismissedStore = {
  listeners: new Set<() => void>(),
  subscribe(callback: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    this.listeners.add(callback);
    return () => { this.listeners.delete(callback); };
  },
  getSnapshot(): string[] { return dismissedCache; },
  async load() {
    dismissedCache = await loadDismissed();
    this.listeners.forEach((cb) => cb());
  },
  async dismiss(id: string) {
    const current = dismissedCache;
    if (current.includes(id)) return;
    const next = [...current, id];
    dismissedCache = next;
    await saveDismissed(next);
    this.listeners.forEach((cb) => cb());
  },
};
```

**Step 3:** Añadir `useEffect` en `AiCopilotClient` para cargar al montar:

```ts
useEffect(() => {
  void dismissedStore.load();
}, []);
```

**Step 4:** Ajustar SSR snapshot a `[]`.

---

## Task 6: Integrations waitlist — migrate to DB

**Files:**
- Modify: `src/app/dashboard/integrations/page.tsx`

**Step 1:** Eliminar `WAITLIST_STORAGE_KEY`, `getStoredWaitlist`, `updateWaitlistStorage`.

**Step 2:** Inicializar waitlist vacío:

```ts
const [waitlist, setWaitlist] = useState<Record<string, WaitlistEntry>>({});
```

**Step 3:** Añadir `useEffect` para cargar preferencias:

```ts
useEffect(() => {
  fetch("/api/personal/preferences")
    .then((res) => (res.ok ? res.json() : null))
    .then((data: unknown) => {
      if (data && typeof data === "object" && "integrationWaitlist" in data) {
        const parsed = z.record(z.string(), waitlistEntrySchema).safeParse(data.integrationWaitlist);
        if (parsed.success) setWaitlist(parsed.data);
      }
    })
    .catch(() => null);
}, []);
```

**Step 4:** En `handleWaitlistSubmit`, tras `setWaitlist(next)` hacer POST:

```ts
fetch("/api/personal/preferences", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ integrationWaitlist: next }),
}).catch(() => null);
```

**Step 5:** Añadir import de `z` y definir `waitlistEntrySchema`.

---

## Task 7: Dead code & unused imports cleanup

**Files:**
- All modified files

**Step 1:** Correr `npm run lint` y resolver warnings de imports no usados.

**Step 2:** Buscar `STORAGE_KEY` residual con grep.

---

## Task 8: Verification

**Step 1:** `npx tsc --noEmit`

**Step 2:** `npm run lint` — 0 errors, 0 warnings

**Step 3:** `npm test` — 61/61 pass

**Step 4:** `npm run build` — pass

**Step 5:** `git status --short` — limpio excepto cambios intencionales

---

## Commit

```bash
git add -A
git commit -m "refactor(rhynode-finance): migrate business state from localStorage to database

Co-Authored-By: Claude <noreply@anthropic.com>"
```
