import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseCsv } from "../utils/csv.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CATEGORY_RULES = [
  { category: "headphones", keywords: ["headphone", "headphones", "earphone", "earphones", "earbud", "earbuds", "airpods", "airdopes", "neckband", "headset", "buds"] },
  { category: "phone", keywords: ["phone", "smartphone", "iphone", "galaxy", "redmi", "oneplus", "realme", "oppo", "vivo", "pixel", "narzo", "moto"] },
  { category: "laptop", keywords: ["laptop", "notebook", "macbook", "thinkpad", "chromebook", "ideapad", "vivobook", "zenbook", "inspiron", "latitude", "gaming laptop"] },
  { category: "watch", keywords: ["smart watch", "smartwatch", "watch"] },
  { category: "tablet", keywords: ["tablet", "ipad", "tab"] },
  { category: "camera", keywords: ["camera", "dslr", "mirrorless", "webcam", "canon", "nikon", "gopro"] },
  { category: "speaker", keywords: ["speaker", "soundbar", "home theater", "subwoofer"] },
  { category: "tv", keywords: [" smart tv", " television", " led tv", " oled", " qled", "android tv", "tv "] },
  { category: "accessory", keywords: ["adapter", "charger", "cable", "power bank", "case", "mouse", "keyboard", "hub", "stand"] },
];
const ACCESSORY_PRIORITY_KEYWORDS = [
  "mouse pad",
  "desk pad",
  "holder",
  "stand",
  "mount",
  "dock",
  "protector",
  "sleeve",
  "cover",
  "keyboard",
  "mouse",
  "hub",
  "power bank",
  "cable",
  "gloves",
];

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsKeyword(haystack, keyword) {
  const pattern = new RegExp(`\\b${escapeRegExp(keyword).replace(/\s+/g, "\\s+")}\\b`, "i");
  return pattern.test(haystack);
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
}

function inferCategory(record) {
  const haystack = ` ${normalizeWhitespace(record.name).toLowerCase()} ${normalizeWhitespace(record.main_category).toLowerCase()} ${normalizeWhitespace(record.sub_category).toLowerCase()} `;

  if (ACCESSORY_PRIORITY_KEYWORDS.some((keyword) => containsKeyword(haystack, keyword.toLowerCase()))) {
    return "accessory";
  }

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => containsKeyword(haystack, keyword.toLowerCase()))) {
      return rule.category;
    }
  }

  if (haystack.includes("electronics")) {
    return "electronics";
  }

  return "other";
}

function buildProduct(record, index) {
  const discountedPrice = parseNumber(record.discount_price);
  const actualPrice = parseNumber(record.actual_price);
  const rating = parseNumber(record.ratings);
  const ratingCount = parseNumber(record.no_of_ratings);
  const category = inferCategory(record);
  const name = normalizeWhitespace(record.name) || `Product ${index + 1}`;
  const mainCategory = normalizeWhitespace(record.main_category);
  const subCategory = normalizeWhitespace(record.sub_category);

  return {
    id: String(record.column_0 || index + 1),
    name,
    category,
    price: discountedPrice ?? actualPrice ?? 0,
    actualPrice,
    currency: "INR",
    image: normalizeWhitespace(record.image),
    link: normalizeWhitespace(record.link),
    rating,
    ratingCount,
    mainCategory,
    subCategory,
    searchableText: `${name} ${category} ${mainCategory} ${subCategory}`.toLowerCase(),
  };
}

export async function loadProducts() {
  const csvPath =
    process.env.PRODUCTS_CSV_PATH ||
    path.resolve(__dirname, "../../../electronics_product.csv");

  const fileContents = await readFile(csvPath, "utf8");
  const rows = parseCsv(fileContents);

  return rows
    .map(buildProduct)
    .filter((product) => product.name && product.price > 0);
}
