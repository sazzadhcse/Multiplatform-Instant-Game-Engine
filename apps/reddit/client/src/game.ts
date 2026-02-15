import "pixi.js/unsafe-eval";
import { Game } from "@repo/game-core";
import { platform } from "@repo/platform-reddit";
import { context } from "@devvit/web/client";

/**
 * Reddit Game Entry Point
 * Uses shared game core with Reddit platform adapter
 */

async function main(): Promise<void> {
  const gameContainer = document.getElementById("game-container");
  if (!gameContainer) {
    console.error("Game container not found");
    return;
  }

  // Set base URL for API calls
  platform.setBaseUrl("/api");

  // Create and initialize game with Reddit platform
  const game = new Game({
    platform,
  });

  await game.init();

  console.log("Reddit game started for user:", context.username);
}

// Initialize game when page loads
window.addEventListener("load", main);
