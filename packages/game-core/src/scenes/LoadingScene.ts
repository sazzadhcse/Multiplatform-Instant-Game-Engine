import { Graphics, Text, Container, Sprite, Assets } from "pixi.js";
import { BaseScene, type GameContext } from "../Scene.js";
import { MenuScene } from "./MenuScene.js";
import { DEFAULT_AUDIO_REGISTRY } from "../AudioManager.js";

/**
* LoadingScene - Shows loading progress and transitions to MenuScene
*
* Loading sequence:
* 1. Load bgLoading.png background image first
* 2. Display background on bgLayer
* 3. Show loading bar
* 4. Load remaining assets (images, audio)
* 5. Transition to MenuScene when complete
*/
export class LoadingScene extends BaseScene {
  private loadingBarBg: Graphics;
  private loadingBarFill: Graphics;
  private loadingText: Text;
  private backgroundSprite: Sprite | null = null;
  
  private progress = 0;
  private transitioned = false; // Track if we've already transitioned to Menu
  
  // Asset loading
  private totalAssets = 0;
  private loadedAssets = 0;
  
  
  // Assets to load
  private imageAssets = [
    "assets/images/bgMenu.jpg",
    "assets/images/flag.png",
    "assets/images/ship.png",
    "assets/images/pole.png",
    "assets/images/bgGameplay.jpg",
    "assets/images/bgComplete.png",
    "assets/images/titleTop.png",
    "assets/images/titleBottom.png",
    "assets/images/uiCoin.png",
    "assets/images/uiLife.png",
    "assets/images/uiSetting.png",
    "assets/images/uiMap.png",
    "assets/images/uiBox.png",
    "assets/images/uiAnchor.png",
    "assets/images/uiTime.png",
    "assets/images/uiPlayBg.png",
  ];
  
  // Audio assets are loaded via AudioManager from DEFAULT_AUDIO_REGISTRY
  private readonly audioAssetCount = Object.keys(DEFAULT_AUDIO_REGISTRY).length;
  
  constructor(context: GameContext) {
    super("LoadingScene", context);
    this.loadingBarBg = new Graphics();
    this.loadingBarFill = new Graphics();
    this.loadingText = new Text();
  }
  
  async create(): Promise<void> {
    // Hide the HTML loading background now that LoadingScene is starting
    const loadingBg = document.getElementById("loading-bg");
    if (loadingBg) {
      loadingBg.classList.add("hidden");
      setTimeout(() => loadingBg.remove(), 500);
    }
    
    const layers = this.getLayers();
    
    // Step 1: Load background image first (20% progress)
    await this.loadBackground(layers.bgLayer);
    
    // Step 2: Create UI elements (loading bar, text)
    this.createLoadingUI(layers.uiLayer);
    
    
    for (let i = 0; i < 3; i++) {
      this.imageAssets.push(`assets/images/heart${i + 1}.png`); 
    }
    
    
    // Step 3: Load all game assets with progress tracking
    await this.loadAllAssets(layers.worldLayer);
    
    // Step 4: Load saved progress
    await this.context.loadProgress();
  }
  
  /**
  * Load background image first and display on bgLayer
  */
  private async loadBackground(bgLayer: Container): Promise<void> {
    this.updateProgress(0, "Loading background...");
    
    try {
      // Try to load the background image
      const bgTexture = await Assets.load("assets/images/bgLoading.jpg");
      
      this.backgroundSprite = new Sprite(bgTexture);
      this.backgroundSprite.anchor.set(0.5);
      this.backgroundSprite.x = this.context.DESIGN_W / 2;
      this.backgroundSprite.y = this.context.DESIGN_H / 2;
      
      // Scale to cover the entire design area (FILL scaling)
      const scaleX = this.context.DESIGN_W / this.backgroundSprite.width;
      const scaleY = this.context.DESIGN_H / this.backgroundSprite.height;
      const scale = Math.max(scaleX, scaleY);
      this.backgroundSprite.scale.set(scale);
      
      bgLayer.addChild(this.backgroundSprite);
      console.log("Loading background loaded successfully");
    } catch (e) {
      // If background fails to load, use fallback solid background
      console.warn("Failed to load bgLoading.png, using fallback:", e);
      
      const fallbackBg = new Graphics();
      fallbackBg.rect(0, 0, this.context.DESIGN_W, this.context.DESIGN_H);
      fallbackBg.fill({ color: 0x1a1a2e });
      
      // Add some decorative circles as fallback
      for (let i = 0; i < 10; i++) {
        const x = Math.random() * this.context.DESIGN_W;
        const y = Math.random() * this.context.DESIGN_H;
        const radius = 50 + Math.random() * 150;
        fallbackBg.circle(x, y, radius);
        fallbackBg.fill({ color: 0x252540, alpha: 0.5 });
      }
      
      bgLayer.addChild(fallbackBg);
    }
    
    // Background loaded = 20% progress
    this.updateProgress(20, "Background loaded");
  }
  
  /**
  * Create loading UI elements
  */
  private createLoadingUI(uiLayer: Container): void {
    const barWidth = 600;
    const barHeight = 30;
    const barX = (this.context.DESIGN_W - barWidth) / 2;
    const barY = (this.context.DESIGN_H + 500) / 2;
    
    // Loading bar background
    this.loadingBarBg.roundRect(barX, barY, barWidth, barHeight, 8);
    this.loadingBarBg.fill({ color: 0x333344, alpha: 0.8 });
    uiLayer.addChild(this.loadingBarBg);
    
    // Loading bar fill
    this.loadingBarFill.roundRect(barX, barY, 0, barHeight, 8);
    this.loadingBarFill.fill({ color: 0x00ff88 });
    uiLayer.addChild(this.loadingBarFill);
    
    // Loading text
    this.loadingText.text = "Loading... 20%";
    this.loadingText.anchor.set(0.5);
    this.loadingText.x = this.context.DESIGN_W / 2;
    this.loadingText.y = barY - 40;
    this.loadingText.style = {
      fill: 0xffffff,
      fontSize: 32,
      fontWeight: "bold",
      dropShadow: {
        color: 0x000000,
        alpha: 0.5,
        blur: 4,
        distance: 2,
      },
    };
    uiLayer.addChild(this.loadingText);
    
    this.updateLoadingBar();
  }
  
