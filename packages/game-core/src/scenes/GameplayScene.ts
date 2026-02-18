import { Graphics, Text, Container, Sprite, Assets } from "pixi.js";
import { BaseScene, type GameContext } from "../Scene.js";
import { CompleteScene } from "./CompleteScene.js";

/**
 * Coin data structure
 */
interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

/**
 * Parallax layer data
 */
interface ParallaxLayer {
  container: Container;
  speed: number;
  y: number;
}

/**
 * GameplayScene - Main game scene with coin collection gameplay
 *
 * Features:
 * - Player movement (keyboard + touch)
 * - Coin collection with scoring
 * - Parallax background
 * - UI HUD
 * - Completion after collecting target score
 */
export class GameplayScene extends BaseScene {
  private player: Graphics;
  private coinsGraphics: Graphics;
  private scoreText: Text;
  private targetScoreText: Text;
  private pauseButton: Graphics;
  private pauseIcon: Graphics;

  // Game objects
  private coins: Coin[] = [];
  private parallaxLayers: ParallaxLayer[] = [];

  // Player state (in design coordinates)
  private playerX = this.context.DESIGN_W / 2;
  private playerY = this.context.DESIGN_H / 2;
  private playerSize = 40;
  private playerSpeed = 400; // pixels per second in design coords

  // Coin config
  private coinRadius = 12;
  private coinValue = 10;
  private targetScore = 200; // Complete after collecting 200 points

  // Input state
  private keys: Record<string, boolean> = {};
  private touchStart: { x: number; y: number } | null = null;
  private touchActive = false;

  // Game state
  private score = 0;
  private isPaused = false;
  private isCompleted = false;

  private readonly PLAYER_COLOR = 0x00ff88;
  private readonly COIN_COLOR = 0xffd700;
  private readonly BG_COLOR = 0x1a1a2e;

  constructor(context: GameContext) {
    super("GameplayScene", context);
    this.player = new Graphics();
    this.coinsGraphics = new Graphics();
    this.scoreText = new Text();
    this.targetScoreText = new Text();
    this.pauseButton = new Graphics();
    this.pauseIcon = new Graphics();
  }
  //   this.onPauseCallback = callback;
  // }

  async create(): Promise<void> {
    const layers = this.getLayers();

    // Create parallax background
    this.createParallaxBackground(layers.bgLayer);

    // Create player
    this.createPlayer(layers.worldLayer);

    // Create coins
    this.spawnCoins(8);
    this.drawCoins();
    layers.worldLayer.addChild(this.coinsGraphics);

    // Create UI
    this.createUI(layers.uiLayer);

    // Setup input handlers
    this.setupInput();

    // Reset score
    this.score = 0;
    this.updateUI();

    // Switch to gameplay music
    this.context.audio.playMusic("bgm_gameplay");

    // Reset state
    this.isCompleted = false;
    this.isPaused = false;
  }

  
  private createParallaxBackground(bgLayer: Container): void {
    // Try to use pre-loaded background image
    let hasBgImage = false;
    try {
      const texture = Assets.get("assets/images/bgGameplay.jpg");
      if (texture) {
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5);
        sprite.x = this.context.DESIGN_W / 2;
        sprite.y = this.context.DESIGN_H / 2;

        // Scale to cover (FILL scaling)
        const scaleX = this.context.DESIGN_W / sprite.width;
        const scaleY = this.context.DESIGN_H / sprite.height;
        const scale = Math.max(scaleX, scaleY);
        sprite.scale.set(scale);

        bgLayer.addChild(sprite);
        hasBgImage = true;
      }
    } catch {
      // Fall through to fallback
    }

    // Fallback solid background (only if no image loaded)
    if (!hasBgImage) {
      const bg = new Graphics();
      bg.rect(0, 0, this.context.DESIGN_W, this.context.DESIGN_H);
      bg.fill({ color: this.BG_COLOR });
      bgLayer.addChild(bg);
    }

