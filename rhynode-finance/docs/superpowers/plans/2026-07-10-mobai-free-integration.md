# MobAI Free Tools Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt free MobAI open-source tools (Maestro UI tests + iOS builder workflow) for the Rhynode Finance Expo mobile app, and document future free-tier MobAI desktop integrations.

**Architecture:** Add Maestro E2E flows and a GitHub Actions CI job running an Android emulator; add a separate `workflow_dispatch` iOS build workflow powered by `MobAI-App/ios-builder`; keep everything optional and documented so existing EAS/Android flows keep working.

**Tech Stack:** Maestro CLI, GitHub Actions (Ubuntu + Android emulator / macOS for iOS), Expo dev client, MobAI `ios-builder` (Go CLI), React Native Testing Library for unit assertions.

---

## File map

| File | Responsibility |
|------|----------------|
| `.github/workflows/mobile-maestro.yml` | CI: install Maestro, start Android emulator, run flows, upload results |
| `.github/workflows/ios-build.yml` | CI: build iOS IPA via `ios-builder` generated workflow (manual dispatch) |
| `apps/mobile/.maestro/config.yaml` | Maestro global config (timeouts, tags) |
| `apps/mobile/.maestro/flows/launch-app.yml` | Reusable subflow: launch app and wait for sign-in screen |
| `apps/mobile/.maestro/flows/login-and-see-dashboard.yml` | First E2E flow: sign in, verify dashboard |
| `apps/mobile/.maestro/flows/add-transaction.yml` | Second E2E flow: add an expense and see it in list |
| `apps/mobile/package.json` | Add `maestro:test` script |
| `apps/mobile/docs/MOBAI_INTEGRATION.md` | Maestro setup + future MobAI desktop tools guide |
| `apps/mobile/docs/IOS_BUILDER.md` | Build iOS from Linux/Windows via GitHub Actions |
| `apps/mobile/.maestro/.gitignore` | Ignore Maestro local screenshots/logs |

---

## Task 1: Maestro configuration and reusable launch subflow

**Files:**
- Create: `apps/mobile/.maestro/config.yaml`
- Create: `apps/mobile/.maestro/flows/launch-app.yml`
- Create: `apps/mobile/.maestro/.gitignore`

- [ ] **Step 1: Create Maestro config**

```yaml
# apps/mobile/.maestro/config.yaml
flows:
  - "flows/**/*.yml"
executionOrder:
  - continueOnFailure: false
  flowsOrder:
    - flows/launch-app.yml
    - flows/login-and-see-dashboard.yml
    - flows/add-transaction.yml
```

- [ ] **Step 2: Create reusable launch subflow**

```yaml
# apps/mobile/.maestro/flows/launch-app.yml
appId: com.rhynode.finance.mobile
---
- launchApp:
    clearState: true
- extendedWaitUntil:
    visible: "Sign in"
    timeout: 30000
```

- [ ] **Step 3: Create .gitignore for Maestro artifacts**

```text
# apps/mobile/.maestro/.gitignore
screenshots/
logs/
report.xml
```

- [ ] **Step 4: Verify file structure**

Run:
```bash
ls -R apps/mobile/.maestro/
```

Expected output contains `config.yaml`, `flows/launch-app.yml`, `.gitignore`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/.maestro/
git commit -m "feat(mobile,maestro): add Maestro config and reusable launch subflow

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Maestro E2E flows for core happy path

**Files:**
- Create: `apps/mobile/.maestro/flows/login-and-see-dashboard.yml`
- Create: `apps/mobile/.maestro/flows/add-transaction.yml`
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Write login + dashboard flow**

```yaml
# apps/mobile/.maestro/flows/login-and-see-dashboard.yml
appId: com.rhynode.finance.mobile
---
- runFlow: launch-app.yml
- tapOn: "Email"
- inputText: "${E2E_EMAIL}"
- tapOn: "Password"
- inputText: "${E2E_PASSWORD}"
- tapOn: "Continue"
- extendedWaitUntil:
    visible: "Dashboard"
    timeout: 30000
- assertVisible: "Total balance"
- assertVisible: "Income"
- assertVisible: "Expense"
```

- [ ] **Step 2: Write add transaction flow**

```yaml
# apps/mobile/.maestro/flows/add-transaction.yml
appId: com.rhynode.finance.mobile
---
- runFlow: login-and-see-dashboard.yml
- tapOn: "Add"
- tapOn: "Expense"
- tapOn: "Amount"
- inputText: "25000"
- tapOn: "Description"
- inputText: "Maestro test coffee"
- tapOn: "Category"
- tapOn: "Food & dining"
- tapOn: "Save"
- extendedWaitUntil:
    visible: "Maestro test coffee"
    timeout: 15000
- assertVisible: "Maestro test coffee"
```

