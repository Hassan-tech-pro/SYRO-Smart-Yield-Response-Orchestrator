import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// 1. Gemini AI Route
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    geminiKeyLength: process.env.GEMINI_API_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    envKeys: Object.keys(process.env).filter(k => k.includes("GEMINI") || k.includes("API") || k.includes("TWILIO")),
    timestamp: new Date().toISOString()
  });
});

app.post("/api/analyze-crisis", async (req, res) => {
  const { report } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  console.log(`[Server] Analyzing crisis report: "${report?.substring(0, 50)}..."`);
  console.log(`[Server] API Key check: exists=${!!apiKey}, len=${apiKey?.length || 0}`);

  if (!apiKey) {
    console.error("[Server] Error: GEMINI_API_KEY is missing from environment.");
    return res.status(500).json({ error: "Gemini API key not configured on server. Please ensure the project has GEMINI_API_KEY set in project secrets/env." });
  }

  try {
    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const prompt = `Analyze this crisis report: "${report}". 
Extract JSON matching exactly this format: {"city": "city_name_in_lowercase", "isCrisis": boolean (true if mentions fire, blast, explosion, outage, etc)}.
If no Pakistani city is found, return null for city. Return ONLY the raw JSON object, no markdown formatting.`;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    
    let text = result.text?.trim() || "";

    console.log("[Server] Gemini raw response:", text);

    // Clean up potential markdown formatting
    if (text.startsWith("```json")) {
        text = text.replace(/```json\n?/, "").replace(/\n?```/, "");
    } else if (text.startsWith("```")) {
        text = text.replace(/```\n?/, "").replace(/\n?```/, "");
    }

    try {
      const json = JSON.parse(text);
      res.json(json);
    } catch (parseErr) {
      console.error("[Server] JSON Parse Error:", parseErr, "Raw Text:", text);
      // Attempt to extract JSON if there's surrounding text
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) {
         res.json(JSON.parse(jsonMatch[0]));
      } else {
         throw new Error("Could not parse AI response as JSON");
      }
    }
  } catch (error: any) {
    console.error("[Server] Gemini Error Detail:", error.message || error);
    res.status(500).json({ error: `AI Analysis Failed: ${error.message || "Internal Error"}` });
  }
});

// 2. Twilio SMS Route
app.post("/api/dispatch-alert", async (req, res) => {
  const { city, location } = req.body;
  const sid = process.env.VITE_TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.VITE_TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.VITE_TWILIO_FROM_NUMBER || process.env.TWILIO_FROM_NUMBER;
  const to = process.env.VITE_TWILIO_TO_NUMBER || process.env.TWILIO_TO_NUMBER;

  if (!sid || !token) {
    return res.status(500).json({ error: "Twilio credentials missing on server." });
  }

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const body = new URLSearchParams();
    body.append("To", to || "");
    body.append("From", from || "");
    body.append("Body", `🚨 SYRO ALERT: Transformer crisis detected in ${city.toUpperCase()} at ${location}. WAPDA crew dispatched.`);

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || `Twilio Error ${response.status}`);
    res.json(data);
  } catch (error) {
    console.error("Twilio Error:", error);
    res.status(500).json({ error: "Failed to dispatch SMS alert." });
  }
});

// Vite Middleware for Development
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
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
