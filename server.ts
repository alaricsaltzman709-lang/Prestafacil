import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware
  app.use(express.json({ limit: '10mb' }));

  // API Route for Gemini Extraction
  app.post("/api/extract", async (req: express.Request, resValue: express.Response) => {
    try {
      const { base64, mimeType } = req.body;
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

      const prompt = `Extrae información de clientes y sus préstamos de este archivo. Devuelve un objeto JSON con dos arrays: 
        "customers": array de objetos con { name (string, requerido), idNumber (string), phone (string), email (string), address (string) }.
        "loans": array de objetos con { borrowerName (string, requerido), amount (number), interestRate (number), termMonths (number), startDate (string YYYY-MM-DD), status (string: 'active'|'paid'|'defaulted') }.
        Intenta relacionar los préstamos con los clientes por el nombre si es posible.
        Solo devuelve el JSON puro sin bloques de código markdown.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { text: prompt },
          { inlineData: { data: base64, mimeType: mimeType } }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      let text = result.text || '{"customers":[], "loans":[]}';
      // Basic cleanup in case of markdown blocks
      text = text.replace(/```json\n?/, '').replace(/```/, '').trim();
      
      const extracted = JSON.parse(text);
      resValue.json(extracted);
    } catch (error: any) {
      console.error("Extraction error:", error);
      resValue.status(500).json({ error: error.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
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
