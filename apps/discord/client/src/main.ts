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

  // Fallback: remove loading screen after 8 seconds max
  const loadingTimeout = setTimeout(() => {
    document.getElementById("loading")?.remove();
    console.warn("Loading screen removed by timeout");
  }, 8000);

  try {
    // Create and initialize game with Discord platform
    const game = new Game({
      platform,
    });

    await game.init();

    // Clear the timeout since init completed
    clearTimeout(loadingTimeout);

    // Hide loading screen
    document.getElementById("loading")?.remove();

    console.log("Discord game started!");
  } catch (e) {
    console.error("Game init failed:", e);
    // Still remove loading screen on error
    document.getElementById("loading")?.remove();
  }
}

// Initialize game when page loads
window.addEventListener("load", main);
