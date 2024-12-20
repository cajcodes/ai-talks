// server.js
import express from "express";
import fetch from "node-fetch"; // If you're on Node 18+, fetch is built-in, adjust accordingly.
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 3000;

app.get("/session", async (req, res) => {
  try {
    const r = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "verse",
      }),
    });
    const data = await r.json();

    if (!r.ok) {
      console.error("Error fetching ephemeral key:", data);
      return res.status(r.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.use(express.static("public"));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
