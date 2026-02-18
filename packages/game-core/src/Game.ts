import 'pixi.js/unsafe-eval';
import { Application } from "pixi.js";
import type { PlatformAPI } from "@repo/shared";

// Import new architecture components
import { LayoutSystem, DESIGN_W, DESIGN_H } from "./LayoutSystem.js";
import { AudioManager, DEFAULT_AUDIO_SETTINGS, DEFAULT_AUDIO_REGISTRY } from "./AudioManager.js";
import { SceneManager, createSceneTicker } from "./SceneManager.js";
import type { GameContext, Scene } from "./Scene.js";
import { LoadingScene } from "./scenes/LoadingScene.js";

interface GameOptions {
  platform: PlatformAPI;
  canvas?: HTMLCanvasElement;
  width?: number;
  height?: number;
  bgColor?: number;
}

// Helper: Promise with timeout
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

/**
 * Main Game class - Orchestrates the game with scene management
 *
 * Features:
 * - 1920x1080 design coordinates
 * - Hybrid scaling (FILL for backgrounds, FIT for gameplay/UI)
 * - Scene management (Loading -> Menu -> Gameplay -> Complete -> Menu)
 * - Audio system with BGM and SFX
 * - Portrait orientation lock with overlay
 */
export class Game {
  private app: Application;
  private platform: PlatformAPI;
  private layoutSystem: LayoutSystem;
  private audioManager: AudioManager;
  private sceneManager: SceneManager;
  private context: GameContext;

  private portraitOverlay: HTMLElement | null = null;
  private isPortrait = false;
  private isInitialized = false;
  private hasAudioUnlockListener = false;

  private readonly BG_COLOR = 0x1a1a2e;

  constructor(options: GameOptions) {
    this.platform = options.platform;

    // Initialize PixiJS Application
    this.app = new Application();

    // Initialize systems (will be configured in init())
    this.layoutSystem = new LayoutSystem(this.app);
    this.audioManager = new AudioManager(
      { ...DEFAULT_AUDIO_SETTINGS },
      DEFAULT_AUDIO_REGISTRY
    );

    // Create context object (will be enhanced after sceneManager is created)
    this.context = {
      app: this.app,
      DESIGN_W,
      DESIGN_H,
      layout: this.layoutSystem,
      audio: this.audioManager,
      platform: this.platform,
      sceneManager: null as any, // Will be set after creation
      settings: {
        audio: { ...DEFAULT_AUDIO_SETTINGS },
      },
      progress: {
        lastScore: 0,
        highScore: 0,
      },
      saveProgress: this.saveProgress.bind(this),
      loadProgress: this.loadProgress.bind(this),
    };

    // Scene manager (now context has sceneManager reference)
    this.sceneManager = new SceneManager(this.context);

    // Add sceneManager back to context (circular dependency resolved)
    this.context.sceneManager = this.sceneManager;
  }

