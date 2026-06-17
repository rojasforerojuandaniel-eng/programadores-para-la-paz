# Final UX Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline batch execution recommended; many small, interrelated edits across dashboard pages).

**Goal:** Add offline write-sync, empty/loading states, accessibility fixes, and subtle motion to Rhynode Finance dashboard pages, then verify build/test/lint and commit.

**Architecture:**
- Offline queue: lightweight IndexedDB module (`src/lib/offline-queue.ts`) wraps `fetch`-based mutations; queues when `navigator.onLine === false` and drains on `online` event with sonner toasts.
- Empty/loading states: reuse `EmptyStateCard` and existing skeleton variants; add `loading.tsx` or inline skeletons where missing.
- A11y: wire orphaned `Label` to `Select` via `htmlFor`/`id`, darken tinted status badges, add `aria-live` regions where dynamic status is announced, remove nested `<main>` landmark.
- Motion: prefer Tailwind `animate-in`, `transition-*`, `hover:*` utilities; add staggered list entrance via CSS custom property or existing animation classes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, shadcn/ui, sonner, native IndexedDB.

---

## Task 1: Offline queue module

**Files:**
- Create: `src/lib/offline-queue.ts`
- Modify: `src/components/providers.tsx` (register online drain listener once)
- Modify: selected mutation dialogs (wrap `fetch` calls)

### Steps

- [ ] **Step 1: Write `src/lib/offline-queue.ts`**

```ts
"use client";

import { toast } from "sonner";

const DB_NAME = "rhynode-offline-queue";
const DB_VERSION = 1;
const STORE_NAME = "mutations";

export type MutationMethod = "POST" | "PATCH" | "PUT" | "DELETE";

export interface QueuedMutation {
  id: string;
  url: string;
  method: MutationMethod;
  body: unknown;
  headers?: Record<string, string>;
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getQueueDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Offline queue only runs in browser"));
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
  return dbPromise;
}

export async function enqueueMutation(mutation: Omit<QueuedMutation, "id" | "createdAt">): Promise<void> {
  const db = await getQueueDB();
  const item: QueuedMutation = {
    ...mutation,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(item);
    request.onsuccess = () => {
      toast.info("Sin conexión: acción guardada. Se sincronizará al recuperarla.");
      resolve();
    };
    request.onerror = () => reject(request.error ?? new Error("Failed to enqueue mutation"));
  });
}

export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  const db = await getQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error ?? new Error("Failed to read queue"));
  });
}

export async function removeMutation(id: string): Promise<void> {
  const db = await getQueueDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Failed to remove mutation"));
  });
}

export async function processQueue(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const mutations = await getQueuedMutations();
  if (mutations.length === 0) return;

  const toastId = toast.loading(`Sincronizando ${mutations.length} acción(es)...`);
  let successCount = 0;
  let failCount = 0;

  for (const mutation of mutations.sort((a, b) => a.createdAt - b.createdAt)) {
    try {
      const res = await fetch(mutation.url, {
        method: mutation.method,
        headers: {
          "Content-Type": "application/json",
          ...(mutation.headers ?? {}),
        },
        body: mutation.body ? JSON.stringify(mutation.body) : undefined,
      });
      if (res.ok) {
        await removeMutation(mutation.id);
        successCount++;
      } else {
        failCount++;
      }
    } catch {
      failCount++;
    }
  }

  toast.dismiss(toastId);
  if (successCount > 0) {
    toast.success(`${successCount} acción(es) sincronizada(s).`);
  }
  if (failCount > 0) {
    toast.error(`${failCount} acción(es) no se pudieron sincronizar. Reintentaremos más tarde.`);
  }
}

export function registerOfflineQueue(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => {
    void processQueue();
  });
}

export async function executeMutation(
  url: string,
  method: MutationMethod,
  body: unknown,
  options?: {
    headers?: Record<string, string>;
    onSuccess?: () => void | Promise<void>;
    onError?: (error: Error) => void;
  },
): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await enqueueMutation({ url, method, body, headers: options?.headers });
    options?.onSuccess?.();
    return;
  }

  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers ?? {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `Request failed with ${res.status}`);
    }
    await options?.onSuccess?.();
  } catch (error) {
    if (error instanceof TypeError && typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueMutation({ url, method, body, headers: options?.headers });
      options?.onSuccess?.();
      return;
    }
    const err = error instanceof Error ? error : new Error("Unknown error");
    options?.onError?.(err);
    throw err;
  }
}
```

