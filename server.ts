import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { extractCueCard, evaluateAudioFile } from "./src/lib/gemini_service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for audio files
  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.post("/api/extract-cue-card", async (req, res) => {
    try {
      console.log("Received OCR request...");
      const { image } = req.body;
      if (!image) {
        console.error("Missing image in payload");
        return res.status(400).json({ error: "Image required" });
      }
      const data = await extractCueCard(image);
      console.log("OCR success");
      res.json(data);
    } catch (error) {
      console.error("OCR Error in server:", error);
      res.status(500).json({ error: "Failed to extract cue card", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/evaluate-audio", async (req, res) => {
    try {
      console.log("Received Evaluation request...");
      const { audio, mimeType } = req.body;
      if (!audio) {
        console.error("Missing audio in payload");
        return res.status(400).json({ error: "Audio required" });
      }
      const data = await evaluateAudioFile(audio, mimeType);
      console.log("Evaluation success");
      res.json(data);
    } catch (error) {
      console.error("Evaluation Error in server:", error);
      res.status(500).json({ error: "Failed to evaluate audio", details: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