  /**
   * Initialize the game
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Wait for platform initialization (with timeout)
      await withTimeout(
        this.platform.initialize(),
        3000,
        "Platform init timeout"
      ).catch(() => {
        console.warn("Platform init timed out, using defaults");
      });

      console.log("Platform initialized:", {
        playerId: this.platform.getPlayerId(),
        playerName: await Promise.race([
          this.platform.getPlayerName(),
          Promise.resolve("Player")
        ]),
        locale: this.platform.getLocale(),
      });

      // Get canvas dimensions
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Initialize PixiJS app
      await withTimeout(
        this.app.init({
          width,
          height,
          backgroundColor: this.BG_COLOR,
          autoDensity: true,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
        }),
        30000,
        "PixiJS init timeout"
      );

      // Add canvas to DOM
      const canvas = this.app.canvas;
      console.log("Canvas element:", canvas, "width:", canvas.width, "height:", canvas.height);

      // Find or create container
      let container = document.getElementById("game-container");
      if (!container) {
        container = document.body;
      }
      container.appendChild(canvas);

      // Ensure canvas is visible
      canvas.style.display = "block";
      canvas.style.width = "100%";
      canvas.style.height = "100%";

      console.log("PixiJS initialized, canvas appended");

      // Check for portrait orientation
      this.checkOrientation();

      // Create portrait overlay
      this.createPortraitOverlay();
      this.setupAudioUnlockOnFirstGesture();

      // Load saved progress
      await this.loadProgress();

      // Start with LoadingScene
      await this.startLoadingScene();

      // Connect ticker to scene manager
      this.app.ticker.add(createSceneTicker(this.sceneManager));
      this.app.ticker.add(this.handleOrientationTick);

      // Signal game ready
      this.platform.setLoadingProgress(100);
      this.platform.startGame().catch(() => {});

      this.isInitialized = true;

      console.log("Game initialized and started");
    } catch (e) {
      console.error("Game init error:", e);
      throw e;
    }
  }

  /**
   * Start with LoadingScene
   * Scene will handle its own transitions to MenuScene
   */
  private async startLoadingScene(): Promise<void> {
    const loadingScene = new LoadingScene(this.context);
    await this.sceneManager.changeScene(loadingScene);
  }

  /**
   * Check and handle orientation
   */
  private checkOrientation(): void {
    const wasPortrait = this.isPortrait;
    this.isPortrait = this.layoutSystem.isPortrait();

    if (this.isPortrait && !wasPortrait) {
      // Entered portrait mode
      this.showPortraitOverlay();
      this.pauseGame();
    } else if (!this.isPortrait && wasPortrait) {
      // Entered landscape mode
      this.hidePortraitOverlay();
      this.resumeGame();
    }
  }

  /**
   * Orientation handling only. Layout remains startup-only by design.
   */
  private handleOrientationTick = (): void => {
    this.checkOrientation();
  };

  /**
   * Pause the game (for portrait mode)
   */
  private pauseGame(): void {
    this.app.ticker.speed = 0;
  }

  /**
   * Resume the game
   */
  private resumeGame(): void {
    this.app.ticker.speed = 1;
  }