    // Create multiple parallax layers (on top of background)
    const layerConfigs = [
      { color: 0x252540, speed: 0.1, count: 15 },
      { color: 0x303050, speed: 0.2, count: 10 },
      { color: 0x3a3a60, speed: 0.3, count: 8 },
    ];

    for (const config of layerConfigs) {
      const container = new Container();
      for (let i = 0; i < config.count; i++) {
        const circle = new Graphics();
        const x = Math.random() * this.context.DESIGN_W;
        const y = Math.random() * this.context.DESIGN_H;
        const radius = 30 + Math.random() * 100;
        circle.circle(x, y, radius);
        circle.fill({ color: config.color, alpha: 0.5 });
        container.addChild(circle);
      }
      bgLayer.addChild(container);
      this.parallaxLayers.push({
        container,
        speed: config.speed,
        y: 0,
      });
    }
  }

  private createPlayer(worldLayer: Container): void {
    const halfSize = this.playerSize / 2;
    this.player.roundRect(-halfSize, -halfSize, this.playerSize, this.playerSize, 8);
    this.player.fill({ color: this.PLAYER_COLOR });
    this.player.position.set(this.playerX, this.playerY);
    this.player.pivot.set(halfSize, halfSize);
    worldLayer.addChild(this.player);

    // Reset position to center
    this.playerX = this.context.DESIGN_W / 2;
    this.playerY = this.context.DESIGN_H / 2;
    this.player.position.set(this.playerX, this.playerY);
  }

  private spawnCoins(count: number): void {
    const margin = 100;
    for (let i = 0; i < count; i++) {
      this.coins.push({
        x: margin + Math.random() * (this.context.DESIGN_W - margin * 2),
        y: margin + Math.random() * (this.context.DESIGN_H - margin * 2),
        collected: false,
      });
    }
  }

  private drawCoins(): void {
    this.coinsGraphics.clear();
    for (const coin of this.coins) {
      if (!coin.collected) {
        // Outer ring
        this.coinsGraphics.circle(coin.x, coin.y, this.coinRadius + 2);
        this.coinsGraphics.fill({ color: 0xffaa00 });

        // Inner circle
        this.coinsGraphics.circle(coin.x, coin.y, this.coinRadius - 2);
        this.coinsGraphics.fill({ color: this.COIN_COLOR });
      }
    }
  }

  private createUI(uiLayer: Container): void {
    // Score display
    this.scoreText.anchor.set(0, 0);
    this.scoreText.x = 30;
    this.scoreText.y = 30;
    this.scoreText.style = {
      fill: 0xffffff,
      fontSize: 36,
      fontWeight: "bold",
      dropShadow: {
        color: 0x000000,
        alpha: 0.5,
        blur: 4,
        distance: 2,
      },
    };
    uiLayer.addChild(this.scoreText);

    // Target score display
    this.targetScoreText.anchor.set(1, 0);
    this.targetScoreText.x = this.context.DESIGN_W - 30;
    this.targetScoreText.y = 30;
    this.targetScoreText.style = {
      fill: 0xffd700,
      fontSize: 28,
      dropShadow: {
        color: 0x000000,
        alpha: 0.5,
        blur: 4,
        distance: 2,
      },
    };
    this.targetScoreText.text = `Target: ${this.targetScore}`;
    uiLayer.addChild(this.targetScoreText);

    // Pause button
    const pauseBtnSize = 60;
    const pauseBtnX = this.context.DESIGN_W - pauseBtnSize - 20;
    const pauseBtnY = this.context.DESIGN_H - pauseBtnSize - 20;

    this.pauseButton.roundRect(pauseBtnX, pauseBtnY, pauseBtnSize, pauseBtnSize, 12);
    this.pauseButton.fill({ color: 0x444466, alpha: 0.8 });
    this.pauseButton.eventMode = "static";
    this.pauseButton.cursor = "pointer";
    this.pauseButton.on("pointerdown", () => {
      this.context.audio.playSfx("sfx_click");
      this.isPaused = !this.isPaused;
      this.updatePauseButton();
    });
    uiLayer.addChild(this.pauseButton);

    // Pause icon (two bars)
    this.updatePauseIcon(pauseBtnX, pauseBtnY, pauseBtnSize);
    uiLayer.addChild(this.pauseIcon);
  }

  private updatePauseButton(): void {
    this.pauseButton.clear();
    const pauseBtnSize = 60;
    const pauseBtnX = this.context.DESIGN_W - pauseBtnSize - 20;
    const pauseBtnY = this.context.DESIGN_H - pauseBtnSize - 20;

    this.pauseButton.roundRect(pauseBtnX, pauseBtnY, pauseBtnSize, pauseBtnSize, 12);
    if (this.isPaused) {
      this.pauseButton.fill({ color: 0x00ff88, alpha: 0.8 });
    } else {
      this.pauseButton.fill({ color: 0x444466, alpha: 0.8 });
    }
    this.updatePauseIcon(pauseBtnX, pauseBtnY, pauseBtnSize);
  }

  private updatePauseIcon(x: number, y: number, size: number): void {
    this.pauseIcon.clear();
    const barWidth = 8;
    const barHeight = 20;
    const centerX = x + size / 2;
    const centerY = y + size / 2;

    if (this.isPaused) {
      // Play icon (triangle)
      this.pauseIcon.moveTo(centerX - 6, centerY - 10);
      this.pauseIcon.lineTo(centerX - 6, centerY + 10);
      this.pauseIcon.lineTo(centerX + 10, centerY);
      this.pauseIcon.closePath();
      this.pauseIcon.fill({ color: 0x1a1a2e });
    } else {
      // Pause icon (two bars)
      this.pauseIcon.roundRect(centerX - 10, centerY - barHeight / 2, barWidth, barHeight, 2);
      this.pauseIcon.fill({ color: 0xffffff });
      this.pauseIcon.roundRect(centerX + 2, centerY - barHeight / 2, barWidth, barHeight, 2);
      this.pauseIcon.fill({ color: 0xffffff });
    }
  }

  private readonly handleKeyDown = (e: KeyboardEvent): void => {
    this.keys[e.key.toLowerCase()] = true;
    this.keys[e.code] = true;
  };

  private readonly handleKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.key.toLowerCase()] = false;
    this.keys[e.code] = false;
  };

  private readonly handleTouchStart = (e: TouchEvent): void => {
    if (!this.container.stage) return;
    const layout = this.context.layout.getLayoutState();
    const touch = e.touches[0];
    const localX = (touch.clientX - layout.offsetX) / layout.scaleFit;
    const localY = (touch.clientY - layout.offsetY) / layout.scaleFit;
    this.touchStart = { x: localX, y: localY };
    this.touchActive = true;
  };

  private readonly handleTouchMove = (e: TouchEvent): void => {
    if (!this.touchActive || !this.touchStart || !this.container.stage) return;
    const layout = this.context.layout.getLayoutState();
    const touch = e.touches[0];
    const localX = (touch.clientX - layout.offsetX) / layout.scaleFit;
    const localY = (touch.clientY - layout.offsetY) / layout.scaleFit;

    this.playerX += localX - this.touchStart.x;
    this.playerY += localY - this.touchStart.y;

    this.touchStart = { x: localX, y: localY };
    e.preventDefault();
  };

  private readonly handleTouchEnd = (): void => {
    this.touchActive = false;
    this.touchStart = null;
  };

  private setupInput(): void {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("touchstart", this.handleTouchStart, { passive: false });
    window.addEventListener("touchmove", this.handleTouchMove, { passive: false });
    window.addEventListener("touchend", this.handleTouchEnd);
  }

  private inputCleanup = (): void => {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("touchstart", this.handleTouchStart);
    window.removeEventListener("touchmove", this.handleTouchMove);
    window.removeEventListener("touchend", this.handleTouchEnd);
  };

  update(dt: number): void {
    if (this.isPaused || this.isCompleted) {
      return;
    }

    // Handle keyboard input
    let movedX = 0;
    let movedY = 0;

    if (this.keys["arrowleft"] || this.keys["a"]) {
      movedX -= 1;
    }
    if (this.keys["arrowright"] || this.keys["d"]) {
      movedX += 1;
    }
    if (this.keys["arrowup"] || this.keys["w"]) {
      movedY -= 1;
    }
    if (this.keys["arrowdown"] || this.keys["s"]) {
      movedY += 1;
    }

    // Normalize diagonal movement
    if (movedX !== 0 && movedY !== 0) {
      const len = Math.sqrt(movedX * movedX + movedY * movedY);
      movedX /= len;
      movedY /= len;
    }

    // Apply movement (scaled by delta time for consistent speed)
    this.playerX += movedX * this.playerSpeed * dt;
    this.playerY += movedY * this.playerSpeed * dt;

    // Clamp player position to design coordinates
    const halfSize = this.playerSize / 2;
    this.playerX = Math.max(halfSize, Math.min(this.context.DESIGN_W - halfSize, this.playerX));
    this.playerY = Math.max(halfSize, Math.min(this.context.DESIGN_H - halfSize, this.playerY));

    // Update player graphics position
    this.player.position.set(this.playerX, this.playerY);

    // Update parallax (subtle movement based on player position)
    this.updateParallax();

    // Check coin collisions
    this.checkCoinCollisions();
  }

  private updateParallax(): void {
    // Parallax offset based on player position relative to center
    const offsetX = (this.playerX - this.context.DESIGN_W / 2) * 0.05;
    const offsetY = (this.playerY - this.context.DESIGN_H / 2) * 0.05;

    for (const layer of this.parallaxLayers) {
      layer.container.x = offsetX * layer.speed;
      layer.container.y = offsetY * layer.speed;
    }
  }

  private checkCoinCollisions(): void {
    for (const coin of this.coins) {
      if (!coin.collected) {
        const dx = this.playerX - coin.x;
        const dy = this.playerY - coin.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.playerSize / 2 + this.coinRadius) {
          coin.collected = true;
          this.score += this.coinValue;
          this.context.audio.playSfx("sfx_coin");
          this.updateUI();
          this.drawCoins();

          // Spawn new coin
          const margin = 100;
          this.coins.push({
            x: margin + Math.random() * (this.context.DESIGN_W - margin * 2),
            y: margin + Math.random() * (this.context.DESIGN_H - margin * 2),
            collected: false,
          });
          this.drawCoins();

          // Save progress
          this.context.progress.lastScore = this.score;
          this.context.saveProgress();

          // Check completion
          if (this.score >= this.targetScore && !this.isCompleted) {
            this.isCompleted = true;
            this.completeGame();
          }
        }
      }
    }
  }

  private updateUI(): void {
    this.scoreText.text = `Score: ${this.score}`;
  }

  private completeGame(): void {
    this.context.audio.playSfx("sfx_complete");

    // Update high score
    if (this.score > this.context.progress.highScore) {
      this.context.progress.highScore = this.score;
      this.context.saveProgress();
    }

    // Trigger scene transition after a short delay
    setTimeout(() => {
      this.changeScene(new CompleteScene(this.context));
    }, 500);
  }

  exit(): void {
    this.inputCleanup();
  }

  destroy(): void {
    this.player.destroy();
    this.coinsGraphics.destroy();
    this.scoreText.destroy();
    this.targetScoreText.destroy();
    this.pauseButton.destroy();
    this.pauseIcon.destroy();

    // Clean up parallax layers
    for (const layer of this.parallaxLayers) {
      layer.container.destroy();
    }
    this.parallaxLayers = [];

    // Clear coins
    this.coins = [];

    super.destroy();
  }

  /**
   * Get current score (for external access)
   */
  getScore(): number {
    return this.score;
  }

  /**
   * Pause/unpause the game
   */
  setPaused(paused: boolean): void {
    this.isPaused = paused;
    this.updatePauseButton();
  }
}
