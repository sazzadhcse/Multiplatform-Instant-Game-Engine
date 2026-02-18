import { sound } from "@pixi/sound";

/**
 * Audio settings stored in context
 */
export interface AudioSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number; // 0-1
  sfxVolume: number; // 0-1
}

/**
 * Default audio settings
 */
export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  musicEnabled: true,
  sfxEnabled: true,
  musicVolume: 0.7,
  sfxVolume: 0.8,
};

/**
 * Sound track configuration
 */
export interface SoundTrack {
  url: string;
  loop?: boolean;
  volume?: number;
}

/**
 * Audio registry - maps sound names to their resources
 */
export interface AudioRegistry {
  [key: string]: SoundTrack;
}

/**
 * Default audio registry - can be replaced with real assets
 * Uses placeholder URLs that will be stubs if not available
 */
export const DEFAULT_AUDIO_REGISTRY: AudioRegistry = {
  bgm_menu: { url: "assets/audio/bgm_menu.wav", loop: true, volume: 0.7 },
  bgm_gameplay: { url: "assets/audio/bgm_gameplay.mp3", loop: true, volume: 0.7 },
  sfx_click: { url: "assets/audio/sfx_click.mp3", loop: false, volume: 0.8 },
  sfx_complete: { url: "assets/audio/sfx_complete.mp3", loop: false, volume: 0.8 },
  sfx_coin: { url: "assets/audio/sfx_coin.wav", loop: false, volume: 0.6 },
};

/**
 * AudioManager - Handles BGM and SFX playback with browser autoplay restrictions
 *
 * Features:
 * - Background music that persists across scenes
 * - SFX for game events
 * - Browser autoplay unlock handling
 * - Volume and enable/disable controls
 * - Lazy loading - sounds load on first play to avoid startup errors
 */
export class AudioManager {
  private settings: AudioSettings;
  private registry: AudioRegistry;
  private currentMusic: string | null = null;
  private currentMusicInstance: any = null; // Track the actual playing instance
  private isUnlocked = false;
  private registeredSounds = new Set<string>();
  private failedSounds = new Set<string>();

  constructor(
    settings: AudioSettings = DEFAULT_AUDIO_SETTINGS,
    registry: AudioRegistry = DEFAULT_AUDIO_REGISTRY
  ) {
    this.settings = { ...settings };
    this.registry = { ...registry };
  }

  /**
   * Initialize audio - does NOT preload sounds to avoid decoding errors
   * Sounds will be loaded lazily when first played
   */
  async init(): Promise<void> {
    // Don't preload any sounds - they'll load on first play
    // This avoids decoding errors during game initialization
    console.log("AudioManager initialized (sounds will load on first play)");
    await Promise.resolve(); // Just a no-op async for compatibility
  }

  /**
   * Register a sound if not already registered
   * Checks if sound was pre-registered by LoadingScene
   */
  private registerSound(name: string): boolean {
    if (this.registeredSounds.has(name) || this.failedSounds.has(name)) {
      return this.registeredSounds.has(name);
    }

    // Check if sound was already registered by LoadingScene
    if (sound.exists(name)) {
      this.registeredSounds.add(name);
      return true;
    }

    const track = this.registry[name];
    if (!track) {
      console.warn(`Sound "${name}" not found in registry`);
      this.failedSounds.add(name);
      return false;
    }

    try {
      sound.add(name, {
        url: track.url,
        loop: track.loop ?? false,
        volume: track.volume ?? 1,
        preload: false, // Don't preload - load on play
      });
      this.registeredSounds.add(name);
      return true;
    } catch (err) {
      console.warn(`Failed to register sound "${name}":`, err);
      this.failedSounds.add(name);
      return false;
    }
  }

  /**
   * Unlock audio context - must be called on first user interaction
   * Browsers block autoplay until user gesture
   */
  unlock(): boolean {
    if (this.isUnlocked) {
      return true;
    }

    try {
      const wasUnlocked = sound.isContextReady();
      if (wasUnlocked) {
        this.isUnlocked = true;
        return true;
      }

      // Try to unlock by attempting to play a silent/empty action
      // Just checking context state is often enough
      this.isUnlocked = sound.isContextReady();
      return this.isUnlocked;
    } catch {
      return false;
    }
  }

  /**
   * Check if audio is unlocked (can play)
   */
  isAudioUnlocked(): boolean {
    return this.isUnlocked || sound.isContextReady();
  }

