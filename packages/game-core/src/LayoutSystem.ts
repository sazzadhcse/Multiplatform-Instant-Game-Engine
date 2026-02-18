import { Container, type Application } from "pixi.js";

/**
 * Design dimensions - the virtual coordinate system for all gameplay and UI
 */
export const DESIGN_W = 1920;
export const DESIGN_H = 1080;

/**
 * Layout state computed by the LayoutSystem
 */
export interface LayoutState {
  /** FIT scale factor for world/UI layers */
  scaleFit: number;
  /** X offset to center FIT content */
  offsetX: number;
  /** Y offset to center FIT content */
  offsetY: number;
  /** Visible rect x position in design coords (under FIT) */
  vx: number;
  /** Visible rect y position in design coords (under FIT) */
  vy: number;
  /** Visible rect width in design coords (under FIT) */
  vw: number;
  /** Visible rect height in design coords (under FIT) */
  vh: number;
  /** Screen width in physical pixels */
  screenWidth: number;
  /** Screen height in physical pixels */
  screenHeight: number;
  /** FILL scale factor for backgrounds */
  scaleFill: number;
}

/**
 * Scene layers container with pre-configured scaling
 */
export interface SceneLayers {
  /** Background layer - uses FILL scaling (covers screen, cropping allowed) */
  bgLayer: Container;
  /** World/gameplay layer - uses FIT scaling (letterboxed) */
  worldLayer: Container;
  /** UI layer - uses FIT scaling (letterboxed) */
  uiLayer: Container;
  /** Root container holding all layers */
  root: Container;
}

/**
 * LayoutSystem - Handles hybrid scaling policy:
 * - Backgrounds: FILL scaling (cover screen)
 * - Gameplay + UI: FIT scaling (maintain aspect ratio with letterboxing)
 *
 * All positions are authored in design coordinates (1920x1080)
 */
export class LayoutSystem {
  private app: Application;
  private sceneLayers: SceneLayers | null = null;
  private layoutState: LayoutState | null = null;

  constructor(app: Application) {
    this.app = app;
  }

  /**
   * Compute layout state based on current screen size
   */
  computeLayout(): LayoutState {
    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;

    // FIT scaling: maintain aspect ratio, show entire design area
    const scaleX = screenWidth / DESIGN_W;
    const scaleY = screenHeight / DESIGN_H;
    const scaleFit = Math.min(scaleX, scaleY);

    // Center the FIT content
    const fitWidth = DESIGN_W * scaleFit;
    const fitHeight = DESIGN_H * scaleFit;
    const offsetX = (screenWidth - fitWidth) / 2;
    const offsetY = (screenHeight - fitHeight) / 2;

    // FILL scaling: cover entire screen (cropping allowed)
    const scaleFill = Math.max(scaleX, scaleY);

    // Visible rect in design coordinates (under FIT scaling)
    const vw = screenWidth / scaleFit;
    const vh = screenHeight / scaleFit;
    const vx = (DESIGN_W - vw) / 2;
    const vy = (DESIGN_H - vh) / 2;

    this.layoutState = {
      scaleFit,
      offsetX,
      offsetY,
      vx,
      vy,
      vw,
      vh,
      screenWidth,
      screenHeight,
      scaleFill,
    };

    return this.layoutState;
  }

  /**
   * Get the current layout state
   */
  getLayoutState(): LayoutState {
    if (!this.layoutState) {
      return this.computeLayout();
    }
    return this.layoutState;
  }

  /**
   * Create scene layers with proper scaling configuration
   * This should be called once during initialization
   */
  createSceneLayers(): SceneLayers {
    const layout = this.computeLayout();

    // Create root container
    const root = new Container();

    // Background layer - FILL scaling
    const bgLayer = new Container();
    bgLayer.scale.set(layout.scaleFill, layout.scaleFill);
    // Center the background
    bgLayer.x = layout.screenWidth / 2;
    bgLayer.y = layout.screenHeight / 2;
    bgLayer.pivot.set(DESIGN_W / 2, DESIGN_H / 2);

    // World layer - FIT scaling
    const worldLayer = new Container();
    worldLayer.scale.set(layout.scaleFit, layout.scaleFit);
    worldLayer.x = layout.offsetX;
    worldLayer.y = layout.offsetY;

    // UI layer - FIT scaling
    const uiLayer = new Container();
    uiLayer.scale.set(layout.scaleFit, layout.scaleFit);
    uiLayer.x = layout.offsetX;
    uiLayer.y = layout.offsetY;

    root.addChild(bgLayer, worldLayer, uiLayer);

    this.sceneLayers = {
      bgLayer,
      worldLayer,
      uiLayer,
      root,
    };

    return this.sceneLayers;
  }

  /**
   * Get existing scene layers
   */
  getSceneLayers(): SceneLayers | null {
    return this.sceneLayers;
  }

  /**
   * Re-apply layout to existing layers (for future resize support)
   */
  relayout(): void {
    if (!this.sceneLayers) {
      return;
    }

    const layout = this.computeLayout();

    // Update background layer (FILL)
    this.sceneLayers.bgLayer.scale.set(layout.scaleFill, layout.scaleFill);
    this.sceneLayers.bgLayer.x = layout.screenWidth / 2;
    this.sceneLayers.bgLayer.y = layout.screenHeight / 2;

    // Update world layer (FIT)
    this.sceneLayers.worldLayer.scale.set(layout.scaleFit, layout.scaleFit);
    this.sceneLayers.worldLayer.x = layout.offsetX;
    this.sceneLayers.worldLayer.y = layout.offsetY;

    // Update UI layer (FIT)
    this.sceneLayers.uiLayer.scale.set(layout.scaleFit, layout.scaleFit);
    this.sceneLayers.uiLayer.x = layout.offsetX;
    this.sceneLayers.uiLayer.y = layout.offsetY;
  }

  /**
   * Check if device is in portrait orientation
   */
  isPortrait(): boolean {
    return this.app.screen.width < this.app.screen.height;
  }
}
