import "pixi.js/unsafe-eval";
import { Game } from "@repo/game-core";
import { platform } from "@repo/platform-reddit";
import { context } from "@devvit/web/client";

/**
 * Reddit Game Entry Point
 * Uses shared game core with Reddit platform adapter
 */

async function main(): Promise<void> {
  // Fallback: remove loading screen after 8 seconds max
  const loadingElement = document.getElementById("loading");
  const loadingTimeout = setTimeout(() => {
    loadingElement?.remove();
    console.warn("Loading screen removed by timeout");
  }, 8000);

  try {
    // Set base URL for API calls
    platform.setBaseUrl("/api");

    // Create and initialize game with Reddit platform
    const game = new Game({
      platform,
    });

    await game.init();

    clearTimeout(loadingTimeout);

    // Hide loading screen
    loadingElement?.remove();

    console.log("Reddit game started for user:", context.username);
  } catch (e) {
    console.error("Game init failed:", e);
    loadingElement?.remove();
  }
}

// Initialize game when page loads
window.addEventListener("load", main);
