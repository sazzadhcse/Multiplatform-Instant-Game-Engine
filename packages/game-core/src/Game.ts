import { Application, Container, Graphics, Text, Ticker } from "pixi.js";
import type { PlatformAPI } from "@repo/shared";

interface GameOptions {
  platform: PlatformAPI;
  canvas?: HTMLCanvasElement;
  width?: number;
  height?: number;
  bgColor?: number;
}

interface PlayerConfig {
  x: number;
  y: number;
  size: number;
  color: number;
  speed: number;
}

interface CoinConfig {
  x: number;
  y: number;
  radius: number;
  color: number;
  value: number;
}

/**
 * Core game class - platform-agnostic game logic
 */
export class Game {
  private app: Application;
  private platform: PlatformAPI;
  private scene: Container;
  private player: Graphics;
  private coins: Graphics;
  private uiText: Text;
  private highScoreText: Text;

  // Game state
  private playerX = 0;
  private playerY = 0;
  private playerSize = 40;
  private playerSpeed = 5;
  private playerColor = 0x00ff88;
  private coinsArray: Array<{ x: number; y: number; collected: boolean }> = [];
  private score = 0;
  private highScore = 0;
  private coinRadius = 12;
  private coinColor = 0xffd700;
  private coinValue = 10;
  private bgColor = 0x1a1a2e;

  // Input state
  private keys: Record<string, boolean> = {};
  private touchStart: { x: number; y: number } | null = null;

  private readonly PLAYER_COLOR = 0x00ff88;
  private readonly COIN_COLOR = 0xffd700;
  private readonly BG_COLOR = 0x1a1a2e;
  private readonly UI_COLOR = 0xffffff;

  constructor(options: GameOptions) {
    this.platform = options.platform;

    // Initialize PixiJS Application
    this.app = new Application();
    this.scene = new Container();

    // Create game objects (will be initialized in async init)
    this.player = new Graphics();
    this.coins = new Graphics();
    this.uiText = new Text({ text: "", style: { fill: this.UI_COLOR, fontSize: 20 } });
    this.highScoreText = new Text({ text: "", style: { fill: this.UI_COLOR, fontSize: 16 } });
  }

  /**
   * Initialize the game
   */
  async init(): Promise<void> {
    // Wait for platform initialization
    await this.platform.initialize();

    // Get canvas dimensions
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Initialize PixiJS app
    await this.app.init({
      canvas: document.createElement("canvas"),
      width,
      height,
      backgroundColor: this.BG_COLOR,
      autoDensity: true,
      resizeTo: window,
      antialias: true,
    });

    // Add canvas to DOM if not provided
    const canvas = this.app.canvas;
    if (canvas.parentElement !== document.body) {
      document.body.appendChild(canvas);
    }

    // Add scene to stage
    this.app.stage.addChild(this.scene);

    // Create game objects
    this.createPlayer();
    this.createCoins();
    this.createUI();

    // Set up input handlers
    this.setupInput();

    // Center player
    this.playerX = this.app.screen.width / 2;
    this.playerY = this.app.screen.height / 2;

    // Load saved high score
    await this.loadHighScore();

    // Start game loop
    this.app.ticker.add(this.gameLoop.bind(this));

    // Signal game ready
    this.platform.setLoadingProgress(100);
    await this.platform.startGame();

    // Update UI with player name
    const playerName = await this.platform.getPlayerName();
    this.updateWelcomeText(playerName);
  }

  private createPlayer(): void {
    const halfSize = this.playerSize / 2;
    this.player.roundRect(-halfSize, -halfSize, this.playerSize, this.playerSize, 8);
    this.player.fill({ color: this.PLAYER_COLOR });
    this.scene.addChild(this.player);
  }

  private createCoins(): void {
    // Create initial coins
    this.spawnCoins(5);
    this.scene.addChild(this.coins);
    this.drawCoins();
  }

  private spawnCoins(count: number): void {
    const margin = 50;
    for (let i = 0; i < count; i++) {
      this.coinsArray.push({
        x: margin + Math.random() * (window.innerWidth - margin * 2),
        y: margin + Math.random() * (window.innerHeight - margin * 2),
        collected: false,
      });
    }
  }

  private drawCoins(): void {
    this.coins.clear();
    for (const coin of this.coinsArray) {
      if (!coin.collected) {
        this.coins.circle(coin.x, coin.y, this.coinRadius);
        this.coins.fill({ color: this.COIN_COLOR });
      }
    }
  }

