import { Graphics, Text, Container, Sprite, Assets } from "pixi.js";
import { BaseScene, type GameContext } from "../Scene.js";
import { GameplayScene } from "./GameplayScene.js";
import { MenuScene } from "./MenuScene.js";

/**
 * CompleteScene - Game completion screen
 *
 * Features:
 * - Shows final score
 * - Shows high score indicator
 * - "Play Again" button to restart
 * - "Menu" button to return to main menu
 */
export class CompleteScene extends BaseScene {
  private playAgainButton: Graphics;
  private menuButton: Graphics;
  private titleText: Text;
  private scoreText: Text;
  private highScoreText: Text;
  private playAgainButtonText: Text;
  private menuButtonText: Text;
  private confetti: Array<{ graphics: Graphics; vx: number; vy: number; rot: number; rotSpeed: number }> = [];

  private buttonStates: Map<Graphics, { isHovered: boolean; isPressed: boolean }> = new Map();

  constructor(context: GameContext) {
    super("CompleteScene", context);
    this.playAgainButton = new Graphics();
    this.menuButton = new Graphics();
    this.titleText = new Text();
    this.scoreText = new Text();
    this.highScoreText = new Text();
    this.playAgainButtonText = new Text();
    this.menuButtonText = new Text();
  }

  async create(): Promise<void> {
    const layers = this.getLayers();
    const uiLayer = layers.uiLayer;

    // Create background
    this.createBackground(layers.bgLayer);

    // Create title
    this.titleText.text = "LEVEL COMPLETE!";
    this.titleText.anchor.set(0.5);
    this.titleText.x = this.context.DESIGN_W / 2;
    this.titleText.y = 250;
    this.titleText.style = {
      fill: 0x00ff88,
      fontSize: 64,
      fontWeight: "bold",
      dropShadow: {
        color: 0x000000,
        alpha: 0.5,
        blur: 10,
        distance: 5,
      },
    };
    uiLayer.addChild(this.titleText);

    // Score display
    this.scoreText.text = `Score: ${this.context.progress.lastScore}`;
    this.scoreText.anchor.set(0.5);
    this.scoreText.x = this.context.DESIGN_W / 2;
    this.scoreText.y = 380;
    this.scoreText.style = {
      fill: 0xffffff,
      fontSize: 40,
      dropShadow: {
        color: 0x000000,
        alpha: 0.3,
        blur: 5,
        distance: 2,
      },
    };
    uiLayer.addChild(this.scoreText);

    // High score display
    const isNewHighScore = this.context.progress.lastScore >= this.context.progress.highScore;
    this.highScoreText.text = isNewHighScore
      ? `NEW HIGH SCORE: ${this.context.progress.highScore}!`
      : `High Score: ${this.context.progress.highScore}`;
    this.highScoreText.anchor.set(0.5);
    this.highScoreText.x = this.context.DESIGN_W / 2;
    this.highScoreText.y = 450;
    this.highScoreText.style = {
      fill: isNewHighScore ? 0xffd700 : 0xaaaaaa,
      fontSize: isNewHighScore ? 36 : 28,
      fontWeight: isNewHighScore ? "bold" : "normal",
    };
    uiLayer.addChild(this.highScoreText);

    // Create buttons
    this.createPlayAgainButton(uiLayer);
    this.createMenuButton(uiLayer);

    // Create confetti
    this.createConfetti(layers.worldLayer);

    // Play completion sound
    this.context.audio.playSfx("sfx_complete");

    // Switch back to menu music at lower volume
    this.context.audio.playMusic("bgm_menu");
  }

  private createBackground(bgLayer: Container): void {
    // Try to use pre-loaded background image
    let hasBgImage = false;
    try {
      const texture = Assets.get("assets/images/bgComplete.png");
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
      bg.fill({
        color: 0x1a1a2e,
      });
      bgLayer.addChild(bg);
    }

    // Add celebration gradient effect
    const gradient = new Graphics();
    gradient.rect(0, 0, this.context.DESIGN_W, this.context.DESIGN_H);
    gradient.fill({
      color: 0x252540,
      alpha: 0.3,
    });
    bgLayer.addChild(gradient);
  }

  private createPlayAgainButton(uiLayer: Container): void {
    const btnWidth = 280;
    const btnHeight = 70;
    const btnX = (this.context.DESIGN_W - btnWidth) / 2;
    const btnY = 550;

    this.playAgainButton.roundRect(btnX, btnY, btnWidth, btnHeight, 14);
    this.playAgainButton.fill({ color: 0x00ff88 });
    this.playAgainButton.eventMode = "static";
    this.playAgainButton.cursor = "pointer";

    this.setupButton(this.playAgainButton, () => {
      this.context.audio.playSfx("sfx_click");
      this.changeScene(new GameplayScene(this.context));
    });

    uiLayer.addChild(this.playAgainButton);

    // Button text
    this.playAgainButtonText.text = "PLAY AGAIN";
    this.playAgainButtonText.anchor.set(0.5);
    this.playAgainButtonText.x = this.context.DESIGN_W / 2;
    this.playAgainButtonText.y = btnY + btnHeight / 2;
    this.playAgainButtonText.style = {
      fill: 0x1a1a2e,
      fontSize: 28,
      fontWeight: "bold",
    };
    uiLayer.addChild(this.playAgainButtonText);
  }