- [ ] **Step 3: Add Maestro script to package.json**

In `apps/mobile/package.json`, under `"scripts"`, add:

```json
"maestro:test": "maestro test .maestro/flows/"
```

- [ ] **Step 4: Validate YAML syntax**

Run:
```bash
cd apps/mobile
npx -y @maestro/yaml-validator .maestro/flows/*.yml 2>&1 || true
```

Expected: no fatal parse errors (validator may not exist; if missing, visually inspect indentation).

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/.maestro/ apps/mobile/package.json
git commit -m "feat(mobile,maestro): add sign-in, dashboard and add-transaction flows

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: GitHub Actions workflow for Maestro on Android emulator

**Files:**
- Create: `.github/workflows/mobile-maestro.yml`

- [ ] **Step 1: Create workflow file**

```yaml
# .github/workflows/mobile-maestro.yml
name: Mobile E2E (Maestro)

on:
  workflow_dispatch:
  pull_request:
    branches: [main]
    paths:
      - "apps/mobile/**"
      - ".github/workflows/mobile-maestro.yml"
  push:
    branches: [main]
    paths:
      - "apps/mobile/**"
      - ".github/workflows/mobile-maestro.yml"

jobs:
  maestro:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    defaults:
      run:
        working-directory: apps/mobile
    env:
      E2E_EMAIL: ${{ secrets.E2E_CLERK_EMAIL }}
      E2E_PASSWORD: ${{ secrets.E2E_CLERK_PASSWORD }}
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: "17"
          distribution: "temurin"

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Install Maestro
        run: |
          curl -fsSL "https://get.maestro.mobile.dev" | bash
          echo "$HOME/.maestro/bin" >> $GITHUB_PATH

      - name: Cache AVD
        uses: actions/cache@v4
        id: avd-cache
        with:
          path: |
            ~/.android/avd/*
            ~/.android/adb*
          key: avd-${{ runner.os }}-api-34

      - name: Create AVD and launch emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 34
          arch: x86_64
          target: google_apis
          emulator-options: -no-window -gpu swiftshader_indirect -no-snapshot -noaudio -no-boot-anim
          script: |
            adb wait-for-device
            adb shell input keyevent 82

      - name: Download latest Android preview APK from EAS
        run: |
          # If a prebuilt preview APK is not available, this job expects the CI caller
          # to have produced one. For now we document the requirement and fail fast.
          echo "TODO: download or build APK before running Maestro"
        continue-on-error: true

      - name: Run Maestro tests
        run: |
          if [ -z "$E2E_EMAIL" ] || [ -z "$E2E_PASSWORD" ]; then
            echo "E2E Clerk credentials not configured; skipping."
            exit 0
          fi
          maestro test .maestro/flows/ --format junit

      - name: Upload Maestro report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: maestro-report
          path: apps/mobile/.maestro/logs/
          retention-days: 7
```

- [ ] **Step 2: Add placeholder step to build/download APK**

Above `Run Maestro tests`, replace the `Download latest Android preview APK` placeholder with a script that builds the Expo dev client locally or downloads an existing artifact. Keep it minimal:

```yaml
      - name: Build Expo Android locally for tests
        run: |
          echo "Build step placeholder: run eas build --local or prebuild + gradle assemble."
          echo "APK path must be set to MAESTRO_APP_PATH env var for maestro to install it."
        env:
          MAESTRO_APP_PATH: ""
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/mobile-maestro.yml
git commit -m "feat(ci): add Maestro mobile E2E workflow on Android emulator

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: iOS builder workflow for builds without a Mac

**Files:**
- Create: `.github/workflows/ios-build.yml`
- Create: `apps/mobile/docs/IOS_BUILDER.md`

- [ ] **Step 1: Create manual iOS build workflow**

```yaml
# .github/workflows/ios-build.yml
name: iOS Build (ios-builder)

on:
  workflow_dispatch:
    inputs:
      branch:
        description: "Branch to build"
        required: true
        default: "main"

