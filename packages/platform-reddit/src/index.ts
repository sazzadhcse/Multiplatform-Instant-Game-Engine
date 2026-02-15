import type { PlatformAPI } from "@repo/shared";

declare global {
  interface Window {
    __REDDIT__?: {
      username?: string;
      locale?: string;
      sessionId?: string;
    };
    Devvit?: {
      bridge?: {
        asyncPostMessage?(type: string, data: unknown): Promise<unknown>;
        onMessage?(callback: (data: unknown) => void): void;
      };
    };
  }
}

interface RedditBridge {
  postMessage<T>(type: string, data: unknown): Promise<T>;
  onMessage(callback: (data: unknown) => void): void;
}

export class RedditPlatform implements PlatformAPI {
  private initialized = false;
  private playerId = "local_reddit_player";
  private playerName = "Snoo";
  private locale = "en";
  private bridge: RedditBridge | null = null;
  private baseUrl = "/api";

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  async initialize(): Promise<void> {
    if (typeof window === "undefined") return;

    // Try to get user info from Devvit bridge
    if (window.Devvit?.bridge) {
      this.bridge = window.Devvit.bridge as unknown as RedditBridge;
      try {
        const userInfo = (await this.bridge?.postMessage<{
          username?: string;
          locale?: string;
        }>("getUserInfo", {})) as { username?: string; locale?: string };
        if (userInfo?.username) {
          this.playerName = userInfo.username;
        }
        if (userInfo?.locale) {
          this.locale = userInfo.locale;
        }
        this.initialized = true;
      } catch (e) {
        console.warn("Failed to get Reddit user info:", e);
      }
    }

    // Fallback to window.__REDDIT__
    if (!this.initialized && window.__REDDIT__?.username) {
      this.playerName = window.__REDDIT__.username;
      this.playerId = `reddit_${window.__REDDIT__.username}`;
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
    if (this.bridge) {
      try {
        await this.bridge.postMessage("setData", { key, value });
      } catch (e) {
        console.warn("Failed to set data via bridge:", e);
      }
    }
    // Fallback to localStorage
    localStorage.setItem(`reddit_${key}`, value);
  }

  async getData(key: string): Promise<string | null> {
    if (this.bridge) {
      try {
        const result = (await this.bridge.postMessage<{ value?: string }>(
          "getData",
          { key }
        )) as { value?: string };
        return result?.value || null;
      } catch (e) {
        console.warn("Failed to get data via bridge:", e);
      }
    }
    return localStorage.getItem(`reddit_${key}`);
  }

  setLoadingProgress(_percent: number): void {
    // Reddit Devvit handles loading via the bridge
    // No-op for client-side
  }

  async startGame(): Promise<void> {
    // Signal to Devvit that game is ready
    if (this.bridge) {
      try {
        await this.bridge.postMessage("gameReady", {});
      } catch (e) {
        console.warn("Failed to signal game ready:", e);
      }
    }
  }

  async updateScore(score: number): Promise<void> {
    // Score updates are handled via server API
    try {
      const response = await fetch(`${this.baseUrl}/highscore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
      });
      if (!response.ok) {
        console.warn("Failed to update high score");
      }
    } catch (e) {
      console.warn("Failed to update score:", e);
    }
  }

  isPlatformContext(): boolean {
    return (
      typeof window !== "undefined" &&
      (!!window.Devvit?.bridge || !!window.__REDDIT__)
    );
  }
}

export const platform = new RedditPlatform();
