import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function startServer() {
  console.log("Starting full-stack server...");
  const app = express();
  const PORT = 3000;

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

  // OCR Route
  app.post("/api/extract-cue-card", async (req, res, next) => {
    try {
      const { image, mimeType } = req.body;
      if (!image) return res.status(400).json({ error: "Image required" });
      
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: image, mimeType: mimeType || "image/png" } },
              { text: "Exhaustively extract every single word from this IELTS Speaking Part 2 cue card image. Map it precisely to a JSON object: 'title', 'preamble', 'instructionLine', 'bulletPoints' (array). Do not summarize." }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              title: { type: SchemaType.STRING },
              preamble: { type: SchemaType.STRING },
              instructionLine: { type: SchemaType.STRING },
              bulletPoints: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
            },
            required: ['title', 'preamble', 'instructionLine', 'bulletPoints']
          }
        }
      });

      res.json(JSON.parse(result.response.text()));
    } catch (error) {
      next(error);
    }
  });

  // Evaluation Route
  app.post("/api/evaluate-audio", async (req, res, next) => {
    try {
      const { audio, mimeType } = req.body;
      if (!audio) return res.status(400).json({ error: "Audio required" });

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: audio, mimeType: mimeType || "audio/mpeg" } },
              { text: "Evaluate this IELTS Speaking audio. Provide transcript, feedback (fluency, lexical, grammar, pronunciation), estimatedScore, and generalAdvice in JSON." }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              transcript: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    speaker: { type: SchemaType.STRING },
                    text: { type: SchemaType.STRING },
                    startTime: { type: SchemaType.NUMBER }
                  }
                }
              },
              feedback: {
                 type: SchemaType.OBJECT,
                 properties: {
                   fluency: { type: SchemaType.STRING },
                   lexical: { type: SchemaType.STRING },
                   grammar: { type: SchemaType.STRING },
                   pronunciation: { type: SchemaType.STRING }
                 }
              },
              estimatedScore: { type: SchemaType.NUMBER },
              generalAdvice: { type: SchemaType.STRING }
            },
            required: ['transcript', 'feedback', 'estimatedScore', 'generalAdvice']
          }
        }
      });

      res.json(JSON.parse(result.response.text()));
    } catch (error) {
      next(error);
    }
  });

  // Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Server Error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Ready on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Bootstrap Failure:", err);
});