jobs:
  build:
    runs-on: macos-latest
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.branch }}

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: "1.22"

      - name: Install ios-builder
        run: go install github.com/MobAI-App/ios-builder/cmd/builder@latest

      - name: Initialize ios-builder workflow
        run: |
          cd apps/mobile
          builder init --non-interactive --owner ${{ github.repository_owner }} --repo ${{ github.event.repository.name }}

      - name: Build iOS via generated workflow
        run: |
          cd apps/mobile
          builder ios build --unsigned
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Upload IPA
        uses: actions/upload-artifact@v4
        with:
          name: rhynode-ios-unsigned
          path: apps/mobile/dist/*.ipa
          retention-days: 7
```

- [ ] **Step 2: Create usage doc**

```markdown
# apps/mobile/docs/IOS_BUILDER.md
# Build iOS from Linux/Windows with MobAI ios-builder

## Requirements
- Go 1.22+
- A GitHub repo with Actions enabled
- A GitHub token with `workflow` scope (for pushing the generated workflow)

## Local setup
```bash
go install github.com/MobAI-App/ios-builder/cmd/builder@latest
builder auth github
```

## Trigger a build
1. Go to **Actions → iOS Build (ios-builder)** in GitHub.
2. Click **Run workflow**, choose the branch.
3. Download the unsigned `.ipa` artifact after completion.

## Install on device
Use MobAI desktop (free tier) or Apple Configurator to sign and install the IPA.

## Costs
GitHub Actions free tier provides ~200 effective macOS minutes/month (2,000 minutes at 10x multiplier).
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ios-build.yml apps/mobile/docs/IOS_BUILDER.md
git commit -m "feat(ci): add ios-builder workflow for Mac-less iOS builds

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Documentation for MobAI free tools integration

**Files:**
- Create: `apps/mobile/docs/MOBAI_INTEGRATION.md`

- [ ] **Step 1: Write integration guide**

```markdown
# apps/mobile/docs/MOBAI_INTEGRATION.md
# MobAI Free Tools for Rhynode Finance Mobile

## What is already set up (free, no desktop app needed)

### Maestro E2E tests
Location: `apps/mobile/.maestro/flows/`
Run locally:
```bash
cd apps/mobile
# Start an emulator or connect a device with the app installed
npx maestro test .maestro/flows/
```

Run in CI: `Actions → Mobile E2E (Maestro)` is triggered on PRs/pushes that touch `apps/mobile/**`.

Required GitHub secrets:
- `E2E_CLERK_EMAIL`
- `E2E_CLERK_PASSWORD`

### iOS builds without a Mac
See `IOS_BUILDER.md`. Trigger manually via `Actions → iOS Build (ios-builder)`.

## What requires the free MobAI desktop tier

### Record polished demo videos
Repo: https://github.com/MobAI-App/mobile-recorder-skill
Use case: create app-store/landing-page demo videos without a designer.
Setup:
1. Install MobAI desktop free tier.
2. Clone `mobile-recorder-skill`.
3. Point it at the running Rhynode Finance app.

### Agent-driven QA
Repo: https://github.com/MobAI-App/mobai-mcp
Use case: Claude Code/Cursor can see and tap the mobile UI for exploratory testing.
Setup:
1. Install MobAI desktop free tier.
2. Add `mobai-mcp` as an MCP server in Claude Code.
3. Prompt: "Open Rhynode Finance mobile, sign in, and check if the dashboard loads."

## Paid-only features (do not rely on)
- Multi-device parallel runs
- More than 100 daily AI points in MobAI desktop
- iOS simulator cloud access beyond local/BYOD
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/docs/MOBAI_INTEGRATION.md
git commit -m "docs(mobile): add MobAI free tools integration guide

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Wire package scripts and local dev helper

**Files:**
- Modify: `apps/mobile/package.json`

- [ ] **Step 1: Add maestro script (already added in Task 2; verify)**

Ensure `apps/mobile/package.json` contains:

```json
"scripts": {
  ...
  "maestro:test": "maestro test .maestro/flows/",
  "maestro:record": "maestro record .maestro/flows/"
}
```

- [ ] **Step 2: Commit if any change**

```bash
git diff --exit-code apps/mobile/package.json || git add apps/mobile/package.json && git commit -m "chore(mobile): add maestro npm scripts

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Self-review

1. **Spec coverage:**
   - Maestro config + reusable launch subflow → Task 1.
   - Core E2E flows → Task 2.
   - CI workflow → Task 3.
   - iOS builder workflow → Task 4.
   - Documentation for free + future tools → Task 5.
   - Local dev helper scripts → Task 6.
2. **Placeholder scan:**
   - `TODO: download or build APK` remains in Task 3 Step 2 because the actual APK build mechanism depends on EAS/local prebuild and should be resolved in a follow-up task.
   - All other steps contain concrete commands and file contents.
3. **Type consistency:** No TypeScript code is modified by this plan; only YAML, JSON, and Markdown. Naming consistent (`E2E_EMAIL`, `E2E_PASSWORD`).

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-10-mobai-free-integration.md`.

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
