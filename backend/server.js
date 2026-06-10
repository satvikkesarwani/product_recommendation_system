import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import { loadProducts } from "./src/data/loadProducts.js";
import { extractPreferences } from "./src/services/preferenceExtractor.js";
import { recommendProducts } from "./src/services/recommendationService.js";

dotenv.config();

const app = express();
const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 5000);
const AI_PROVIDER = process.env.AI_PROVIDER || "nvidia";
const MODEL =
  AI_PROVIDER === "nvidia"
    ? process.env.NVIDIA_MODEL || "meta/llama-3.1-70b-instruct"
    : process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b:free";
const API_KEY =
  AI_PROVIDER === "nvidia"
    ? process.env.NVIDIA_API_KEY
    : process.env.OPENROUTER_API_KEY;
const products = await loadProducts();
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((value) => value.trim())
  : "*";

app.use(
  cors({
    origin: allowedOrigins,
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/health", (request, response) => {
  response.json({
    status: "ok",
    productsLoaded: products.length,
    provider: AI_PROVIDER,
    model: MODEL,
  });
});

app.get("/products", (request, response) => {
  response.json(products.map(({ searchableText, ...product }) => product));
});

app.post("/recommend", async (request, response, next) => {
  try {
    const query = String(request.body?.query ?? "").trim();

    if (!query) {
      return response.status(400).json({
        message: "Please provide a preference query.",
      });
    }

    const { preferences, source, warning } = await extractPreferences({
      query,
      provider: AI_PROVIDER,
      apiKey: API_KEY,
      model: MODEL,
    });

    const recommendedProducts = recommendProducts(products, preferences);

    return response.json({
      products: recommendedProducts,
      preferences,
      meta: {
        source,
        warning: warning ?? null,
        currency: "INR",
        totalProducts: products.length,
        returnedProducts: recommendedProducts.length,
      },
    });
  } catch (error) {
    return next(error);
  }
});

app.use((error, request, response, next) => {
  console.error(error);

  if (response.headersSent) {
    return next(error);
  }

  return response.status(500).json({
    message: "Something went wrong while generating recommendations.",
    details: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Backend running on http://${HOST}:${PORT}`);
});
