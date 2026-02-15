import type { PlatformAPI } from "@repo/shared";
import { DiscordSDK, type DiscordSdk } from "@discord/embedded-app-sdk";

declare global {
  interface Window {
    DiscordSDKMock?: {
      commands: {
        authenticate(_token: string): { user: { username: string } };
        getChannel(): { id: string };
        getGuilds(): { id: string }[];
      };
    };
  }
}

/**
 * Mock DiscordSDK for development outside Discord
 */
class DiscordSDKMock implements Partial<DiscordSdk> {
  commands = {
    authenticate: (_token: string) =>
      Promise.resolve({
        user: { username: "MockUser" + Math.floor(Math.random() * 1000) },
        application: { id: "mock-app-id" },
      }),
    getChannel: () =>
      Promise.resolve({ id: "mock-channel-id", name: "mock-channel" }),
    getGuilds: () => Promise.resolve([{ id: "mock-guild-id" }]),
  };
}

function detectDiscordContext(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.has("frame_id");
}

function getDiscordSDK(): DiscordSdk | DiscordSDKMock {
  if (detectDiscordContext()) {
    return new DiscordSDK({
      clientId: import.meta.env.VITE_DISCORD_CLIENT_ID || "",
    });
  }
  return new DiscordSDKMock() as unknown as DiscordSdk;
}

export class DiscordPlatform implements PlatformAPI {
  private sdk: DiscordSdk | DiscordSDKMock;
  private initialized = false;
  private playerId = "local_discord_player";
  private playerName = "DiscordUser";
  private locale = "en";
  private auth = {
    accessToken: "",
    user: { username: "", discriminator: "", id: "" },
  };

  constructor() {
    this.sdk = getDiscordSDK();
  }

  async initialize(): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      // Authenticate with Discord
      this.auth = (await this.sdk.commands.authenticate(
        import.meta.env.VITE_DISCORD_ACCESS_TOKEN || ""
      )) as typeof this.auth;

      this.playerName =
        this.auth.user.username +
          (this.auth.user.discriminator && this.auth.user.discriminator !== "0"
            ? `#${this.auth.user.discriminator}`
            : "") || "DiscordUser";
      this.playerId = this.auth.user.id || "discord_user";

      this.initialized = true;
    } catch (e) {
      console.warn("Discord authentication failed:", e);
      this.playerName = "GuestPlayer";
      this.playerId = "guest_" + Math.random().toString(36).slice(2);
    }

    this.locale = navigator.language?.split("-")[0] || "en";
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
    localStorage.setItem(`discord_${key}`, value);
  }

  async getData(key: string): Promise<string | null> {
    return localStorage.getItem(`discord_${key}`);
  }

  setLoadingProgress(_percent: number): void {
    // Discord doesn't have a native loading progress API
  }

  async startGame(): Promise<void> {
    // No-op for Discord - game starts immediately after auth
  }

  async updateScore(score: number): Promise<void> {
    // Update Discord activity
    try {
      // Discord SDK doesn't have native score tracking
      // Could use activity updates if needed
      console.log("Discord score updated:", score);
    } catch (e) {
      console.warn("Failed to update Discord activity:", e);
    }
  }

  isPlatformContext(): boolean {
    return detectDiscordContext();
  }

  getSDK(): DiscordSdk | DiscordSDKMock {
    return this.sdk;
  }

  getAuth() {
    return this.auth;
  }
}

export const platform = new DiscordPlatform();
