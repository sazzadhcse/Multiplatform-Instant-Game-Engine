import { Game } from "@repo/game-core";
import { platform } from "@repo/platform-fb";

/**
 * FB Instant Game Entry Point
 * Uses shared game core with FB platform adapter
 */

async function main(): Promise<void> {
  // Fallback: remove loading screen after 8 seconds max
  const loadingTimeout = setTimeout(() => {
    document.getElementById("loading")?.remove();
    console.warn("Loading screen removed by timeout");
  }, 8000);

  try {
    // Create and initialize game with FB platform
    const game = new Game({
      platform,
    });

    await game.init();

    clearTimeout(loadingTimeout);

    // Hide loading screen
    document.getElementById("loading")?.remove();

    console.log("FB Instant Game started!");
  } catch (e) {
    console.error("Game init failed:", e);
    document.getElementById("loading")?.remove();
  }
}

// Initialize game when page loads
window.addEventListener("load", main);