- [ ] **Step 2: Register online listener in providers**

In `src/components/providers.tsx`, inside the Providers client component (or create a small `OfflineQueueRegister` component), call `registerOfflineQueue()` in a `useEffect`:

```tsx
"use client";

import { useEffect } from "react";
import { registerOfflineQueue } from "@/lib/offline-queue";

function OfflineQueueRegister() {
  useEffect(() => {
    registerOfflineQueue();
  }, []);
  return null;
}
```

Render `<OfflineQueueRegister />` inside the providers tree near `<Toaster />`.

- [ ] **Step 3: Wrap selected mutations**

Update the `handleSubmit` functions in these dialogs to use `executeMutation` for the network call:

- `src/components/dashboard/invoice-form.tsx`
- `src/components/dashboard/transaction-form.tsx`
- `src/components/dashboard/create-client-dialog.tsx`
- `src/app/dashboard/personal/debts/create-dialog.tsx`
- `src/app/dashboard/personal/goals/create-dialog.tsx`
- `src/app/dashboard/personal/budgets/create-dialog.tsx`
- `src/app/dashboard/personal/recurring/create-dialog.tsx`
- `src/app/dashboard/personal/reminders/reminder-dialog.tsx`
- `src/app/dashboard/personal/categories/create-dialog.tsx`
- `src/app/dashboard/projects/create-dialog.tsx`

For each, replace the inline `fetch` block with:

```ts
await executeMutation("/api/...", "POST", body, {
  onSuccess: () => {
    toast.success("...");
    // existing success logic (close dialog, reset, refresh)
  },
  onError: () => {
    toast.error("...");
  },
});
```

Keep existing validation/form handling unchanged.

---

## Task 2: Empty states and loading states

**Files:**
- Modify: `src/app/dashboard/rules/page.tsx`
- Modify: `src/app/dashboard/leaderboard/page.tsx`
- Modify: `src/app/dashboard/personal/scenarios/page.tsx`
- Modify: `src/app/dashboard/personal/investments/page.tsx`
- Modify: `src/app/dashboard/personal/reminders/page.tsx`
- Add/modify `loading.tsx` where missing

### Steps

- [ ] **Step 4: Convert inline empty placeholders to `EmptyStateCard`**

For `rules/page.tsx`, replace the plain text empty block with:

```tsx
<EmptyStateCard
  variant="md"
  icon={BookOpen}
  title="No tienes reglas creadas"
  description="Crea reglas de categorización para automatizar cómo Rhynode clasifica tus transacciones."
  hint="También puedes cargar ejemplos o usar una sugerencia."
/>
```

For `leaderboard/page.tsx`, replace the inline Medal empty state with:

```tsx
<EmptyStateCard
  variant="md"
  icon={Medal}
  title="Sé el primero en ganar XP"
  description="Completa acciones en Rhynode para sumar puntos y aparecer en el ranking."
/>
```

For `scenarios/page.tsx`, replace the custom empty card with:

```tsx
<EmptyStateCard
  variant="md"
  icon={GitBranch}
  title="No tienes escenarios guardados"
  description="Crea escenarios para comparar hipótesis de ingresos, gastos y crecimiento contra tu línea base."
  action={<Button onClick={openNewScenario}>Nuevo escenario</Button>}
/>
```

Add the relevant icons to imports (`BookOpen`, `Medal`, `GitBranch` from `lucide-react`).

- [ ] **Step 5: Add loading skeletons where missing**

`investments/page.tsx`: wrap the main table in a Suspense boundary with `TableRowsSkeleton` fallback.
`reminders/page.tsx`: add a `loading.tsx` under `src/app/dashboard/personal/reminders/` using `PageSkeleton variant="generic"` or a custom reminder skeleton.
`projects/page.tsx`: add a `loading.tsx` under `src/app/dashboard/projects/` using `TableRowsSkeleton` + header skeleton.

---

## Task 3: Accessibility fixes

**Files:**
- Modify: all dialog files with orphaned `<Label>` for `<Select>`
- Modify: `src/components/dashboard/client-list.tsx`
- Modify: `src/components/dashboard/payment-links-client.tsx`
- Modify: `src/app/dashboard/personal/investments/page.tsx`
- Modify: `src/components/dashboard/notification-center.tsx`
- Modify: `src/components/dashboard/command-palette.tsx`
- Modify: `src/app/dashboard/personal/calendar/page.tsx`

