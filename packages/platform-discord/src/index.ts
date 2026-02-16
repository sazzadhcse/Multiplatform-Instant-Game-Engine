import type { PlatformAPI } from "@repo/shared";

function detectDiscordContext(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.has("frame_id");
}

/**
 * Mock SDK for development/local testing
 */
const createMockSDK = () => ({
  commands: {
    authenticate: async () => ({
      user: {
        username: "Guest" + Math.floor(Math.random() * 1000),
        discriminator: "0",
        id: "guest_" + Math.random().toString(36).slice(2),
        avatar: null,
      },
      application: { id: "mock-app" },
    }),
    getChannel: async () => ({ id: "mock-channel", name: "Mock Channel" }),
    getGuilds: async () => [{ id: "mock-guild" }],
  },
});

/**
 * Dynamically import Discord SDK only when in Discord context
 */
async function loadDiscordSDK(): Promise<any> {
  try {
    const sdkModule = await import("@discord/embedded-app-sdk");
    return sdkModule.DiscordSDK;
  } catch (e) {
    console.warn("Discord SDK not available:", e);
    return null;
  }
}

export class DiscordPlatform implements PlatformAPI {
  private sdk: any = null;
  private initialized = false;
  private playerId = "local_player";
  private playerName = "Player";
  private locale = "en";

  constructor() {
    // Use mock by default, SDK will be loaded during init if in Discord context
    this.sdk = createMockSDK();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (typeof window === "undefined") return;

    // Set default locale first
    this.locale = navigator.language?.split("-")[0] || "en";

    // Only load real SDK if we're in Discord context
    if (detectDiscordContext()) {
      const DiscordSDK = await loadDiscordSDK();
      if (DiscordSDK) {
        try {
          this.sdk = new DiscordSDK({
            clientId: (import.meta.env as any).VITE_DISCORD_CLIENT_ID || "",
          });
        } catch (e) {
          console.warn("Failed to initialize Discord SDK:", e);
          this.sdk = createMockSDK();
        }
      }
    }

    // Try to authenticate
    if (this.sdk?.commands) {
      try {
        const auth = await this.sdk.commands.authenticate(
          (import.meta.env as any).VITE_DISCORD_ACCESS_TOKEN || ""
        );

        if (auth?.user) {
          this.playerName = auth.user.username || "Player";
          this.playerId = auth.user.id || this.playerId;
        }
      } catch (e) {
        console.warn("Discord auth failed, using defaults:", e);
        this.playerName = "Guest Player";
        this.playerId = "guest_" + Math.random().toString(36).slice(2);
      }
    }

    this.initialized = true;
  }

  getPlayerId(): string {
    return this.playerId;
  }

  async getPlayerName(): Promise<string> {
    return this.playerName;
  }

  getLocale(): string {
    return this.locale;
  }

  async setData(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(`discord_${key}`, value);
    } catch (e) {
      console.warn("Failed to save data:", e);
    }
  }

  async getData(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(`discord_${key}`);
    } catch (e) {
      console.warn("Failed to load data:", e);
      return null;
    }
  }

  setLoadingProgress(_percent: number): void {
    // Discord doesn't have a native loading progress API
  }

  async startGame(): Promise<void> {
    // No-op for Discord
  }

  async updateScore(_score: number): Promise<void> {
    // Discord activity updates can be added here if needed
  }

  isPlatformContext(): boolean {
    return detectDiscordContext();
  }
}

export const platform = new DiscordPlatform();
