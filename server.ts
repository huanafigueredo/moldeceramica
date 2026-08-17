import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { searchMolds } from "./src/server/searchMolds";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API: Search models with Google Search grounding and Gemini 3.1 Flash Lite
app.post("/api/search-molds", async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: "O termo de busca é obrigatório." });
  }

  const result = await searchMolds(query);
  res.json(result);
});

// Setup Vite or Static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
