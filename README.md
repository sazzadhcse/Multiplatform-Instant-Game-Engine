# PixiJS Game Monorepo

Turborepo monorepo hosting a shared PixiJS game codebase with platform builds for Facebook Instant Games, Reddit Devvit, and Discord Embedded Apps.

## Structure

```
turborepo-pixi-game/
├── apps/
│   ├── fb-instant/         # Facebook Instant Games (client-only)
│   ├── reddit/             # Reddit Devvit app (client + server)
│   └── discord/            # Discord Embedded App (client + server)
├── packages/
│   ├── game-core/          # Shared game logic
│   ├── platform-fb/        # Facebook platform adapter
│   ├── platform-reddit/    # Reddit platform adapter
│   ├── platform-discord/   # Discord platform adapter
│   ├── shared/             # Shared types
│   └── typescript-config/  # Shared TypeScript config
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## How to Run

### Install Dependencies

```bash
cd turborepo-pixi-game
pnpm install
```

### Development

Run all apps in development:
```bash
pnpm dev
```

Run individual apps:
```bash
# Facebook Instant Games
pnpm dev:fb

# Reddit Devvit
pnpm dev:reddit

# Discord Embedded App
pnpm dev:discord
```

### Build

Build all apps:
```bash
pnpm build
```

Build individual apps:
```bash
pnpm build:fb      # Output: dist/fb-instant/
pnpm build:reddit  # Output: dist/reddit/
pnpm build:discord # Output: dist/discord/
```

## Platform-Specific Setup

### Facebook Instant Games

1. Update `apps/fb-instant/fbapp-config.json` with your app ID
2. Update `apps/fb-instant/index.html` meta tag with your app ID
3. Upload `dist/fb-instant/` to Facebook

### Reddit Devvit

1. Create Reddit app at https://developers.reddit.com
2. Configure `apps/reddit/devvit.json` with your subreddit
3. Run `pnpm dev:reddit` to test with `devvit playtest`
4. Run `pnpm build:reddit` then deploy via `devvit upload`

### Discord Embedded App

1. Create Discord app at https://discord.com/developers/applications
2. Copy `apps/discord/.env.example` to `apps/discord/.env`
3. Add your `VITE_DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`
4. Configure your Discord app's URL to point to your deployed client
5. For local testing, use a tunnel (Cloudflare, ngrok) to expose port 5173

## Architecture

- **`@repo/game-core`**: Platform-agnostic game logic using PixiJS
- **`@repo/shared`**: Defines `PlatformAPI` interface that all adapters implement
- **`@repo/platform-*`**: Adapters implement `PlatformAPI` for each platform's SDK
- **`apps/*`**: Entry points that import game core and platform adapter
