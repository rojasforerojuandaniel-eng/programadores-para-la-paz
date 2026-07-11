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
