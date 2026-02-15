import type { PlatformAPI } from "@repo/shared";

declare global {
  interface Window {
    FBInstant?: {
      initializeAsync(): Promise<void>;
      startGameAsync(): Promise<void>;
      setLoadingProgress(percent: number): void;
      player: {
        getNameAsync(): Promise<string>;
        getID(): string;
        setDataAsync(data: Record<string, string>): Promise<void>;
        getDataAsync(keys: string[]): Promise<Record<string, string>>;
      };
      getEntryPointAsync(): Promise<string>;
      getLeaderboardAsync(name: string): Promise<{
        getScoreAsync(): Promise<{ rank: number; score: number }>;
        setScoreAsync(score: number): Promise<void>;
      }>;
    };
  }
}

export class FBPlatform implements PlatformAPI {
  private initialized = false;
  private playerId = "local_player";
  private playerName = "Local Player";
  private locale = "en_US";

  async initialize(): Promise<void> {
    if (typeof window === "undefined" || !window.FBInstant) {
      console.warn("FBInstant not available, running in fallback mode");
      this.locale = navigator.language || "en_US";
      return;
    }

    try {
      await Promise.race([
        window.FBInstant.initializeAsync(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("FB init timeout")), 2000)
        ),
      ]);
      this.initialized = true;
      this.playerId = window.FBInstant.player.getID();
      this.playerName = await window.FBInstant.player.getNameAsync();
      window.FBInstant.setLoadingProgress(100);
    } catch (e) {
      console.warn("FBInstant initialization failed:", e);
    }
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
    if (this.initialized && window.FBInstant) {
      await window.FBInstant.player.setDataAsync({ [key]: value });
    } else {
      localStorage.setItem(key, value);
    }
  }

  async getData(key: string): Promise<string | null> {
    if (this.initialized && window.FBInstant) {
      const data = await window.FBInstant.player.getDataAsync([key]);
      return data[key] || null;
    }
    return localStorage.getItem(key);
  }

  setLoadingProgress(percent: number): void {
    if (this.initialized && window.FBInstant) {
      window.FBInstant.setLoadingProgress(percent);
    }
  }

  async startGame(): Promise<void> {
    if (this.initialized && window.FBInstant) {
      await window.FBInstant.startGameAsync();
    }
  }

  async updateScore(score: number): Promise<void> {
    if (this.initialized && window.FBInstant) {
      try {
        const leaderboard = await window.FBInstant.getLeaderboardAsync(
          "high_scores"
        );
        await leaderboard.setScoreAsync(score);
      } catch (e) {
        console.warn("Failed to update leaderboard:", e);
      }
    }
  }

  isPlatformContext(): boolean {
    return typeof window !== "undefined" && !!window.FBInstant;
  }
}

export const platform = new FBPlatform();
