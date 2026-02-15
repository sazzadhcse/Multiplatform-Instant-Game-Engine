import express from "express";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const app = express();
const port = 3001;

// Allow express to parse JSON bodies
app.use(express.json());

// Discord OAuth2 token exchange endpoint
app.post("/api/token", async (req, res) => {
  const code = req.body.code;

  if (!code) {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  try {
    const response = await fetch(`https://discord.com/api/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.VITE_DISCORD_CLIENT_ID || "",
        client_secret: process.env.DISCORD_CLIENT_SECRET || "",
        grant_type: "authorization_code",
        code,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Discord token exchange error:", errorText);
      return res.status(400).json({ error: "Failed to exchange token" });
    }

    const { access_token } = (await response.json()) as { access_token: string };

    // Return the access_token to our client
    res.send({ access_token });
  } catch (error) {
    console.error("Token exchange error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Discord server listening at http://localhost:${port}`);
});
