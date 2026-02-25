import { Graphics, Text, Container, FederatedPointerEvent, Sprite, Assets, MeshSimple, Texture, Point, MeshRope } from "pixi.js";
import { BaseScene, type GameContext } from "../Scene.js";
import { GameplayScene } from "./GameplayScene.js";
import type { LevelData } from "../entities/Levels.js";
import { DialogManager } from "../managers/DialogManager.js";
import { MapSystem } from "../entities/Maps.js";

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
  
  
  //flag
  private flagTexture?: Texture;
  // private flagMesh: MeshSimple | null = null;
  // private flagTime = 0;
  // private vertices?: Float32Array;
  
  // Animation points
  private flagPoints: Point[] = [];
  private bannerPoints: Point[] = [];
  private shipSprite: Sprite | null = null;
  private titleTopRope: MeshRope | null = null;
  
  // Trackers
  private animCount = 0;
  
  private dialogManager: DialogManager;
  private mapSystem = new MapSystem();
  
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

    this.dialogManager = new DialogManager();
  }
  
  async create(): Promise<void> {
    const layers = this.getLayers();
    const uiLayer = layers.uiLayer;

    // Create background with gradient effect
    await this.createBackground(layers.bgLayer);

    this.createMenuUI(uiLayer);

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
    // uiLayer.addChild(this.titleText);

    // Create high score display
    this.highScoreText.text = `High Score: ${this.context.progress.highScore}`;
    this.highScoreText.anchor.set(0.5);
    this.highScoreText.x = this.context.DESIGN_W / 2;
    this.highScoreText.y = 300;
    this.highScoreText.style = {
      fill: 0xffd700,
      fontSize: 32,
    };
    // uiLayer.addChild(this.highScoreText);

    // Start menu music (will queue if audio not unlocked yet)
    this.context.audio.playMusic("bgm_menu");
  }
  
  

  private async createBackground(bgLayer: Container): Promise<void> {
    // Try to load background image
    try {
      console.log("[MenuScene] Loading background...");
      const texture = await Assets.load("assets/images/bgMenu.jpg");
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
      console.log("[MenuScene] ✓ Background loaded");
    } catch (e) {
      console.warn("[MenuScene] Background image not found, using fallback:", e);
      this.createFallbackBackground(bgLayer);
    }

    // Load ship sprite
    try {
      console.log("[MenuScene] Loading ship...");
      const shipTexture = await Assets.load("assets/images/ship.png");
      this.shipSprite = new Sprite(shipTexture);
      this.shipSprite.anchor.set(0.5);
      this.shipSprite.position.set(350, 450);
      bgLayer.addChild(this.shipSprite);
      console.log("[MenuScene] ✓ Ship loaded");
    } catch (e) {
      console.warn("[MenuScene] Ship not found:", e);
    }

    // Load banner (titleTop)
    try {
      console.log("[MenuScene] Loading banner...");
      const bannerTex = await Assets.load('assets/images/titleTop.png');
      const segs = 10;
      const ropeLength = bannerTex.width / segs;
      for (let i = 0; i < segs; i++) this.bannerPoints.push(new Point(i * ropeLength, 0));

      this.titleTopRope = new MeshRope({ texture: bannerTex, points: this.bannerPoints });
      this.titleTopRope.position.set(960 - (bannerTex.width / 2), 400);
      bgLayer.addChild(this.titleTopRope);
      console.log("[MenuScene] ✓ Banner loaded");
    } catch (e) {
      console.warn("[MenuScene] Banner not found:", e);
    }

    // Load titleBottom (use Sprite.from which handles errors gracefully)
    try {
      const titleBottom = Sprite.from('assets/images/titleBottom.png');
      titleBottom.anchor.set(0.5);
      titleBottom.position.set(960, 400);
      bgLayer.addChild(titleBottom);
    } catch (e) {
      console.warn("[MenuScene] TitleBottom not found:", e);
    }

    // Create animated flag mesh
    await this.createFlagMesh(bgLayer);
  }

  private createFallbackBackground(bgLayer: Container): void {
    const bg = new Graphics();
    bg.rect(0, 0, this.context.DESIGN_W, this.context.DESIGN_H);
    bg.fill({ color: 0x1a1a2e });

    // Add some decorative circles
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * this.context.DESIGN_W;
      const y = Math.random() * this.context.DESIGN_H;
      const radius = 50 + Math.random() * 150;
      bg.circle(x, y, radius);
      bg.fill({ color: 0x252540, alpha: 0.5 });
    }

    bgLayer.addChild(bg);
  }


  /**
  * Create the animated flag mesh
  */
  private async createFlagMesh(worldLayer: Container): Promise<void> {
    try {
      const poleTexture = await Assets.load("assets/images/pole.png");
      const sprite = new Sprite(poleTexture);
      sprite.anchor.set(0.5);
      sprite.x = 1400;
      sprite.y = 800;
      worldLayer.addChild(sprite);
    } catch {
      console.warn("Failed to load pole.png");
    }

    try {
      this.flagTexture = await Assets.load("assets/images/flag.png");
    } catch {
      console.warn("Failed to load flag.png");
      return;
    }

    const segs = 15;
    const ropeLength = this.flagTexture.width / segs;
    this.flagPoints = [];
    for (let i = 0; i < segs; i++) {
      this.flagPoints.push(new Point(i * ropeLength, 0));
    }

    const flagRope = new MeshRope({ texture: this.flagTexture, points: this.flagPoints });
    // Adjusting to match your offset
    flagRope.x = 1400 - 45;
    flagRope.y = 800 - 180 + (this.flagTexture.height / 2); // Rope center-aligns usually
    worldLayer.addChild(flagRope);
  }

  private createMenuUI(uiLayer: Container): void {
    // Standard Text Style for the small UI labels
    const labelStyle = {
      fill: 0xffffff,
      fontSize: 20,
      fontWeight: "bold",
      // stroke: { color: 0x000000, width: 4 },
      dropShadow: { color: 0x000000, alpha: 0.5, blur: 2, distance: 2 },
    };

    // 1. COINS (uiCoinBg)
    const uiCoinBg = Sprite.from('assets/images/uiCoin.png');
    uiCoinBg.anchor.set(0.5);
    uiCoinBg.position.set(200, 100);
    uiLayer.addChild(uiCoinBg);
    this.addLabel(uiCoinBg, "1250", { ...labelStyle, fontSize: 34 }, 30, -5);

    // 2. ANCHOR EVENT (uiAnchor)
    const uiAnchor = Sprite.from('assets/images/uiAnchor.png');
    uiAnchor.anchor.set(0.5);
    uiAnchor.position.set(120, 230);
    uiLayer.addChild(uiAnchor);
    this.addLabel(uiAnchor, "2 days", labelStyle, 0, 43); // Offset Y downward

    // 3. TIME EVENT (uiTime)
    const uiTime = Sprite.from('assets/images/uiTime.png');
    uiTime.anchor.set(0.5);
    uiTime.position.set(120, 380);
    uiLayer.addChild(uiTime);
    this.addLabel(uiTime, "6 days", labelStyle, 0, 40);

    // 4. LIFE (uiLifeBg)
    const uiLifeBg = Sprite.from('assets/images/uiLife.png');
    uiLifeBg.anchor.set(0.5);
    uiLifeBg.position.set(1600, 100);
    uiLayer.addChild(uiLifeBg);
    this.addLabel(uiLifeBg, "5/5", { ...labelStyle, fontSize: 34 }, 40, -10);

    // 5. SETTINGS (uiSetting) - Interactive
    const uiSetting = Sprite.from('assets/images/uiSetting.png');
    uiSetting.anchor.set(0.5);
    uiSetting.position.set(1790, 100);
    uiLayer.addChild(uiSetting);
    this.makeInteractive(uiSetting, () => console.log("Settings Clicked"));

    // 6. CHEST BOX (uiBox)
    const uiBox = Sprite.from('assets/images/uiBox.png');
    uiBox.anchor.set(0.5);
    uiBox.position.set(1790, 250);
    uiLayer.addChild(uiBox);
    this.addLabel(uiBox, "11/20", labelStyle, 0, 40);

    // 7. MAP (uiMap) - Interactive
    const uiMap = Sprite.from('assets/images/uiMap.png');
    uiMap.anchor.set(0.5);
    uiMap.position.set(200, 950);
    uiLayer.addChild(uiMap);
    this.makeInteractive(uiMap, () => console.log("Map Clicked"));

    this.makeInteractive(uiMap, () => {
        
        // Open the dialog
        this.dialogManager.showMapExploration(
            this.getLayers().uiLayer,
            this.mapSystem,
            5000, // Your coin count
            (cost) => {
                // This callback runs AFTER the visual reveal is done
                
                // 1. Deduct Coins
                // this.context.progress.coins -= cost;
                
                // 2. Update Logic
                const nextZone = this.mapSystem.getNextLockedZone();
                if (nextZone) {
                    this.mapSystem.unlockZone(nextZone.id);
                }

                // 3. Save
                this.context.saveProgress(); // Ensure you save the unlock state!
                
                // 4. Refresh UI (Update coin display, etc)
                // this.updateCoinDisplay(); 
            }
        );
    });

    // Determine current level (default to 1 if not set)
  const currentLevel = this.context.progress?.currentLevel || 1;

    // 8. PLAY BUTTON (uiPlayBg) - Interactive
    const uiPlayBg = Sprite.from('assets/images/uiPlayBg.png');
    uiPlayBg.anchor.set(0.5);
    uiPlayBg.position.set(960, 900);
    uiLayer.addChild(uiPlayBg);
    // Add Level Number (e.g., 19)
    this.addLabel(uiPlayBg, `${currentLevel}`, { ...labelStyle, fontSize: 48 }, -5);
    this.makeInteractive(uiPlayBg, async () => {
       this.context.audio.playSfx("sfx_click");
      uiPlayBg.eventMode = "none";
      this.dialogManager.showLevelStart(
         this.getLayers().uiLayer, // The layer to draw the dialog on
         currentLevel,             // Level Number
         1000,                     // Coin Cost
         () => {
           // What happens when they click "Play" on the modal
           // this.changeScene(new GameplayScene(this.context)); 
           this.loadAndPlayLevel(currentLevel);
           console.log("Transitioning to gameplay!");
         }
       );
    });
  }

  private async loadAndPlayLevel(levelNumber: number): Promise<void> {

      //  this.changeScene(new GameplayScene(this.context)); 
       try {
      // Prevent multiple clicks while loading
      
      // Load the specific JSON file
      const levelData: LevelData = await Assets.load(`assets/levelData/${levelNumber}.json`);
      
      // Pass the loaded JSON directly into the GameplayScene
      this.changeScene(new GameplayScene(this.context, levelData)); 
    } catch (error) {
      console.error(`Failed to load level ${levelNumber}.json:`, error);
      // Optional: Reset to level 1 if they beat the last level
      // uiPlayBg.eventMode = "static"; 
    }
  }

  /**
   * Helper to add centered text labels to a sprite
   */
  private addLabel(parent: Container, string: string, style: any, offsetX = 0, offsetY = 0): Text {
    const text = new Text({ text: string, style });
    text.anchor.set(0.5);
    text.x = offsetX; 
    text.y = offsetY;
    parent.addChild(text);
    return text;
  }

  /**
   * Helper to handle Hover and Click logic
   */
  private makeInteractive(target: Sprite, onClick: () => void): void {
    target.eventMode = 'static';
    target.cursor = 'pointer';

    target.on('pointerover', () => {
      target.scale.set(1.1); // Simple hover pop effect
      target.tint = 0xeeeeee;
    });

    target.on('pointerout', () => {
      target.scale.set(1.0);
      target.tint = 0xffffff;
    });

    target.on('pointerdown', () => {
      target.scale.set(0.9); // Press effect
    });

    target.on('pointerup', () => {
      target.scale.set(1.1);
      onClick();
    });
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
      // Change to GameplayScene when Play is clicked
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
    this.context.app.stage.on("pointermove", (e: FederatedPointerEvent) => {
      if (!isDragging) return;
      
      const localX = e.global.x / this.context.layout.getLayoutState().scaleFit;
      const relativeX = localX - x;
      const value = Math.max(0, Math.min(1, relativeX / sliderWidth));
      setValue(value);
      
      handle.clear();
      const newHandleX = x + (value * sliderWidth) - 12;
      handle.circle(newHandleX + 6, y + sliderHeight / 2, 18);
      handle.fill({ color: 0x00ff88 });
      
      text.text = `${label}: ${Math.round(value * 100)}%`;
    });
    
    this.context.app.stage.on("pointerup", () => {
      isDragging = false;
    });
    this.context.app.stage.on("pointerupoutside", () => {
      isDragging = false;
    });
    
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
    this.animCount += 1.5 * _dt;
    
    // 1. ANIMATE SHIP (Gentle floating + slight rotation)
    if (this.shipSprite) {
      // Subtle Y bobbing
      this.shipSprite.y = 450 + Math.sin(this.animCount * 0.5) * 10;
      // Slight rolling rotation (rocking on waves)
      this.shipSprite.rotation = Math.sin(this.animCount * 0.3) * 0.03;
    }
    
    // 2. ANIMATE FLAG (Pinned at the left)
    if (this.flagPoints.length > 0) {
      for (let i = 0; i < this.flagPoints.length; i++) {
        const weight = i / (this.flagPoints.length - 0.5);
        // Move Y. The "weight" makes the pole-side stay still.
        this.flagPoints[i].y = Math.sin(i * 0.5 + this.animCount * 2) * (15 * weight);
        // Slight X crunching for wind effect
        this.flagPoints[i].x = (i * (this.flagTexture!.width / 15)) + (Math.cos(this.animCount) * 2 * weight);
      }
    }
    
    // 3. ANIMATE BANNER (Subtle wave for title)
    if (this.titleTopRope && this.bannerPoints.length > 0) {
      for (let i = 0; i < this.bannerPoints.length; i++) {
        // Both ends wave slightly, center waves more, or uniform wave
        this.bannerPoints[i].y = Math.sin(i * 0.3 + this.animCount) * 8;
      }
    }
    
    // Menu doesn't need per-frame updates
    
    // Animate flag if texture loaded and mesh exists
    // if (this.flagTexture && this.flagMesh && this.vertices) {
    //   this.flagTime += 6 * _dt;
    //   const segments = 25;
    
    //   for (let i = 0; i < segments; i++) {
    //     const x = (i / (segments - 1)) * this.flagTexture.width;
    
    //     // The Weight: 0 at the start (pole), 1 at the end (tip)
    //     const weight = i / (segments - 0.9);
    
    //     // Sine wave applied to Y
    //     const wave = Math.sin(this.flagTime + (i * 0.4)) * (20 * weight);
    
    //     // Update Vertex Positions (x, y) - update both the array and mesh
    //     const index = i * 4;
    //     this.vertices[index] = x;                          // Top X
    //     this.vertices[index + 1] = 0 + wave;               // Top Y
    //     this.vertices[index + 2] = x;                       // Bottom X
    //     this.vertices[index + 3] = this.flagTexture.height + wave; // Bottom Y
    //   }
    
    //   // In PixiJS v8, MeshSimple has a geometry with buffers that need to be updated
    //   // Access the position buffer and update it with the new vertex data
    //   const geom = this.flagMesh.geometry;
    //   if (geom && geom.buffers && geom.buffers[0]) {
    //     geom.buffers[0].data = this.vertices;
    //     geom.buffers[0].update();
    //   }
    // }
    
    
  }
  
  exit(): void {
    // Cleanup
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
