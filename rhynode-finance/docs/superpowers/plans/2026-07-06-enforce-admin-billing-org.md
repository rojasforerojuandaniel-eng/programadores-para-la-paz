# Enforce ADMIN Role on Billing and Org Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Replace `requireAuth()` with role-aware authorization so only ADMIN users can subscribe, cancel, access billing portal, and update organization metadata.

**Architecture:** Use `auth()` from Clerk to identify the user, `getCurrentOrganization()` to fetch org + role, and `canAdmin()` to enforce ADMIN-only access. Leave `POST /api/organization` unchanged (first-time org creation during onboarding).

**Tech Stack:** Next.js App Router API routes, Clerk, Prisma, Vitest.

---

### Task 1: Harden subscribe routes

**Files:**
- Modify: `src/app/api/subscribe/route.ts`
- Modify: `src/app/api/subscribe/cancel/route.ts`
- Modify: `src/app/api/subscribe/portal/route.ts`
- Test: `src/app/api/subscribe/route.test.ts`

- [ ] **Step 1: Update imports**

Add `auth`, `getCurrentOrganization`, `canAdmin`, and keep existing imports.

```ts
import { auth } from "@clerk/nextjs/server";
import { getCurrentOrganization } from "@/lib/organization.server";
import { canAdmin } from "@/lib/organization";
```

- [ ] **Step 2: Replace auth check in `subscribe/route.ts`**

```ts
const session = await auth();
const userId = session?.userId;
if (!userId) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
const ctx = await getCurrentOrganization(userId);
if (!ctx || !canAdmin(ctx.role)) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

Use `ctx.org` in place of the old `org`.

- [ ] **Step 3: Replace auth check in `subscribe/cancel/route.ts`**

Same pattern; use `ctx.org`.

- [ ] **Step 4: Replace auth check in `subscribe/portal/route.ts`**

Same pattern; use `ctx.org`.

- [ ] **Step 5: Write route tests**

Mock `@clerk/nextjs/server`, `@/lib/organization.server`, `@/lib/with-rate-limit`, `@/lib/logger`, `@/lib/prisma`, and `@/lib/stripe`. Cover:
- 401 when unauthenticated
- 403 when role is VIEWER
- 403 when role is MANAGER
- 200/201 when role is ADMIN

- [ ] **Step 6: Run tests and commit**

Run `pnpm vitest run src/app/api/subscribe/route.test.ts`.

---

### Task 2: Harden organization route

**Files:**
- Modify: `src/app/api/organization/route.ts`
- Test: `src/app/api/organization/route.test.ts`

- [ ] **Step 1: Harden GET and PUT handlers**

Apply the same `auth()` + `getCurrentOrganization()` + `canAdmin()` pattern. Leave POST unchanged.

- [ ] **Step 2: Write route tests**

Mock Clerk, `getCurrentOrganization`, rate limit, logger, and Prisma. Cover GET and PUT:
- 401 when unauthenticated
- 403 when role is VIEWER or MANAGER
- 200/200 when role is ADMIN

- [ ] **Step 3: Run tests and commit**

---

### Task 3: Verify and final commit

**Files:** all modified above.

- [ ] **Step 1: Run TypeScript check**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 2: Run full test suite**

```bash
pnpm test
```

- [ ] **Step 3: Final commit**

```bash
git commit -m "security(api): enforce admin role on billing and org settings"
```
