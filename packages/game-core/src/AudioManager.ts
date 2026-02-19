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
  private pendingMusic: string | null = null; // Music to play after unlock
  private pendingMusicOptions: { loop?: boolean; volume?: number } = {};
  private audioBuffers: Map<string, ArrayBuffer> = new Map(); // Preloaded audio data

  constructor(
    settings: AudioSettings = DEFAULT_AUDIO_SETTINGS,
    registry: AudioRegistry = DEFAULT_AUDIO_REGISTRY
  ) {
    this.settings = { ...settings };
    this.registry = { ...registry };
  }

  /**
   * Initialize audio - does NOT preload sounds
   * Use preloadSounds() separately when you want to load audio
   */
  async init(): Promise<void> {
    console.log("AudioManager initialized");
    await Promise.resolve();
  }

  /**
   * Preload all sounds from the registry
   * Call this from LoadingScene to fetch audio data.
   *
   * This fetches audio files as ArrayBuffer WITHOUT triggering AudioContext.
   * AudioContext is only created/resumed when user interacts.
   */
  async preloadSounds(onProgress?: (loaded: number, total: number) => void): Promise<void> {
    const soundNames = Object.keys(this.registry);
    const total = soundNames.length;
    let loaded = 0;

    console.log(`[AudioManager] Starting to preload ${total} sounds...`);

    // Fetch all audio files as ArrayBuffer (no AudioContext involved)
    const promises = soundNames.map(async (name) => {
      await this.fetchSoundData(name);
      loaded++;
      if (onProgress) {
        onProgress(loaded, total);
      }
    });

    await Promise.allSettled(promises);
    console.log(`[AudioManager] Preloaded ${loaded}/${total} sounds`);
  }

  /**
   * Fetch audio data as ArrayBuffer without triggering AudioContext
   */
  private async fetchSoundData(name: string): Promise<void> {
    if (this.audioBuffers.has(name)) {
      return; // Already fetched
    }

    const track = this.registry[name];
    if (!track) {
      console.warn(`Sound "${name}" not found in registry`);
      this.failedSounds.add(name);
      return;
    }

    try {
      const response = await fetch(track.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      this.audioBuffers.set(name, buffer);
      console.log(`[AudioManager] Fetched audio data: ${name} (${buffer.byteLength} bytes)`);
    } catch (err) {
      console.warn(`[AudioManager] Failed to fetch audio "${name}":`, err);
      this.failedSounds.add(name);
    }
  }

  /**
   * Register a sound with pixi-sound, using preloaded buffer if available
   */
  private registerSound(name: string): boolean {
    if (this.registeredSounds.has(name)) {
      return true; // Already registered
    }

    if (this.failedSounds.has(name)) {
      return false; // Already failed, don't retry
    }

    // Check if sound was already registered
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
      const preloadedBuffer = this.audioBuffers.get(name);

      if (preloadedBuffer) {
        // Use preloaded ArrayBuffer - this will decode audio when AudioContext is ready
        sound.add(name, {
          source: preloadedBuffer,
          loop: track.loop ?? false,
          volume: track.volume ?? 1,
          preload: true, // Decode the buffer (after AudioContext is ready)
        });
        console.log(`[AudioManager] Registered sound with preloaded buffer: ${name}`);
      } else {
        // Fallback to URL-based loading (lazy load)
        sound.add(name, {
          url: track.url,
          loop: track.loop ?? false,
          volume: track.volume ?? 1,
          preload: true,
        });
        console.log(`[AudioManager] Registered sound with URL (no preloaded buffer): ${name}`);
      }

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
   *
   * This resumes the AudioContext if it's suspended
   * Returns true if successfully unlocked (or already unlocked)
   */
  unlock(): boolean {
    if (this.isUnlocked) {
      // Already unlocked, play pending music if any
      this.playPendingMusic();
      return true;
    }

    try {
      // Try to get the internal WebAudioContext and resume it
      // pixi-sound stores the context internally
      let audioContext: any = null;

      // Try multiple paths to find the AudioContext
      // @ts-ignore
      if (sound.context?.audioContext) {
        // @ts-ignore
        audioContext = sound.context.audioContext;
      }
      // @ts-ignore
      else if (sound._soundContext?.audioContext) {
        // @ts-ignore
        audioContext = sound._soundContext.audioContext;
      }
      // @ts-ignore
      else if (sound['_context']?.audioContext) {
        // @ts-ignore
        audioContext = sound['_context'].audioContext;
      }

      if (audioContext) {
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            this.isUnlocked = true;
            console.log('[AudioManager] AudioContext resumed successfully');
            this.playPendingMusic();
          }).catch((e: any) => {
            console.warn('[AudioManager] Failed to resume AudioContext:', e);
          });
          return true;
        } else if (audioContext.state === 'running') {
          // Already running
          this.isUnlocked = true;
          this.playPendingMusic();
          console.log('[AudioManager] AudioContext already running');
          return true;
        }
      }

      console.warn('[AudioManager] Could not access AudioContext for unlock');
      return false;
    } catch (e) {
      console.warn('[AudioManager] Failed to unlock audio:', e);
      return false;
    }
  }

  /**
   * Play any pending music after unlock
   */
  private playPendingMusic(): void {
    if (this.pendingMusic) {
      const musicToPlay = this.pendingMusic;
      const options = this.pendingMusicOptions;
      this.pendingMusic = null; // Clear before playing to avoid infinite loop
      this.pendingMusicOptions = {};
      console.log(`Playing pending music: ${musicToPlay}`);
      this.playMusic(musicToPlay, options);
    }
  }

  /**
   * Check if audio is unlocked (can play)
   */
  isAudioUnlocked(): boolean {
    if (this.isUnlocked) {
      return true;
    }

    // Try to check the AudioContext state directly
    try {
      // @ts-ignore
      const context = sound.context?.audioContext || sound._soundContext?.audioContext || sound['_context']?.audioContext;
      if (context && context.state === 'running') {
        return true;
      }
    } catch {
      // Ignore
    }

    return false;
  }

  /**
   * Play background music
   * Automatically switches tracks if different from current
   * Ensures only ONE BGM plays at a time
   *
   * If audio is not unlocked yet, music will be queued to play after first user gesture
   */
  playMusic(trackName: string, options: { loop?: boolean; volume?: number } = {}): void {
    console.log(`[AudioManager] playMusic called with track: ${trackName}, musicEnabled: ${this.settings.musicEnabled}`);

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
        if (sound.isPlaying()) {
          return; // Already playing this track
        }
      } catch {
        // If check fails, continue to restart
      }
    }

    // IMPORTANT: Stop ALL music first to prevent overlapping
    this.stopMusic();

    // If audio is not unlocked yet, queue the music to play after unlock
    const isReady = this.isAudioUnlocked();
    console.log(`[AudioManager] playMusic("${trackName}") - isUnlocked: ${this.isUnlocked}, isReady: ${isReady}`);

    if (!isReady) {
      this.pendingMusic = trackName;
      this.pendingMusicOptions = options;
      console.log(`[AudioManager] Music queued to play after unlock: ${trackName}`);
      return;
    }

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

    // Also stop by name to be sure (only if sound exists)
    if (this.currentMusic && sound.exists(this.currentMusic)) {
      try {
        sound.stop(this.currentMusic);
      } catch {
        // Ignore errors when stopping
      }
    }

    // Stop all music tracks (bgm_*) to be absolutely sure no overlap
    // Only stop sounds that actually exist to avoid assertion errors
    const musicTracks = Object.keys(this.registry).filter(k =>
      k.startsWith('bgm_') && sound.exists(k)
    );
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
      sound.play(name, { volume });
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
      const isPlaying = sound.isPlaying();
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
    return this.currentMusic !== null && sound.isPlaying();
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
   * Destroy and cleanup
   */
  destroy(): void {
    this.stopMusic();
    this.currentMusicInstance = null;
    this.audioBuffers.clear();
    sound.removeAll();
    this.registeredSounds.clear();
    this.failedSounds.clear();
  }
}
