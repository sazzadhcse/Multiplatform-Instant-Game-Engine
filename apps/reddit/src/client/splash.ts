import { requestExpandedMode, context } from "@devvit/web/client";

const startButton = document.getElementById("start-button") as HTMLButtonElement;
const titleElement = document.getElementById("title") as HTMLHeadingElement;

titleElement.textContent = `Hey ${context.username ?? "player"} 👋`;

startButton.addEventListener("click", (e) => {
  requestExpandedMode(e, "game");
});