  /**
   * Create portrait orientation overlay
   */
  private createPortraitOverlay(): void {
    const overlay = document.createElement("div");
    overlay.id = "portrait-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      display: none;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      z-index: 9999;
      color: white;
      font-family: Arial, sans-serif;
    `;

    overlay.innerHTML = `
      <div style="
        width: 120px;
        height: 120px;
        border: 4px solid #00ff88;
        border-radius: 16px;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 24px;
        transform: rotate(90deg);
        animation: pulse 2s ease-in-out infinite;
      ">
        <svg width="60" height="60" viewBox="0 0 24 24" fill="#00ff88">
          <path d="M21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H3V6h18v12z"/>
        </svg>
      </div>
      <p style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">Rotate Your Device</p>
      <p style="font-size: 16px; opacity: 0.7;">This game requires landscape orientation</p>
      <style>
        @keyframes pulse {
          0%, 100% { transform: rotate(90deg) scale(1); opacity: 1; }
          50% { transform: rotate(90deg) scale(1.05); opacity: 0.8; }
        }
      </style>
    `;

    document.body.appendChild(overlay);
    this.portraitOverlay = overlay;
  }

  /**
   * Show portrait overlay
   */
  private showPortraitOverlay(): void {
    if (this.portraitOverlay) {
      this.portraitOverlay.style.display = "flex";
    }
  }

  /**
   * Hide portrait overlay
   */
  private hidePortraitOverlay(): void {
    if (this.portraitOverlay) {
      this.portraitOverlay.style.display = "none";
    }
  }

  /**
   * Unlock audio on first user gesture to satisfy browser autoplay policies.
   */
  private setupAudioUnlockOnFirstGesture(): void {
    if (this.hasAudioUnlockListener) {
      return;
    }

    const unlock = () => {
      this.audioManager.unlock();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      this.hasAudioUnlockListener = false;
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    this.hasAudioUnlockListener = true;
  }

  /**
   * Load progress from platform storage
   */
  private async loadProgress(): Promise<void> {
    try {
      const highScoreData = await this.platform.getData("highScore");
      if (highScoreData) {
        this.context.progress.highScore = parseInt(highScoreData, 10) || 0;
      }

      const lastScoreData = await this.platform.getData("lastScore");
      if (lastScoreData) {
        this.context.progress.lastScore = parseInt(lastScoreData, 10) || 0;
      }

      // Load audio settings
      const musicEnabled = await this.platform.getData("musicEnabled");
      if (musicEnabled !== null) {
        this.context.settings.audio.musicEnabled = musicEnabled === "true";
      }

      const sfxEnabled = await this.platform.getData("sfxEnabled");
      if (sfxEnabled !== null) {
        this.context.settings.audio.sfxEnabled = sfxEnabled === "true";
      }

      const musicVolume = await this.platform.getData("musicVolume");
      if (musicVolume !== null) {
        this.context.settings.audio.musicVolume = parseFloat(musicVolume) || 0.7;
      }

      const sfxVolume = await this.platform.getData("sfxVolume");
      if (sfxVolume !== null) {
        this.context.settings.audio.sfxVolume = parseFloat(sfxVolume) || 0.8;
      }

      // Sync audio manager with loaded settings
      this.audioManager.setMusicEnabled(this.context.settings.audio.musicEnabled);
      this.audioManager.setSfxEnabled(this.context.settings.audio.sfxEnabled);
      this.audioManager.setMusicVolume(this.context.settings.audio.musicVolume);
      this.audioManager.setSfxVolume(this.context.settings.audio.sfxVolume);

      console.log("Progress loaded:", this.context.progress);
    } catch (e) {
      console.warn("Failed to load progress:", e);
    }
  }

  /**
   * Save progress to platform storage
   */
  private async saveProgress(): Promise<void> {
    try {
      await this.platform.setData("highScore", this.context.progress.highScore.toString());
      await this.platform.setData("lastScore", this.context.progress.lastScore.toString());

      // Save audio settings
      await this.platform.setData("musicEnabled", this.context.settings.audio.musicEnabled.toString());
      await this.platform.setData("sfxEnabled", this.context.settings.audio.sfxEnabled.toString());
      await this.platform.setData("musicVolume", this.context.settings.audio.musicVolume.toString());
      await this.platform.setData("sfxVolume", this.context.settings.audio.sfxVolume.toString());

      // Update platform score if supported
      if (this.platform.updateScore) {
        await this.platform.updateScore(this.context.progress.highScore);
      }

      console.log("Progress saved:", this.context.progress);
    } catch (e) {
      console.warn("Failed to save progress:", e);
    }
  }

  /**
   * Get the current scene
   */
  getCurrentScene(): Scene | null {
    return this.sceneManager.getCurrentScene();
  }

  /**
   * Destroy the game and cleanup resources
   */
  destroy(): void {
    this.app.ticker.remove(this.handleOrientationTick);

    // Remove portrait overlay
    if (this.portraitOverlay && this.portraitOverlay.parentNode) {
      this.portraitOverlay.parentNode.removeChild(this.portraitOverlay);
    }

    // Destroy scene manager
    this.sceneManager.destroy();

    // Destroy audio manager
    this.audioManager.destroy();

    // Destroy PixiJS app
    this.app.destroy(true, { children: true, texture: true });

    this.isInitialized = false;
  }

  /**
   * Get the PixiJS application instance
   */
  getApp(): Application {
    return this.app;
  }

  /**
   * Get the audio manager (for external control)
   */
  getAudioManager(): AudioManager {
    return this.audioManager;
  }

  /**
   * Get the layout system
   */
  getLayoutSystem(): LayoutSystem {
    return this.layoutSystem;
  }
}
