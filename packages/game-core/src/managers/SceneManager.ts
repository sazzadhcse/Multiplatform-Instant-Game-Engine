import { Container, type Ticker } from "pixi.js";
import type { Scene, SceneTransitionOptions, GameContext } from "./Scene.js";

/**
 * SceneManager - Handles scene lifecycle and transitions
 *
 * Scene flow:
 * 1. currentScene.exit() - cleanup current scene
 * 2. remove currentScene.container from stage
 * 3. currentScene.destroy() - destroy resources
 * 4. set nextScene as current
 * 5. add nextScene.container to stage
 * 6. await nextScene.create() - initialize new scene
 */
export class SceneManager {
  private context: GameContext;
  private sceneRoot: Container;
  private currentScene: Scene | null = null;
  private isChanging = false;
  private pendingTransition: {
    scene: Scene;
    options?: SceneTransitionOptions;
  } | null = null;

  constructor(context: GameContext) {
    this.context = context;
    this.sceneRoot = new Container();
    this.context.app.stage.addChild(this.sceneRoot);
  }

  /**
   * Get the current scene
   */
  getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  /**
   * Get the scene root container
   */
  getSceneRoot(): Container {
    return this.sceneRoot;
  }

  /**
   * Change to a new scene
   * Handles the full transition lifecycle
   */
  async changeScene(scene: Scene, options?: SceneTransitionOptions): Promise<void> {
    // If already changing, queue the transition
    if (this.isChanging) {
      this.pendingTransition = { scene, options };
      return;
    }

    this.isChanging = true;

    try {
      // Exit current scene
      if (this.currentScene) {
        this.currentScene.exit();
        this.sceneRoot.removeChild(this.currentScene.container);
        this.currentScene.destroy();
      }

      // Set new scene
      this.currentScene = scene;
      this.sceneRoot.addChild(scene.container);

      // Create/initialize new scene (wait for async operations)
      await scene.create();

      console.log(`Scene changed to: ${scene.name}`);
    } catch (e) {
      console.error(`Error changing to scene "${scene.name}":`, e);
      throw e;
    } finally {
      this.isChanging = false;

      // Process pending transition if any
      if (this.pendingTransition) {
        const pending = this.pendingTransition;
        this.pendingTransition = null;
        await this.changeScene(pending.scene, pending.options);
      }
    }
  }

  /**
   * Update the current scene
   * Called from the main game loop
   */
  update(dt: number): void {
    if (this.currentScene && !this.isChanging) {
      this.currentScene.update(dt);
    }
  }

  /**
   * Check if a scene change is in progress
   */
  isTransitioning(): boolean {
    return this.isChanging;
  }

  /**
   * Destroy the scene manager and cleanup
   */
  destroy(): void {
    if (this.currentScene) {
      this.currentScene.exit();
      this.currentScene.destroy();
      this.currentScene = null;
    }
    this.sceneRoot.destroy({ children: true });
  }
}

/**
 * Create a ticker update handler for the SceneManager
 * This connects the PixiJS ticker to scene updates
 */
export function createSceneTicker(
  sceneManager: SceneManager
): (ticker: Ticker) => void {
  return (ticker: Ticker) => {
    sceneManager.update(ticker.deltaMS / 1000);
  };
}