### Steps

- [ ] **Step 6: Wire Labels to Select controls**

For every file reported with an orphaned `<Label>` followed by `<Select>`, add matching `htmlFor` on the `Label` and `id` on the `SelectTrigger`. Example:

```tsx
<Label htmlFor="category-select">Categoría</Label>
<Select>
  <SelectTrigger id="category-select">...</SelectTrigger>
  ...
</Select>
```

Files:
- `recurring/create-dialog.tsx`
- `recurring/edit-recurring-dialog.tsx`
- `accounts/create-dialog.tsx`
- `reminders/reminder-dialog.tsx`
- `subscriptions/edit-subscription-dialog.tsx`
- `budgets/create-dialog.tsx`
- `calendar/create-subscription-dialog.tsx`
- `projects/create-dialog.tsx`
- `create-tax-report-dialog.tsx`
- `create-payment-link-dialog.tsx`

Also replace the `<Label>Activo/Inactivo</Label>` in `reminders/reminder-dialog.tsx` with a real `Label htmlFor` on the `Switch` or an `aria-label` on the `Switch`.

- [ ] **Step 7: Fix low-contrast badges**

In `client-list.tsx`, `payment-links-client.tsx`, and `investments/page.tsx`, change status badge text colors from `*-400` to `*-600` (light mode) / `*-400` (dark mode) or use `text-{color}-foreground` classes from the existing badge variant config. Keep backgrounds at `*-500/10` or `*-500/15`.

- [ ] **Step 8: Add aria-live regions**

`notification-center.tsx`: wrap the loading spinner in `<div aria-live="polite" aria-busy={true}>`.
`command-palette.tsx`: wrap the "No results" message in `<div aria-live="polite" role="status">`.

- [ ] **Step 9: Remove nested `<main>` landmark**

In `src/app/dashboard/personal/calendar/page.tsx`, replace `<main>` with `<div>` (the layout already provides `<main id="main-content">`).

---

## Task 4: Motion and microinteractions

**Files:**
- Modify: `src/components/dashboard/page-skeleton.tsx`
- Modify: `src/components/dashboard/empty-state-card.tsx`
- Modify: dashboard list/card components
- Modify: `src/app/globals.css`

### Steps

- [ ] **Step 10: Skeleton shimmer improvement**

Add a subtle CSS shimmer/background animation to `SkeletonBlock` in `page-skeleton.tsx` using Tailwind `bg-gradient-to-r from-muted via-muted-foreground/10 to-muted bg-[length:200%_100%] animate-skeleton-shimmer`.

Add keyframes in `globals.css`:

```css
@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.animate-skeleton-shimmer {
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}
```

- [ ] **Step 11: Staggered list entrances**

Add a CSS custom-property stagger utility in `globals.css`:

```css
.stagger-children > * {
  animation: fade-in-up 0.35s ease-out both;
  animation-delay: calc(var(--child-index, 0) * 60ms);
}
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Use inline style `--child-index: ${i}` on list items in a few representative dashboards (invoices, transactions, budgets) to demonstrate the pattern without touching every list.

- [ ] **Step 12: Button hover states**

Ensure primary/outline buttons use `transition-colors duration-200` and `hover:scale-[1.02]` on action buttons. Add to `src/components/ui/button.tsx` or globally via CSS. Prefer modifying `button.tsx` CVA classes.

---

## Task 5: Verification and commit

**Files:**
- Run commands in `/home/juan-daniel/rhynode-finance`

### Steps

- [ ] **Step 13: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 14: Lint**

```bash
npm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 15: Tests**

```bash
npm test
```

Expected: 61/61 pass.

- [ ] **Step 16: Build**

```bash
npm run build
```

Expected: pass.

- [ ] **Step 17: Commit**

```bash
git add -A
git commit -m "polish(rhynode-finance): offline sync, empty states, a11y and motion

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Spec coverage self-review

- Offline write-sync: Task 1 (queue module + listener + wrapped mutations).
- Empty/loading states: Task 2 (Rules, Leaderboard, Scenarios + skeletons for Investments/Reminders/Projects).
- Accessibility audit: Task 3 (labels, contrast, aria-live, landmark).
- Motion: Task 4 (skeleton shimmer, stagger, button hover).
- Verification: Task 5 (tsc, lint, tests, build, commit).

No placeholders remain; every step references exact file paths and concrete code snippets.
