import { Container, type Application } from "pixi.js";
import type { LayoutSystem, SceneLayers } from "./LayoutSystem.js";
import type { AudioManager, AudioSettings } from "./AudioManager.js";
import type { PlatformAPI } from "@repo/shared";
import type { SceneManager } from "./SceneManager.js";

/**
 * Game context passed to all scenes
 * Contains all shared services and state
 */
export interface GameContext {
  /** PixiJS application */
  app: Application;
  /** Design width (1920) */
  DESIGN_W: number;
  /** Design height (1080) */
  DESIGN_H: number;
  /** Layout system for scaling */
  layout: LayoutSystem;
  /** Audio manager */
  audio: AudioManager;
  /** Scene manager - for changing scenes (set after initialization) */
  sceneManager: SceneManager | null;
  /** Platform adapter */
  platform: PlatformAPI;
  /** Global settings */
  settings: {
    audio: AudioSettings;
  };
  /** Game progress/state */
  progress: {
    lastScore: number;
    highScore: number;
  };
  /** Save progress to platform storage */
  saveProgress(): Promise<void>;
  /** Load progress from platform storage */
  loadProgress(): Promise<void>;
}

/**
 * Base Scene interface
 * All scenes must implement this lifecycle
 */
export interface Scene {
  /** Root container for this scene's content */
  container: Container;
  /** Scene name for debugging */
  name: string;

  /**
   * Initialize scene - called once when scene is first loaded
   * Use for async operations like asset loading
   */
  create(): Promise<void> | void;

  /**
   * Update loop - called every frame with delta time in seconds
   */
  update(dt: number): void;

  /**
   * Called when scene is being replaced (but before destroy)
   * Use for cleanup that doesn't destroy resources
   */
  exit(): void;

  /**
   * Called when scene is being destroyed
   * Use for cleaning up event listeners, resources, etc.
   */
  destroy(): void;
}

/**
 * Scene transition options
 */
export interface SceneTransitionOptions {
  /** Data to pass to next scene */
  data?: Record<string, unknown>;
  /** Fade duration in seconds (not implemented yet) */
  fadeDuration?: number;
}

/**
 * Base scene class with default implementations and helper methods
 * Extend this for convenience
 */
export abstract class BaseScene implements Scene {
  container: Container;
  name: string;
  protected context: GameContext;

  constructor(name: string, context: GameContext) {
    this.name = name;
    this.context = context;
    this.container = new Container();
  }

  /**
   * Override this to implement scene creation
   */
  async create(): Promise<void> {
    // Default: nothing to create
  }

  /**
   * Override this to implement per-frame updates
   */
  update(_dt: number): void {
    // Default: no updates
  }

  /**
   * Override this for cleanup on scene exit
   */
  exit(): void {
    // Default: nothing to clean up
  }

  /**
   * Override this for resource cleanup
   */
  destroy(): void {
    this.container.destroy({ children: true });
  }

  /**
   * Helper to change to another scene
   * Scenes can call this directly to trigger transitions
   */
  protected changeScene(scene: Scene, options?: SceneTransitionOptions): Promise<void> {
    if (!this.context.sceneManager) {
      console.error("SceneManager not available in context");
      return Promise.reject(new Error("SceneManager not available"));
    }
    return this.context.sceneManager.changeScene(scene, options);
  }

  /**
   * Helper to get scene layers for adding content
   */
  protected getLayers(): SceneLayers {
    const layers = this.context.layout.getSceneLayers();
    if (!layers) {
      throw new Error("Scene layers not initialized. Call layout.createSceneLayers() first.");
    }
    return layers;
  }

  /**
   * Helper to get layout state
   */
  protected getLayoutState() {
    return this.context.layout.getLayoutState();
  }
}
