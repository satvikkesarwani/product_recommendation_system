import axios from "axios";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const ALLOWED_SORTS = new Set(["relevance", "price", "rating", "popularity"]);
const CATEGORY_ALIASES = new Map([
  ["phone", ["phone", "smartphone", "mobile", "iphone"]],
  ["laptop", ["laptop", "notebook", "macbook", "gaming laptop"]],
  ["headphones", ["headphones", "headphone", "earphones", "earbuds", "headset", "airpods", "buds"]],
  ["watch", ["watch", "smartwatch", "smart watch"]],
  ["tablet", ["tablet", "ipad", "tab"]],
  ["camera", ["camera", "dslr", "mirrorless", "webcam"]],
  ["speaker", ["speaker", "soundbar"]],
  ["tv", ["tv", "television", "smart tv"]],
  ["accessory", ["accessory", "charger", "adapter", "cable", "power bank"]],
]);
const KEYWORD_HINTS = [
  "camera",
  "gaming",
  "music",
  "battery",
  "wireless",
  "bluetooth",
  "bass",
  "noise cancelling",
  "office",
  "work",
  "student",
  "portable",
  "premium",
  "budget",
  "travel",
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsPhrase(haystack, phrase) {
  const pattern = new RegExp(`\\b${escapeRegExp(phrase).replace(/\s+/g, "\\s+")}\\b`, "i");
  return pattern.test(haystack);
}

function normalizeCategory(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim().toLowerCase();

  for (const [category, aliases] of CATEGORY_ALIASES.entries()) {
    if (category === normalized || aliases.some((alias) => containsPhrase(normalized, alias))) {
      return category;
    }
  }

  return normalized || null;
}

function parsePrice(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^0-9.]/g, ""));

  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
}

function normalizeKeywords(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(
    value
      .map((keyword) => String(keyword).trim().toLowerCase())
      .filter(Boolean),
  )].slice(0, 8);
}

function detectCurrency(query, candidateCurrency) {
  const normalizedCurrency = String(candidateCurrency ?? "").trim().toUpperCase();
  if (normalizedCurrency === "USD" || normalizedCurrency === "INR") {
    return normalizedCurrency;
  }

  const normalizedQuery = query.toLowerCase();
  if (normalizedQuery.includes("₹") || normalizedQuery.includes("inr") || normalizedQuery.includes("rupees")) {
    return "INR";
  }

  if (normalizedQuery.includes("$") || normalizedQuery.includes("usd") || normalizedQuery.includes("dollar")) {
    return "USD";
  }

  return "INR";
}

function detectSortPreference(query) {
  const normalizedQuery = query.toLowerCase();

  if (/(cheapest|budget|affordable|under|below|low price)/.test(normalizedQuery)) {
    return "price";
  }

  if (/(best|top rated|high rating|good reviews)/.test(normalizedQuery)) {
    return "rating";
  }

  if (/(popular|bestseller|most reviews)/.test(normalizedQuery)) {
    return "popularity";
  }

  return "relevance";
}

function detectCategory(query) {
  const normalizedQuery = query.toLowerCase();

  for (const [category, aliases] of CATEGORY_ALIASES.entries()) {
    if (aliases.some((alias) => containsPhrase(normalizedQuery, alias)) || containsPhrase(normalizedQuery, category)) {
      return category;
    }
  }

  return null;
}

function extractBudget(query) {
  const sanitizedQuery = query.toLowerCase().replace(/,/g, "");
  const betweenMatch = sanitizedQuery.match(/between\s+[$₹]?(\d+(?:\.\d+)?)\s+(?:and|to)\s+[$₹]?(\d+(?:\.\d+)?)/i);
  if (betweenMatch) {
    const minPrice = parsePrice(betweenMatch[1]);
    const maxPrice = parsePrice(betweenMatch[2]);
    return { minPrice, maxPrice };
  }

  const maxMatch = sanitizedQuery.match(/(?:under|below|less than|upto|up to|max(?:imum)? of)\s+[$₹]?(\d+(?:\.\d+)?)/i);
  const minMatch = sanitizedQuery.match(/(?:above|over|at least|minimum of|min(?:imum)? of)\s+[$₹]?(\d+(?:\.\d+)?)/i);

  return {
    minPrice: minMatch ? parsePrice(minMatch[1]) : null,
    maxPrice: maxMatch ? parsePrice(maxMatch[1]) : null,
  };
}

