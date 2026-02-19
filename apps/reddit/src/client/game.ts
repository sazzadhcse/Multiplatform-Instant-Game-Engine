import "pixi.js/unsafe-eval";
import { Game } from "@repo/game-core";
import { platform } from "@repo/platform-reddit";
import { context } from "@devvit/web/client";

/**
 * Reddit Game Entry Point
 * Uses shared game core with Reddit platform adapter
 */

async function main(): Promise<void> {
  // Fallback: hide loading background after 15 seconds max
  // (LoadingScene will handle this normally when it starts)
  const loadingBg = document.getElementById("loading-bg");
  const loadingTimeout = setTimeout(() => {
    loadingBg?.classList.add("hidden");
    setTimeout(() => loadingBg?.remove(), 500);
    console.warn("Loading background removed by timeout");
  }, 15000);

  try {
    // Set base URL for API calls
    platform.setBaseUrl("/api");

    // Create and initialize game with Reddit platform
    const game = new Game({
      platform,
    });

    await game.init();

    clearTimeout(loadingTimeout);
    // LoadingScene will handle hiding the loading background

    console.log("Reddit game started for user:", context.username);
  } catch (e) {
    console.error("Game init failed:", e);
    clearTimeout(loadingTimeout);
    loadingBg?.classList.add("hidden");
    setTimeout(() => loadingBg?.remove(), 500);
  }
}

// Initialize game when page loads
window.addEventListener("load", main);
