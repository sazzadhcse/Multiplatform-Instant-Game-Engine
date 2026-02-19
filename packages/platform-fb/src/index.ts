import type { PlatformAPI } from "@repo/shared";

declare global {
  interface Window {
    FBInstant?: {
      initializeAsync(): Promise<void>;
      startGameAsync(): Promise<void>;
      setLoadingProgress(percent: number): void;
      instantLoad(config: { assets: string[] }): Promise<void>;
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
      console.warn("[FB] FBInstant not available, running in fallback mode");
      this.locale = navigator.language || "en_US";
      return;
    }

    try {
      console.log("[FB] Calling initializeAsync()...");
      // IMPORTANT: Do NOT use timeout - let initializeAsync complete naturally
      // Per FB docs: "You'll only be able to interact with the loading UI after FBInstant.initializeAsync() resolves"
      await window.FBInstant.initializeAsync();
      this.initialized = true;
      console.log("[FB] ✓ initializeAsync() resolved");

      // Get player info after initialization
      this.playerId = window.FBInstant.player.getID();
      this.playerName = await window.FBInstant.player.getNameAsync();
      this.locale = window.FBInstant.getLocale() || navigator.language || "en_US";

      console.log("[FB] Player info loaded:", { playerId: this.playerId, playerName: this.playerName });
    } catch (e) {
      console.error("[FB] ✗ initializeAsync() failed:", e);
      // Don't set this.initialized = true
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
    // Per FB docs: "Informs the SDK of loading progress"
    // This should be called DURING asset loading, not before
    if (window.FBInstant) {
      window.FBInstant.setLoadingProgress(percent);
      console.log(`[FB] Progress: ${percent}%`);
    } else {
      console.log(`[FB] No FBInstant, progress ${percent}% not reported`);
    }
  }

  async preloadAssets(assets: string[]): Promise<void> {
    // DISABLED: instantLoad requires assets to be on FB CDN
    // For now, assets load from local server
    console.log(`[FB] preloadAssets called (currently disabled, using local loading)`);
  }

  async startGame(): Promise<void> {
    // Per FB docs: "Once startGameAsync() resolves it also means the loading view has been removed"
    // IMPORTANT: Call this AFTER all assets are loaded
    if (window.FBInstant) {
      try {
        console.log("[FB] Calling startGameAsync()...");
        await window.FBInstant.startGameAsync();
        console.log("[FB] ✓ startGameAsync() resolved - loading view removed");
      } catch (e) {
        console.error("[FB] ✗ startGameAsync() failed:", e);
      }
    } else {
      console.log("[FB] No FBInstant, startGame() not called");
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