  private createUI(): void {
    this.uiText.anchor.set(0, 0);
    this.uiText.x = 20;
    this.uiText.y = 20;

    this.highScoreText.anchor.set(1, 0);
    this.highScoreText.x = this.app.screen.width - 20;
    this.highScoreText.y = 20;

    this.scene.addChild(this.uiText);
    this.scene.addChild(this.highScoreText);

    this.updateUI();
  }

  private updateUI(): void {
    this.uiText.text = `Score: ${this.score}`;
    this.highScoreText.text = `High Score: ${this.highScore}`;
  }

  private updateWelcomeText(playerName: string): void {
    const welcomeText = new Text({
      text: `Welcome, ${playerName}!`,
      style: {
        fill: 0x00ff88,
        fontSize: 24,
        fontWeight: "bold",
      },
    });
    welcomeText.anchor.set(0.5);
    welcomeText.x = this.app.screen.width / 2;
    welcomeText.y = this.app.screen.height / 2 - 100;

    this.scene.addChild(welcomeText);

    // Fade out welcome text after 2 seconds
    let alpha = 1;
    const fadeInterval = setInterval(() => {
      alpha -= 0.02;
      welcomeText.alpha = alpha;
      if (alpha <= 0) {
        clearInterval(fadeInterval);
        this.scene.removeChild(welcomeText);
        welcomeText.destroy();
      }
    }, 30);
  }

  private setupInput(): void {
    // Keyboard input
    window.addEventListener("keydown", (e) => {
      this.keys[e.key.toLowerCase()] = true;
      this.keys[e.code] = true;
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.key.toLowerCase()] = false;
      this.keys[e.code] = false;
    });

    // Touch input
    window.addEventListener("touchstart", (e) => {
      this.touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    });

    window.addEventListener("touchmove", (e) => {
      if (!this.touchStart) return;
      const dx = e.touches[0].clientX - this.touchStart.x;
      const dy = e.touches[0].clientY - this.touchStart.y;
      this.playerX += dx * 0.5;
      this.playerY += dy * 0.5;
      this.touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    });

    window.addEventListener("touchend", () => {
      this.touchStart = null;
    });

    // Handle resize
    window.addEventListener("resize", () => {
      this.highScoreText.x = this.app.screen.width - 20;
    });
  }

  private gameLoop(_ticker: Ticker): void {
    // Handle keyboard input
    if (this.keys["arrowleft"] || this.keys["a"]) {
      this.playerX -= this.playerSpeed;
    }
    if (this.keys["arrowright"] || this.keys["d"]) {
      this.playerX += this.playerSpeed;
    }
    if (this.keys["arrowup"] || this.keys["w"]) {
      this.playerY -= this.playerSpeed;
    }
    if (this.keys["arrowdown"] || this.keys["s"]) {
      this.playerY += this.playerSpeed;
    }

    // Clamp player position
    const halfSize = this.playerSize / 2;
    this.playerX = Math.max(halfSize, Math.min(this.app.screen.width - halfSize, this.playerX));
    this.playerY = Math.max(halfSize, Math.min(this.app.screen.height - halfSize, this.playerY));

    // Update player graphics position
    this.player.position.set(this.playerX, this.playerY);

    // Check coin collisions
    for (const coin of this.coinsArray) {
      if (!coin.collected) {
        const dx = this.playerX - coin.x;
        const dy = this.playerY - coin.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.playerSize / 2 + this.coinRadius) {
          coin.collected = true;
          this.score += this.coinValue;
          this.updateUI();

          // Spawn new coin
          const margin = 50;
          this.coinsArray.push({
            x: margin + Math.random() * (this.app.screen.width - margin * 2),
            y: margin + Math.random() * (this.app.screen.height - margin * 2),
            collected: false,
          });

          this.drawCoins();

          // Save score and check high score
          this.saveProgress();
        }
      }
    }
  }

  private async loadHighScore(): Promise<void> {
    try {
      const savedScore = await this.platform.getData("highScore");
      if (savedScore) {
        this.highScore = parseInt(savedScore, 10) || 0;
        this.updateUI();
      }
    } catch (e) {
      console.warn("Failed to load high score:", e);
    }
  }

  private saveProgress(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.updateUI();
      this.platform.setData("highScore", this.highScore.toString());
      if (this.platform.updateScore) {
        this.platform.updateScore(this.highScore);
      }
    } else {
      this.platform.setData("currentScore", this.score.toString());
    }
  }

  /**
   * Destroy the game and cleanup resources
   */
  destroy(): void {
    this.app.destroy(true, { children: true, texture: true });
  }

  /**
   * Get the PixiJS application instance
   */
  getApp(): Application {
    return this.app;
  }
}
