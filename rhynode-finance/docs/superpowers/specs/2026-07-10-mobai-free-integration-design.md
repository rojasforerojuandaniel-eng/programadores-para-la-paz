# MobAI Free Tools Integration — Design Spec

## Context

**MobAI App** (https://github.com/MobAI-App) produces a suite of open-source/mobile dev tools. Their business is a freemium desktop app; several repos are free to use today and directly applicable to the Rhynode Finance Expo mobile app (`apps/mobile`).

This spec selects only the free components that can be adopted immediately and produce measurable value for QA, iOS builds, and marketing demos.

## Goals

1. Add automated mobile UI regression tests in CI using **Maestro** (via MobAI's `mobai-ci` model), completely free on GitHub Actions simulators/emulators.
2. Add a free **iOS build workflow** using `MobAI-App/ios-builder` so iOS IPAs can be produced from Linux/Windows without a local Mac.
3. Document how to use `mobile-recorder-skill` and `mobai-mcp` once the free MobAI desktop tier is installed, without blocking today.

## Non-goals

- Do not require purchasing MobAI desktop subscriptions.
- Do not replace existing EAS/Android build flows.
- Do not add paid-only features (multi-device parallel runs, AI-driven test generation).

## Architecture

### A. MobAI CI + Maestro tests

- Add Maestro flow YAMLs under `apps/mobile/.maestro/flows/`.
- Add a GitHub Actions workflow `.github/workflows/mobile-maestro.yml` that:
  - Checks out the repo.
  - Installs Node + Maestro CLI.
  - Starts an Android emulator (or iOS simulator on macOS runner).
  - Builds/starts the Expo dev client or installs a prebuilt APK.
  - Runs `maestro test .maestro/flows/`.
  - Uploads results (screenshots + report) on failure.
- Initial flow coverage: sign-in → dashboard loads → add transaction → transaction appears in list.

### B. iOS builder workflow

- Install `ios-builder` CLI locally as a dev helper:
  - `go install github.com/MobAI-App/ios-builder/cmd/builder@latest` (optional, documented only).
- Add a generated `.github/workflows/ios-build.yml` to the repo that builds the iOS project on a GitHub-hosted macOS runner and uploads the IPA artifact.
- Document usage in `apps/mobile/docs/IOS_BUILDER.md`.
- Keep it off the critical path so it cannot break normal EAS builds.

### C. Future (documented, not implemented)

- `mobile-recorder-skill`: record polished demo videos. Requires MobAI desktop free tier; leave a setup guide.
- `mobai-mcp`: agent-driven QA via Claude Code. Requires MobAI desktop free tier; leave a setup guide.

## Files to create / modify

- `.github/workflows/mobile-maestro.yml` — new CI workflow.
- `.github/workflows/ios-build.yml` — new iOS build workflow.
- `apps/mobile/.maestro/config.yaml` — Maestro configuration.
- `apps/mobile/.maestro/flows/login-dashboard-add-transaction.yml` — first E2E flow.
- `apps/mobile/.maestro/flows/helpers/launch-app.yml` — reusable launch step.
- `apps/mobile/package.json` — add `maestro:test` script.
- `apps/mobile/docs/MOBAI_INTEGRATION.md` — setup and usage guide.
- `apps/mobile/docs/IOS_BUILDER.md` — iOS build from non-Mac guide.
- `apps/mobile/__tests__/e2e/.gitkeep` — placeholder for future Maestro test assertions.
- `apps/mobile/app.json` — add `android.package` fallback if missing for APK install in CI.

## Key constraints

- GitHub Actions free tier: macOS minutes are 10x multiplier, so use Linux + Android emulator for Maestro unless iOS-only is required.
- The app uses Clerk + Expo. CI needs a test user that can sign in without interactive MFA. Use a dedicated E2E Clerk user and pass credentials via GitHub secrets.
- Maestro cannot directly handle OTP-based MFA; flows must use an E2E user with MFA disabled or a deterministic bypass.
- iOS build workflow should be `workflow_dispatch` only initially to avoid burning minutes on every push.

## Testing strategy

- Maestro flow tested locally first with `maestro test` against an Android emulator.
- CI workflow validated by triggering manually on the branch.
- iOS builder workflow validated by dispatching and checking artifact upload.

## Risks / mitigations

| Risk | Mitigation |
|------|-----------|
| Emulator slow/flaky in GitHub Actions | Use Linux + hardware acceleration, cache emulator snapshot, keep flows short. |
| Clerk sign-in blocks CI | Use a dedicated E2E test user with deterministic credentials stored in GitHub secrets. |
| iOS build minutes expensive | Trigger only manually (`workflow_dispatch`) and off-peak. |
| Adding workflows blocks push to GitHub | Same existing `workflow` OAuth scope issue; document that user must run `gh auth refresh -s workflow`. |

## Success criteria

1. `mobile-maestro.yml` runs successfully on demand and reports pass/fail.
2. `login-dashboard-add-transaction.yml` covers the core happy path.
3. `ios-build.yml` produces an unsigned IPA artifact when dispatched.
4. Documentation explains how any teammate can run Maestro locally and trigger iOS builds.
