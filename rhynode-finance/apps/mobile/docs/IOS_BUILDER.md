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
