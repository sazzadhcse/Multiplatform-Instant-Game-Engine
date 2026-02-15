import { Hono } from "hono";
import type { OnAppInstallRequest, TriggerResponse } from "@devvit/web/shared";
import { context } from "@devvit/web/server";
import { reddit } from "devvit";

export const triggers = new Hono();

triggers.post("/on-app-install", async (c) => {
  try {
    const post = await reddit.submitPost({
      title: "PixiJS Treasure Hunt",
      preview: (
        <vstack alignment="center middle" height="100%">
          <text size="large">Play the game!</text>
        </vstack>
      ),
    });
    const input = await c.req.json<OnAppInstallRequest>();

    return c.json<TriggerResponse>(
      {
        status: "success",
        message: `Post created in subreddit ${context.subredditName} with id ${post.id} (trigger: ${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: "error",
        message: "Failed to create post",
      },
      400
    );
  }
});