  /**
  * Load all game assets (images + audio) with progress tracking
  */
  private async loadAllAssets(worldLayer: Container): Promise<void> {
    this.totalAssets = this.imageAssets.length + this.audioAssetCount;
    this.loadedAssets = 0;
    
    // Calculate progress per asset (from 20% to 100%)
    const progressRange = 80; // 80% remaining after background
    const progressPerAsset = progressRange / this.totalAssets;
    
    // NOTE: FB's instantLoad DISABLED - causes 403 errors when assets aren't on FB CDN
    // In production, upload assets to FB first, then re-enable this
    
    // Step 1: Load images via PixiJS Assets with proper error handling
    for (const imageUrl of this.imageAssets) {
      try {
        console.log(`[LoadingScene] Loading: ${imageUrl}`);
        const texture = await Assets.load(imageUrl);
        console.log(`[LoadingScene] ✓ Loaded: ${imageUrl} (${texture.width}x${texture.height})`);
      } catch (e) {
        console.error(`[LoadingScene] ✗ Failed to load "${imageUrl}":`, e);
      } finally {
        this.loadedAssets++;
        const currentProgress = 20 + (this.loadedAssets * progressPerAsset);
        this.updateProgress(currentProgress, `Loading assets... ${this.loadedAssets}/${this.totalAssets}`);
      }
    }
    
    // Step 2: Load audio files via AudioManager
    await this.context.audio.preloadSounds((loaded, total) => {
      this.loadedAssets = this.imageAssets.length + loaded;
      const currentProgress = 20 + (this.loadedAssets * progressPerAsset);
      this.updateProgress(currentProgress, `Loading audio... ${loaded}/${total}`);
    });
    
    console.log(`[LoadingScene] All ${this.audioAssetCount} audio sounds preloaded`);
    
    // Step 3: Verify critical assets are in PixiJS cache
    // const criticalAssets = [
    //   "assets/images/bgMenu.jpg",
    //   "assets/images/bgGameplay.jpg",
    //   "assets/images/ship.png",
    // ];
    
    
    // let cachedCount = 0;
    // for (const asset of criticalAssets) {
    //   try {
    //     // Check if asset exists in PixiJS cache
    //     // @ts-ignore - accessing internal cache
    //     const cache = Assets.cache;
    //     const hasKey = cache.has(asset);
        
    //     if (hasKey) {
    //       console.log(`[LoadingScene] ✓ Cache hit: ${asset}`);
    //       cachedCount++;
    //     } else {
    //       console.warn(`[LoadingScene] ⚠ Cache miss, reloading: ${asset}`);
    //       await Assets.load(asset);
    //       cachedCount++;
    //     }
    //   } catch (e) {
    //     console.error(`[LoadingScene] ✗ Cannot cache "${asset}":`, e);
    //   }
    // }
    
    // console.log(`[LoadingScene] Cache verification: ${cachedCount}/${criticalAssets.length} critical assets`);
    
    // All done!
    this.updateProgress(100, "Loading complete!");
  }
  
  
  /**
  * Update progress state
  * Also reports progress to the platform (e.g., FB Instant)
  */
  private updateProgress(value: number, message: string): void {
    this.progress = Math.min(100, Math.max(0, value));
    
    // Report progress to the platform (FB Instant, etc.)
    this.context.platform.setLoadingProgress(this.progress);
    
    this.updateLoadingBar();
    if (this.loadingText) {
      this.loadingText.text = message;
    }
  }
  
  /**
  * Update the loading bar visual
  */
  private updateLoadingBar(): void {
    const barWidth = 600;
    const barHeight = 30;
    const barX = (this.context.DESIGN_W - barWidth) / 2;
    const barY = (this.context.DESIGN_H + 500) / 2;
    
    this.loadingBarFill.clear();
    const fillWidth = (this.progress / 100) * barWidth;
    if (fillWidth > 0) {
      this.loadingBarFill.roundRect(barX, barY, fillWidth, barHeight, 8);
      this.loadingBarFill.fill({ color: 0x00ff88 });
    }
    
    this.loadingText.text = `Loading... ${Math.floor(this.progress)}%`;
  }
  
  update(_dt: number): void {
    // Check if loading is complete, then transition to MenuScene
    if (this.progress >= 100 && !this.transitioned) {
      this.transitioned = true;
      
      console.log("[LoadingScene] Loading complete, starting game...");
      
      // Signal FB that loading is complete and game is ready
      this.context.platform.startGame().catch(() => {
        console.warn("[LoadingScene] startGame() failed (non-FB environment?)");
      });
      
      // Unlock audio on first user-triggered transition
      this.context.audio.unlock();
      
      // Transition to MenuScene
      this.changeScene(new MenuScene(this.context));
    }
  }
  
  exit(): void {
    // Clean up when scene exits
  }
  
  destroy(): void {
    this.loadingBarBg.destroy();
    this.loadingBarFill.destroy();
    this.loadingText.destroy();
    this.backgroundSprite = null;
    super.destroy();
  }
  
  /**
  * Set loading progress directly (for manual control)
  */
  setProgress(value: number): void {
    this.progress = Math.max(0, Math.min(100, value));
    this.updateLoadingBar();
  }
}