function extractKeywords(query, detectedCategory) {
  const normalizedQuery = query.toLowerCase();
  const keywordMatches = KEYWORD_HINTS.filter((keyword) => normalizedQuery.includes(keyword));

  if (keywordMatches.length > 0) {
    return keywordMatches;
  }

  const stopWords = new Set([
    "i",
    "want",
    "a",
    "an",
    "the",
    "for",
    "with",
    "and",
    "or",
    "under",
    "below",
    "best",
    "suggest",
    "good",
    "need",
    "show",
    "me",
  ]);

  return [...new Set(
    normalizedQuery
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !stopWords.has(token) && token !== detectedCategory),
  )].slice(0, 5);
}

function normalizePreferences(rawPreferences, query) {
  const category = normalizeCategory(rawPreferences?.category) || detectCategory(query);
  const keywords = normalizeKeywords(rawPreferences?.keywords);
  const fallbackBudget = extractBudget(query);
  const minPrice = parsePrice(rawPreferences?.minPrice) ?? fallbackBudget.minPrice;
  const maxPrice = parsePrice(rawPreferences?.maxPrice) ?? fallbackBudget.maxPrice;
  const currency = detectCurrency(query, rawPreferences?.budgetCurrency);
  const sortBy = ALLOWED_SORTS.has(rawPreferences?.sortBy) ? rawPreferences.sortBy : detectSortPreference(query);
  const normalizedKeywords = keywords.length > 0 ? keywords : extractKeywords(query, category);

  return {
    category,
    minPrice,
    maxPrice,
    budgetCurrency: currency,
    keywords: normalizedKeywords,
    sortBy,
  };
}

function extractJsonCandidate(content) {
  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch) {
    return fencedMatch[1];
  }

  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return content.slice(firstBrace, lastBrace + 1);
  }

  return content;
}

function buildPrompt(query) {
  return `
You extract shopping preferences from a user's request.
Return JSON only. Do not include markdown, prose, or code fences.

Required JSON shape:
{
  "category": string | null,
  "minPrice": number | null,
  "maxPrice": number | null,
  "budgetCurrency": "USD" | "INR" | null,
  "keywords": string[],
  "sortBy": "relevance" | "price" | "rating" | "popularity" | null
}

Rules:
- Identify only the user's shopping intent.
- Keep category short and generic, like "phone", "laptop", or "headphones".
- Extract keywords only if they matter to product matching.
- If a field is unknown, use null or [].

Example:
{
  "category": "phone",
  "minPrice": null,
  "maxPrice": 500,
  "budgetCurrency": "USD",
  "keywords": ["camera"],
  "sortBy": "price"
}

User query: "${query}"
`.trim();
}

async function extractWithOpenRouter({ apiKey, model, query }) {
  const response = await axios.post(
    OPENROUTER_URL,
    {
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a shopping preference parser. Return valid JSON only.",
        },
        {
          role: "user",
          content: buildPrompt(query),
        },
      ],
    },
    {
      timeout: 20000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Product Recommendation System",
      },
    },
  );

  return response.data?.choices?.[0]?.message?.content ?? "";
}

async function extractWithNvidia({ apiKey, model, query }) {
  const response = await axios.post(
    NVIDIA_URL,
    {
      model,
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content: "You are a shopping preference parser. Return valid JSON only.",
        },
        {
          role: "user",
          content: buildPrompt(query),
        },
      ],
    },
    {
      timeout: 20000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  return response.data?.choices?.[0]?.message?.content ?? "";
}

export async function extractPreferences({ query, provider, apiKey, model }) {
  const fallbackPreferences = normalizePreferences({}, query);

  if (!apiKey) {
    return {
      preferences: fallbackPreferences,
      source: "fallback",
      warning: `${provider || "ai"} API key is missing. Using local parsing fallback.`,
    };
  }

  try {
    const rawContent =
      provider === "nvidia"
        ? await extractWithNvidia({ apiKey, model, query })
        : await extractWithOpenRouter({ apiKey, model, query });
    const parsedJson = JSON.parse(extractJsonCandidate(rawContent));

    return {
      preferences: normalizePreferences(parsedJson, query),
      source: `ai:${provider}`,
      rawContent,
    };
  } catch (error) {
    return {
      preferences: fallbackPreferences,
      source: "fallback",
      warning: error.response?.data?.error?.message || error.message,
    };
  }
}
