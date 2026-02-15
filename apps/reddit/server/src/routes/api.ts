import { Hono } from "hono";
import { context, redis } from "@devvit/web/server";

type ErrorResponse = {
  status: "error";
  message: string;
};

export const api = new Hono();

api.get("/init", async (c) => {
  const { postId } = context;

  if (!postId) {
    console.error("API Init Error: postId not found in devvit context");
    return c.json<ErrorResponse>(
      {
        status: "error",
        message: "postId is required but missing from context",
      },
      400
    );
  }

  try {
    const [count, username] = await Promise.all([
      redis.get("count"),
      context.reddit?.getCurrentUsername?.() || Promise.resolve("anonymous"),
    ]);

    return c.json({
      type: "init",
      postId: postId,
      count: count ? parseInt(count) : 0,
      username: username ?? "anonymous",
    });
  } catch (error) {
    console.error(`API Init Error for post ${postId}:`, error);
    let errorMessage = "Unknown error during initialization";
    if (error instanceof Error) {
      errorMessage = `Initialization failed: ${error.message}`;
    }
    return c.json<ErrorResponse>(
      { status: "error", message: errorMessage },
      400
    );
  }
});

api.get("/highscore", async (c) => {
  const { postId, userId } = context;

  if (!postId) {
    return c.json<ErrorResponse>(
      { status: "error", message: "postId is required" },
      400
    );
  }

  if (!userId) {
    return c.json<ErrorResponse>(
      { status: "error", message: "userId is required" },
      400
    );
  }

  try {
    const key = `highscore:${postId}:${userId}`;
    const score = await redis.get(key);
    const highScore = score ? parseInt(score) : 0;

    return c.json({
      highScore,
      isNewRecord: false,
    });
  } catch (error) {
    console.error("API HighScore Error:", error);
    return c.json<ErrorResponse>(
      { status: "error", message: "Failed to fetch high score" },
      500
    );
  }
});

api.post("/highscore", async (c) => {
  const { postId, userId } = context;

  if (!postId) {
    return c.json<ErrorResponse>(
      { status: "error", message: "postId is required" },
      400
    );
  }

  if (!userId) {
    return c.json<ErrorResponse>(
      { status: "error", message: "userId is required" },
      400
    );
  }

  try {
    const body = await c.req.json();
    const { score } = body as { score: number };

    if (typeof score !== "number" || score < 0) {
      return c.json<ErrorResponse>(
        { status: "error", message: "Invalid score value" },
        400
      );
    }

    const key = `highscore:${postId}:${userId}`;
    const current = await redis.get(key);
    const currentScore = current ? parseInt(current) : 0;

    let newHighScore = currentScore;
    let isNewRecord = false;

    if (score > currentScore) {
      await redis.set(key, score.toString());
      newHighScore = score;
      isNewRecord = true;
    }

    return c.json({
      highScore: newHighScore,
      isNewRecord,
    });
  } catch (error) {
    console.error("API Update HighScore Error:", error);
    return c.json<ErrorResponse>(
      { status: "error", message: "Failed to update high score" },
      500
    );
  }
});
