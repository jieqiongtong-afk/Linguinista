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

  // Health Check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      env: { 
        hasApiKey: !!process.env.GEMINI_API_KEY,
        nodeEnv: process.env.NODE_ENV 
      } 
    });
  });

  // API Routes
  app.post("/api/extract-cue-card", async (req, res, next) => {
    try {
      console.log("Received OCR request...");
      const { image, mimeType } = req.body;
      if (!image) {
        return res.status(400).json({ error: "Image required" });
      }
      const data = await extractCueCard(image, mimeType || "image/png");
      console.log("OCR success");
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/evaluate-audio", async (req, res, next) => {
    try {
      console.log("Received Evaluation request...");
      const { audio, mimeType } = req.body;
      if (!audio) {
        return res.status(400).json({ error: "Audio required" });
      }
      const data = await evaluateAudioFile(audio, mimeType);
      console.log("Evaluation success");
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  // Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Internal Server Error:", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      details: err instanceof Error ? err.message : String(err) 
    });
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
