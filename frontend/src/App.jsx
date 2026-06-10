import { useEffect, useMemo, useState } from "react";

import { getProducts, getRecommendations } from "./api";
import CategoryFilterBar from "./components/CategoryFilterBar";
import ProductCard from "./components/ProductCard";
import SearchPanel from "./components/SearchPanel";
import Section from "./components/Section";
import Spinner from "./components/Spinner";

const CATALOG_PAGE_SIZE = 24;

function formatPreferences(preferences) {
  if (!preferences) {
    return [];
  }

  const items = [];

  if (preferences.category) {
    items.push(`Category: ${preferences.category}`);
  }

  if (preferences.maxPrice) {
    items.push(`Max budget: ${preferences.budgetCurrency} ${preferences.maxPrice}`);
  }

  if (preferences.minPrice) {
    items.push(`Min budget: ${preferences.budgetCurrency} ${preferences.minPrice}`);
  }

  if (preferences.keywords?.length) {
    items.push(`Keywords: ${preferences.keywords.join(", ")}`);
  }

  return items;
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [query, setQuery] = useState("I want a phone under $500 with a good camera");
  const [preferences, setPreferences] = useState(null);
  const [meta, setMeta] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [visibleCatalogCount, setVisibleCatalogCount] = useState(CATALOG_PAGE_SIZE);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoadingProducts(true);
        setError("");
        const data = await getProducts();
        setProducts(data);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Unable to load products. Please check that the backend is running.",
        );
      } finally {
        setLoadingProducts(false);
      }
    }

    fetchProducts();
  }, []);

  const preferenceSummary = useMemo(() => formatPreferences(preferences), [preferences]);
  const categorySummaries = useMemo(() => {
    const counts = products.reduce((summary, product) => {
      summary.set(product.category, (summary.get(product.category) ?? 0) + 1);
      return summary;
    }, new Map());

    return [...counts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category));
  }, [products]);
  const filteredCatalogProducts = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }

    return products.filter((product) => product.category === selectedCategory);
  }, [products, selectedCategory]);
  const visibleCatalogProducts = useMemo(
    () => filteredCatalogProducts.slice(0, visibleCatalogCount),
    [filteredCatalogProducts, visibleCatalogCount],
  );
  const hasMoreCatalogProducts = visibleCatalogProducts.length < filteredCatalogProducts.length;

  useEffect(() => {
    if (categorySummaries.length === 0) {
      setSelectedCategory("");
      return;
    }

    const hasSelectedCategory = categorySummaries.some(
      ({ category }) => category === selectedCategory,
    );

    if (!hasSelectedCategory) {
      setSelectedCategory(categorySummaries[0].category);
    }
  }, [categorySummaries, selectedCategory]);

  useEffect(() => {
    setVisibleCatalogCount(CATALOG_PAGE_SIZE);
  }, [selectedCategory]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!query.trim()) {
      setError("Please enter your shopping preferences first.");
      return;
    }

    try {
      setLoadingRecommendations(true);
      setError("");
      const response = await getRecommendations(query.trim());
      setRecommendations(response.products);
      setPreferences(response.preferences);
      setMeta(response.meta);
      if (response.preferences?.category) {
        setSelectedCategory(response.preferences.category);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Recommendation request failed. Please try again.",
      );
    } finally {
      setLoadingRecommendations(false);
    }
  }

  return (
    <main className="page-shell">
      <div className="page-stack">
        <SearchPanel
          query={query}
          onQueryChange={setQuery}
          onSubmit={handleSubmit}
          isLoading={loadingRecommendations}
        />

        {error ? <div className="error-banner">{error}</div> : null}

        {preferences || meta ? (
          <section className="status-card">
            <h2>Latest Recommendation Run</h2>
            {meta?.warning ? (
              <p className="status-message">
                The backend used fallback parsing because the AI response was unavailable or invalid.
              </p>
            ) : null}
            <div className="meta-list">
              {preferenceSummary.map((item) => (
                <span className="pill" key={item}>
                  {item}
                </span>
              ))}
              {meta?.source ? <span className="pill pill--soft">Parser: {meta.source}</span> : null}
              {meta?.returnedProducts !== undefined ? (
                <span className="pill pill--soft">
                  Returned: {meta.returnedProducts}
                </span>
              ) : null}
            </div>
          </section>
        ) : null}

        <Section
          title="Recommended Products"
          subtitle="Top matches based on AI-extracted preferences and backend-side filtering."
          actions={loadingRecommendations ? <Spinner label="Generating matches..." /> : null}
        >
          {loadingRecommendations ? null : recommendations.length > 0 ? (
            <div className="product-grid">
              {recommendations.map((product) => (
                <ProductCard key={`recommended-${product.id}`} product={product} highlight />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              {meta?.returnedProducts === 0
                ? "No products matched that request. Try a broader query or a higher budget."
                : "Run a recommendation to see the best matching products here."}
            </div>
          )}
        </Section>

        <Section
          title="All Products"
          subtitle={
            selectedCategory
              ? `Showing ${visibleCatalogProducts.length} of ${filteredCatalogProducts.length} ${selectedCategory} products • ${products.length} total in catalog`
              : `Catalog loaded from CSV: ${products.length} products`
          }
          actions={loadingProducts ? <Spinner label="Loading catalog..." /> : null}
        >
          {!loadingProducts ? (
            <div className="catalog-toolbar">
              <p className="catalog-summary">
                Browse by category to keep the homepage fast and responsive.
              </p>
              <CategoryFilterBar
                categories={categorySummaries}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            </div>
          ) : null}

          {loadingProducts ? null : (
            <>
              <div className="product-grid">
                {visibleCatalogProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {hasMoreCatalogProducts ? (
                <div className="load-more-wrap">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setVisibleCatalogCount((currentCount) => currentCount + CATALOG_PAGE_SIZE)
                    }
                  >
                    Load 24 More
                  </button>
                </div>
              ) : null}
            </>
          )}
        </Section>
      </div>
    </main>
  );
}
