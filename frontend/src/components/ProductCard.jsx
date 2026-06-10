const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatRatingCount(value) {
  if (!value) {
    return "New";
  }

  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function ProductCard({ product, highlight = false }) {
  return (
    <article className={`product-card${highlight ? " product-card--highlight" : ""}`}>
      <div className="product-card__image-wrap">
        <img
          className="product-card__image"
          src={product.image}
          alt={product.name}
          loading="lazy"
        />
      </div>

      <div className="product-card__content">
        <div className="product-card__badges">
          <span className="pill">{product.category}</span>
          {product.rating ? <span className="pill pill--soft">⭐ {product.rating.toFixed(1)}</span> : null}
        </div>

        <h3 className="product-card__title">{product.name}</h3>

        <p className="product-card__meta">
          {product.subCategory || product.mainCategory || "Electronics"}
        </p>

        <div className="product-card__footer">
          <div>
            <p className="product-card__price">{currencyFormatter.format(product.price)}</p>
            {product.actualPrice && product.actualPrice > product.price ? (
              <p className="product-card__actual-price">
                {currencyFormatter.format(product.actualPrice)}
              </p>
            ) : null}
          </div>

          <div className="product-card__stats">
            <span>{formatRatingCount(product.ratingCount)} reviews</span>
            {product.link ? (
              <a
                className="product-card__link"
                href={product.link}
                target="_blank"
                rel="noreferrer"
              >
                View
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
