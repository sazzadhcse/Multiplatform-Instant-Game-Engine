import { Game } from "@repo/game-core";
import { platform } from "@repo/platform-fb";

/**
 * FB Instant Game Entry Point
 * Uses shared game core with FB platform adapter
 */

async function main(): Promise<void> {
  const gameContainer = document.getElementById("game-container");
  if (!gameContainer) {
    console.error("Game container not found");
    return;
  }

  // Create and initialize game with FB platform
  const game = new Game({
    platform,
  });

  await game.init();

  // Hide loading screen
  document.getElementById("loading")?.remove();

  console.log("FB Instant Game started!");
}

// Initialize game when page loads
window.addEventListener("load", main);