  /**
   * Play background music
   * Automatically switches tracks if different from current
   * Ensures only ONE BGM plays at a time
   */
  playMusic(trackName: string, options: { loop?: boolean; volume?: number } = {}): void {
    if (!this.settings.musicEnabled) {
      this.stopMusic(); // Ensure music is stopped if disabled
      return;
    }

    const track = this.registry[trackName];
    if (!track) {
      console.warn(`Music track "${trackName}" not found in registry`);
      return;
    }

    // If same track is already playing, don't restart
    if (this.currentMusic === trackName && this.currentMusicInstance) {
      // Check if it's actually still playing
      try {
        if (sound.isPlaying(trackName)) {
          return; // Already playing this track
        }
      } catch {
        // If check fails, continue to restart
      }
    }

    // IMPORTANT: Stop ALL music first to prevent overlapping
    this.stopMusic();

    // Unlock audio if not already
    this.unlock();

    // Register the sound (lazy load)
    if (!this.registerSound(trackName)) {
      // Failed to register, but track as "current" anyway for stub behavior
      this.currentMusic = trackName;
      return;
    }

    // Play new music
    try {
      const volume = options.volume ?? this.settings.musicVolume;
      const loop = options.loop ?? track.loop ?? true;

      // Store the instance and play
      this.currentMusicInstance = sound.play(trackName, { loop, volume });
      this.currentMusic = trackName;

      console.log(`Playing music: ${trackName}`);
    } catch (e) {
      console.warn(`Failed to play music "${trackName}":`, e);
      this.currentMusic = null;
      this.currentMusicInstance = null;
    }
  }

  /**
   * Stop background music completely
   */
  stopMusic(): void {
    // Stop the tracked instance if exists
    if (this.currentMusicInstance) {
      try {
        if (typeof this.currentMusicInstance.stop === 'function') {
          this.currentMusicInstance.stop();
        }
      } catch {
        // Ignore errors
      }
      this.currentMusicInstance = null;
    }

    // Also stop by name to be sure
    if (this.currentMusic) {
      try {
        sound.stop(this.currentMusic);
      } catch {
        // Ignore errors when stopping
      }
    }

    // Stop all music tracks (bgm_*) to be absolutely sure no overlap
    const musicTracks = Object.keys(this.registry).filter(k => k.startsWith('bgm_'));
    for (const track of musicTracks) {
      try {
        sound.stop(track);
      } catch {
        // Ignore
      }
    }

    this.currentMusic = null;
  }

  /**
   * Play a sound effect
   */
  playSfx(name: string, options: { volume?: number } = {}): void {
    if (!this.settings.sfxEnabled) {
      return;
    }

    // Unlock audio if not already
    this.unlock();

    const track = this.registry[name];
    if (!track) {
      console.warn(`SFX "${name}" not found in registry`);
      return;
    }

    // Register the sound (lazy load)
    if (!this.registerSound(name)) {
      // Stub for development
      console.log(`[SFX STUB] ${name}`);
      return;
    }

    try {
      const volume = options.volume ?? this.settings.sfxVolume;
      sound.play(name, { volume }).catch((e) => {
        console.warn(`Failed to play SFX "${name}":`, e);
      });
    } catch (e) {
      console.warn(`Failed to play SFX "${name}":`, e);
    }
  }

  /**
   * Set music enabled state
   */
  setMusicEnabled(enabled: boolean): void {
    this.settings.musicEnabled = enabled;
    if (!enabled) {
      this.stopMusic();
    }
  }

  /**
   * Set SFX enabled state
   */
  setSfxEnabled(enabled: boolean): void {
    this.settings.sfxEnabled = enabled;
  }

  /**
   * Set music volume (0-1)
   */
  setMusicVolume(volume: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    // Update current music if playing
    if (this.currentMusic && this.registeredSounds.has(this.currentMusic)) {
      // Volume update would need to track the instance
      // For simplicity, restart with new volume
      const isPlaying = sound.isPlaying(this.currentMusic);
      if (isPlaying) {
        this.stopMusic();
        this.playMusic(this.currentMusic);
      }
    }
  }

  /**
   * Set SFX volume (0-1)
   */
  setSfxVolume(volume: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get current settings
   */
  getSettings(): Readonly<AudioSettings> {
    return { ...this.settings };
  }

  /**
   * Get current music track name
   */
  getCurrentMusic(): string | null {
    return this.currentMusic;
  }

  /**
   * Check if music is currently playing
   */
  isMusicPlaying(): boolean {
    return this.currentMusic !== null && sound.isPlaying(this.currentMusic);
  }

  /**
   * Pause all audio
   */
  pauseAll(): void {
    sound.pauseAll();
  }

  /**
   * Resume all audio
   */
  resumeAll(): void {
    sound.resumeAll();
  }

  /**
   * Mute all audio
   */
  muteAll(): void {
    sound.toggleMute(true);
  }

  /**
   * Unmute all audio
   */
  unmuteAll(): void {
    sound.toggleMute(false);
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.stopMusic();
    this.currentMusicInstance = null;
    sound.removeAll();
    this.registeredSounds.clear();
    this.failedSounds.clear();
  }
}
