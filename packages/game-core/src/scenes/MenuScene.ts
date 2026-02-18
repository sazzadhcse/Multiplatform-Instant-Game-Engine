import { Graphics, Text, Container, FederatedPointerEvent } from "pixi.js";
import { BaseScene, type GameContext } from "../Scene.js";
import { GameplayScene } from "./GameplayScene.js";

/**
 * Button state for visual feedback
 */
interface ButtonState {
  isHovered: boolean;
  isPressed: boolean;
}

/**
 * MenuScene - Main menu with Play button and audio settings
 *
 * Features:
 * - Play button to start game
 * - Music toggle (On/Off)
 * - SFX toggle (On/Off)
 * - Music volume slider
 * - SFX volume slider
 * - High score display
 */
export class MenuScene extends BaseScene {
  private playButton: Graphics;
  private musicToggleBtn: Graphics;
  private sfxToggleBtn: Graphics;
  private musicSliderBg: Graphics;
  private musicSliderHandle: Graphics;
  private sfxSliderBg: Graphics;
  private sfxSliderHandle: Graphics;
  private titleText: Text;
  private playButtonText: Text;
  private musicToggleText: Text;
  private sfxToggleText: Text;
  private musicSliderText: Text;
  private sfxSliderText: Text;
  private highScoreText: Text;

  private buttonStates: Map<Graphics, ButtonState> = new Map();

  private musicDragMoveHandler?: (e: FederatedPointerEvent) => void;
  private musicDragUpHandler?: () => void;
  private sfxDragMoveHandler?: (e: FederatedPointerEvent) => void;
  private sfxDragUpHandler?: () => void;

  constructor(context: GameContext) {
    super("MenuScene", context);
    this.playButton = new Graphics();
    this.musicToggleBtn = new Graphics();
    this.sfxToggleBtn = new Graphics();
    this.musicSliderBg = new Graphics();
    this.musicSliderHandle = new Graphics();
    this.sfxSliderBg = new Graphics();
    this.sfxSliderHandle = new Graphics();

    this.titleText = new Text();
    this.playButtonText = new Text();
    this.musicToggleText = new Text();
    this.sfxToggleText = new Text();
    this.musicSliderText = new Text();
    this.sfxSliderText = new Text();
    this.highScoreText = new Text();
  }

  async create(): Promise<void> {
    const layers = this.getLayers();
    const uiLayer = layers.uiLayer;

    // Create background with gradient effect
    this.createBackground(layers.bgLayer);

    // Create title
    this.titleText.text = "COIN COLLECTOR";
    this.titleText.anchor.set(0.5);
    this.titleText.x = this.context.DESIGN_W / 2;
    this.titleText.y = 200;
    this.titleText.style = {
      fill: 0x00ff88,
      fontSize: 80,
      fontWeight: "bold",
      dropShadow: {
        color: 0x000000,
        alpha: 0.5,
        blur: 10,
        distance: 5,
      },
    };
    uiLayer.addChild(this.titleText);

    // Create high score display
    this.highScoreText.text = `High Score: ${this.context.progress.highScore}`;
    this.highScoreText.anchor.set(0.5);
    this.highScoreText.x = this.context.DESIGN_W / 2;
    this.highScoreText.y = 300;
    this.highScoreText.style = {
      fill: 0xffd700,
      fontSize: 32,
    };
    uiLayer.addChild(this.highScoreText);

    // Create Play button
    this.createPlayButton(uiLayer);

    // Create settings panel
    this.createSettingsPanel(uiLayer);

    // Start menu music
    this.context.audio.playMusic("bgm_menu");
  }

  private createBackground(bgLayer: Container): void {
    const bg = new Graphics();
    bg.rect(0, 0, this.context.DESIGN_W, this.context.DESIGN_H);
    bg.fill({
      color: 0x1a1a2e,
    });

    // Add some decorative circles
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * this.context.DESIGN_W;
      const y = Math.random() * this.context.DESIGN_H;
      const radius = 50 + Math.random() * 150;
      bg.circle(x, y, radius);
      bg.fill({
        color: 0x252540,
        alpha: 0.5,
      });
    }

