const USD_TO_INR = Number(process.env.USD_TO_INR || 83);

const CATEGORY_ALIASES = new Map([
  ["phone", ["phone", "smartphone", "mobile", "iphone"]],
  ["laptop", ["laptop", "notebook", "macbook"]],
  ["headphones", ["headphones", "headphone", "earphones", "earbuds", "headset", "buds"]],
  ["watch", ["watch", "smartwatch", "smart watch"]],
  ["tablet", ["tablet", "ipad", "tab"]],
  ["camera", ["camera", "dslr", "webcam"]],
  ["speaker", ["speaker", "soundbar"]],
  ["tv", ["tv", "television", "smart tv"]],
  ["accessory", ["accessory", "charger", "adapter", "cable", "power bank"]],
]);
const ACCESSORY_TERMS = ["stand", "holder", "mount", "case", "cover", "adapter", "charger", "cable"];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsPhrase(haystack, phrase) {
  const pattern = new RegExp(`\\b${escapeRegExp(phrase).replace(/\s+/g, "\\s+")}\\b`, "i");
  return pattern.test(haystack);
}

function convertBudgetToInr(price, currency) {
  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  if (currency === "USD") {
    return Math.round(price * USD_TO_INR);
  }

  return Math.round(price);
}

function matchesCategory(product, category) {
  if (!category) {
    return true;
  }

  if (product.category && product.category !== "other" && product.category !== "electronics") {
    return product.category === category;
  }

  const aliases = CATEGORY_ALIASES.get(category) ?? [category];
  return aliases.some(
    (alias) =>
      containsPhrase(product.searchableText, alias.toLowerCase()),
  );
}

function keywordMatchCount(product, keywords) {
  return keywords.reduce((count, keyword) => {
    return product.searchableText.includes(keyword.toLowerCase()) ? count + 1 : count;
  }, 0);
}

function sortScoredProducts(scoredProducts, sortBy) {
  const sorted = [...scoredProducts];

  if (sortBy === "price") {
    return sorted.sort(
      (left, right) =>
        right.score - left.score ||
        left.product.price - right.product.price ||
        (right.product.rating ?? 0) - (left.product.rating ?? 0),
    );
  }

  if (sortBy === "rating") {
    return sorted.sort(
      (left, right) =>
        right.score - left.score ||
        (right.product.rating ?? 0) - (left.product.rating ?? 0) ||
        left.product.price - right.product.price,
    );
  }

  if (sortBy === "popularity") {
    return sorted.sort(
      (left, right) =>
        right.score - left.score ||
        (right.product.ratingCount ?? 0) - (left.product.ratingCount ?? 0) ||
        (right.product.rating ?? 0) - (left.product.rating ?? 0),
    );
  }

  return sorted.sort(
    (left, right) =>
      right.score - left.score ||
      (right.product.rating ?? 0) - (left.product.rating ?? 0) ||
      left.product.price - right.product.price,
  );
}

function scoreProduct(product, preferences, keywordMatches) {
  let score = 0;

  if (preferences.category && matchesCategory(product, preferences.category)) {
    score += 40;
  }

  score += keywordMatches * 14;
  score += (product.rating ?? 0) * 6;
  score += Math.log10((product.ratingCount ?? 0) + 1) * 4;

  if (preferences.maxPriceInInr && product.price <= preferences.maxPriceInInr) {
    score += 8;
  }

  if (preferences.minPriceInInr && product.price >= preferences.minPriceInInr) {
    score += 4;
  }

  if (preferences.category && preferences.category !== "accessory") {
    const looksLikeAccessory = ACCESSORY_TERMS.some((term) =>
      containsPhrase(product.searchableText, term),
    );

    if (looksLikeAccessory) {
      score -= 18;
    }
  }

  return score;
}

function stripInternalFields(product) {
  const { searchableText, ...rest } = product;
  return rest;
}

export function recommendProducts(products, preferences) {
  const normalizedPreferences = {
    ...preferences,
    minPriceInInr: convertBudgetToInr(preferences.minPrice, preferences.budgetCurrency),
    maxPriceInInr: convertBudgetToInr(preferences.maxPrice, preferences.budgetCurrency),
  };

  let candidates = [...products];

  if (normalizedPreferences.category) {
    const categoryMatches = candidates.filter((product) =>
      matchesCategory(product, normalizedPreferences.category),
    );

    if (categoryMatches.length > 0) {
      candidates = categoryMatches;
    }
  }

  if (normalizedPreferences.minPriceInInr) {
    candidates = candidates.filter((product) => product.price >= normalizedPreferences.minPriceInInr);
  }

  if (normalizedPreferences.maxPriceInInr) {
    candidates = candidates.filter((product) => product.price <= normalizedPreferences.maxPriceInInr);
  }

  if (normalizedPreferences.keywords.length > 0) {
    const keywordFiltered = candidates.filter((product) => keywordMatchCount(product, normalizedPreferences.keywords) > 0);

    if (keywordFiltered.length > 0) {
      candidates = keywordFiltered;
    }
  }

  const scoredProducts = candidates.map((product) => {
    const keywordMatches = keywordMatchCount(product, normalizedPreferences.keywords);
    return {
      product,
      score: scoreProduct(product, normalizedPreferences, keywordMatches),
    };
  });

  const sortedProducts = sortScoredProducts(scoredProducts, normalizedPreferences.sortBy);

  return sortedProducts.slice(0, 8).map((entry) => stripInternalFields(entry.product));
}
