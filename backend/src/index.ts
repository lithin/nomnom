import { resolve } from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import express from "express";

const loadLocalEnv = () => {
  // In production (for example Cloud Run), env vars come from service config/secrets.
  if (process.env.NODE_ENV === "production") {
    return;
  }

  dotenv.config({ path: resolve(__dirname, "../.env") });
};

loadLocalEnv();

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

type ChatRequestBody = {
  messages?: ChatMessage[];
};

const primaryModel = process.env.GEMINI_MODEL?.trim() || "gemini-3-flash";

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const isModelNotSupportedError = (message: string) => {
  return (
    message.includes("not found for API version") ||
    message.includes("not supported for generateContent")
  );
};

const app = express();
const port = Number(process.env.PORT) || 8080;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/chat", async (_req, res) => {
  const body = _req.body as ChatRequestBody;
  const { messages } = body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
    return;
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages is required" });
    return;
  }

  // Convert messages to SDK format for history
  const history = messages.slice(0, -1).map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.text }],
  }));

  // Get the latest user message
  const latestMessage = messages[messages.length - 1];
  const latestText = latestMessage?.text?.trim();

  if (!latestText) {
    res.status(400).json({ error: "latest message text is required" });
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const runChatWithModel = async (modelName: string) => {
      const model = genAI.getGenerativeModel({
        model: modelName,

        systemInstruction: `
        You are a recipe assisstant to a mother of two small children (baby and toddler) and a wife to a very hungry weight-lifting husband.
        Toddler eats everything and quite a lot. Baby is doing baby led weaning.
        She loves cooking and baking. She is a foodie who used to live in London and got used to eating delicious foods from all kinds of world cuisines.
        She likes concise responses, but with detailed recipes when asked for. She likes ideating fun new recipes.
        `,
      });
      const chat = model.startChat({
        history,
        generationConfig: {
          maxOutputTokens: 1500,
        },
      });

      const result = await chat.sendMessage(latestText);
      const response = await result.response;
      return response.text();
    };

    const reply = await runChatWithModel("gemini-3-flash-preview");
    res.status(200).json({ reply });
  } catch (error) {
    const message = getErrorMessage(error);
    res.status(500).json({ error: message });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