    bgLayer.addChild(bg);
  }

  private createPlayButton(uiLayer: Container): void {
    const btnWidth = 300;
    const btnHeight = 80;
    const btnX = (this.context.DESIGN_W - btnWidth) / 2;
    const btnY = 450;

    this.playButton.roundRect(btnX, btnY, btnWidth, btnHeight, 16);
    this.playButton.fill({ color: 0x00ff88 });
    this.playButton.eventMode = "static";
    this.playButton.cursor = "pointer";

    this.setupButton(this.playButton, () => {
      this.context.audio.playSfx("sfx_click");
      this.changeScene(new GameplayScene(this.context));
    });

    uiLayer.addChild(this.playButton);

    // Button text
    this.playButtonText.text = "PLAY";
    this.playButtonText.anchor.set(0.5);
    this.playButtonText.x = this.context.DESIGN_W / 2;
    this.playButtonText.y = btnY + btnHeight / 2;
    this.playButtonText.style = {
      fill: 0x1a1a2e,
      fontSize: 36,
      fontWeight: "bold",
    };
    uiLayer.addChild(this.playButtonText);
  }

  private createSettingsPanel(uiLayer: Container): void {
    const panelX = 260;
    const panelY = 600;
    const panelWidth = this.context.DESIGN_W - 520;
    const panelHeight = 350;

    // Panel background
    const panelBg = new Graphics();
    panelBg.roundRect(panelX, panelY, panelWidth, panelHeight, 16);
    panelBg.fill({ color: 0x252540, alpha: 0.9 });
    uiLayer.addChild(panelBg);

    // Settings title
    const settingsTitle = new Text({
      text: "SETTINGS",
      style: {
        fill: 0xffffff,
        fontSize: 28,
        fontWeight: "bold",
      },
    });
    settingsTitle.anchor.set(0.5);
    settingsTitle.x = this.context.DESIGN_W / 2;
    settingsTitle.y = panelY + 40;
    uiLayer.addChild(settingsTitle);

    // Music toggle
    this.createToggle(
      uiLayer,
      this.musicToggleBtn,
      this.musicToggleText,
      panelX + 60,
      panelY + 100,
      "Music",
      () => this.context.settings.audio.musicEnabled,
      (enabled) => {
        this.context.audio.setMusicEnabled(enabled);
        this.context.settings.audio.musicEnabled = enabled;
      }
    );

    // SFX toggle
    this.createToggle(
      uiLayer,
      this.sfxToggleBtn,
      this.sfxToggleText,
      panelX + 60,
      panelY + 170,
      "SFX",
      () => this.context.settings.audio.sfxEnabled,
      (enabled) => {
        this.context.audio.setSfxEnabled(enabled);
        this.context.settings.audio.sfxEnabled = enabled;
      }
    );

    // Music volume slider
    this.createSlider(
      uiLayer,
      this.musicSliderBg,
      this.musicSliderHandle,
      this.musicSliderText,
      panelX + 400,
      panelY + 100,
      "Music Volume",
      () => this.context.settings.audio.musicVolume,
      (volume) => {
        this.context.audio.setMusicVolume(volume);
        this.context.settings.audio.musicVolume = volume;
      }
    );

    // SFX volume slider
    this.createSlider(
      uiLayer,
      this.sfxSliderBg,
      this.sfxSliderHandle,
      this.sfxSliderText,
      panelX + 400,
      panelY + 170,
      "SFX Volume",
      () => this.context.settings.audio.sfxVolume,
      (volume) => {
        this.context.audio.setSfxVolume(volume);
        this.context.settings.audio.sfxVolume = volume;
      }
    );
  }

  private createToggle(
    uiLayer: Container,
    button: Graphics,
    text: Text,
    x: number,
    y: number,
    label: string,
    getEnabled: () => boolean,
    setEnabled: (enabled: boolean) => void
  ): void {
    const btnSize = 50;

    const drawToggle = () => {
      button.clear();
      button.roundRect(x, y, btnSize, btnSize, 8);
      if (getEnabled()) {
        button.fill({ color: 0x00ff88 });
      } else {
        button.fill({ color: 0x444466 });
      }
    };

    drawToggle();

    button.eventMode = "static";
    button.cursor = "pointer";
    this.setupButton(button, () => {
      this.context.audio.playSfx("sfx_click");
      setEnabled(!getEnabled());
      drawToggle();
      this.updateToggleText(text, label, getEnabled());
    });

    uiLayer.addChild(button);

    // Label text
    text.anchor.set(0, 0.5);
    text.x = x + btnSize + 20;
    text.y = y + btnSize / 2;
    text.style = {
      fill: 0xffffff,
      fontSize: 24,
    };
    this.updateToggleText(text, label, getEnabled());
    uiLayer.addChild(text);
  }

  private updateToggleText(text: Text, label: string, enabled: boolean): void {
    text.text = `${label}: ${enabled ? "ON" : "OFF"}`;
  }

  private createSlider(
    uiLayer: Container,
    bg: Graphics,
    handle: Graphics,
    text: Text,
    x: number,
    y: number,
    label: string,
    getValue: () => number,
    setValue: (value: number) => void
  ): void {
    const sliderWidth = 200;
    const sliderHeight = 12;

    // Background track
    bg.roundRect(x, y + sliderHeight / 2 - 6, sliderWidth, sliderHeight, 6);
    bg.fill({ color: 0x444466 });
    uiLayer.addChild(bg);

    // Handle
    const handleX = x + (getValue() * sliderWidth) - 12;
    handle.circle(handleX + 6, y + sliderHeight / 2, 18);
    handle.fill({ color: 0x00ff88 });
    handle.eventMode = "static";
    handle.cursor = "pointer";

    let isDragging = false;

    handle.on("pointerdown", () => {
      isDragging = true;
      this.context.audio.playSfx("sfx_click");
    });

    // Use the app stage for global pointer events
    this.context.app.stage.eventMode = "static";
    const pointerMove = (e: FederatedPointerEvent) => {
      if (!isDragging) return;

      const layout = this.context.layout.getLayoutState();
      const localX = (e.global.x - layout.offsetX) / layout.scaleFit;
      const relativeX = localX - x;
      const value = Math.max(0, Math.min(1, relativeX / sliderWidth));
      setValue(value);

      handle.clear();
      const newHandleX = x + (value * sliderWidth) - 12;
      handle.circle(newHandleX + 6, y + sliderHeight / 2, 18);
      handle.fill({ color: 0x00ff88 });

      text.text = `${label}: ${Math.round(value * 100)}%`;
    };

    const pointerUp = () => {
      isDragging = false;
    };

    this.context.app.stage.on("pointermove", pointerMove);
    this.context.app.stage.on("pointerup", pointerUp);
    this.context.app.stage.on("pointerupoutside", pointerUp);

    if (label === "Music Volume") {
      this.musicDragMoveHandler = pointerMove;
      this.musicDragUpHandler = pointerUp;
    } else if (label === "SFX Volume") {
      this.sfxDragMoveHandler = pointerMove;
      this.sfxDragUpHandler = pointerUp;
    }

    uiLayer.addChild(handle);

    // Label text
    text.text = `${label}: ${Math.round(getValue() * 100)}%`;
    text.anchor.set(0.5);
    text.x = x + sliderWidth / 2;
    text.y = y - 25;
    text.style = {
      fill: 0xffffff,
      fontSize: 18,
    };
    uiLayer.addChild(text);
  }

  private setupButton(button: Graphics, onClick: () => void): void {
    const state: ButtonState = { isHovered: false, isPressed: false };
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

  private updateButtonVisual(button: Graphics, state: ButtonState): void {
    if (state.isPressed) {
      button.clear();
      const btnWidth = 300;
      const btnHeight = 80;
      const btnX = (this.context.DESIGN_W - btnWidth) / 2;
      const btnY = 450;
      button.roundRect(btnX, btnY, btnWidth, btnHeight, 16);
      button.fill({ color: 0x00cc66 }); // Darker when pressed
    } else if (state.isHovered) {
      button.clear();
      const btnWidth = 300;
      const btnHeight = 80;
      const btnX = (this.context.DESIGN_W - btnWidth) / 2;
      const btnY = 450;
      button.roundRect(btnX, btnY, btnWidth, btnHeight, 16);
      button.fill({ color: 0x33ff99 }); // Lighter when hovered
    } else {
      button.clear();
      const btnWidth = 300;
      const btnHeight = 80;
      const btnX = (this.context.DESIGN_W - btnWidth) / 2;
      const btnY = 450;
      button.roundRect(btnX, btnY, btnWidth, btnHeight, 16);
      button.fill({ color: 0x00ff88 }); // Normal
    }
  }

  update(_dt: number): void {
    // Menu doesn't need per-frame updates
  }

  exit(): void {
    if (this.musicDragMoveHandler) {
      this.context.app.stage.off("pointermove", this.musicDragMoveHandler);
    }
    if (this.musicDragUpHandler) {
      this.context.app.stage.off("pointerup", this.musicDragUpHandler);
      this.context.app.stage.off("pointerupoutside", this.musicDragUpHandler);
    }
    if (this.sfxDragMoveHandler) {
      this.context.app.stage.off("pointermove", this.sfxDragMoveHandler);
    }
    if (this.sfxDragUpHandler) {
      this.context.app.stage.off("pointerup", this.sfxDragUpHandler);
      this.context.app.stage.off("pointerupoutside", this.sfxDragUpHandler);
    }
  }

  destroy(): void {
    this.playButton.destroy();
    this.musicToggleBtn.destroy();
    this.sfxToggleBtn.destroy();
    this.musicSliderBg.destroy();
    this.musicSliderHandle.destroy();
    this.sfxSliderBg.destroy();
    this.sfxSliderHandle.destroy();
    this.titleText.destroy();
    this.playButtonText.destroy();
    this.musicToggleText.destroy();
    this.sfxToggleText.destroy();
    this.musicSliderText.destroy();
    this.sfxSliderText.destroy();
    this.highScoreText.destroy();
    this.buttonStates.clear();
    super.destroy();
  }
}
