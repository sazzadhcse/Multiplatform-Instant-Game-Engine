import { Hono } from "hono";
import type { UiResponse } from "@devvit/web/shared";
import { context } from "@devvit/web/server";
import { reddit } from "devvit";

export const menu = new Hono();

menu.post("/post-create", async (c) => {
  try {
    const post = await reddit.submitPost({
      title: "PixiJS Treasure Hunt",
      preview: (
        <vstack alignment="center middle" height="100%">
          <text size="large">Play the game!</text>
        </vstack>
      ),
    });

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: "Failed to create post",
      },
      400
    );
  }
});
