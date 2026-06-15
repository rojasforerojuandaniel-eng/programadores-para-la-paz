---
name: marc-v3-real-agent-graph-2026-06-15
description: "Grafo multiagente REAL implementado el 2026-06-15: 8 nodos LangGraph + sistema self-healing completo"
metadata: 
  node_type: memory
  type: project
  project: marc-v3
  date: 2026-06-15
  originSessionId: c2435f61-3a6b-4c94-a499-f1957b0128e8
---

# MARC v3 — Grafo Multiagente REAL + Self-Healing (2026-06-15)

## Estado: COMPLETADO

**Why:** Reemplazar el grafo v4 "código muerto" con un StateGraph LangGraph real de 8 nodos que ejecute planning, dispatching, revisión, replanning y síntesis autónomos, más un sistema self-healing que se auto-repare.

**How to apply:**

### 1. Grafo Real (8 nodos con loops)

**Archivo principal:** `src/agents/graph-real.ts`
**Flujo:** `supervisor → planner → decomposer ↔ dispatcher → reviewer → (judge | replanner → supervisor) → synthesizer → self_healing`

**Nodos implementados:**
1. **supervisor** — clasifica intención, complexityScore, decide si requiere planning
2. **planner** — descompone en TaskPlan con PlanSteps
3. **decomposer** — genera subtasks para steps con complexity >0.7
4. **dispatcher** — ejecuta steps secuencialmente con ModelMarketplace
5. **reviewer** — quality gate: coverageScore, consistencyScore
6. **judge** — decide terminación o enriquecimiento
7. **replanner** — genera retry plan para steps fallidos
8. **synthesizer** — concatena outputs exitosos
9. **self_healing** — nodo paralelo post-synthesizer (ver abajo)

**Integración con legacy:** `src/agents/graph.ts` usa `processWithAgents()` que decide entre grafo real (si `GRAPH_USE_REAL_AGENT_GRAPH=true`) o grafo legacy.

### 2. Self-Healing System (10 componentes)

**Directorio:** `src/agents/self-healing/`
**Flujo:** Fallo detectado → clasificar → generar patch → sandbox (tsc+vitest) → aplicar → métricas → rollback si empeora

**Componentes:**
1. **types.ts** — PatchFile, PatchOperation, SandboxResult, MetricsSnapshot
2. **allowlist.ts** — ALLOWLIST + BLOCKLIST con path traversal guard
3. **reflection-engine.ts** — detecta fallos recurrentes (minCount=3)
4. **failure-classifier.ts** — 5 tipos: timeout, tool_error, model_failure, routing_miss, prompt_weakness
5. **patch-generator.ts** — genera PatchFile JSON estructurado por template
6. **sandbox-executor.ts** — ejecuta TSC + VITEST REALES con backup/restore
7. **patch-applier.ts** — aplica a producción con git commit + backup
8. **metrics-comparator.ts** — detecta degradación >20%
9. **rollback-manager.ts** — revierte si métricas empeoran o 3+ fallos consecutivos
10. **integration** — nodo `self_healing` en graph-real.ts, fire-and-forget

**Guardrails de seguridad:**
- Solo puede modificar archivos en `src/agents/` (no auth, pagos, DB schema)
- Rechaza eval(), child_process, DROP TABLE, process.env
- Path traversal bloqueado (path.resolve + path.relative)
- Backup previo antes de escribir
- Sandbox ejecuta tsc --noEmit + vitest antes de tocar producción

### 3. Model Marketplace V2

**Archivo:** `src/agents/marketplace-v2.ts`
- Selecciona modelo óptimo por step basado en costo, calidad, latencia
- 3 modelos default: glm-4-flash (barato), deepseek-v3.1 (medio), kimi-k2.6 (potente)
- Fallback chain automático
- UpdateHealth para actualizar métricas en tiempo real

### 4. UI Operativa

**Archivos:**
- `src/app/api/agents/graph-status/route.ts` — GET estado de flags/fases
- `src/app/api/agents/graph-toggle/route.ts` — POST activar/desactivar flags
- `src/components/agents/graph-phase-control.tsx` — panel React con toggles

### 5. Feature Flags

**Archivo:** `src/agents/feature-flags-graph.ts`
- Fase 1: useRealAgentGraph + supervisor + planner + dispatcher + synthesizer
- Fase 2: reviewer + judge
- Fase 3: replanner + decomposer
- Fase 4: marketplace
- Fase 5: replication + self-healing

### 6. Tests

**Suite:** 765/773 tests pasan (2 fallos preexistentes en university-plugin)
**Self-healing:** 48 tests (9 archivos, incluyendo 5 de integración end-to-end)
**Build:** 0 errores TypeScript

### 7. Documentación

- **Spec de diseño:** `docs/superpowers/specs/2026-06-15-self-healing-design.md`
- **Plan de implementación:** `docs/superpowers/plans/2026-06-15-marc-real-agent-graph.md`
- **Plan self-healing:** `docs/superpowers/plans/2026-06-15-marc-self-healing.md`

### 8. Commits clave

- `feat(agents): feature flags for real agent graph rollout phases`
- `feat(agents): real agent graph with supervisor→planner→dispatcher→synthesizer`
- `feat(agents): connect reviewer and judge into real agent graph`
- `feat(agents): connect replanner and decomposer into graph with loops`
- `feat(agents): dynamic model marketplace v2`
- `feat(self-healing): core types + sandbox executor + patch applier + rollback manager`
- `feat(self-healing): end-to-end integration tests with real sandbox`
- `fix(self-healing): path traversal guard, real sandbox tsc+vitest, backup restore`

### 9. Para continuar trabajo

**Si el próximo Claude Code necesita:**
- Activar grafo real: setear `GRAPH_USE_REAL_AGENT_GRAPH=true` + fases
- Activar self-healing: setear `GRAPH_ENABLESELFHEALING=true`
- Ver estado: GET `/api/agents/graph-status`
- Toggle flags: POST `/api/agents/graph-toggle` `{ flag, value }`
- Tests self-healing: `npx vitest run src/agents/self-healing/__tests__/`
- Tests grafo: `npx vitest run src/agents/__tests__/graph-real.test.ts`

**Gaps conocidos (no críticos):**
- Sandbox usa `npx tsc` (20-30s) — puede optimizarse con cache
- `applyPatchWithRollback` evalúa métricas inmediatamente; ideal sería 24h
- No hay deduplicación de patches (mismo fallo genera patch nuevo cada vez)
- `heartbeat.ts` tiene sistema de "healing" aislado que no usa reflection-engine

---

## Relacionado

- [[marc-v3-status-2026-06-15]] — Documentación técnica completa (modelos, env vars, optimizaciones)
- [[marc-v3-mega-plan]] — Roadmap Q3 2026-Q1 2027
- [[marc-v3-documentacion-tecnica]] — REGLA DE ORO: revisar antes de tocar
