export default function CategoryFilterBar({
  categories,
  selectedCategory,
  onCategoryChange,
}) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="category-filter-bar" aria-label="Product categories">
      {categories.map(({ category, count }) => (
        <button
          key={category}
          type="button"
          className={`category-filter-button${
            selectedCategory === category ? " category-filter-button--active" : ""
          }`}
          onClick={() => onCategoryChange(category)}
        >
          <span>{category}</span>
          <span className="category-filter-button__count">{count}</span>
        </button>
      ))}
    </div>
  );
}