  private createMenuButton(uiLayer: Container): void {
    const btnWidth = 280;
    const btnHeight = 70;
    const btnX = (this.context.DESIGN_W - btnWidth) / 2;
    const btnY = 640;

    this.menuButton.roundRect(btnX, btnY, btnWidth, btnHeight, 14);
    this.menuButton.fill({ color: 0x444466 });
    this.menuButton.eventMode = "static";
    this.menuButton.cursor = "pointer";

    this.setupButton(this.menuButton, () => {
      this.context.audio.playSfx("sfx_click");
      this.changeScene(new MenuScene(this.context));
    });

    uiLayer.addChild(this.menuButton);

    // Button text
    this.menuButtonText.text = "MAIN MENU";
    this.menuButtonText.anchor.set(0.5);
    this.menuButtonText.x = this.context.DESIGN_W / 2;
    this.menuButtonText.y = btnY + btnHeight / 2;
    this.menuButtonText.style = {
      fill: 0xffffff,
      fontSize: 28,
      fontWeight: "bold",
    };
    uiLayer.addChild(this.menuButtonText);
  }

  private createConfetti(worldLayer: Container): void {
    const colors = [0x00ff88, 0xffd700, 0x00ccff, 0xff66aa, 0xaa66ff];

    for (let i = 0; i < 50; i++) {
      const graphics = new Graphics();
      const x = Math.random() * this.context.DESIGN_W;
      const y = -Math.random() * this.context.DESIGN_H; // Start above screen
      const size = 10 + Math.random() * 15;
      const color = colors[Math.floor(Math.random() * colors.length)];

      graphics.rect(-size / 2, -size / 2, size, size);
      graphics.fill({ color });

      graphics.x = x;
      graphics.y = y;

      worldLayer.addChild(graphics);

      this.confetti.push({
        graphics,
        vx: (Math.random() - 0.5) * 100,
        vy: 100 + Math.random() * 200,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 10,
      });
    }
  }

  private setupButton(button: Graphics, onClick: () => void): void {
    const state = { isHovered: false, isPressed: false };
    this.buttonStates.set(button, state);

    button.on("pointerenter", () => {
      state.isHovered = true;
      this.updateButtonVisual(button, state);
    });

    button.on("pointerleave", () => {
      state.isHovered = false;
      state.isPressed = false;
      this.updateButtonVisual(button, state);
    });

    button.on("pointerdown", () => {
      state.isPressed = true;
      this.updateButtonVisual(button, state);
    });

    button.on("pointerup", () => {
      state.isPressed = false;
      this.updateButtonVisual(button, state);
      onClick();
    });
  }

  private updateButtonVisual(button: Graphics, state: { isHovered: boolean; isPressed: boolean }): void {
    const isPlayAgain = button === this.playAgainButton;
    const btnWidth = 280;
    const btnHeight = 70;
    let btnY: number;

    if (isPlayAgain) {
      btnY = 550;
    } else {
      btnY = 640;
    }

    const btnX = (this.context.DESIGN_W - btnWidth) / 2;

    button.clear();
    button.roundRect(btnX, btnY, btnWidth, btnHeight, 14);

    if (state.isPressed) {
      button.fill({ color: isPlayAgain ? 0x00cc66 : 0x333355 });
    } else if (state.isHovered) {
      button.fill({ color: isPlayAgain ? 0x33ff99 : 0x555577 });
    } else {
      button.fill({ color: isPlayAgain ? 0x00ff88 : 0x444466 });
    }
  }

  update(dt: number): void {
    // Animate confetti
    for (const confetti of this.confetti) {
      confetti.graphics.y += confetti.vy * dt;
      confetti.graphics.x += confetti.vy * 0.3 * dt; // Slight sideways drift
      confetti.graphics.rotation += confetti.rotSpeed * dt;

      // Reset confetti when it falls off screen
      if (confetti.graphics.y > this.context.DESIGN_H + 50) {
        confetti.graphics.y = -50;
        confetti.graphics.x = Math.random() * this.context.DESIGN_W;
      }
    }
  }

  exit(): void {
    // Cleanup
  }

  destroy(): void {
    this.playAgainButton.destroy();
    this.menuButton.destroy();
    this.titleText.destroy();
    this.scoreText.destroy();
    this.highScoreText.destroy();
    this.playAgainButtonText.destroy();
    this.menuButtonText.destroy();

    // Clean up confetti
    for (const confetti of this.confetti) {
      confetti.graphics.destroy();
    }
    this.confetti = [];

    this.buttonStates.clear();
    super.destroy();
  }
}
