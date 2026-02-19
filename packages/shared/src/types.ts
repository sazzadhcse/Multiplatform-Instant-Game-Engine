/**
 * Platform-agnostic game configuration
 */
export interface GameConfig {
  canvas?: HTMLCanvasElement;
  width?: number;
  height?: number;
}

/**
 * Platform API - interface that all platform adapters must implement
 */
export interface PlatformAPI {
  /**
   * Initialize the platform (load SDK, authenticate, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Get the current player's identifier
   */
  getPlayerId(): string;

  /**
   * Get the current player's display name
   */
  getPlayerName(): Promise<string>;

  /**
   * Get player's locale/language
   */
  getLocale(): string;

  /**
   * Save data to platform storage
   */
  setData(key: string, value: string): Promise<void>;

  /**
   * Load data from platform storage
   */
  getData(key: string): Promise<string | null>;

  /**
   * Report loading progress (0-100)
   */
  setLoadingProgress(percent: number): void;

  /**
   * Preload assets using platform's caching system (e.g., FB Instant instantLoad)
   * @param assets - Array of asset URLs to preload
   * @returns Promise that resolves when preloading is complete
   */
  preloadAssets?(assets: string[]): Promise<void>;

  /**
   * Signal that the game has finished loading and is ready to start
   */
  startGame(): Promise<void>;

  /**
   * Update player's score/activity on the platform
   */
  updateScore?(score: number): Promise<void>;

  /**
   * Check if running in platform context
   */
  isPlatformContext(): boolean;
}

/**
 * High score response from server
 */
export interface HighScoreResponse {
  highScore: number;
  isNewRecord: boolean;
}

/**
 * Init response from server
 */
export interface InitResponse {
  success: boolean;
  highScore?: number;
}
