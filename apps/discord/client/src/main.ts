import { Game } from "@repo/game-core";
import { platform } from "@repo/platform-discord";

/**
 * Discord Game Entry Point
 * Uses shared game core with Discord platform adapter
 */

async function main(): Promise<void> {
  const gameContainer = document.getElementById("game-container");
  if (!gameContainer) {
    console.error("Game container not found");
    return;
  }

  // Fallback: hide loading background after 15 seconds max
  // (LoadingScene will handle this normally when it starts)
  const loadingBg = document.getElementById("loading-bg");
  const loadingTimeout = setTimeout(() => {
    loadingBg?.classList.add("hidden");
    setTimeout(() => loadingBg?.remove(), 500);
    console.warn("Loading background removed by timeout");
  }, 15000);

  try {
    // Create and initialize game with Discord platform
    const game = new Game({
      platform,
    });

    await game.init();

    // Clear the timeout since init completed
    // LoadingScene will handle hiding the loading background
    clearTimeout(loadingTimeout);

    console.log("Discord game started!");
  } catch (e) {
    console.error("Game init failed:", e);
    clearTimeout(loadingTimeout);
    // Still hide loading background on error
    loadingBg?.classList.add("hidden");
    setTimeout(() => loadingBg?.remove(), 500);
  }
}

// Initialize game when page loads
window.addEventListener("load", main);
